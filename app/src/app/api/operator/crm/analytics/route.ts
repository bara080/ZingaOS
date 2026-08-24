import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/crm/analytics?days=14
// Real analytics: daily sends+replies series + per-platform sends, from
// ops.outreach_messages + ops.ig_messages via SECURITY DEFINER RPCs.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days')) || 14, 1), 90);
  const admin = createServiceClient();
  const [ts, plat] = await Promise.all([
    admin.rpc('operator_crm_timeseries', { p_days: days }),
    admin.rpc('operator_crm_by_platform'),
  ]);
  if (ts.error || plat.error) {
    console.error('crm analytics error', ts.error ?? plat.error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
  return NextResponse.json({ timeseries: ts.data ?? [], byPlatform: plat.data ?? [] });
}
