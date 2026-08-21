import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/crm/stats — CRM dashboard + guardrail numbers, all real
// (ops.leads + ops.outreach_messages + ops.ig_messages) via operator_crm_stats.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_crm_stats');
  if (error) {
    console.error('operator_crm_stats error', error.message);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
  // RPC returns a single row (table-returning fn → array of one).
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ stats: row ?? null });
}
