'use client';

// CRM · Inbox — multi-channel. A channel switch (Instagram | Email) at the top
// swaps the whole surface between the two data sources; each channel keeps the
// Outreachify layout: searchable conversation list with avatars + unread dots, a
// chat column, and a right-hand Lead details panel matched to ops.leads (by IG
// handle, or by email address). Real data from ops.ig_messages / ops.email_messages
// (+ ops.leads); draft/show/wait on every reply.
import { useEffect, useMemo, useState } from 'react';
import { Bot, Send as SendIcon, Search, Instagram, Mail, RefreshCw } from 'lucide-react';
import {
  useIgThreads,
  useIgThread,
  useIgDraft,
  useIgSend,
  useEmailThreads,
  useEmailThread,
  useEmailDraft,
  useEmailSend,
  useEmailPoll,
  useLeads,
} from '../hooks';
import { leadName, type IgThread, type EmailThread, type Lead } from '../api';
import { usePager, Pager } from '../Pager';
import { cleanEmailBody, emailPreview } from './emailClean';
import { C } from '@/components/operator/theme';

type Channel = 'instagram' | 'email';

const STAGE_COLOR: Record<string, string> = {
  scraped: C.ink3, prospect: C.ink2, new: C.ink2, contacted: C.amber,
  replied: C.teal, interested: C.teal, qualified: C.green, signed: C.green, listed: C.green, won: C.green,
};

function relTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function handleOf(t: IgThread): string {
  return t.username ? `@${t.username.replace(/^@/, '')}` : t.igsid;
}

