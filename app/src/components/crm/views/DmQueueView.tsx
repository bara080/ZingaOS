'use client';

// CRM · DM Queue — the priority surface (docs/outreach-crm-plan.md §1).
// Three columns: Lead Queue | Selected Lead + Message | Conversation/Activity.
// Reads REAL leads from ops.leads (filtered to DM-able handles). The AI message
// is a Zinga-voice template derived from real lead fields — the `// TODO` seam
// swaps it for the OpenAI Responses API. Manual send is first-class: Copy + Open
// Instagram, then Mark as Sent advances the queue.
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Copy, Check, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLeads, useMarkSent, useCrmStats } from '../hooks';
import { draftDm, leadHandle, leadName, type Lead } from '../api';
import { C } from '@/components/operator/theme';

// Warming / ban-safety cap on manual IG DMs per day (see docs/outreach-crm-plan.md).
// Start conservative; raise deliberately as the account warms.
const DAILY_DM_CAP = 40;

type QueueTab = 'all' | 'new' | 'contacted' | 'followup';

function tabMatch(tab: QueueTab, l: Lead): boolean {
  const s = (l.stage || 'scraped').toLowerCase();
  if (tab === 'all') return true;
  if (tab === 'new') return s === 'scraped' || s === 'prospect' || s === 'new';
  if (tab === 'contacted') return s === 'contacted';
  if (tab === 'followup') return s === 'contacted' && !l.replied_at;
  return true;
}

