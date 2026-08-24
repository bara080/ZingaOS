import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/scrape/finish  { id, status, error? }
// Auth-gated. Marks a scrape-run history row as terminal — used by the client to
// record FAILED/aborted/timed-out runs (the success path is finalized inside
// /scrape/results). Recording is BEST-EFFORT: a missing/unapplied RPC is
// swallowed and returns { ok: true } so the client flow never breaks.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { id?: unknown; status?: unknown; error?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'missing or invalid id' }, { status: 400 });
  }
  const status = String(body.status ?? '');
  if (status !== 'failed' && status !== 'succeeded') {
    return NextResponse.json({ error: "status must be 'failed' or 'succeeded'" }, { status: 400 });
  }
  const errorText = body.error == null ? null : String(body.error).slice(0, 500);

  try {
    const admin = createServiceClient();
    await admin.rpc('operator_scrape_run_finish', {
      p_id: id,
      p_status: status,
      p_found: 0,
      p_dropped: 0,
      p_inserted: 0,
      p_error: errorText,
    });
  } catch {
    /* ignore history failure — recording is best-effort */
  }

  return NextResponse.json({ ok: true });
}
