// Instagram DM layer for the Operator console. Ported from tools/meta_send.py.
// Uses the **Instagram API with Instagram Login** (base https://graph.instagram.com),
// because @zingaapp is a standalone IG business account not linked to a Facebook Page.
// Server-only: the Instagram User token never reaches the browser. The IG DM channel
// can ONLY message people who are already in an OPEN conversation (a 24h messaging
// window Meta requires) — cold handles cannot be DM'd. So the UI lists real
// conversations (with IGSIDs) and only sends to a chosen IGSID.

function cfg() {
  // Prefer the Instagram User token; fall back to META_ACCESS_TOKEN.
  const igToken = process.env.META_IG_ACCESS_TOKEN ?? '';
  const token = igToken || (process.env.META_ACCESS_TOKEN ?? '');
  if (!igToken && token) {
    console.warn(
      '[operator/meta] META_IG_ACCESS_TOKEN not set — falling back to META_ACCESS_TOKEN. ' +
        'The Instagram Login API needs an Instagram User token; a Facebook token will fail.',
    );
  }
  return {
    token,
    igUserId: process.env.META_IG_USER_ID ?? '',
    version: process.env.META_GRAPH_VERSION ?? 'v21.0',
    base: `https://graph.instagram.com/${process.env.META_GRAPH_VERSION ?? 'v21.0'}`,
  };
}

export function metaConfigured(): { ok: true } | { ok: false; error: string } {
  const c = cfg();
  if (!c.token)
    return { ok: false, error: 'META_IG_ACCESS_TOKEN (or META_ACCESS_TOKEN) not set' };
  return { ok: true };
}

export type Conversation = {
  igsid: string;
  username: string;
  updated: string;
  snippet: string;
};

export async function listConversations(): Promise<{ conversations: Conversation[] } | { error: string }> {
  const c = cfg();
  const fields = 'participants,updated_time,messages{message,from}';
  const url =
    `${c.base}/me/conversations?platform=instagram` +
    `&fields=${encodeURIComponent(fields)}&access_token=${c.token}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      return { error: json?.error?.message ?? `Meta HTTP ${res.status}` };
    }
    const out: Conversation[] = [];
    for (const conv of json.data ?? []) {
      const participants = conv.participants?.data ?? [];
      const others = participants.filter(
        (p: { id?: string }) => String(p.id) !== String(c.igUserId),
      );
      const first = others[0] ?? {};
      const msgs = conv.messages?.data ?? [];
      let snippet = '';
      if (msgs.length) {
        const top = msgs[0];
        const who = String(top.from?.id) === String(c.igUserId) ? 'us' : 'them';
        let text = String(top.message ?? '').replace(/\n/g, ' ');
        if (text.length > 80) text = text.slice(0, 77) + '...';
        snippet = `[${who}] "${text}"`;
      }
      out.push({
        igsid: String(first.id ?? ''),
        username: first.username ? `@${first.username}` : '',
        updated: conv.updated_time ?? '',
        snippet,
      });
    }
    return { conversations: out };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Meta request failed' };
  }
}

export async function sendDm(
  igsid: string,
  text: string,
): Promise<{ messageId: string } | { error: string }> {
  const c = cfg();
  // /me/messages resolves to our own IG user from the token; no id needed.
  const url = `${c.base}/me/messages?access_token=${c.token}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      return { error: json?.error?.message ?? `Meta HTTP ${res.status}` };
    }
    return { messageId: json.message_id ?? '' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Meta send failed' };
  }
}
