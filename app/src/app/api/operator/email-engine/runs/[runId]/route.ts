import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// GET /api/operator/email-engine/runs/[runId] → run + progress + cadence stages
//     + recent audit events (the monitor view).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { runId } = await params;
  const admin = createServiceClient();
  try {
    const detail = await engine.getRunDetail(admin, runId);
    if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
