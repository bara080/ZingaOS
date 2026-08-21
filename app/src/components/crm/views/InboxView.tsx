'use client';

// CRM · Inbox — three columns: Conversation List | Chat | Reply. Real data from
// ops.ig_messages via the existing /api/operator/ig/{threads,thread,draft,send}
// routes (the conversation pipeline). Draft/show/wait: replies are drafted +
// human-approved, never auto-sent.
import { useEffect, useMemo, useState } from 'react';
import { Bot, Send as SendIcon } from 'lucide-react';
import { useIgThreads, useIgThread, useIgDraft, useIgSend } from '../hooks';
import { C } from '@/components/operator/theme';

export function InboxView() {
  const threadsQ = useIgThreads(true);
  const threads = useMemo(() => threadsQ.data?.threads ?? [], [threadsQ.data]);
  const [igsid, setIgsid] = useState<string | null>(null);
  const threadQ = useIgThread(igsid, true);
  const draft = useIgDraft();
  const send = useIgSend();

  const [reply, setReply] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  // Auto-select the first thread once loaded.
  useEffect(() => {
    if (!igsid && threads.length) setIgsid(threads[0].igsid);
  }, [threads, igsid]);

  const active = threads.find((t) => t.igsid === igsid) || null;
  const messages = threadQ.data?.messages ?? [];

  const doDraft = () => {
    if (!igsid) return;
    setFlash(null);
    draft.mutate(
      { igsid },
      {
        onSuccess: (d) => setReply(d.draft),
        onError: (e) => setFlash(`Draft failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const doSend = () => {
    if (!igsid || !reply.trim() || send.isPending) return;
    setFlash(null);
    send.mutate(
      { igsid, text: reply.trim() },
      {
        onSuccess: () => {
          setReply('');
          setFlash('Reply sent ✓');
        },
        onError: (e) => setFlash(`Send failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const notAuthorized = threadsQ.isError;

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 14px' }}>
        Inbox
      </h2>

      {notAuthorized ? (
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, background: 'rgba(230,178,76,0.06)' }}>
          Instagram messaging not available.
          <div style={{ color: C.ink3, marginTop: 6 }}>
            {threadsQ.error instanceof Error ? threadsQ.error.message : 'not authorized'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr 260px', gap: 14, alignItems: 'start' }}>
          {/* col 1: conversation list */}
          <div style={colCard}>
            <label style={eyebrow}>Conversations</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 520, overflowY: 'auto' }}>
              {threadsQ.isLoading ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
              ) : threads.length === 0 ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8, lineHeight: 1.6 }}>
                  No conversations yet. Inbound DMs to @zingaapp land here once the
                  webhook captures them.
                </div>
              ) : (
                threads.map((t) => {
                  const on = t.igsid === igsid;
                  return (
                    <button
                      key={t.igsid}
                      onClick={() => setIgsid(t.igsid)}
                      style={{
                        textAlign: 'left',
                        padding: '9px 10px',
                        borderRadius: 8,
                        border: `1px solid ${on ? C.teal : C.line}`,
                        background: on ? 'rgba(47,217,201,0.08)' : C.panel2,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontFamily: C.sans, fontSize: 12.5, fontWeight: 600, color: on ? C.teal : C.ink }}>
                        {t.username ? `@${t.username.replace(/^@/, '')}` : t.igsid}
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.last_text || `${t.msg_count} messages`}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* col 2: chat */}
          <div style={{ ...colCard, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
            <label style={eyebrow}>
              {active ? (active.username ? `@${active.username.replace(/^@/, '')}` : active.igsid) : 'Chat'}
            </label>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 340, padding: '4px 2px' }}>
              {!igsid ? (
                <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, margin: 'auto' }}>Pick a conversation.</div>
              ) : threadQ.isLoading ? (
                <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, margin: 'auto' }}>loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, margin: 'auto' }}>no messages</div>
              ) : (
                messages.map((m) => {
                  const out = m.direction === 'out';
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: out ? 'flex-end' : 'flex-start',
                        maxWidth: '78%',
                        background: out ? 'rgba(47,217,201,0.12)' : C.panel2,
                        border: `1px solid ${out ? 'rgba(47,217,201,0.4)' : C.line}`,
                        borderRadius: 10,
                        padding: '8px 11px',
                        fontFamily: C.sans,
                        fontSize: 12.5,
                        color: C.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>

            {/* reply composer */}
            <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Draft a reply, or write your own…"
                  disabled={!igsid}
                  style={{ ...fieldStyle, flex: 1, minHeight: 56, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doDraft} disabled={!igsid || draft.isPending} style={{ ...btn(false), flex: 1 }}>
                  <Bot size={14} /> {draft.isPending ? 'Drafting…' : 'AI draft'}
                </button>
                <button onClick={doSend} disabled={!igsid || !reply.trim() || send.isPending} style={{ ...btn(true), flex: 1 }}>
                  <SendIcon size={14} /> {send.isPending ? 'Sending…' : 'Send reply'}
                </button>
              </div>
              {flash && (
                <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 11, color: flash.includes('failed') || flash.includes('Failed') ? C.red : C.green }}>
                  {flash}
                </div>
              )}
            </div>
          </div>

          {/* col 3: lead details */}
          <div style={colCard}>
            <label style={eyebrow}>Details</label>
            {active ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink2, lineHeight: 1.9 }}>
                <div>handle: <span style={{ color: C.teal }}>{active.username ? `@${active.username.replace(/^@/, '')}` : '—'}</span></div>
                <div>igsid: <span style={{ color: C.ink3 }}>{active.igsid}</span></div>
                <div>messages: {active.msg_count}</div>
                <div>last: {active.last_at ? new Date(active.last_at).toLocaleString() : '—'}</div>
              </div>
            ) : (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>—</div>
            )}
            <div style={{ marginTop: 14, fontFamily: C.mono, fontSize: 10, color: C.ink3, lineHeight: 1.6 }}>
              Replies here go out within Meta&apos;s 24h window via the approved send
              path — human-reviewed, never auto-sent.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const colCard: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 14,
};
const eyebrow: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.ink3,
  display: 'block',
  marginBottom: 8,
};
const fieldStyle: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 12.5,
  padding: '9px 11px',
  borderRadius: 9,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
};
function btn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: C.mono,
    fontSize: 11.5,
    fontWeight: 600,
    padding: '9px 10px',
    borderRadius: 9,
    border: `1px solid ${primary ? C.teal : C.line}`,
    background: primary ? 'rgba(47,217,201,0.10)' : C.panel2,
    color: primary ? C.teal : C.ink2,
    cursor: 'pointer',
  };
}
