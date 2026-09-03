// Server-only Telnyx SMS client. Ported from lagosMailer/lib/telnyx.js — sends one
// message via the Telnyx Messaging API (POST https://api.telnyx.com/v2/messages).
// Uses either an explicit `from` number (TELNYX_FROM) or a messaging profile
// (TELNYX_MESSAGING_PROFILE_ID / number pool). The API key is read from the env,
// NEVER logged or returned. Requires the Node.js runtime (routes set runtime='nodejs').
//
// Sending is HARD-GATED upstream: a caller may only reach sendSms after the
// consent ledger (ops.sms_consent) says the number is opted_in. See
// /api/operator/sms/send. This module does no consent logic itself.

const TELNYX_ENDPOINT = 'https://api.telnyx.com/v2/messages';

// True when Telnyx creds are present (an API key AND a from-number or profile).
// Used to render the channel's dormant state when it isn't wired yet.
export function telnyxConfigured(): boolean {
  const key = process.env.TELNYX_API_KEY || '';
  const from = process.env.TELNYX_FROM || '';
  const profile = process.env.TELNYX_MESSAGING_PROFILE_ID || '';
  return !!(key && (from || profile));
}

// Send ONE SMS. Returns the Telnyx provider message id. Throws on any Telnyx-level
// rejection (caller records the failure + audits it). The key never appears in the
// thrown message.
export async function sendSms(opts: { to: string; text: string }): Promise<{ id: string }> {
  const apiKey = process.env.TELNYX_API_KEY || '';
  const from = (process.env.TELNYX_FROM || '').trim();
  const messagingProfileId = (process.env.TELNYX_MESSAGING_PROFILE_ID || '').trim();

  if (!apiKey) throw new Error('Telnyx not configured (TELNYX_API_KEY missing)');
  if (!from && !messagingProfileId) {
    throw new Error('Telnyx not configured (TELNYX_FROM or TELNYX_MESSAGING_PROFILE_ID missing)');
  }

  const to = (opts.to || '').trim();
  const text = (opts.text || '').trim();
  if (!to) throw new Error('recipient (to) required');
  if (!text) throw new Error('message text required');

  // Prefer an explicit from-number — the messaging-profile path needs number
  // pooling enabled on the profile, which many accounts don't have.
  const payload = from
    ? { from, to, text }
    : { messaging_profile_id: messagingProfileId, to, text };

  const r = await fetch(TELNYX_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await r.json().catch(() => ({}))) as {
    data?: { id?: string };
    errors?: { detail?: string; title?: string }[];
  };
  if (!r.ok) {
    const detail =
      data?.errors?.[0]?.detail || data?.errors?.[0]?.title || `Telnyx error ${r.status}`;
    throw new Error(detail);
  }
  const id = data?.data?.id ?? '';
  return { id };
}
