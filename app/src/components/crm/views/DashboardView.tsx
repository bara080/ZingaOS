'use client';

// CRM · Dashboard — operational cards, all real (operator_crm_stats over
// ops.leads + ops.outreach_messages + ops.ig_messages). No vanity numbers.
import { useCrmStats } from '../hooks';
import { C } from '@/components/operator/theme';

function pct(n: number, d: number): string {
  if (!d) return '—';
  return `${((n / d) * 100).toFixed(1)}%`;
}

export function DashboardView() {
  const q = useCrmStats();
  const s = q.data?.stats;

  const cards: { label: string; value: string; hint?: string; accent?: string }[] = [
    { label: 'Ready to Contact', value: s ? s.ready_to_contact.toLocaleString() : '—', hint: 'emailable / DM-able, pre-contact' },
    { label: 'Sent Today', value: s ? String(s.sent_today) : '—', hint: 'outreach_messages today', accent: C.teal },
    { label: 'Sent (total)', value: s ? s.sent_total.toLocaleString() : '—' },
    { label: 'Replies', value: s ? String(s.inbound_threads) : '—', hint: 'inbound IG conversations' },
    { label: 'Reply Rate', value: s ? pct(s.inbound_threads, s.sent_total) : '—', accent: C.green },
    { label: 'Qualified', value: s ? String(s.qualified) : '—' },
    { label: 'Conversions', value: s ? String(s.won) : '—', accent: C.green },
  ];

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 16px' }}>
        Dashboard
      </h2>

      {q.isError ? (
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
          {q.error instanceof Error ? q.error.message : 'failed to load stats'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                background: 'rgba(18,21,28,0.5)',
                padding: '16px 16px 14px',
              }}
            >
              <div
                style={{
                  fontFamily: C.mono,
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.ink3,
                  marginBottom: 8,
                }}
              >
                {c.label}
              </div>
              <div style={{ fontFamily: C.sans, fontSize: 26, fontWeight: 700, color: c.accent ?? C.ink }}>
                {q.isLoading ? '…' : c.value}
              </div>
              {c.hint && (
                <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 6 }}>{c.hint}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* pipeline strip */}
      {s && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink3, marginBottom: 8 }}>
            Pipeline
          </div>
          <div style={{ display: 'flex', gap: 2, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.line}` }}>
            {[
              { k: 'Ready', v: s.ready_to_contact, c: C.ink3 },
              { k: 'Contacted', v: s.contacted, c: C.amber },
              { k: 'Replied', v: s.inbound_threads, c: C.teal },
              { k: 'Qualified', v: s.qualified, c: C.green },
              { k: 'Won', v: s.won, c: C.green },
            ].map((seg) => (
              <div key={seg.k} style={{ flex: Math.max(seg.v, 0.4), background: C.panel2, padding: '10px 12px' }}>
                <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 700, color: seg.c }}>{seg.v}</div>
                <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3 }}>{seg.k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, marginTop: 14 }}>
        Live from ops.leads · ops.outreach_messages · ops.ig_messages
      </div>
    </div>
  );
}
