// Server-only Facebook Messenger (Page DM) client. Sends one message via the
// Meta Messenger Platform Send API (POST https://graph.facebook.com/v21.0/me/messages)
// using the PAGE Access Token — NOT the IG user token. Mirrors lib/operator/meta.ts
// (sendDm) and lib/operator/whatsapp.ts (dormant-when-unconfigured). The token
// never reaches the browser and is never logged or returned.
//
// This channel is the SAME Meta app + SAME /api/meta/webhook as Instagram; the
// only difference is recipients are addressed by PSID (page-scoped id from
// messaging[].sender.id) and the token used to send is the Page Access Token.
//
// DORMANT-SAFE: creds (MESSENGER_PAGE_ID + MESSENGER_PAGE_ACCESS_TOKEN) are NOT
// set yet. messengerConfigured() reports that cleanly and callers (routes) return
// a "not configured" response instead of crashing — exactly like the WhatsApp
// channel. Sending is a human-approved click only (draft/show/wait).

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function cfg() {
  return {
    pageId: (process.env.MESSENGER_PAGE_ID ?? '').trim(),
    token: (process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? '').trim(),
  };
}

// { ok:true } when the Page id AND Page access token are present. Used to render
// the channel's dormant state and to hard-gate the send route.
export function messengerConfigured(): { ok: true } | { ok: false; error: string } {
  const c = cfg();
  if (!c.pageId || !c.token) {
    return {
      ok: false,
      error: 'Messenger not configured (MESSENGER_PAGE_ID + MESSENGER_PAGE_ACCESS_TOKEN)',
    };
  }
  return { ok: true };
}

// Send ONE Messenger text message to a PSID, inside Meta's 24h standard messaging
// window. Returns the provider message id (mid) or an { error } — never throws to
// the caller. Uses messaging_type:'RESPONSE' (a reply to the user's last message).
export async function sendMessengerMessage(
  psid: string,
  text: string,
): Promise<{ mid: string } | { error: string }> {
  const conf = messengerConfigured();
  if (!conf.ok) return { error: conf.error };

  const c = cfg();
  const to = (psid || '').trim();
  const body = (text || '').trim();
  if (!to) return { error: 'psid required' };
  if (!body) return { error: 'text required' };

  const url = `${GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(c.token)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: to },
        messaging_type: 'RESPONSE',
        message: { text: body },
      }),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as {
      message_id?: string;
      error?: { message?: string; error_user_msg?: string; type?: string };
    };
    if (!res.ok) {
      const detail =
        json?.error?.error_user_msg ||
        json?.error?.message ||
        json?.error?.type ||
        `Meta HTTP ${res.status}`;
      return { error: detail };
    }
    return { mid: json.message_id ?? '' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Messenger send failed' };
  }
}

// OPTIONAL best-effort profile lookup. GET /{psid}?fields=name with the Page
// token. Returns { name } or an empty object — never throws. Requires the
// pages_messaging permission + that the person has messaged the Page.
export async function getMessengerProfile(psid: string): Promise<{ name?: string }> {
  const conf = messengerConfigured();
  if (!conf.ok) return {};
  const c = cfg();
  const to = (psid || '').trim();
  if (!to) return {};
  const url =
    `${GRAPH_BASE}/${encodeURIComponent(to)}?fields=name&access_token=${encodeURIComponent(c.token)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as { name?: string };
    if (!res.ok) return {};
    return { name: json.name };
  } catch {
    return {};
  }
}
