import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/sms/consent/optout  { phone }
// Auth-gated. Manual "Mark opted-out" — flips the consent ledger to opted_out for
// a number (e.g. someone asked to stop by another channel). Same effect as an
// inbound STOP keyword. Irreversible by inbound; re-opt-in needs a fresh consent.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const phone = (body.phone ?? '').toString().trim();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const admin = createServiceClient();
  let id: number | null = null;
  try {
    const { data, error } = await admin.rpc('operator_sms_consent_optout', {
      p_phone: phone,
      p_source: 'manual-optout',
    });
    if (error) throw new Error(error.message);
    id = data != null ? Number(data) : null;
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'sms.consent.optout',
      p_detail: `phone=${phone} source=manual`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to opt out: ${e instanceof Error ? e.message : 'error'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
