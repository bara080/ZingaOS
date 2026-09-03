// Server-only WhatsApp client. Sends one message via the Meta WhatsApp Business
// Cloud API (POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages).
// Auth is a Bearer WHATSAPP_TOKEN read from the env — NEVER logged or returned.
// Requires the Node.js runtime (routes set runtime='nodejs').
//
// Sending is HARD-GATED upstream: a caller may only reach sendWhatsApp after the
// consent ledger (ops.whatsapp_consent) says the number is opted_in. See
// /api/operator/whatsapp/send. This module does no consent logic itself.
//
// NOTE (Meta policy): business-initiated messages outside the 24-hour customer-
// service window require an APPROVED message template. This client sends a plain
// `text` message, which is valid inside the 24h window (a reply to an inbound) —
// the operator UI reflects that consent + window discipline.

const GRAPH_VERSION = 'v21.0';

// True when Meta WhatsApp creds are present (a token AND a phone number id).
// Used to render the channel's dormant state when it isn't wired yet.
export function whatsappConfigured(): boolean {
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  return !!(token && phoneNumberId);
}

// Send ONE WhatsApp text message. Returns the WhatsApp provider message id
// (WAMID). Throws on any Meta-level rejection (caller records the failure +
// audits it). The token never appears in the thrown message.
export async function sendWhatsApp(opts: { to: string; text: string }): Promise<{ id: string }> {
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();

  if (!token) throw new Error('WhatsApp not configured (WHATSAPP_TOKEN missing)');
  if (!phoneNumberId) throw new Error('WhatsApp not configured (WHATSAPP_PHONE_NUMBER_ID missing)');

  const to = (opts.to || '').trim();
  const text = (opts.text || '').trim();
  if (!to) throw new Error('recipient (to) required');
  if (!text) throw new Error('message text required');

  // WhatsApp Cloud API wants the destination WITHOUT a leading '+'.
  const toDigits = to.replace(/[^0-9]/g, '');

  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: toDigits,
    type: 'text',
    text: { body: text },
  };

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await r.json().catch(() => ({}))) as {
    messages?: { id?: string }[];
    error?: { message?: string; error_user_msg?: string; type?: string };
  };
  if (!r.ok) {
    const detail =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      data?.error?.type ||
      `WhatsApp error ${r.status}`;
    throw new Error(detail);
  }
  const id = data?.messages?.[0]?.id ?? '';
  return { id };
}
