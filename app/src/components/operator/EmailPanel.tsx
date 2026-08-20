'use client';

// Email tab — full-width. Campaign counts (sent/pending/total) + recipients for
// the chosen data source (GET /api/operator/campaign). "Send next batch" →
// POST /api/operator/send-batch (server caps at ≤10) behind a confirm, then
// queries invalidate. A review list of sent recipients + the audit trail
// (GET /api/operator/logs) sit below.
import { useEffect, useState } from 'react';
import { useCampaign, useLogs, useSendBatch, useSources } from './hooks';
import { Card, ConfirmModal, Eyebrow, Tile } from './ui';
import { C } from './theme';

const SEND_LIMIT = 10;

export function EmailPanel({ active }: { active: boolean }) {
  const [src, setSrc] = useState('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const sources = useSources(active);
  const campaign = useCampaign(src, active);
  const logs = useLogs(active);
  const send = useSendBatch();

  // Default the picker to the first source once loaded.
  useEffect(() => {
    const list = sources.data?.sources ?? [];
    if (list.length && !list.some((s) => s.id === src)) setSrc(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.data]);

  const c = campaign.data;
  const pending = c?.pending ?? 0;
  const total = c?.total ?? 0;
  const sent = c?.sent ?? 0;
  const batch = Math.min(SEND_LIMIT, pending);
  const pct = total ? (sent / total) * 100 : 0;
  const sentRecipients = (c?.recipients ?? []).filter((r) => r.status === 'sent');

  const confirmSend = () => {
    setConfirmOpen(false);
    setFlash(null);
    send.mutate(
      { src, limit: SEND_LIMIT },
      {
        onSuccess: (r) => {
          setFlash(`Sent ${r.sent} · failed ${r.failed} · ${r.remaining} still pending in this source.`);
        },
        onError: (e) => setFlash(`Send failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>Campaign</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <Tile accent="g" label="Sent" value={sent} hint="delivered" />
        <Tile accent="a" label="Pending" value={pending} hint="not yet contacted" />
        <Tile accent="t" label="Total" value={total} hint="emailable in source" />
      </div>

      <Eyebrow>Send console</Eyebrow>
      <Card>
        <label style={labelStyle}>Data source</label>
        <select
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          style={{
            width: '100%',
            fontFamily: C.mono,
            fontSize: 12.5,
            padding: 10,
            borderRadius: 9,
            background: C.panel2,
            color: C.ink,
            border: `1px solid ${C.line}`,
            marginBottom: 14,
          }}
        >
          {(sources.data?.sources ?? []).length === 0 ? (
            <option value="all">no emailable leads yet</option>
          ) : (
            sources.data!.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))
          )}
        </select>

        <div
          style={{
            height: 12,
            background: C.panel2,
            borderRadius: 7,
            overflow: 'hidden',
            margin: '4px 0 6px',
          }}
        >
          <div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${C.teal}, ${C.green})`,
              width: `${pct}%`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, marginBottom: 12 }}>
          {sent} / {total} delivered
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={pending === 0 || send.isPending}
          style={{
            fontFamily: C.mono,
            fontSize: 12.5,
            padding: '12px 20px',
            borderRadius: 10,
            border: `1px solid ${pending && !send.isPending ? C.teal : C.line}`,
            background: pending && !send.isPending ? 'rgba(47,217,201,0.08)' : C.panel2,
            color: pending && !send.isPending ? C.teal : C.ink3,
            cursor: pending && !send.isPending ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
        >
          {send.isPending
            ? `sending ${batch}…`
            : pending
              ? `▶ Send next batch (${batch})`
              : '✓ All sent'}
        </button>

        {flash && (
          <div
            style={{
              marginTop: 12,
              fontFamily: C.mono,
              fontSize: 11.5,
              color: flash.startsWith('Send failed') ? C.red : C.green,
            }}
          >
            {flash}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 10, lineHeight: 1.5 }}>
          Each click sends up to {SEND_LIMIT} real cold emails from the server&apos;s{' '}
          <span style={{ color: C.ink2 }}>OUTREACH_FROM</span> identity, then marks them contacted.
          The server caps the batch; click again to continue the campaign.
        </div>
      </Card>

      <Eyebrow>
        Review sent <span style={{ color: C.ink3 }}>· {sentRecipients.length}</span>
      </Eyebrow>
      <Card style={{ maxHeight: 280, overflow: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={th}>To</th>
              <th style={th}>Business</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sentRecipients.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ ...td, color: C.ink3 }}>
                  no sends yet
                </td>
              </tr>
            ) : (
              sentRecipients.slice(0, 60).map((r) => (
                <tr key={r.id}>
                  <td style={{ ...td, fontFamily: C.mono, color: C.ink2 }}>{r.email}</td>
                  <td style={td}>{r.biz}</td>
                  <td style={td}>
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 20,
                        background: 'rgba(79,208,138,0.15)',
                        color: C.green,
                      }}
                    >
                      sent
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Eyebrow>Logs · audit trail</Eyebrow>
      <Card style={{ maxHeight: 280, overflow: 'auto' }}>
        <div style={{ fontFamily: C.mono, fontSize: 11, lineHeight: 1.7 }}>
          {(logs.data?.audit ?? []).length === 0 ? (
            <div style={{ color: C.ink3 }}>no actions yet</div>
          ) : (
            logs.data!.audit.map((line, i) => {
              const color =
                line.includes('FAILED') || line.includes('error')
                  ? C.red
                  : line.includes('send.batch') || line.includes('ok')
                    ? C.green
                    : C.ink2;
              return (
                <div key={i} style={{ color }}>
                  {line.slice(0, 160)}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        danger
        title={`Send ${batch} real cold emails`}
        body={`Send ${batch} REAL cold emails now?\n\nThey send from the server's OUTREACH_FROM identity and cannot be unsent. This continues the campaign one capped batch per click.`}
        confirmLabel={`Send ${batch}`}
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
const th: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.ink3,
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: `1px solid ${C.line}`,
  position: 'sticky',
  top: 0,
  background: C.panel,
};
const td: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: `1px solid ${C.panel2}`,
};
