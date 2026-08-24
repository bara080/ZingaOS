import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/crm/automations/enabled  { id, enabled: boolean }
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { id?: number; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const enabled = body.enabled === true;

  const admin = createServiceClient();
  const { error } = await admin.rpc('operator_automation_set_enabled', { p_id: id, p_enabled: enabled });
  if (error) {
    console.error('operator_automation_set_enabled error', error.message);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enabled });
}
