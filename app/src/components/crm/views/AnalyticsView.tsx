'use client';

// CRM · Analytics (docs/outreach-crm-plan.md §8). Real numbers only:
// top cards from operator_crm_stats, a sent-vs-replies time series, per-platform
// sends, and per-campaign performance — all from ops.* via the CRM RPCs.
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalytics, useCrmStats, useCampaigns } from '../hooks';
import { C } from '@/components/operator/theme';

const RANGES = [7, 14, 30];
function pct(n: number, d: number): string {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—';
}
function fmtDay(d: string): string {
  // 'YYYY-MM-DD' → 'M/D'
  const p = d.split('-');
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : d;
}

export function AnalyticsView() {
  const [days, setDays] = useState(14);
  const statsQ = useCrmStats();
  const anaQ = useAnalytics(days);
  const campQ = useCampaigns();
  const s = statsQ.data?.stats;
  const series = anaQ.data?.timeseries ?? [];
  const byPlatform = anaQ.data?.byPlatform ?? [];
  const campaigns = campQ.data?.campaigns ?? [];

  const cards = [
    { label: 'Messages Sent', value: s ? s.sent_total.toLocaleString() : '—' },
    { label: 'Replies', value: s ? String(s.inbound_threads) : '—', accent: C.teal },
    { label: 'Reply Rate', value: s ? pct(s.inbound_threads, s.sent_total) : '—', accent: C.green },
    { label: 'Qualified', value: s ? String(s.qualified) : '—' },
    { label: 'Qualification Rate', value: s ? pct(s.qualified, s.sent_total) : '—' },
    { label: 'Conversion Rate', value: s ? pct(s.won, s.sent_total) : '—', accent: C.green },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Analytics</h2>
        <span style={{ flex: 1 }} />
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              padding: '6px 11px',
              borderRadius: 8,
              border: `1px solid ${days === r ? C.teal : C.line}`,
              background: days === r ? 'rgba(47,217,201,0.10)' : 'transparent',
              color: days === r ? C.teal : C.ink2,
              cursor: 'pointer',
            }}
          >
            {r}d
          </button>
        ))}
      </div>

      {/* top cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {cards.map((c) => (
          <div key={c.label} style={card}>
            <div style={eyebrow}>{c.label}</div>
            <div style={{ fontFamily: C.sans, fontSize: 24, fontWeight: 700, color: c.accent ?? C.ink }}>
              {statsQ.isLoading ? '…' : c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* time series */}
        <div style={card}>
          <div style={eyebrow}>Performance over time · sent vs replies</div>
          <div style={{ height: 240, marginTop: 8 }}>
            {series.every((p) => p.sent === 0 && p.replies === 0) ? (
              <Empty note="No sends yet — Mark leads as Sent in the DM Queue and this fills in." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: C.ink3, fontSize: 10 }} stroke={C.line} />
                  <YAxis allowDecimals={false} tick={{ fill: C.ink3, fontSize: 10 }} stroke={C.line} />
                  <Tooltip
                    contentStyle={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: C.ink2 }}
                    labelFormatter={fmtDay}
                  />
                  <Line type="monotone" dataKey="sent" stroke={C.teal} strokeWidth={2} dot={false} name="Sent" isAnimationActive />
                  <Line type="monotone" dataKey="replies" stroke={C.green} strokeWidth={2} dot={false} name="Replies" isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* by platform */}
        <div style={card}>
          <div style={eyebrow}>Sends by platform</div>
          <div style={{ height: 240, marginTop: 8 }}>
            {byPlatform.length === 0 || byPlatform.every((p) => p.sent === 0) ? (
              <Empty note="No sends yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlatform} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="platform" tick={{ fill: C.ink3, fontSize: 10 }} stroke={C.line} />
                  <YAxis allowDecimals={false} tick={{ fill: C.ink3, fontSize: 10 }} stroke={C.line} />
                  <Tooltip
                    contentStyle={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: 'rgba(47,217,201,0.06)' }}
                  />
                  <Bar dataKey="sent" radius={[6, 6, 0, 0]} isAnimationActive>
                    {byPlatform.map((_, i) => (
                      <Cell key={i} fill={C.teal} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* per-campaign performance */}
      <div style={card}>
        <div style={eyebrow}>Performance by campaign</div>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                {['Campaign', 'Platform', 'Assigned', 'Sent', 'Replies', 'Reply rate', 'Qualified', 'Won'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...td, color: C.ink3 }}>
                    {campQ.isLoading ? 'loading…' : 'no campaigns yet'}
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ ...td, color: C.ink }}>{c.name}</td>
                    <td style={{ ...td, textTransform: 'capitalize' }}>{c.platform}</td>
                    <td style={td}>{c.assigned}</td>
                    <td style={td}>{c.sent}</td>
                    <td style={{ ...td, color: C.teal }}>{c.replies}</td>
                    <td style={{ ...td, color: C.green }}>{pct(c.replies, c.sent)}</td>
                    <td style={td}>{c.qualified}</td>
                    <td style={{ ...td, color: C.green }}>{c.won}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, marginTop: 12 }}>
        Live from ops.outreach_messages · ops.ig_messages · ops.leads · ops.campaigns
      </div>
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontFamily: C.mono, fontSize: 11.5, color: C.ink3, textAlign: 'center', padding: 12 }}>
      {note}
    </div>
  );
}

const card: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 16,
};
const eyebrow: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: C.ink3,
  marginBottom: 6,
};
const th: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: C.ink3,
  padding: '8px 10px',
  whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  fontFamily: C.sans,
  fontSize: 12.5,
  color: C.ink2,
  padding: '8px 10px',
  whiteSpace: 'nowrap',
};
