import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// POST /api/operator/email-engine/runs/[runId]/control  { action }
// action ∈ pause | resume | stop | continue. Status-flag driven; drainRun honors
// it. (Resume/continue does NOT auto-drain here — call .../drain to advance.)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { runId } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const admin = createServiceClient();
  try {
    const result = await engine.controlRun(admin, runId, action || '');
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 400 });
  }
}
