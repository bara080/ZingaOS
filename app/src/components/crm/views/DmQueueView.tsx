'use client';

// CRM · DM Queue — the priority surface (docs/outreach-crm-plan.md §1).
// Three columns: Lead Queue | Selected Lead + Message | Conversation/Activity.
// Reads REAL leads from ops.leads (filtered to DM-able handles). The AI message
// is a Zinga-voice template derived from real lead fields — the `// TODO` seam
// swaps it for the OpenAI Responses API. Manual send is first-class: Copy + Open
// Instagram, then Mark as Sent advances the queue.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Copy, Check, SkipForward, ChevronLeft, ChevronRight, MoreVertical, MinusCircle, Trash2, Ban } from 'lucide-react';
import { useLeads, useMarkSent, useCrmStats, useLeadActivity, useAgents, useDmDraft, useLeadAction } from '../hooks';
import { draftDm, fillTemplate, leadHandle, leadName, type Lead } from '../api';
import { DAILY_DM_CAP } from '../channels';
import { C } from '@/components/operator/theme';

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
  const leadAction = useLeadAction();
  // Optimistic: hide rows the operator just skipped/deleted/blocked before refetch.
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  // DM queue = leads with an IG handle, excluding ones skipped or just-removed.
  const dmable = useMemo(
    () =>
      (query.data?.leads ?? []).filter(
        (l) => !!l.instagram && (l.stage || '').toLowerCase() !== 'skipped' && !hiddenIds.has(l.id),
      ),
    [query.data, hiddenIds],
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
  // Once the operator customizes the message (edit / tone chip / Custom / Regenerate)
  // it becomes a SHARED template that persists across the whole queue — every lead
  // shows it, so a custom message affects all, not just the current IG. Until then,
  // each lead shows the default draft. "Reset to default" clears this.
  const [customized, setCustomized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [sendMode, setSendMode] = useState<'manual' | 'api' | 'autopilot'>('manual');
  const [flash, setFlash] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'agent' | 'conversation' | 'profile' | 'activity'>('agent');
  const mark = useMarkSent();
  const activityQ = useLeadActivity(lead?.id ?? null, rightTab === 'activity');
  const agentsQ = useAgents();
  const activeAgent = (agentsQ.data?.agents ?? []).find((a) => a.enabled) ?? null;
  const dmDraft = useDmDraft();

  // Regenerate via the LLM. With no instruction → a fresh first-touch draft. With
  // an instruction (Shorter / Casual / Formal / a typed Custom steer) → the LLM
  // rewrites the CURRENT message per that instruction. Dynamic, not string hacks.
  const regenerate = (instruction?: string) => {
    if (!lead || dmDraft.isPending) return;
    dmDraft.mutate(
      {
        name: leadName(lead),
        business: lead.business ?? undefined,
        category: lead.category ?? undefined,
        borough: lead.borough ?? undefined,
        instruction,
        base: instruction ? message : undefined,
      },
      { onSuccess: (r) => { setMessage(r.draft); setCustomized(true); } },
    );
  };

  // When the selected lead changes: keep the shared custom message if the operator
  // has customized it (so it applies to every lead); otherwise show this lead's
  // default draft.
  useEffect(() => {
    if (!customized) setMessage(lead ? draftDm() : '');
    setCopied(false);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The message the operator writes is a TEMPLATE (may contain {username} etc.).
  // `resolved` is what actually gets copied/sent for the CURRENT lead — the same
  // template personalizes for every IG. `hasVars` drives the per-lead preview.
  const resolved = lead ? fillTemplate(message, lead) : message;
  const hasVars = /\{\w+\}/.test(message);

  const advance = () => setIdx((i) => Math.min(i + 1, list.length - 1));

  // ⋮ menu — skip (remove from queue) / delete lead / block+denylist handle.
  const runLeadAction = (target: Lead, action: 'skip' | 'delete' | 'block') => {
    if (leadAction.isPending) return;
    const handle = (target.instagram || '').replace(/^@/, '').trim();
    // Optimistically drop it from the queue immediately.
    setHiddenIds((prev) => new Set(prev).add(target.id));
    leadAction.mutate(
      { id: target.id, action, handle: action === 'block' ? handle : undefined },
      {
        onSuccess: (r) => {
          setFlash(
            action === 'skip'
              ? 'Removed from queue'
              : action === 'delete'
                ? 'Lead deleted'
                : `Blocked @${handle} — ${r.removed} removed, future scrapes will skip it`,
          );
        },
        onError: (e) => {
          // Roll back the optimistic hide on failure.
          setHiddenIds((prev) => {
            const n = new Set(prev);
            n.delete(target.id);
            return n;
          });
          setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`);
        },
      },
    );
  };

  // Queue pagination — page is derived from the selected index so paging and
  // lead-navigation stay in sync (Skip/Next can roll onto the next page).
  const PAGE = 8;
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.floor(clampedIdx / PAGE);
  const pageStart = page * PAGE;
  const pageLeads = list.slice(pageStart, pageStart + PAGE);
  const gotoPage = (p: number) => setIdx(Math.min(Math.max(p, 0), pageCount - 1) * PAGE);

  const markSent = () => {
    if (!lead || mark.isPending) return;
    if (capReached) {
      setFlash(`Daily cap reached (${DAILY_DM_CAP}) — protect the account, resume tomorrow.`);
      return;
    }
    const id = lead.id;
    setFlash(null);
    mark.mutate(
      { leadId: id, platform: 'instagram', sendMode, message: resolved },
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
      await navigator.clipboard.writeText(resolved);
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 320px', gap: 14, alignItems: 'start' }}>
        {/* ── col 1: queue ─────────────────────────────────────────── */}
        <div style={{ ...colCard, display: 'flex', flexDirection: 'column', maxHeight: 520 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {query.isLoading ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
            ) : list.length === 0 ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>
                no DM-able leads (need an Instagram handle)
              </div>
            ) : (
              pageLeads.map((l, pi) => {
                const i = pageStart + pi;
                const on = i === clampedIdx;
                const sent = sentIds.has(l.id);
                return (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 6px 4px 9px',
                      borderRadius: 8,
                      border: `1px solid ${on ? C.teal : C.line}`,
                      background: on ? 'rgba(47,217,201,0.08)' : C.panel2,
                      opacity: sent ? 0.5 : 1,
                    }}
                  >
                    <button
                      onClick={() => setIdx(i)}
                      style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer' }}
                    >
                      <div style={{ fontFamily: C.sans, fontSize: 12.5, color: on ? C.teal : C.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leadName(l)} {sent && <span style={{ color: C.green }}>✓</span>}
                      </div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leadHandle(l)} · {l.borough || l.category || '—'}
                      </div>
                    </button>
                    <QueueRowMenu lead={l} busy={leadAction.isPending} onAction={runLeadAction} />
                  </div>
                );
              })
            )}
          </div>

          {/* queue pagination */}
          {list.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>
                {pageStart + 1}–{Math.min(pageStart + PAGE, list.length)} of {list.length}
              </span>
              <span style={{ flex: 1 }} />
              <button onClick={() => gotoPage(page - 1)} disabled={page === 0} style={pageBtn(page === 0)}>
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink2 }}>{page + 1}/{pageCount}</span>
              <button onClick={() => gotoPage(page + 1)} disabled={page >= pageCount - 1} style={pageBtn(page >= pageCount - 1)}>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
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

              <label style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 8 }}>
                Message
                {customized && (
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.teal, border: `1px solid ${C.teal}`, borderRadius: 5, padding: '1px 6px' }}>
                    applies to all leads
                  </span>
                )}
              </label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setCustomized(true); }}
                style={{ ...fieldStyle, width: '100%', minHeight: 110, resize: 'vertical', lineHeight: 1.55, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: customOpen ? 8 : 14 }}>
                <MsgChip label={dmDraft.isPending ? 'Generating…' : '✨ Regenerate'} onClick={() => regenerate()} disabled={dmDraft.isPending} />
                <MsgChip label="Shorter" onClick={() => regenerate('Make it noticeably shorter and more concise — 1–2 short sentences.')} disabled={dmDraft.isPending} />
                <MsgChip label="Casual" onClick={() => regenerate('Make the tone more casual, warm and friendly.')} disabled={dmDraft.isPending} />
                <MsgChip label="Formal" onClick={() => regenerate('Make the tone more formal and professional.')} disabled={dmDraft.isPending} />
                <MsgChip label={customOpen ? '✕ Custom' : '✎ Custom'} onClick={() => setCustomOpen((o) => !o)} active={customOpen} />
                {customized && (
                  <MsgChip
                    label="↺ Reset"
                    onClick={() => {
                      setCustomized(false);
                      setCustomOpen(false);
                      setCustomText('');
                      setMessage(lead ? draftDm() : '');
                    }}
                  />
                )}
              </div>
              {customOpen && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customText.trim() && !dmDraft.isPending) regenerate(customText.trim());
                    }}
                    placeholder="Tell the agent what you want — e.g. “mention weekend slots, keep it 2 lines”"
                    style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
                  />
                  <button
                    onClick={() => customText.trim() && regenerate(customText.trim())}
                    disabled={dmDraft.isPending || !customText.trim()}
                    style={{
                      fontFamily: C.mono,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: `1px solid ${C.teal}`,
                      background: 'rgba(47,217,201,0.10)',
                      color: C.teal,
                      whiteSpace: 'nowrap',
                      cursor: dmDraft.isPending || !customText.trim() ? 'default' : 'pointer',
                      opacity: dmDraft.isPending || !customText.trim() ? 0.6 : 1,
                    }}
                  >
                    {dmDraft.isPending ? 'Generating…' : '✨ Rewrite'}
                  </button>
                </div>
              )}

              {/* Merge-variable hint + per-lead preview (what actually gets sent) */}
              <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginBottom: hasVars ? 8 : 14, lineHeight: 1.5 }}>
                Variables:{' '}
                <span style={{ color: C.teal }}>{'{username}'}</span>{' '}
                <span style={{ color: C.ink2 }}>{'{name}'} {'{borough}'} {'{category}'}</span>
                {' '}— filled per lead.
              </div>
              {hasVars && lead && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...eyebrow, marginBottom: 5 }}>Preview · @{leadHandle(lead)?.replace(/^@/, '') || 'this lead'}</div>
                  <div
                    style={{
                      fontFamily: C.sans,
                      fontSize: 12.5,
                      color: C.ink2,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      background: 'rgba(47,217,201,0.05)',
                      padding: '9px 11px',
                    }}
                  >
                    {resolved}
                  </div>
                </div>
              )}

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

        {/* ── col 3: conversation / profile / activity ─────────────── */}
        <div style={colCard}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['agent', 'conversation', 'profile', 'activity'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                style={{
                  flex: 1,
                  fontFamily: C.mono,
                  fontSize: 10.5,
                  padding: '6px 4px',
                  borderRadius: 7,
                  border: `1px solid ${rightTab === t ? C.teal : C.line}`,
                  background: rightTab === t ? 'rgba(47,217,201,0.10)' : 'transparent',
                  color: rightTab === t ? C.teal : C.ink2,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {!lead ? (
            <div style={rightEmpty}>Pick a lead.</div>
          ) : rightTab === 'agent' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={agentEyebrow}>Assigned agent</div>
                <div style={{ fontFamily: C.sans, fontSize: 12.5, color: activeAgent ? C.teal : C.ink3 }}>
                  {activeAgent ? activeAgent.name : 'none enabled — configure in AI Agents'}
                </div>
              </div>
              <div>
                <div style={agentEyebrow}>Next best action</div>
                <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink }}>{nextBestAction(lead)}</div>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, marginTop: 3 }}>
                  confidence {confidence(lead)} · rule-based
                </div>
              </div>
              <div>
                <div style={agentEyebrow}>Retrieval context (RAG)</div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontFamily: C.mono, fontSize: 10.5, color: C.ink2, lineHeight: 1.7 }}>
                  <li>Zinga company + voice (context/*.md)</li>
                  <li>Lead profile — {lead.category || 'category'} · {lead.borough || 'NYC'}</li>
                  <li>Prior activity ({activityQ.data?.activity?.length ?? 0} sends)</li>
                  <li>Conversation history (ops.ig_messages)</li>
                </ul>
              </div>
              <div
                style={{
                  fontFamily: C.mono,
                  fontSize: 10,
                  color: C.amber,
                  border: `1px solid ${C.line}`,
                  borderRadius: 9,
                  background: 'rgba(230,178,76,0.06)',
                  padding: 10,
                  lineHeight: 1.6,
                }}
              >
                Reasoning is rule-based. Wire the OpenAI Responses API + a vector store
                over the sources above to make this a generative RAG agent (docs
                §5 / AI-SDR). The backend owns tools + permissions; the model only
                requests permitted actions.
              </div>
            </div>
          ) : rightTab === 'conversation' ? (
            <div style={rightEmpty}>
              No conversation yet. Replies from @zingaapp appear in the Inbox once
              this lead messages back (24h window).
            </div>
          ) : rightTab === 'profile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ProfRow k="Business" v={lead.business} />
              <ProfRow k="Owner" v={lead.owner} />
              <ProfRow k="Handle" v={leadHandle(lead)} accent={C.teal} />
              <ProfRow k="Email" v={lead.email} />
              <ProfRow k="Phone" v={lead.phone} />
              <ProfRow k="Website" v={lead.website} />
              <ProfRow k="Category" v={lead.category} />
              <ProfRow k="Borough" v={lead.borough} />
              <ProfRow k="Source" v={lead.source} />
              <ProfRow k="Stage" v={lead.stage} />
              <ProfRow k="Reviews" v={lead.reviews != null ? String(lead.reviews) : null} />
              <ProfRow k="Contacted" v={lead.contacted_at} />
              {lead.notes && (
                <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 10.5, color: C.ink3, lineHeight: 1.6 }}>
                  <div style={{ color: C.ink2, marginBottom: 3 }}>Notes</div>
                  {lead.notes}
                </div>
              )}
            </div>
          ) : (
            // activity
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activityQ.isLoading ? (
                <div style={rightEmpty}>loading…</div>
              ) : (activityQ.data?.activity ?? []).length === 0 ? (
                <div style={rightEmpty}>
                  No sends logged yet. Mark this lead as Sent and it appears here.
                </div>
              ) : (
                (activityQ.data?.activity ?? []).map((a) => (
                  <div key={a.id} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', background: C.panel2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontFamily: C.mono, fontSize: 10.5, color: C.teal, textTransform: 'capitalize' }}>
                        {a.platform} · {a.send_mode}
                      </span>
                      <span style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3 }}>
                        {new Date(a.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.message && (
                      <div style={{ fontFamily: C.sans, fontSize: 11.5, color: C.ink2, marginTop: 4, lineHeight: 1.4 }}>
                        {a.message.length > 90 ? `${a.message.slice(0, 88)}…` : a.message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
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

// Rule-based next-best-action + confidence, derived from the lead's real stage.
// This is the deterministic stand-in for the AI-SDR agent until OpenAI + RAG
// are wired (docs/outreach-crm-plan.md §5).
function nextBestAction(l: Lead): string {
  const s = (l.stage || 'scraped').toLowerCase();
  if (s === 'replied' || l.replied_at) return 'Qualify — ask a discovery question';
  if (s === 'contacted') return 'Wait for reply · follow up in 3 days if silent';
  if (s === 'qualified') return 'Book a demo / send the listing link';
  if (s === 'scraped' || s === 'prospect' || s === 'new')
    return l.instagram ? 'Send the intro DM (manual)' : 'No handle — reach via email instead';
  return 'Review lead';
}
function confidence(l: Lead): string {
  const s = (l.stage || 'scraped').toLowerCase();
  if (l.replied_at || s === 'replied' || s === 'qualified') return 'high';
  if (s === 'contacted') return 'medium';
  return l.instagram ? 'medium' : 'low';
}

function ProfRow({ k, v, accent }: { k: string; v: string | null; accent?: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: `1px solid ${C.line}` }}>
      <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.ink3, width: 74, flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: C.sans, fontSize: 11.5, color: v ? accent ?? C.ink2 : C.ink3, wordBreak: 'break-word' }}>{v || '—'}</span>
    </div>
  );
}

// ⋮ menu per queue row — Remove from queue (skip) / Delete lead / Not a lead
// (block+denylist). Fixed-position dropdown anchored to the button so the list's
// overflow never clips it. Block asks an inline confirm (it also blocks future scrapes).
function QueueRowMenu({
  lead,
  busy,
  onAction,
}: {
  lead: Lead;
  busy: boolean;
  onAction: (lead: Lead, action: 'skip' | 'delete' | 'block') => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [confirm, setConfirm] = useState<null | 'delete' | 'block'>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const handle = (lead.instagram || '').replace(/^@/, '');

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
    document.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setConfirm(null);
    setOpen((o) => !o);
  };

  const fire = (action: 'skip' | 'delete' | 'block') => {
    onAction(lead, action);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={ref}
        onClick={toggle}
        title="More options"
        aria-label="More options"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 7,
          border: `1px solid ${open ? C.teal : 'transparent'}`,
          background: open ? 'rgba(47,217,201,0.10)' : 'transparent',
          color: open ? C.teal : C.ink3,
          cursor: 'pointer',
        }}
      >
        <MoreVertical size={14} />
      </button>
      {open && pos && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 70,
            width: 210,
            background: '#0e1218',
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: 5,
            boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
          }}
        >
          <QRowItem icon={MinusCircle} label="Remove from queue" onClick={() => fire('skip')} disabled={busy} />
          {confirm !== 'delete' ? (
            <QRowItem icon={Trash2} label="Delete lead" danger onClick={() => setConfirm('delete')} />
          ) : (
            <QRowItem icon={Trash2} label={busy ? 'Deleting…' : 'Confirm delete'} danger disabled={busy} onClick={() => fire('delete')} />
          )}
          {confirm !== 'block' ? (
            <QRowItem icon={Ban} label="Not a lead — block" danger onClick={() => setConfirm('block')} disabled={!handle} title={handle ? undefined : 'No handle to block'} />
          ) : (
            <QRowItem icon={Ban} label={busy ? 'Blocking…' : `Block @${handle}`} danger disabled={busy} onClick={() => fire('block')} />
          )}
          {confirm === 'block' && (
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ink3, padding: '2px 10px 6px', lineHeight: 1.5 }}>
              Deletes this lead + auto-drops @{handle} from future scrapes.
            </div>
          )}
        </div>
      )}
    </>
  );
}

function QRowItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
  title,
}: {
  icon: typeof Ban;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const color = disabled ? C.ink3 : danger ? C.red : C.ink2;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        borderRadius: 7,
        border: '1px solid transparent',
        background: 'transparent',
        color,
        fontFamily: C.sans,
        fontSize: 12.5,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = danger ? 'rgba(224,101,90,0.10)' : 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={13} strokeWidth={2} /> {label}
    </button>
  );
}

function MsgChip({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: C.mono,
        fontSize: 10.5,
        padding: '5px 10px',
        borderRadius: 7,
        border: `1px solid ${active ? C.teal : C.line}`,
        background: active ? 'rgba(47,217,201,0.10)' : C.panel2,
        color: disabled ? C.ink3 : active ? C.teal : C.ink2,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
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
const rightEmpty: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 11.5,
  color: C.ink3,
  padding: '18px 4px',
  textAlign: 'center',
  lineHeight: 1.6,
};
function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'grid',
    placeItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${C.line}`,
    background: C.panel2,
    color: disabled ? C.ink3 : C.ink2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
const agentEyebrow: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: C.ink3,
  marginBottom: 4,
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
