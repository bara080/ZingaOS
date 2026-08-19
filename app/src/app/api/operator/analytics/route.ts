import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/analytics
// Auth-gated. Tiles + funnel on the Analytics tab, aggregated from ops.leads via
// service-role RPCs (stage counts, per-source counts, emailable send counts).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNED = new Set(['signed', 'listed']);
const BEYOND_SCRAPED = new Set(['prospect', 'contacted', 'replied', 'signed', 'listed']);

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  try {
    const admin = createServiceClient();
    const [{ data: stageRows, error: e1 }, { data: srcRows, error: e2 }, { data: sendRows, error: e3 }] =
      await Promise.all([
        admin.rpc('operator_lead_counts'),
        admin.rpc('operator_source_counts'),
        admin.rpc('operator_campaign_counts', { p_source: null }),
      ]);
    if (e1 || e2 || e3) {
      return NextResponse.json(
        { error: (e1 ?? e2 ?? e3)?.message ?? 'analytics query failed' },
        { status: 500 },
      );
    }

    let sourced = 0;
    let icp = 0;
    let signed = 0;
    for (const r of stageRows ?? []) {
      const n = Number(r.n) || 0;
      sourced += n;
      if (BEYOND_SCRAPED.has(r.stage)) icp += n;
      if (SIGNED.has(r.stage)) signed += n;
    }

    const scrape = { google: 0, ig: 0, tiktok: 0 };
    for (const r of srcRows ?? []) {
      const s = String(r.source ?? '');
      const n = Number(r.n) || 0;
      if (s.includes('google')) scrape.google += n;
      else if (s.includes('ig') || s.includes('instagram')) scrape.ig += n;
      else if (s.includes('tiktok')) scrape.tiktok += n;
    }

    const send = (sendRows ?? [])[0] ?? { sent: 0, pending: 0, total: 0 };

    return NextResponse.json({
      supply: { sourced, icp, signed },
      trust: { testimonials: 0 },
      demand: { bookings: 0 },
      send: {
        sent: Number(send.sent) || 0,
        failed: 0,
        pending: Number(send.pending) || 0,
        total: Number(send.total) || 0,
      },
      scrape,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'analytics failed' }, { status: 500 });
  }
}
