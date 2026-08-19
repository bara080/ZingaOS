// Instagram DM layer for the Operator console. Ported from tools/meta_send.py.
// Server-only: META_ACCESS_TOKEN never reaches the browser. The IG DM channel can
// ONLY message people who are already in an OPEN conversation (a 24h messaging
// window Meta requires) — cold handles cannot be DM'd. So the UI lists real
// conversations (with IGSIDs) and only sends to a chosen IGSID.

function cfg() {
  return {
    token: process.env.META_ACCESS_TOKEN ?? '',
    igUserId: process.env.META_IG_USER_ID ?? '',
    version: process.env.META_GRAPH_VERSION ?? 'v21.0',
  };
}

export function metaConfigured(): { ok: true } | { ok: false; error: string } {
  const c = cfg();
  if (!c.token) return { ok: false, error: 'META_ACCESS_TOKEN not set' };
  if (!c.igUserId) return { ok: false, error: 'META_IG_USER_ID not set' };
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
  const base = `https://graph.facebook.com/${c.version}`;
  const fields = 'participants,updated_time,messages{message,from}';
  const url =
    `${base}/${c.igUserId}/conversations?platform=instagram` +
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
  const base = `https://graph.facebook.com/${c.version}`;
  const url = `${base}/${c.igUserId}/messages?access_token=${c.token}`;
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
