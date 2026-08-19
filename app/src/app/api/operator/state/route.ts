import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/state
// Auth-gated. "The three numbers" tiles on the Email tab, derived from ops.leads
// stage counts. (Ported/adapted from app.py state(): the local version read
// providers.csv/testimonials on disk; the deployed console sources supply from
// the leads DB instead.)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNED = new Set(['signed', 'listed']);
const BEYOND_SCRAPED = new Set(['prospect', 'contacted', 'replied', 'signed', 'listed']);

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  try {
    const admin = createServiceClient();
    const { data: rows, error } = await admin.rpc('operator_lead_counts');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let sourced = 0;
    let icp = 0;
    let signed = 0;
    for (const r of rows ?? []) {
      const n = Number(r.n) || 0;
      sourced += n;
      if (BEYOND_SCRAPED.has(r.stage)) icp += n;
      if (SIGNED.has(r.stage)) signed += n;
    }
    return NextResponse.json({
      supply: { sourced, icp, signed },
      trust: { testimonials: 0 }, // testimonials still live in data/testimonials (not yet in DB)
      demand: { bookings: 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'state failed' }, { status: 500 });
  }
}
