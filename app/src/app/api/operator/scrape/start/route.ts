import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { apifyStart, clampNumber, isScrapeSource, SCRAPE_NUMBER_MAX } from '@/lib/operator/apify';

// POST /api/operator/scrape/start  { source, query, number }
// Auth-gated (operator roles only). Starts an Apify actor run and returns a runId
// the browser polls. GUARDRAIL: `number` is clamped server-side to ≤200 (not just
// in the UI). Every start is written to the ops.audit trail.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { source?: string; query?: string; number?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const source = body.source;
  const query = (body.query ?? '').toString();
  if (!isScrapeSource(source)) {
    return NextResponse.json({ error: 'unknown source' }, { status: 400 });
  }
  const number = clampNumber(body.number);
  if (number > SCRAPE_NUMBER_MAX) {
    return NextResponse.json({ error: `number exceeds cap ${SCRAPE_NUMBER_MAX}` }, { status: 400 });
  }

  const result = await apifyStart(source, query, number);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Audit (best-effort — never block the scrape if the audit RPC is missing).
  try {
    const admin = createServiceClient();
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'scrape.start',
      p_detail: `${source} · "${query.slice(0, 80)}" · n=${number} · run=${result.runId}`,
    });
  } catch {
    /* ignore audit failure */
  }

  // Scrape-run history (best-effort — never block the scrape if the RPC is
  // missing/unapplied). Records a 'running' row the finalize step later closes.
  let scrapeRunId: number | null = null;
  try {
    const admin = createServiceClient();
    const { data } = await admin.rpc('operator_scrape_run_start', {
      p_actor: gate.session.email,
      p_source: source,
      p_query: query,
      p_number: number,
      p_run_id: result.runId,
      p_dataset_id: result.datasetId,
    });
    scrapeRunId = data == null ? null : Number(data);
  } catch {
    /* ignore history failure — scrape must not break */
  }

  return NextResponse.json({ runId: result.runId, datasetId: result.datasetId, number, scrapeRunId });
}
