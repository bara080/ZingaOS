'use client';

// Social → Instagram · conversations. Reads the STORED message history that the
// Meta webhook captured into the private ops.ig_messages table (distinct from the
// live 24h-window send list in InstagramPanel's "direct messages" card). The
// operator picks a thread, sees the in/out history, generates a Zinga-voice reply
// DRAFT, edits it, and — only on an explicit confirm — sends it via the existing
// /api/operator/ig/send path. Draft / show / wait: nothing auto-sends.
import { useEffect, useState } from 'react';
import { useIgThreads, useIgThread, useIgDraft, useIgSend } from './hooks';
import { Card, ConfirmModal, Eyebrow } from './ui';
import { C } from './theme';

export function ConversationPanel({ active }: { active: boolean }) {
  const threads = useIgThreads(active);
  const [picked, setPicked] = useState<string | null>(null);
  const thread = useIgThread(picked, active);
  const draft = useIgDraft();
  const send = useIgSend();

  const [text, setText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const list = threads.data?.threads ?? [];
  const messages = thread.data?.messages ?? [];
  const pickedThread = list.find((t) => t.igsid === picked) ?? null;
  const pickedLabel = pickedThread?.username || picked || '';

  // Switching threads clears any half-written reply so drafts never leak across
  // conversations.
  useEffect(() => {
    setText('');
    setFlash(null);
  }, [picked]);

  const onDraft = () => {
    if (!picked) return;
    setFlash(null);
    draft.mutate(
      { igsid: picked },
      {
        onSuccess: (d) => setText(d.draft),
        onError: (e) => setFlash(`draft failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const confirmSend = () => {
    setConfirmOpen(false);
    if (!picked) return;
    setFlash(null);
    send.mutate(
      { igsid: picked, text: text.trim() },
      {
        onSuccess: () => {
          setFlash('reply sent ✓');
          setText('');
        },
        onError: (e) => setFlash(`send failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>Instagram · conversations</Eyebrow>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: 14 }}>
          {/* ── thread list ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <label style={labelStyle}>Threads</label>
            {threads.isLoading ? (
              <div style={rowStyle(false)}>loading…</div>
            ) : threads.isError ? (
              <div style={{ ...rowStyle(false), color: C.red }}>
                {threads.error instanceof Error ? threads.error.message : 'failed to load'}
              </div>
            ) : list.length === 0 ? (
              <div style={{ ...rowStyle(false), color: C.ink3 }}>
                no captured conversations yet — inbound DMs land here once someone
                messages @zingaapp
              </div>
            ) : (
              list.map((t) => {
                const on = picked === t.igsid;
                const label = t.username || t.igsid;
                return (
                  <button key={t.igsid} onClick={() => setPicked(t.igsid)} style={rowStyle(on)}>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div style={{ color: C.ink3, marginTop: 2 }}>
                      {truncate(t.last_text ?? '', 42)}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ── message history + reply composer ────────────────────────── */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>
              History ·{' '}
              <span style={{ color: C.teal }}>{pickedLabel || '— pick a thread —'}</span>
            </label>
            <div
              style={{
                minHeight: 160,
                maxHeight: 300,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                borderRadius: 9,
                background: C.panel2,
                border: `1px solid ${C.line}`,
                marginBottom: 12,
              }}
            >
              {!picked ? (
                <div style={{ color: C.ink3, fontFamily: C.mono, fontSize: 11.5 }}>
                  Pick a thread to see the conversation.
                </div>
              ) : thread.isLoading ? (
                <div style={{ color: C.ink3, fontFamily: C.mono, fontSize: 11.5 }}>loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ color: C.ink3, fontFamily: C.mono, fontSize: 11.5 }}>no messages</div>
              ) : (
                messages.map((m) => <Bubble key={m.id} outbound={m.direction === 'out'} text={m.text ?? ''} />)
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Reply</label>
              <button
                onClick={onDraft}
                disabled={!picked || draft.isPending}
                style={draftBtnStyle(!!picked && !draft.isPending)}
              >
                {draft.isPending ? 'drafting…' : 'Draft reply'}
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Draft a reply, or write your own…"
              style={{
                width: '100%',
                minHeight: 100,
                resize: 'vertical',
                fontFamily: C.mono,
                fontSize: 12.5,
                padding: 10,
                borderRadius: 9,
                background: C.panel2,
                color: C.ink,
                border: `1px solid ${C.line}`,
                marginBottom: 12,
              }}
            />
            <button
              onClick={() => {
                if (!picked || !text.trim()) return;
                setConfirmOpen(true);
              }}
              disabled={!picked || !text.trim() || send.isPending}
              style={{
                width: '100%',
                fontFamily: C.mono,
                fontSize: 12.5,
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${picked && text.trim() ? C.teal : C.line}`,
                background: picked && text.trim() ? 'rgba(47,217,201,0.08)' : C.panel2,
                color: picked && text.trim() ? C.teal : C.ink3,
                cursor: picked && text.trim() && !send.isPending ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              {send.isPending ? 'sending…' : 'Send reply'}
            </button>
            {flash && (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: C.mono,
                  fontSize: 11.5,
                  color: flash.includes('failed') ? C.red : C.green,
                }}
              >
                {flash}
              </div>
            )}
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Send Instagram reply"
        body={`Send this reply to ${pickedLabel}?`}
        confirmLabel="Send reply"
        onConfirm={confirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Bubble({ outbound, text }: { outbound: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: outbound ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '80%',
          fontFamily: C.mono,
          fontSize: 11.5,
          lineHeight: 1.5,
          padding: '7px 10px',
          borderRadius: 9,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: outbound ? 'rgba(47,217,201,0.10)' : C.panel,
          border: `1px solid ${outbound ? C.teal : C.line}`,
          color: outbound ? C.teal : C.ink2,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\n/g, ' ');
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}

const labelStyle: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.ink3,
  display: 'block',
  marginBottom: 6,
};

function draftBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    fontFamily: C.mono,
    fontSize: 11,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 8,
    border: `1px solid ${enabled ? C.line : C.line}`,
    background: C.panel2,
    color: enabled ? C.ink : C.ink3,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

function rowStyle(on: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    fontFamily: C.mono,
    fontSize: 10.5,
    color: on ? C.teal : C.ink2,
    padding: '7px 9px',
    borderRadius: 7,
    background: on ? 'rgba(47,217,201,0.08)' : C.panel2,
    border: `1px solid ${on ? C.teal : C.line}`,
    cursor: 'pointer',
  };
}
