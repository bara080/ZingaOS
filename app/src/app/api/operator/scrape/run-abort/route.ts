import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { apifyAbort } from '@/lib/operator/apify';

// POST /api/operator/scrape/run-abort  { id, runId }
// Pauses (aborts) a RUNNING scrape (Scrape History ⋮ → Pause): aborts the Apify
// actor run, then marks the history row failed. Auth-gated. Best-effort.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { id?: unknown; runId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const id = Number(body.id);
  const runId = (body.runId ?? '').toString().trim();
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (runId) {
    const res = await apifyAbort(runId);
    if (!res.ok) {
      // Report but still mark the run failed so it doesn't sit stuck as 'running'.
      console.warn('[scrape/run-abort] apify abort failed:', res.error);
    }
  }

  const admin = createServiceClient();
  await admin.rpc('operator_scrape_run_finish', {
    p_id: id,
    p_status: 'failed',
    p_found: 0,
    p_dropped: 0,
    p_inserted: 0,
    p_error: 'paused by operator',
    p_duration_ms: null,
  });
  return NextResponse.json({ ok: true });
}
