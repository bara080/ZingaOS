import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/scrape/runs?limit=50
// Auth-gated. Returns the recent scrape-run history (most recent first) that
// powers the Scrape History UI. Degrades gracefully: if the RPC is missing or
// unapplied the route returns { runs: [] } rather than 500ing the history view.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const limitRaw = new URL(req.url).searchParams.get('limit');
  const limit = Math.max(1, Math.min(200, Number(limitRaw) || 50));

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.rpc('operator_scrape_runs_list', { p_limit: limit });
    if (error) {
      // RPC not applied yet (or other DB error): stay graceful, never crash the UI.
      console.error('operator_scrape_runs_list error', error.message);
      return NextResponse.json({ runs: [] });
    }
    return NextResponse.json({ runs: data ?? [] });
  } catch (e) {
    console.error('scrape/runs failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ runs: [] });
  }
}
