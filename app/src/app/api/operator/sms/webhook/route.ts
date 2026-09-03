import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';

// POST /api/operator/sms/webhook  — Telnyx INBOUND SMS webhook.
// NOT requireOperator-gated: Telnyx calls this server-to-server. Instead we
// validate the payload is a real Telnyx inbound-message shape, and (stub) verify
// the Telnyx signature when a secret/public key is configured.
//
// Behavior:
//   • STOP keyword (STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT, case-insensitive)
//     → operator_sms_consent_optout — honored immediately + irreversibly-by-inbound.
//   • anything else → operator_sms_store_inbound (dedup-safe on provider_id).
// Delivery/sent status callbacks (message.sent / message.finalized) are ignored.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

// ── Telnyx signature verification (stub) ────────────────────────────────────
// Telnyx signs webhooks with Ed25519: headers `telnyx-signature-ed25519` +
// `telnyx-timestamp`, verified against the account's public key. Full verification
// (crypto.verify('ed25519', …) over `${timestamp}|${rawBody}`) belongs here once
// TELNYX_WEBHOOK_SECRET (the public key) is set. For now: if it's set we log that
// we would verify; if unset we ACCEPT but log — so local testing never hard-fails.
function verifyTelnyxSignature(req: Request): { ok: boolean; note: string } {
  const publicKey = process.env.TELNYX_WEBHOOK_SECRET || '';
  const sig = req.headers.get('telnyx-signature-ed25519') || '';
  const ts = req.headers.get('telnyx-timestamp') || '';
  if (!publicKey) {
    return { ok: true, note: 'TELNYX_WEBHOOK_SECRET unset — accepting unverified (local/testing)' };
  }
  // TODO: implement Ed25519 verification of `${ts}|${rawBody}` against publicKey.
  // Until then, require the signature headers to at least be present.
  if (!sig || !ts) {
    return { ok: false, note: 'missing Telnyx signature headers' };
  }
  return { ok: true, note: 'signature headers present (Ed25519 verification stubbed)' };
}

type TelnyxPayload = {
  data?: {
    event_type?: string;
    payload?: {
      id?: string;
      direction?: string;
      text?: string;
      from?: { phone_number?: string };
      to?: { phone_number?: string }[];
    };
  };
};

export async function POST(req: Request) {
  const check = verifyTelnyxSignature(req);
  if (!check.ok) {
    return NextResponse.json({ error: `signature check failed: ${check.note}` }, { status: 401 });
  }

  let body: TelnyxPayload;
  try {
    body = (await req.json()) as TelnyxPayload;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const eventType = body?.data?.event_type ?? '';
  const payload = body?.data?.payload;

  // Validate this is a Telnyx message webhook shape.
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'not a Telnyx message payload' }, { status: 400 });
  }

  // Only act on inbound messages. Sent/finalized delivery callbacks are acked.
  const isInbound = eventType === 'message.received' || payload.direction === 'inbound';
  if (!isInbound) {
    return NextResponse.json({ ok: true, ignored: eventType || 'non-inbound' });
  }

  const from = (payload.from?.phone_number ?? '').toString().trim();
  const text = (payload.text ?? '').toString();
  const providerId = (payload.id ?? '').toString().trim() || null;
  if (!from) {
    return NextResponse.json({ error: 'inbound missing from.phone_number' }, { status: 400 });
  }

  const admin = createServiceClient();
  const isStop = STOP_KEYWORDS.has(text.trim().toUpperCase());

  try {
    if (isStop) {
      await admin.rpc('operator_sms_consent_optout', { p_phone: from, p_source: 'inbound-stop' });
      // Also log the inbound STOP into the thread for the record.
      await admin.rpc('operator_sms_store_inbound', {
        p_phone: from,
        p_body: text,
        p_provider_id: providerId,
      });
      await admin.rpc('operator_audit_insert', {
        p_actor: 'telnyx-webhook',
        p_action: 'sms.optout',
        p_detail: `phone=${from} keyword=${text.trim().toUpperCase()}`,
      });
      return NextResponse.json({ ok: true, optedOut: true });
    }

    const { data } = await admin.rpc('operator_sms_store_inbound', {
      p_phone: from,
      p_body: text,
      p_provider_id: providerId,
    });
    return NextResponse.json({ ok: true, stored: data != null });
  } catch (e) {
    console.error('operator/sms/webhook store error', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'failed to process inbound' }, { status: 500 });
  }
}
