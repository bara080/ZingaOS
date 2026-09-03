import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendSms, telnyxConfigured } from '@/lib/operator/telnyx';

// POST /api/operator/sms/send  { to, text }
// Auth-gated. Sends ONE 1:1 marketing/service SMS via Telnyx, but ONLY after a
// HARD consent gate: operator_sms_consent_is_allowed(to) must return true (a
// non-opted-out ops.sms_consent row). Scraped-only numbers with no consent row
// are refused with 403. On success we persist the outbound message + audit it.
// Human-reviewed, fires only on this authenticated click — never auto-sent.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { to?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const to = (body.to ?? '').toString().trim();
  const text = (body.text ?? '').toString().trim();
  if (!to) return NextResponse.json({ error: 'to (phone) required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const admin = createServiceClient();

  // ── HARD CONSENT GATE ─────────────────────────────────────────────────────
  // No opted-in consent row → we may not text this number. Full stop.
  const { data: allowed, error: gateErr } = await admin.rpc('operator_sms_consent_is_allowed', {
    p_phone: to,
  });
  if (gateErr) {
    return NextResponse.json({ error: `consent check failed: ${gateErr.message}` }, { status: 500 });
  }
  if (allowed !== true) {
    return NextResponse.json({ error: 'no consent on file for this number' }, { status: 403 });
  }

  // Telnyx must be wired for a real send.
  if (!telnyxConfigured()) {
    return NextResponse.json(
      { error: 'Telnyx not configured (TELNYX_API_KEY + TELNYX_FROM or TELNYX_MESSAGING_PROFILE_ID)' },
      { status: 500 },
    );
  }

  let result: { id: string };
  try {
    result = await sendSms({ to, text });
  } catch (e) {
    try {
      await admin.rpc('operator_audit_insert', {
        p_actor: gate.session.email,
        p_action: 'sms.send',
        p_detail: `to=${to} FAILED: ${e instanceof Error ? e.message : 'error'}`,
      });
    } catch {
      /* ignore audit failure */
    }
    return NextResponse.json(
      { error: `Send failed: ${e instanceof Error ? e.message : 'error'}` },
      { status: 502 },
    );
  }

  let id: number | null = null;
  try {
    const { data } = await admin.rpc('operator_sms_store_outbound', {
      p_phone: to,
      p_body: text,
      p_provider_id: result.id || null,
    });
    id = data != null ? Number(data) : null;
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'sms.send',
      p_detail: `to=${to} ok provider_id=${result.id}`,
    });
  } catch {
    /* ignore persistence/audit failure — the SMS was already sent */
  }

  return NextResponse.json({ ok: true, id, providerId: result.id });
}
