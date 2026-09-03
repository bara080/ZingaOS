import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { whatsappConfigured } from '@/lib/operator/whatsapp';

// /api/operator/whatsapp/consent
//   GET  — list the consent ledger (opted_in first, then opted_out).
//   POST { phone, name?, leadId?, source } — manually record a real opt-in.
// Auth-gated. This is the ledger the send route hard-gates on. Recording an
// opt-in here asserts that a real Meta-policy opt-in was actually captured
// (web form, in-person, keyword reply, …) — never invent one.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_whatsapp_consent_list', { p_limit: 300 });
  if (error) {
    console.error('operator/whatsapp/consent list RPC error', error.message);
    return NextResponse.json({ error: 'Failed to load consent list' }, { status: 500 });
  }
  return NextResponse.json({ consent: data ?? [], configured: whatsappConfigured() });
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { phone?: string; name?: string; leadId?: number | string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const phone = (body.phone ?? '').toString().trim();
  const name = (body.name ?? '').toString().trim();
  const source = (body.source ?? '').toString().trim() || 'manual';
  const leadIdRaw = body.leadId;
  const leadId =
    leadIdRaw != null && `${leadIdRaw}`.trim() !== '' && Number.isFinite(Number(leadIdRaw))
      ? Number(leadIdRaw)
      : null;

  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  if (phone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'enter a valid phone number' }, { status: 400 });
  }

  const admin = createServiceClient();
  let id: number | null = null;
  try {
    const { data, error } = await admin.rpc('operator_whatsapp_consent_add', {
      p_phone: phone,
      p_name: name || null,
      p_lead_id: leadId,
      p_source: source,
    });
    if (error) throw new Error(error.message);
    id = data != null ? Number(data) : null;
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'whatsapp.consent.add',
      p_detail: `phone=${phone} source=${source}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to record consent: ${e instanceof Error ? e.message : 'error'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
