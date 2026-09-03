import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// GET  /api/operator/email-engine/campaigns/[id]/runs → list runs (with progress)
// POST /api/operator/email-engine/campaigns/[id]/runs → LAUNCH a run:
//        create run → snapshotAudience (freeze recipients from an ops.leads
//        segment) → assign cadence stages → queue. Draining is a SEPARATE call
//        (POST .../runs/[runId]/drain) so this request returns fast.
// Body: { versionId?, audienceMode?, audienceFilter?, duplicatePolicy?,
//         stagePlan?, dispatchChunkSize?, sourceRunId?, priority? }
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { id } = await params;
  const admin = createServiceClient();
  try {
    return NextResponse.json({ runs: await engine.listRuns(admin, id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { id } = await params;
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const admin = createServiceClient();

  try {
    // Default to the campaign's current (latest) frozen version.
    const versionId =
      (b.versionId as string) || (await engine.getCampaign(admin, id))?.current_version_id || null;
    if (!versionId) return NextResponse.json({ error: 'campaign has no version' }, { status: 400 });

    const run = await engine.createRun(admin, {
      campaignId: id,
      versionId,
      audienceMode: b.audienceMode as string,
      audienceFilter: (b.audienceFilter as Record<string, unknown>) || {},
      duplicatePolicy: b.duplicatePolicy as string,
      stagePlan: (b.stagePlan as unknown[]) || [],
      dispatchChunkSize: Number(b.dispatchChunkSize) || undefined,
      sourceRunId: (b.sourceRunId as string) || null,
      priority: Number(b.priority) || undefined,
      createdBy: gate.session.email,
    });

    // Freeze the recipient snapshot now; the run is left `queued`. The local
    // drain route advances it chunk-by-chunk (a Vercel Workflow will loop that in
    // Stage 3). Snapshotting here keeps the request fast (no SMTP in-request).
    const snapshot = await engine.snapshotAudience(admin, run.id);
    return NextResponse.json({ run, snapshot });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 400 });
  }
}
