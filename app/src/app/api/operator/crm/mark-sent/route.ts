import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/crm/mark-sent  { leadId, platform?, sendMode?, message? }
// Operator-gated. Records a sent outreach message + advances the lead to
// 'contacted' (from a pre-contact stage only) + writes an audit row, via the
// SECURITY DEFINER RPC operator_crm_mark_sent (service_role only). This is what
// makes the DM Queue's "Mark as Sent" persist. See tools/sql/operator_crm.sql.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { leadId?: number; platform?: string; sendMode?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const leadId = Number(body.leadId);
  if (!Number.isFinite(leadId) || leadId <= 0) {
    return NextResponse.json({ error: 'leadId required' }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_crm_mark_sent', {
    p_lead_id: leadId,
    p_platform: (body.platform ?? 'instagram').toString(),
    p_send_mode: (body.sendMode ?? 'manual').toString(),
    p_message: (body.message ?? '').toString(),
    p_actor: gate.session.email,
  });

  if (error) {
    console.error('operator_crm_mark_sent error', error.message);
    return NextResponse.json({ error: 'Failed to mark sent' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messageId: data });
}
