import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/sources
// Auth-gated. Data-source picker options for the Email tab: each distinct
// ops.leads `source` that has emailable leads, plus an "All emailable" option.
// (Adapted from app.py /api/sources, which listed CSV files; the deployed console
// sources from the leads DB instead.)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.rpc('operator_source_counts');
    if (error) return NextResponse.json({ error: error.message, sources: [] }, { status: 500 });

    const rows = (data ?? []) as { source: string; n: number; emailable: number }[];
    let totalEmailable = 0;
    const sources = rows
      .filter((r) => Number(r.emailable) > 0)
      .map((r) => {
        const emailable = Number(r.emailable) || 0;
        totalEmailable += emailable;
        return {
          id: r.source,
          label: `${r.source} — ${emailable} emailable`,
          count: emailable,
          kind: 'db' as const,
        };
      });
    sources.unshift({
      id: 'all',
      label: `All emailable leads — ${totalEmailable}`,
      count: totalEmailable,
      kind: 'db' as const,
    });
    return NextResponse.json({ sources });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sources failed', sources: [] }, { status: 500 });
  }
}