export function DmQueueView() {
  const query = useLeads();
  // DM queue = leads that actually have an Instagram handle to message.
  const dmable = useMemo(
    () => (query.data?.leads ?? []).filter((l) => !!l.instagram),
    [query.data],
  );

  const statsQ = useCrmStats();
  const sentToday = statsQ.data?.stats?.sent_today ?? 0; // server truth (persisted)
  const capReached = sentToday >= DAILY_DM_CAP;

  const [tab, setTab] = useState<QueueTab>('all');
  const [search, setSearch] = useState('');
  const [idx, setIdx] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return dmable.filter(
      (l) =>
        tabMatch(tab, l) &&
        (!s ||
          leadName(l).toLowerCase().includes(s) ||
          (l.instagram || '').toLowerCase().includes(s)),
    );
  }, [dmable, tab, search]);

  const clampedIdx = Math.min(idx, Math.max(0, list.length - 1));
  const lead = list[clampedIdx] as Lead | undefined;

  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendMode, setSendMode] = useState<'manual' | 'api' | 'autopilot'>('manual');
  const [flash, setFlash] = useState<string | null>(null);
  const mark = useMarkSent();

  // Regenerate the draft whenever the selected lead changes.
  useEffect(() => {
    setMessage(lead ? draftDm(lead) : '');
    setCopied(false);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = () => setIdx((i) => Math.min(i + 1, list.length - 1));

  const markSent = () => {
    if (!lead || mark.isPending) return;
    if (capReached) {
      setFlash(`Daily cap reached (${DAILY_DM_CAP}) — protect the account, resume tomorrow.`);
      return;
    }
    const id = lead.id;
    setFlash(null);
    mark.mutate(
      { leadId: id, platform: 'instagram', sendMode, message },
      {
        onSuccess: () => {
          // Persisted server-side: outreach_messages row + stage → contacted + audit.
          // sent_today refreshes via the stats query invalidation.
          setSentIds((prev) => new Set(prev).add(id));
          setFlash('Marked sent ✓');
          if (autoAdvance) advance();
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const copyAndOpen = async () => {
    if (!lead) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      /* clipboard blocked — the textarea is still selectable */
    }
    const handle = (lead.instagram || '').replace(/^@/, '');
    if (handle) window.open(`https://instagram.com/${handle}`, '_blank', 'noopener');
  };

  const tabs: { key: QueueTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'followup', label: 'Follow-up' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* header: progress + auto-advance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>
          DM Queue
        </h2>
        <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3 }}>
          {list.length} queued ·{' '}
          <span style={{ color: capReached ? C.amber : C.ink2 }}>
            {sentToday}/{DAILY_DM_CAP} sent today
          </span>
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ fontFamily: C.mono, fontSize: 11, color: C.ink2, display: 'flex', gap: 7, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
          Auto-advance
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: 14, alignItems: 'start' }}>
        {/* ── col 1: queue ─────────────────────────────────────────── */}
        <div style={colCard}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setIdx(0); }}
                style={{
                  fontFamily: C.mono,
                  fontSize: 10.5,
                  padding: '5px 9px',
                  borderRadius: 7,
                  border: `1px solid ${tab === t.key ? C.teal : C.line}`,
                  background: tab === t.key ? 'rgba(47,217,201,0.10)' : 'transparent',
                  color: tab === t.key ? C.teal : C.ink2,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIdx(0); }}
            placeholder="Search queue…"
            style={{ ...fieldStyle, width: '100%', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 460, overflowY: 'auto' }}>
            {query.isLoading ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
            ) : list.length === 0 ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>
                no DM-able leads (need an Instagram handle)
              </div>
            ) : (
              list.map((l, i) => {
                const on = i === clampedIdx;
                const sent = sentIds.has(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => setIdx(i)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 9px',
                      borderRadius: 8,
                      border: `1px solid ${on ? C.teal : C.line}`,
                      background: on ? 'rgba(47,217,201,0.08)' : C.panel2,
                      cursor: 'pointer',
                      opacity: sent ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontFamily: C.sans, fontSize: 12.5, color: on ? C.teal : C.ink, fontWeight: 600 }}>
                      {leadName(l)} {sent && <span style={{ color: C.green }}>✓</span>}
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>
                      {leadHandle(l)} · {l.borough || l.category || '—'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── col 2: selected lead + message ───────────────────────── */}
        <div style={colCard}>
          {!lead ? (
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.ink3, padding: 20 }}>
              Pick a lead from the queue.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: C.sans, fontSize: 16, fontWeight: 700, color: C.ink }}>
                  {leadName(lead)}
                </div>
                {leadHandle(lead) && (
                  <a
                    href={`https://instagram.com/${(lead.instagram || '').replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: C.mono, fontSize: 12, color: C.teal, textDecoration: 'none', display: 'inline-flex', gap: 4, alignItems: 'center' }}
                  >
                    {leadHandle(lead)} <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 14px' }}>
                {[lead.category, lead.borough, lead.source].filter(Boolean).map((t, i) => (
                  <span key={i} style={chipStyle}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 18, marginBottom: 16, flexWrap: 'wrap' }}>
                <Stat label="Reviews" value={lead.reviews != null ? String(lead.reviews) : '—'} />
                <Stat label="Stage" value={lead.stage || 'scraped'} />
                <Stat label="Email" value={lead.email ? '✓' : '—'} />
                <Stat label="Website" value={lead.website ? '✓' : '—'} />
              </div>

              <label style={eyebrow}>AI-generated message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ ...fieldStyle, width: '100%', minHeight: 110, resize: 'vertical', lineHeight: 1.55, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <MsgChip label="Regenerate" onClick={() => setMessage(draftDm(lead))} />
                <MsgChip label="Shorter" onClick={() => setMessage((m) => m.split('. ')[0].replace(/\.?$/, '.'))} />
                <MsgChip label="Casual" onClick={() => setMessage((m) => (m.startsWith('Hey') ? m : `Hey 👋 ${m}`))} />
                <MsgChip label="Formal" onClick={() => setMessage((m) => m.replace(/^Hey!?\s*👋?\s*/i, 'Hello, '))} />
              </div>

              <label style={eyebrow}>Send method</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {([
                  ['manual', 'Manual'],
                  ['api', 'API'],
                  ['autopilot', 'AI Autopilot'],
                ] as const).map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setSendMode(k)}
                    disabled={k !== 'manual'}
                    title={k !== 'manual' ? 'Not available for Instagram (Meta 24h rule) — build-up step' : ''}
                    style={{
                      flex: 1,
                      fontFamily: C.mono,
                      fontSize: 11.5,
                      padding: '9px 8px',
                      borderRadius: 8,
                      border: `1px solid ${sendMode === k ? C.teal : C.line}`,
                      background: sendMode === k ? 'rgba(47,217,201,0.08)' : C.panel2,
                      color: k !== 'manual' ? C.ink3 : sendMode === k ? C.teal : C.ink2,
                      cursor: k === 'manual' ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyAndOpen} style={{ ...actionBtn(false), flex: 1 }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} Copy + Open Instagram
                </button>
                <button
                  onClick={markSent}
                  disabled={mark.isPending || capReached}
                  title={capReached ? `Daily cap reached (${DAILY_DM_CAP})` : ''}
                  style={{
                    ...actionBtn(true),
                    flex: 1,
                    opacity: capReached ? 0.5 : 1,
                    cursor: capReached ? 'not-allowed' : mark.isPending ? 'wait' : 'pointer',
                  }}
                >
                  <Check size={14} /> {capReached ? 'Daily cap reached' : mark.isPending ? 'Saving…' : 'Mark as Sent'}
                </button>
              </div>
              {flash && (
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: flash.startsWith('Failed') ? C.red : C.green,
                  }}
                >
                  {flash}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── col 3: conversation / activity ───────────────────────── */}
        <div style={colCard}>
          <label style={eyebrow}>Conversation</label>
          <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, padding: '18px 4px', textAlign: 'center', lineHeight: 1.6 }}>
            No conversation yet. Replies from @zingaapp land here once the inbox is
            wired to ops.ig_messages (build-up step).
          </div>
        </div>
      </div>

      {/* footer: nav controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 18 }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} style={navBtn}>
          <ChevronLeft size={14} /> Previous
        </button>
        <button onClick={advance} style={navBtn}>
          <SkipForward size={14} /> Skip
        </button>
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>
          {list.length ? clampedIdx + 1 : 0} / {list.length}
        </span>
        <button onClick={advance} style={{ ...navBtn, borderColor: C.teal, color: C.teal }}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 700, color: C.ink, textTransform: 'capitalize' }}>{value}</div>
      <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink3 }}>{label}</div>
    </div>
  );
}

function MsgChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: C.mono,
        fontSize: 10.5,
        padding: '5px 10px',
        borderRadius: 7,
        border: `1px solid ${C.line}`,
        background: C.panel2,
        color: C.ink2,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const colCard: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 14,
  minHeight: 200,
};
const eyebrow: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.ink3,
  display: 'block',
  marginBottom: 7,
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
const chipStyle: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 10.5,
  color: C.ink2,
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  padding: '3px 8px',
  textTransform: 'capitalize',
};
function actionBtn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    fontFamily: C.mono,
    fontSize: 12,
    fontWeight: 600,
    padding: '11px 12px',
    borderRadius: 10,
    border: `1px solid ${primary ? C.teal : C.line}`,
    background: primary ? 'rgba(47,217,201,0.10)' : C.panel2,
    color: primary ? C.teal : C.ink2,
    cursor: 'pointer',
  };
}
const navBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: C.mono,
  fontSize: 11.5,
  padding: '8px 14px',
  borderRadius: 9,
  border: `1px solid ${C.line}`,
  background: C.panel2,
  color: C.ink2,
  cursor: 'pointer',
};
