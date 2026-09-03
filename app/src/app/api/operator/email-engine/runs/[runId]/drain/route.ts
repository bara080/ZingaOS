import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// POST /api/operator/email-engine/runs/[runId]/drain
//   THE LOCAL-TEST ENTRYPOINT. Advances the run ONE chunk (engine.drainRun):
//   queued→running, claim + SMTP-send a chunk of the current cadence stage,
//   record results, advance/gate the stage, and →completed when drained.
//   Call it repeatedly to walk a run to completion and watch progress.
//
//   In prod (Stage 3) a Vercel Workflow will loop this. To let a cron/workflow
//   call it, a `Authorization: Bearer $CRON_SECRET` bypasses operator auth
//   (same pattern as /api/operator/email/poll). Otherwise operator auth applies.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function drain(runId: string) {
  const admin = createServiceClient();
  try {
    const outcome = await engine.drainRun(admin, runId);
    const detail = await engine.getRunDetail(admin, runId);
    return NextResponse.json({ outcome, progress: detail?.progress ?? null, status: detail?.run?.status ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (secret && auth === `Bearer ${secret}`) {
    return drain(runId);
  }
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  return drain(runId);
}
