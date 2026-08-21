import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/crm/campaigns/status  { id, status: 'active' | 'paused' }
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { id?: number; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const status = body.status === 'paused' ? 'paused' : 'active';

  const admin = createServiceClient();
  const { error } = await admin.rpc('operator_campaign_set_status', { p_id: id, p_status: status });
  if (error) {
    console.error('operator_campaign_set_status error', error.message);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
