'use client';

// Social → Instagram. Lists open IG conversations (24h window) and sends a DM to
// a picked conversation via the existing /api/operator/ig/* routes. If the API
// returns not-authorized (Meta approval pending), a clear banner is shown instead
// of a dead form.
import { useState } from 'react';
import { useIgConversations, useIgSend } from './hooks';
import { Card, ConfirmModal, Eyebrow } from './ui';
import { C } from './theme';

export function InstagramPanel({ active }: { active: boolean }) {
  const convos = useIgConversations(active);
  const send = useIgSend();
  const [picked, setPicked] = useState<{ igsid: string; label: string } | null>(null);
  const [text, setText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const notAuthorized = convos.isError;
  const list = convos.data?.conversations ?? [];

  const confirmSend = () => {
    setConfirmOpen(false);
    if (!picked) return;
    setFlash(null);
    send.mutate(
      { igsid: picked.igsid, text: text.trim() },
      {
        onSuccess: () => {
          setFlash('DM sent ✓');
          setText('');
        },
        onError: (e) => setFlash(`DM failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>Instagram · direct messages</Eyebrow>

      {notAuthorized ? (
        <Card
          style={{
            color: C.amber,
            fontFamily: C.mono,
            fontSize: 12,
            lineHeight: 1.6,
            border: `1px solid ${C.line}`,
            background: 'rgba(230,178,76,0.06)',
          }}
        >
          Instagram messaging pending Meta approval.
          <div style={{ color: C.ink3, marginTop: 8 }}>
            {convos.error instanceof Error ? convos.error.message : 'not authorized'}
          </div>
        </Card>
      ) : (
        <Card>
          <label style={labelStyle}>Open conversations · 24h window</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            {convos.isLoading ? (
              <div style={rowStyle(false)}>loading…</div>
            ) : list.length === 0 ? (
              <div style={{ ...rowStyle(false), color: C.ink3 }}>
                no open conversations — a tester must DM @zingaapp first
              </div>
            ) : (
              list.map((cv) => {
                const on = picked?.igsid === cv.igsid;
                const label = cv.username || cv.igsid;
                return (
                  <button
                    key={cv.igsid}
                    onClick={() => setPicked({ igsid: cv.igsid, label })}
                    style={rowStyle(on)}
                  >
                    {label}{' '}
                    <span style={{ color: C.ink3 }}>{cv.snippet}</span>
                  </button>
                );
              })
            )}
          </div>

          <label style={labelStyle}>
            Message to{' '}
            <span style={{ color: C.teal }}>{picked?.label ?? '— pick a conversation —'}</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hey! Thanks for reaching out…"
            style={{
              width: '100%',
              minHeight: 84,
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
            {send.isPending ? 'sending…' : 'Send DM'}
          </button>
          {flash && (
            <div
              style={{
                marginTop: 10,
                fontFamily: C.mono,
                fontSize: 11.5,
                color: flash.startsWith('DM failed') ? C.red : C.green,
              }}
            >
              {flash}
            </div>
          )}
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              color: C.amber,
              padding: 11,
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              background: 'rgba(230,178,76,0.06)',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            IG DM reaches only people already messaging @zingaapp (Meta&apos;s 24h rule). Cold handles
            can&apos;t be DM&apos;d — scrape + email them instead.
          </div>
        </Card>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Send Instagram DM"
        body={`Send this Instagram DM to ${picked?.label ?? ''}?`}
        confirmLabel="Send DM"
        onConfirm={confirmSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
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
function rowStyle(on: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    fontFamily: C.mono,
    fontSize: 10.5,
    color: on ? C.teal : C.ink2,
    padding: '6px 8px',
    borderRadius: 6,
    background: on ? 'rgba(47,217,201,0.08)' : C.panel2,
    border: `1px solid ${on ? C.teal : C.line}`,
    cursor: 'pointer',
  };
}