export function InboxView() {
  const [channel, setChannel] = useState<Channel>('instagram');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Inbox</h2>
        <div style={{ display: 'flex', gap: 4, border: `1px solid ${C.line}`, borderRadius: 9, padding: 3 }}>
          {([
            { key: 'instagram', label: 'Instagram', Icon: Instagram },
            { key: 'email', label: 'Email', Icon: Mail },
          ] as const).map(({ key, label, Icon }) => {
            const on = channel === key;
            return (
              <button
                key={key}
                onClick={() => setChannel(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.sans, fontSize: 12.5,
                  fontWeight: on ? 600 : 500, color: on ? C.teal : C.ink2,
                  background: on ? 'rgba(47,217,201,0.10)' : 'transparent',
                  border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
                }}
              >
                <Icon size={13} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {channel === 'instagram' ? <IgInbox /> : <EmailInbox />}
    </div>
  );
}

// ── Instagram channel (unchanged behavior) ──────────────────────────────────
type IgTab = 'all' | 'unread' | 'ai' | 'mine' | 'mentions';

function IgInbox() {
  const threadsQ = useIgThreads(true);
  const leadsQ = useLeads();
  const threads = useMemo(() => threadsQ.data?.threads ?? [], [threadsQ.data]);

  const leadByHandle = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leadsQ.data?.leads ?? []) {
      if (l.instagram) m.set(l.instagram.replace(/^@/, '').toLowerCase(), l);
    }
    return m;
  }, [leadsQ.data]);
  const leadFor = (t: IgThread | null): Lead | null =>
    t?.username ? leadByHandle.get(t.username.replace(/^@/, '').toLowerCase()) ?? null : null;

  const [tab, setTab] = useState<IgTab>('all');
  const [search, setSearch] = useState('');
  const [igsid, setIgsid] = useState<string | null>(null);

  const unreadCount = threads.filter((t) => t.last_direction === 'in').length;
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'unread' && t.last_direction !== 'in') return false;
      if (tab === 'ai' || tab === 'mine' || tab === 'mentions') return false; // not tracked yet
      return !s || handleOf(t).toLowerCase().includes(s) || (t.last_text || '').toLowerCase().includes(s);
    });
  }, [threads, tab, search]);

  const pager = usePager(filtered, 12, `${tab}|${search}`);

  useEffect(() => {
    if (!igsid && filtered.length) setIgsid(filtered[0].igsid);
  }, [filtered, igsid]);

  const active = threads.find((t) => t.igsid === igsid) || null;
  const activeLead = leadFor(active);
  const threadQ = useIgThread(igsid, true);
  const messages = threadQ.data?.messages ?? [];
  const draft = useIgDraft();
  const send = useIgSend();
  const [reply, setReply] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const doDraft = () => {
    if (!igsid) return;
    setFlash(null);
    draft.mutate({ igsid }, { onSuccess: (d) => setReply(d.draft), onError: (e) => setFlash(`Draft failed: ${e instanceof Error ? e.message : 'error'}`) });
  };
  const doSend = () => {
    if (!igsid || !reply.trim() || send.isPending) return;
    setFlash(null);
    send.mutate({ igsid, text: reply.trim() }, { onSuccess: () => { setReply(''); setFlash('Reply sent ✓'); }, onError: (e) => setFlash(`Send failed: ${e instanceof Error ? e.message : 'error'}`) });
  };

  const TABS: { key: IgTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: threads.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'ai', label: 'AI', count: 0 },
    { key: 'mine', label: 'Mine', count: 0 },
    { key: 'mentions', label: 'Mentions', count: 0 },
  ];

  const notAuthorized = threadsQ.isError;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setIgsid(null); }} style={{
              fontFamily: C.sans, fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? C.teal : C.ink2,
              background: 'transparent', border: 'none', borderBottom: `2px solid ${on ? C.teal : 'transparent'}`,
              padding: '6px 10px', cursor: 'pointer',
            }}>
              {t.label} <span style={{ color: C.ink3, fontSize: 11 }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {notAuthorized ? (
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, background: 'rgba(230,178,76,0.06)' }}>
          Instagram messaging not available.
          <div style={{ color: C.ink3, marginTop: 6 }}>{threadsQ.error instanceof Error ? threadsQ.error.message : 'not authorized'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 14, alignItems: 'start' }}>
          {/* col 1: conversation list */}
          <div style={{ ...colCard, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color={C.ink3} style={{ position: 'absolute', left: 9, top: 9 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" style={{ ...fieldStyle, width: '100%', paddingLeft: 28 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 460, overflowY: 'auto' }}>
              {threadsQ.isLoading ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8, lineHeight: 1.6 }}>
                  {tab === 'all' ? 'No conversations yet. Inbound DMs land here.' : 'Nothing here.'}
                </div>
              ) : (
                pager.slice.map((t) => {
                  const on = t.igsid === igsid;
                  const unread = t.last_direction === 'in';
                  const lead = leadFor(t);
                  return (
                    <button key={t.igsid} onClick={() => setIgsid(t.igsid)} style={{
                      display: 'flex', gap: 9, alignItems: 'center', textAlign: 'left', padding: '9px 10px', borderRadius: 9,
                      border: `1px solid ${on ? C.teal : 'transparent'}`, background: on ? 'rgba(47,217,201,0.08)' : 'transparent', cursor: 'pointer',
                    }}>
                      <div style={avatar}>{(lead ? leadName(lead) : handleOf(t).replace(/^@/, '')).charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: C.sans, fontSize: 12.5, fontWeight: 600, color: on ? C.teal : C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead ? leadName(lead) : handleOf(t)}
                          </span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.ink3 }}>{relTime(t.last_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.last_text || `${t.msg_count} messages`}
                          </span>
                          {unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal, flexShrink: 0 }} />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <Pager p={pager} noun="threads" />
          </div>

          {/* col 2: chat */}
          <div style={{ ...colCard, display: 'flex', flexDirection: 'column', minHeight: 460, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${C.line}`, minWidth: 0 }}>
              <div style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
                {active ? (activeLead ? leadName(activeLead) : handleOf(active)) : 'Chat'}
              </div>
              {active && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>{handleOf(active)} · Instagram</div>}
              <span style={{ flex: 1 }} />
              {activeLead && (
                <span style={{ fontFamily: C.mono, fontSize: 10, color: STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.ink2, border: `1px solid ${STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.line}`, borderRadius: 6, padding: '2px 8px', textTransform: 'capitalize' }}>
                  {activeLead.stage || 'scraped'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320, padding: '10px 2px' }}>
              {!igsid ? (
                <Center>Pick a conversation.</Center>
              ) : threadQ.isLoading ? (
                <Center>loading…</Center>
              ) : messages.length === 0 ? (
                <Center>no messages</Center>
              ) : (
                messages.map((m) => {
                  const out = m.direction === 'out';
                  return (
                    <div key={m.id} style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '78%', minWidth: 0, background: out ? 'rgba(47,217,201,0.12)' : C.panel2, border: `1px solid ${out ? 'rgba(47,217,201,0.4)' : C.line}`, borderRadius: 12, padding: '8px 11px', fontFamily: C.sans, fontSize: 12.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply, or click AI reply…" disabled={!igsid} style={{ ...fieldStyle, width: '100%', minHeight: 52, resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doDraft} disabled={!igsid || draft.isPending} style={{ ...btn(false), flex: 1 }}>
                  <Bot size={14} /> {draft.isPending ? 'Drafting…' : 'AI reply'}
                </button>
                <button onClick={doSend} disabled={!igsid || !reply.trim() || send.isPending} style={{ ...btn(true), flex: 1 }}>
                  <SendIcon size={14} /> {send.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
              {flash && <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 11, color: flash.toLowerCase().includes('fail') ? C.red : C.green }}>{flash}</div>}
            </div>
          </div>

          {/* col 3: lead details */}
          <div style={colCard}>
            {!active ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>—</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ ...avatar, width: 40, height: 40, fontSize: 15 }}>{(activeLead ? leadName(activeLead) : handleOf(active)).charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>{activeLead ? leadName(activeLead) : handleOf(active)}</div>
                    <a href={`https://instagram.com/${(active.username || '').replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: C.mono, fontSize: 10, color: C.teal, textDecoration: 'none' }}>{handleOf(active)}</a>
                  </div>
                </div>

                <Section label="About" />
                {activeLead ? (
                  <>
                    <Row v={activeLead.category || 'Service provider'} />
                    {activeLead.borough && <Row v={activeLead.borough} />}
                    {activeLead.website && <Row v={activeLead.website} accent={C.teal} />}
                    <Section label="Stage" />
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.ink2, textTransform: 'capitalize' }}>{activeLead.stage || 'scraped'}</span>
                    {activeLead.notes && (<><Section label="Notes" /><div style={{ fontFamily: C.sans, fontSize: 11.5, color: C.ink2, lineHeight: 1.5 }}>{activeLead.notes}</div></>)}
                    <Section label="Tags" />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {[activeLead.category, activeLead.borough].filter(Boolean).map((t, i) => (
                        <span key={i} style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 7px' }}>{t}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, lineHeight: 1.7 }}>
                    Not in the lead DB yet.
                    <div>igsid {active.igsid}</div>
                    <div>{active.msg_count} messages</div>
                  </div>
                )}
                <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 14, lineHeight: 1.6 }}>
                  Replies send within Meta&apos;s 24h window via the approved path — human-reviewed, never auto-sent.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email channel ────────────────────────────────────────────────────────────
type EmailTab = 'all' | 'unread';

function EmailInbox() {
  const threadsQ = useEmailThreads(true);
  const leadsQ = useLeads();
  const poll = useEmailPoll();
  const threads = useMemo(() => threadsQ.data?.threads ?? [], [threadsQ.data]);

  // Match a thread to a lead by email address for the details panel.
  const leadByEmail = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leadsQ.data?.leads ?? []) {
      if (l.email) m.set(l.email.trim().toLowerCase(), l);
    }
    return m;
  }, [leadsQ.data]);
  const leadFor = (t: EmailThread | null): Lead | null =>
    t?.contact ? leadByEmail.get(t.contact.trim().toLowerCase()) ?? null : null;
  const nameOf = (t: EmailThread): string => t.name?.trim() || t.contact;

  const [tab, setTab] = useState<EmailTab>('all');
  const [search, setSearch] = useState('');
  const [contact, setContact] = useState<string | null>(null);

  const unreadCount = threads.filter((t) => t.last_direction === 'in').length;
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'unread' && t.last_direction !== 'in') return false;
      return (
        !s ||
        t.contact.toLowerCase().includes(s) ||
        (t.name || '').toLowerCase().includes(s) ||
        (t.last_subject || '').toLowerCase().includes(s) ||
        (t.last_text || '').toLowerCase().includes(s)
      );
    });
  }, [threads, tab, search]);

  const pager = usePager(filtered, 12, `${tab}|${search}`);

  useEffect(() => {
    if (!contact && filtered.length) setContact(filtered[0].contact);
  }, [filtered, contact]);

  const active = threads.find((t) => t.contact === contact) || null;
  const activeLead = leadFor(active);
  const threadQ = useEmailThread(contact, true);
  const messages = threadQ.data?.messages ?? [];
  const draft = useEmailDraft();
  const send = useEmailSend();
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  // Default the reply subject from the most recent inbound subject (Re: …).
  useEffect(() => {
    if (!active) { setSubject(''); return; }
    const base = active.last_subject?.trim() || '';
    setSubject(base ? (/^re:/i.test(base) ? base : `Re: ${base}`) : 'Re: your message');
  }, [active]);

  const doSync = () => {
    setFlash(null);
    poll.mutate(undefined, {
      onSuccess: (r) => setFlash(`Synced — fetched ${r.fetched}, stored ${r.stored}`),
      onError: (e) => setFlash(`Sync failed: ${e instanceof Error ? e.message : 'error'}`),
    });
  };
  const doDraft = () => {
    if (!contact) return;
    setFlash(null);
    draft.mutate({ contact }, {
      onSuccess: (d) => { setReply(d.draft); if (d.subject) setSubject(d.subject); },
      onError: (e) => setFlash(`Draft failed: ${e instanceof Error ? e.message : 'error'}`),
    });
  };
  const doSend = () => {
    if (!contact || !reply.trim() || send.isPending) return;
    setFlash(null);
    send.mutate(
      { contact, subject: subject.trim() || 'Re: your message', body: reply.trim() },
      {
        onSuccess: () => { setReply(''); setFlash('Reply sent ✓'); },
        onError: (e) => setFlash(`Send failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const TABS: { key: EmailTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: threads.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
  ];

  const notAuthorized = threadsQ.isError;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setContact(null); }} style={{
              fontFamily: C.sans, fontSize: 12.5, fontWeight: on ? 600 : 500, color: on ? C.teal : C.ink2,
              background: 'transparent', border: 'none', borderBottom: `2px solid ${on ? C.teal : 'transparent'}`,
              padding: '6px 10px', cursor: 'pointer',
            }}>
              {t.label} <span style={{ color: C.ink3, fontSize: 11 }}>{t.count}</span>
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <button onClick={doSync} disabled={poll.isPending} style={{ ...btn(false) }}>
          <RefreshCw size={13} /> {poll.isPending ? 'Syncing…' : 'Sync email'}
        </button>
      </div>

      {flash && (
        <div style={{ marginBottom: 10, fontFamily: C.mono, fontSize: 11, color: flash.toLowerCase().includes('fail') ? C.red : C.green }}>
          {flash}
        </div>
      )}

      {notAuthorized ? (
        <div style={{ fontFamily: C.mono, fontSize: 12, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, background: 'rgba(230,178,76,0.06)' }}>
          Email inbox not available.
          <div style={{ color: C.ink3, marginTop: 6 }}>{threadsQ.error instanceof Error ? threadsQ.error.message : 'not authorized'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 14, alignItems: 'start' }}>
          {/* col 1: conversation list */}
          <div style={{ ...colCard, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color={C.ink3} style={{ position: 'absolute', left: 9, top: 9 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email…" style={{ ...fieldStyle, width: '100%', paddingLeft: 28 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 460, overflowY: 'auto' }}>
              {threadsQ.isLoading ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8, lineHeight: 1.6 }}>
                  {tab === 'all' ? 'No email yet. Click “Sync email” to pull inbound.' : 'Nothing here.'}
                </div>
              ) : (
                pager.slice.map((t) => {
                  const on = t.contact === contact;
                  const unread = t.last_direction === 'in';
                  const lead = leadFor(t);
                  const label = lead ? leadName(lead) : nameOf(t);
                  return (
                    <button key={t.contact} onClick={() => setContact(t.contact)} style={{
                      display: 'flex', gap: 9, alignItems: 'center', textAlign: 'left', padding: '9px 10px', borderRadius: 9,
                      border: `1px solid ${on ? C.teal : 'transparent'}`, background: on ? 'rgba(47,217,201,0.08)' : 'transparent', cursor: 'pointer',
                    }}>
                      <div style={avatar}>{label.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: C.sans, fontSize: 12.5, fontWeight: 600, color: on ? C.teal : C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.ink3 }}>{relTime(t.last_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.last_subject || emailPreview(t.last_text) || `${t.msg_count} messages`}
                          </span>
                          {unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal, flexShrink: 0 }} />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <Pager p={pager} noun="threads" />
          </div>

          {/* col 2: chat */}
          <div style={{ ...colCard, display: 'flex', flexDirection: 'column', minHeight: 460, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${C.line}`, minWidth: 0 }}>
              <div style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
                {active ? (activeLead ? leadName(activeLead) : nameOf(active)) : 'Chat'}
              </div>
              {active && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>{active.contact} · Email</div>}
              <span style={{ flex: 1 }} />
              {activeLead && (
                <span style={{ fontFamily: C.mono, fontSize: 10, color: STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.ink2, border: `1px solid ${STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.line}`, borderRadius: 6, padding: '2px 8px', textTransform: 'capitalize' }}>
                  {activeLead.stage || 'scraped'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320, padding: '10px 2px' }}>
              {!contact ? (
                <Center>Pick a conversation.</Center>
              ) : threadQ.isLoading ? (
                <Center>loading…</Center>
              ) : messages.length === 0 ? (
                <Center>no messages</Center>
              ) : (
                messages.map((m) => {
                  const out = m.direction === 'out';
                  return (
                    <div key={m.id} style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '82%', minWidth: 0, background: out ? 'rgba(47,217,201,0.12)' : C.panel2, border: `1px solid ${out ? 'rgba(47,217,201,0.4)' : C.line}`, borderRadius: 12, padding: '8px 11px' }}>
                      {m.subject && (
                        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginBottom: 4, textTransform: 'none', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                          {m.subject}
                        </div>
                      )}
                      <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {cleanEmailBody(m.body)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" disabled={!contact} style={{ ...fieldStyle, width: '100%', marginBottom: 8 }} />
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply, or click AI reply…" disabled={!contact} style={{ ...fieldStyle, width: '100%', minHeight: 72, resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doDraft} disabled={!contact || draft.isPending} style={{ ...btn(false), flex: 1 }}>
                  <Bot size={14} /> {draft.isPending ? 'Drafting…' : 'AI reply'}
                </button>
                <button onClick={doSend} disabled={!contact || !reply.trim() || send.isPending} style={{ ...btn(true), flex: 1 }}>
                  <SendIcon size={14} /> {send.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>

          {/* col 3: lead details */}
          <div style={colCard}>
            {!active ? (
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>—</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ ...avatar, width: 40, height: 40, fontSize: 15 }}>{(activeLead ? leadName(activeLead) : nameOf(active)).charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>{activeLead ? leadName(activeLead) : nameOf(active)}</div>
                    <a href={`mailto:${active.contact}`} style={{ fontFamily: C.mono, fontSize: 10, color: C.teal, textDecoration: 'none' }}>{active.contact}</a>
                  </div>
                </div>

                <Section label="About" />
                {activeLead ? (
                  <>
                    <Row v={activeLead.category || 'Service provider'} />
                    {activeLead.borough && <Row v={activeLead.borough} />}
                    {activeLead.website && <Row v={activeLead.website} accent={C.teal} />}
                    <Section label="Stage" />
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: STAGE_COLOR[(activeLead.stage || 'scraped').toLowerCase()] ?? C.ink2, textTransform: 'capitalize' }}>{activeLead.stage || 'scraped'}</span>
                    {activeLead.notes && (<><Section label="Notes" /><div style={{ fontFamily: C.sans, fontSize: 11.5, color: C.ink2, lineHeight: 1.5 }}>{activeLead.notes}</div></>)}
                    <Section label="Tags" />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {[activeLead.category, activeLead.borough].filter(Boolean).map((t, i) => (
                        <span key={i} style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 7px' }}>{t}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, lineHeight: 1.7 }}>
                    Not in the lead DB yet.
                    <div>{active.contact}</div>
                    <div>{active.msg_count} messages</div>
                  </div>
                )}
                <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 14, lineHeight: 1.6 }}>
                  Replies send from info@zingaapp.com via the Gmail bridge — human-reviewed, never auto-sent.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ margin: 'auto', fontFamily: C.mono, fontSize: 11.5, color: C.ink3 }}>{children}</div>;
}
function Section({ label }: { label: string }) {
  return <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink3, margin: '14px 0 6px' }}>{label}</div>;
}
function Row({ v, accent }: { v: string; accent?: string }) {
  return <div style={{ fontFamily: C.sans, fontSize: 12, color: accent ?? C.ink2, padding: '2px 0' }}>{v}</div>;
}

const colCard: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 12, background: 'rgba(18,21,28,0.5)', padding: 14 };
const avatar: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: C.teal };
const fieldStyle: React.CSSProperties = { fontFamily: C.mono, fontSize: 12, padding: '8px 11px', borderRadius: 9, background: C.panel2, color: C.ink, border: `1px solid ${C.line}` };
function btn(primary: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: C.mono, fontSize: 11.5, fontWeight: 600, padding: '9px 10px', borderRadius: 9, border: `1px solid ${primary ? C.teal : C.line}`, background: primary ? 'rgba(47,217,201,0.10)' : C.panel2, color: primary ? C.teal : C.ink2, cursor: 'pointer' };
}
