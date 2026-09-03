'use client';

// CRM · Campaigns (docs/outreach-crm-plan.md §4). A campaign is a saved lead
// segment (by source) + config; metrics are computed LIVE from ops.leads. Left:
// campaign list with real Assigned/Sent/Replies/Reply-rate + pause/resume.
// Right: create builder (Setup → Audience → Delivery → create).
import { useState } from 'react';
import { Play, Pause, Instagram, Mail, Music2, Twitter, Facebook, Send } from 'lucide-react';
import { useCampaigns, useSegments, useCampaignCreate, useCampaignSetStatus } from '../hooks';
import type { Campaign } from '../api';
import { Pager, usePager } from '../Pager';
import { EmailCampaigns } from './EmailCampaigns';
import { C } from '@/components/operator/theme';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'tiktok', label: 'TikTok', icon: Music2 },
  { key: 'x', label: 'X', icon: Twitter },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
];
function platformIcon(p: string) {
  return (PLATFORMS.find((x) => x.key === p)?.icon) ?? Instagram;
}
function rate(n: number, d: number): string {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—';
}

export function CampaignsView() {
  const [channel, setChannel] = useState<'social' | 'email'>('social');
  const listQ = useCampaigns();
  const segsQ = useSegments();
  const create = useCampaignCreate();
  const setStatus = useCampaignSetStatus();
  const campaigns = listQ.data?.campaigns ?? [];
  const pager = usePager(campaigns, 6, campaigns.length);

  // create-form state
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [goal, setGoal] = useState('Book demo');
  const [source, setSource] = useState('all');
  const [sendMode, setSendMode] = useState('manual');
  const [dailyLimit, setDailyLimit] = useState(40);
  const [flash, setFlash] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim() || create.isPending) return;
    setFlash(null);
    create.mutate(
      { name: name.trim(), platform, goal, source, sendMode, dailyLimit },
      {
        onSuccess: () => {
          setFlash('Campaign created ✓');
          setName('');
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Campaigns</h2>
        <div style={{ display: 'flex', gap: 4, border: `1px solid ${C.line}`, borderRadius: 9, padding: 3 }}>
          {([['social', 'Social / DM', Instagram], ['email', 'Email', Send]] as const).map(([k, lbl, Icon]) => {
            const on = channel === k;
            return (
              <button
                key={k}
                onClick={() => setChannel(k)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? C.teal : C.ink2, background: on ? 'rgba(47,217,201,0.10)' : 'transparent', border: `1px solid ${on ? C.teal : 'transparent'}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}
              >
                <Icon size={13} /> {lbl}
              </button>
            );
          })}
        </div>
      </div>

      {channel === 'email' ? (
        <EmailCampaigns />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* ── list ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listQ.isError ? (
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
              {listQ.error instanceof Error ? listQ.error.message : 'failed to load campaigns'}
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ ...card, color: C.ink3, fontFamily: C.mono, fontSize: 12 }}>
              {listQ.isLoading ? 'loading…' : 'No campaigns yet — create one on the right.'}
            </div>
          ) : (
            pager.slice.map((c: Campaign) => {
              const Icon = platformIcon(c.platform);
              const active = c.status === 'active';
              return (
                <div key={c.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.teal }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink }}>{c.name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, textTransform: 'capitalize' }}>
                        {c.platform} · {c.send_mode} · {c.source ?? 'all sources'}{c.goal ? ` · ${c.goal}` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 10,
                        color: active ? C.green : C.amber,
                        border: `1px solid ${active ? C.green : C.amber}`,
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      {active ? 'Active' : 'Paused'}
                    </span>
                    <button
                      onClick={() => setStatus.mutate({ id: c.id, status: active ? 'paused' : 'active' })}
                      disabled={setStatus.isPending}
                      title={active ? 'Pause' : 'Resume'}
                      style={{ ...iconBtn, color: active ? C.amber : C.green }}
                    >
                      {active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    <Metric label="Assigned" value={c.assigned} />
                    <Metric label="Ready" value={c.ready} />
                    <Metric label="Sent" value={c.sent} />
                    <Metric label="Replies" value={c.replies} accent={C.teal} />
                    <Metric label="Reply rate" text={rate(c.replies, c.sent)} accent={C.green} />
                    <Metric label="Qualified" value={c.qualified} />
                    <Metric label="Won" value={c.won} accent={C.green} />
                  </div>
                </div>
              );
            })
          )}
          <Pager p={pager} noun="campaigns" />
        </div>

        {/* ── create builder ───────────────────────────────────────── */}
        <div style={card}>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
            Create campaign
          </div>

          <Field label="Setup · Campaign name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="IG Salons NYC" style={input} />
          </Field>

          <Field label="Platform">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLATFORMS.map((p) => {
                const on = platform === p.key;
                const Icon = p.icon;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    style={{ ...pill(on), display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Icon size={12} /> {p.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Goal">
            <select value={goal} onChange={(e) => setGoal(e.target.value)} style={input}>
              {['Book demo', 'Get listed', 'Start conversation', 'Re-engage'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>

          <Field label="Audience · Lead segment (source)">
            <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
              <option value="all">All sources</option>
              {(segsQ.data?.segments ?? []).map((s) => (
                <option key={s.source} value={s.source}>
                  {s.source} ({s.n})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Delivery · Send mode">
            <div style={{ display: 'flex', gap: 6 }}>
              {['manual', 'api', 'autopilot'].map((m) => (
                <button key={m} onClick={() => setSendMode(m)} style={{ ...pill(sendMode === m), flex: 1, textTransform: 'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Daily limit">
            <input
              type="number"
              min={1}
              max={500}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              style={input}
            />
          </Field>

          <button
            onClick={submit}
            disabled={!name.trim() || create.isPending}
            style={{
              width: '100%',
              marginTop: 6,
              fontFamily: C.mono,
              fontSize: 12.5,
              fontWeight: 600,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${name.trim() ? C.teal : C.line}`,
              background: name.trim() ? 'rgba(47,217,201,0.10)' : C.panel2,
              color: name.trim() ? C.teal : C.ink3,
              cursor: name.trim() && !create.isPending ? 'pointer' : 'not-allowed',
            }}
          >
            {create.isPending ? 'Creating…' : 'Create campaign'}
          </button>
          {flash && (
            <div style={{ marginTop: 10, fontFamily: C.mono, fontSize: 11, color: flash.startsWith('Failed') ? C.red : C.green }}>
              {flash}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function Metric({ label, value, text, accent }: { label: string; value?: number; text?: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 700, color: accent ?? C.ink }}>
        {text ?? (value ?? 0)}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.ink3 }}>{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 16,
};
const input: React.CSSProperties = {
  width: '100%',
  fontFamily: C.mono,
  fontSize: 12.5,
  padding: '9px 11px',
  borderRadius: 9,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
};
function pill(on: boolean): React.CSSProperties {
  return {
    fontFamily: C.mono,
    fontSize: 11,
    padding: '7px 11px',
    borderRadius: 8,
    border: `1px solid ${on ? C.teal : C.line}`,
    background: on ? 'rgba(47,217,201,0.10)' : C.panel2,
    color: on ? C.teal : C.ink2,
    cursor: 'pointer',
  };
}
const iconBtn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid ${C.line}`,
  background: C.panel2,
  cursor: 'pointer',
};
