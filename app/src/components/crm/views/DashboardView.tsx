'use client';

// CRM · Home. Matches the Outreachify mockup: greeting + metric cards (with
// change deltas) + a two-column body — Pipeline overview & Channel performance
// (left), Tasks due today & AI Agent activity (right). Numbers we have are real
// (operator_crm_stats + by_platform); sections with no data source yet (deltas,
// AI-agent activity) show ZEROES until wired — never invented.
import { useEffect, useRef, useState } from 'react';
import { Zap, ChevronDown, Send, Megaphone, Users, Inbox } from 'lucide-react';
import { useCrmStats, useAnalytics } from '../hooks';
import type { CrmView } from '../nav';
import { C } from '@/components/operator/theme';

function pct(n: number, d: number): string {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '0%';
}
const PLAT_COLOR: Record<string, string> = {
  instagram: C.teal,
  email: C.green,
  x: '#7CA8FF',
  tiktok: '#E6B24C',
  facebook: '#8B93FF',
};

export function DashboardView({ onNavigate }: { onNavigate?: (v: CrmView) => void }) {
  const statsQ = useCrmStats();
  const anaQ = useAnalytics(30);
  const s = statsQ.data?.stats;
  const platforms = anaQ.data?.byPlatform ?? [];
  const platTotal = platforms.reduce((a, p) => a + p.sent, 0);

  const cards = [
    { label: 'Leads', value: s?.total_leads },
    { label: 'Contacted', value: s?.contacted },
    { label: 'Replies', value: s?.replied, accent: C.teal },
    { label: 'Qualified', value: s?.qualified },
    { label: 'Customers', value: s?.won, accent: C.green },
  ];

  const funnel = s
    ? [
        { k: 'New', v: s.ready_to_contact, c: '#8B93FF' },
        { k: 'Contacted', v: s.contacted, c: C.teal },
        { k: 'Replied', v: s.replied, c: C.green },
        { k: 'Qualified', v: s.qualified, c: C.amber },
        { k: 'Customers', v: s.won, c: '#E0655A' },
      ]
    : [];
  const funnelTotal = funnel.reduce((a, f) => a + f.v, 0) || 1;

  // AI Agent activity — no execution engine wired yet, so all zero (honest).
  const aiActivity = [
    { label: 'Conversations handled', v: 0 },
    { label: 'Replies sent', v: 0 },
    { label: 'Positive sentiment', v: 0 },
    { label: 'Leads qualified by AI', v: 0 },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* greeting + date range + quick actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 700, color: C.ink, margin: 0 }}>
            Welcome back 👋
          </h2>
          <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, marginTop: 4 }}>
            Here&apos;s what&apos;s happening with your outreach.
          </div>
        </div>
        <DateRange />
        <QuickActions onNavigate={onNavigate} />
      </div>

      {/* metric cards with (zero) change deltas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {cards.map((c) => (
          <div key={c.label} style={card}>
            <div style={eyebrow}>{c.label}</div>
            <div style={{ fontFamily: C.sans, fontSize: 26, fontWeight: 700, color: c.accent ?? C.ink }}>
              {statsQ.isLoading ? '…' : (c.value ?? 0).toLocaleString()}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 5 }}>
              +0.0% · vs last period
            </div>
          </div>
        ))}
      </div>

      {/* two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        {/* LEFT: pipeline + channel performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={eyebrow}>Pipeline overview</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 10, borderRadius: 8, overflow: 'hidden' }}>
              {funnel.map((f) => (
                <div key={f.k} style={{ flex: Math.max(f.v, 0.5), minWidth: 66, background: C.panel2, borderTop: `2px solid ${f.c}`, padding: '12px' }}>
                  <div style={{ fontFamily: C.sans, fontSize: 17, fontWeight: 700, color: f.c }}>{f.v.toLocaleString()}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3 }}>{f.k}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ink3, marginTop: 2 }}>{pct(f.v, funnelTotal)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={eyebrow}>Channel performance · sends</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platforms.length === 0 || platTotal === 0 ? (
                <>
                  {['instagram', 'tiktok', 'x', 'facebook'].map((p) => (
                    <ChannelBar key={p} name={p} sent={0} total={0} />
                  ))}
                </>
              ) : (
                platforms.map((p) => <ChannelBar key={p.platform} name={p.platform} sent={p.sent} total={platTotal} />)
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: tasks + AI agent activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={eyebrow}>Tasks due today</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Task n={s?.ready_to_contact ?? 0} label="Ready to contact" sub="in the DM Queue" />
              <Task n={s?.followups ?? 0} label="Follow-ups due" sub="contacted, no reply yet" />
              <Task n={s?.replied ?? 0} label="Hot leads" sub="replied — need attention" accent={C.teal} />
            </div>
            <button
              onClick={() => onNavigate?.('dm-queue')}
              style={{
                width: '100%',
                marginTop: 14,
                fontFamily: C.mono,
                fontSize: 12,
                fontWeight: 600,
                padding: '10px',
                borderRadius: 10,
                border: `1px solid ${C.teal}`,
                background: 'rgba(47,217,201,0.10)',
                color: C.teal,
                cursor: 'pointer',
              }}
            >
              Open DM Queue →
            </button>
          </div>

          <div style={card}>
            <div style={eyebrow}>AI Agent activity · last 30 days</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {aiActivity.map((a) => (
                <div key={a.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${C.line}` }}>
                  <span style={{ fontFamily: C.sans, fontSize: 12, color: C.ink2 }}>{a.label}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 700, color: C.ink }}>{a.v}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3 }}>+0%</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.amber, marginTop: 10, lineHeight: 1.6 }}>
              Zero until the OpenAI Responses API is wired (docs §5). No AI agent is
              running yet, so nothing is fabricated here.
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, marginTop: 14 }}>
        Live from ops.leads · ops.outreach_messages · ops.ig_messages
      </div>
    </div>
  );
}

// Current 7-day window. Computed after mount (useEffect) to avoid an SSR/CSR
// hydration mismatch on the date.
function DateRange() {
  const [range, setRange] = useState('');
  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setRange(`${fmt(start)} – ${fmt(now)}, ${now.getFullYear()}`);
  }, []);
  return (
    <div
      style={{
        fontFamily: C.mono,
        fontSize: 11,
        color: C.ink2,
        border: `1px solid ${C.line}`,
        borderRadius: 9,
        padding: '8px 12px',
        background: C.panel2,
        whiteSpace: 'nowrap',
      }}
    >
      {range || '—'}
    </div>
  );
}

function QuickActions({ onNavigate }: { onNavigate?: (v: CrmView) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const actions: { label: string; icon: typeof Send; view: CrmView }[] = [
    { label: 'Open DM Queue', icon: Send, view: 'dm-queue' },
    { label: 'New campaign', icon: Megaphone, view: 'campaigns' },
    { label: 'View leads', icon: Users, view: 'leads' },
    { label: 'Open inbox', icon: Inbox, view: 'inbox' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: C.mono,
          fontSize: 11.5,
          fontWeight: 600,
          padding: '8px 13px',
          borderRadius: 9,
          border: `1px solid ${C.teal}`,
          background: 'rgba(47,217,201,0.10)',
          color: C.teal,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Zap size={13} /> Quick actions <ChevronDown size={13} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            zIndex: 30,
            minWidth: 180,
            background: C.panel,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.view}
                onClick={() => { setOpen(false); onNavigate?.(a.view); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: C.sans,
                  fontSize: 12.5,
                  color: C.ink2,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.panel2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon size={14} /> {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChannelBar({ name, sent, total }: { name: string; sent: number; total: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: C.ink2, textTransform: 'capitalize' }}>{name}</span>
        <span style={{ color: C.ink3 }}>{pct(sent, total)} ({sent})</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: C.panel2, overflow: 'hidden' }}>
        <div style={{ width: pct(sent, total), height: '100%', background: PLAT_COLOR[name] ?? C.teal, transition: 'width 400ms' }} />
      </div>
    </div>
  );
}

function Task({ n, label, sub, accent }: { n: number; label: string; sub: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 700, color: accent ?? C.ink, width: 44 }}>{n}</div>
      <div>
        <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{label}</div>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3 }}>{sub}</div>
      </div>
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
};
