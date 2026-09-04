import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { sendMessengerMessage, messengerConfigured } from '@/lib/operator/messenger';

// POST /api/operator/messenger/send  { psid, text }
// Auth-gated. Sends ONE real Facebook Messenger reply to a chosen PSID, inside
// Meta's 24-hour standard messaging window (Tend replies fast via draft/show/
// wait, so the window is rarely hit; business-initiated messages OUTSIDE 24h
// require an approved message tag / HUMAN_AGENT and are not sent here).
//
// GUARDRAIL: fires only on this authenticated click; every send is audited. If
// the Messenger creds are unset the channel is DORMANT and this returns a clean
// "not configured" error (503) rather than crashing.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: { psid?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const psid = (body.psid ?? '').toString().trim();
  const text = (body.text ?? '').toString().trim();
  if (!psid) return NextResponse.json({ error: 'psid required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  // 24h-window policy: the Send API call uses messaging_type:'RESPONSE', which is
  // only valid as a reply within Meta's 24-hour customer-service window. Anything
  // outside the window must go through an approved message tag — not supported
  // here — so Meta will reject it and we surface that as a send failure.

  // DORMANT guard — creds not wired yet. Return a clear 503, never crash.
  const conf = messengerConfigured();
  if (!conf.ok) return NextResponse.json({ error: conf.error }, { status: 503 });

  const result = await sendMessengerMessage(psid, text);

  const pageId = (process.env.MESSENGER_PAGE_ID ?? '').trim();
  try {
    const admin = createServiceClient();
    await admin.rpc('operator_audit_insert', {
      p_actor: gate.session.email,
      p_action: 'messenger.send',
      p_detail:
        'error' in result
          ? `psid=${psid} FAILED: ${result.error}`
          : `psid=${psid} ok mid=${result.mid}`,
    });
    // On a successful send, persist the outbound message so it shows up in the
    // conversation thread alongside inbound DMs. Never blocks/affects the send.
    if (!('error' in result)) {
      await admin.rpc('operator_messenger_store_outbound', {
        p_page_id: pageId,
        p_psid: psid,
        p_mid: result.mid || null,
        p_body: text,
      });
    }
  } catch {
    /* ignore audit / persistence failure — the DM was already sent */
  }

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, messageId: result.mid });
}
