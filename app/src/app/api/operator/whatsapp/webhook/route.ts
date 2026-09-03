import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';

// /api/operator/whatsapp/webhook — Meta WhatsApp Business Cloud API webhook.
//
// NOT requireOperator-gated: Meta calls this server-to-server. `src/middleware.ts`
// only matches /console, /admin-users, /settings, /api-doc — so this route is
// not behind the Supabase auth middleware.
//
// GET  — Meta verification handshake (hub.mode / hub.verify_token / hub.challenge).
//        Echoes the challenge back when hub.verify_token === WHATSAPP_VERIFY_TOKEN.
// POST — inbound messages (whatsapp_business_account / changes[].value.messages):
//   • STOP keyword (STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT, case-insensitive)
//     → operator_whatsapp_consent_optout — honored immediately + irreversibly-by-inbound.
//   • anything else → operator_whatsapp_store_inbound (dedup-safe on provider_id/WAMID).
// Delivery/read status callbacks (changes[].value.statuses) are acked + ignored.
// SECURITY: never auto-reply from this scaffold. Inbound only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STOP_KEYWORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);

// GET — Meta webhook verification handshake.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  // .trim() both sides — dashboard-pasted env vars often carry stray whitespace,
  // which silently breaks the equality check.
  const token = (searchParams.get('hub.verify_token') ?? '').trim();
  const challenge = searchParams.get('hub.challenge');
  const expected = (process.env.WHATSAPP_VERIFY_TOKEN ?? '').trim();

  if (mode === 'subscribe' && expected && token === expected) {
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Minimal types for the WhatsApp Cloud API inbound payload we consume.
type WaMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
};
type WaChangeValue = {
  messaging_product?: string;
  messages?: WaMessage[];
  statuses?: unknown[];
};
type WaChange = { value?: WaChangeValue; field?: string };
type WaEntry = { id?: string; changes?: WaChange[] };
type WaWebhookBody = { object?: string; entry?: WaEntry[] };

// POST — inbound messaging events from Meta WhatsApp.
export async function POST(req: Request) {
  let body: WaWebhookBody;
  try {
    body = (await req.json()) as WaWebhookBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const admin = createServiceClient();
  let processed = 0;

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        // Status callbacks (sent/delivered/read) carry `statuses`, not `messages`.
        const messages = value?.messages;
        if (!Array.isArray(messages) || messages.length === 0) continue;

        for (const m of messages) {
          const from = (m.from ?? '').toString().trim();
          const providerId = (m.id ?? '').toString().trim() || null;
          // We only store text messages; non-text (media, reactions) are acked.
          const text = (m.text?.body ?? '').toString();
          if (!from) continue;
          if (m.type && m.type !== 'text') continue;

          const isStop = STOP_KEYWORDS.has(text.trim().toUpperCase());
          if (isStop) {
            await admin.rpc('operator_whatsapp_consent_optout', {
              p_phone: from,
              p_source: 'inbound-stop',
            });
            await admin.rpc('operator_whatsapp_store_inbound', {
              p_phone: from,
              p_body: text,
              p_provider_id: providerId,
            });
            await admin.rpc('operator_audit_insert', {
              p_actor: 'whatsapp-webhook',
              p_action: 'whatsapp.optout',
              p_detail: `phone=${from} keyword=${text.trim().toUpperCase()}`,
            });
          } else {
            await admin.rpc('operator_whatsapp_store_inbound', {
              p_phone: from,
              p_body: text,
              p_provider_id: providerId,
            });
          }
          processed += 1;
        }
      }
    }
  } catch (e) {
    console.error('operator/whatsapp/webhook store error', e instanceof Error ? e.message : e);
    // Ack anyway so Meta doesn't storm-retry; DB dedup handles re-delivery.
    return NextResponse.json({ ok: true, processed, note: 'partial' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, processed });
}
