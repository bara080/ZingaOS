'use client';

// CRM · SMS — a CONSENT-GATED text channel (Telnyx / A2P 10DLC).
//
// LEGAL: US marketing/service SMS requires TCPA prior express consent AND a
// registered A2P 10DLC sender. This surface can ONLY text a number that has a
// non-opted-out row in the consent ledger (ops.sms_consent). The send route
// hard-gates on operator_sms_consent_is_allowed(); this UI mirrors that — the
// Send button is disabled for any number that is not opted_in, and STOP/opt-out
// is shown clearly and honored irreversibly-by-inbound. Layout mirrors InboxView:
// left = consent ledger + add-consent, center = thread + compose, right = lead.
import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Send as SendIcon,
  Search,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Plus,
  MessageSquare,
} from 'lucide-react';
import {
  useSmsThreads,
  useSmsThread,
  useSmsConsent,
  useSmsSend,
  useSmsConsentAdd,
  useSmsConsentOptout,
  useSmsDraft,
  useLeads,
} from '../hooks';
import { leadName, type SmsThread, type SmsConsent, type Lead } from '../api';
import { C } from '@/components/operator/theme';

// last-10-digits key so a lead's phone matches the E.164 consent/thread phone.
function phoneKey(p: string | null | undefined): string {
  const d = (p || '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
function relTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SmsView() {
  const consentQ = useSmsConsent(true);
  const threadsQ = useSmsThreads(true);
  const leadsQ = useLeads();

  const consent = useMemo(() => consentQ.data?.consent ?? [], [consentQ.data]);
  const configured = consentQ.data?.configured ?? false;
  const optedInCount = useMemo(() => consent.filter((c) => c.status === 'opted_in').length, [consent]);
  const dormant = !configured || optedInCount === 0;

  const threadByPhone = useMemo(() => {
    const m = new Map<string, SmsThread>();
    for (const t of threadsQ.data?.threads ?? []) m.set(t.phone, t);
    return m;
  }, [threadsQ.data]);

  const leadByPhone = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leadsQ.data?.leads ?? []) {
      const k = phoneKey(l.phone);
      if (k) m.set(k, l);
    }
    return m;
  }, [leadsQ.data]);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // Contacts = the consent ledger (opted_in first, then opted_out).
  const contacts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return consent.filter((c) => {
      if (!s) return true;
      return c.phone.toLowerCase().includes(s) || (c.name || '').toLowerCase().includes(s);
    });
  }, [consent, search]);

  useEffect(() => {
    if (!selected && contacts.length) setSelected(contacts[0].phone);
  }, [contacts, selected]);

  const active = consent.find((c) => c.phone === selected) || null;
  const isAllowed = active?.status === 'opted_in';
  const activeLead = active ? leadByPhone.get(phoneKey(active.phone)) ?? null : null;

  const threadQ = useSmsThread(selected, true);
  const messages = threadQ.data?.messages ?? [];

  const send = useSmsSend();
  const draft = useSmsDraft();
  const optout = useSmsConsentOptout();
  const [reply, setReply] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const doDraft = () => {
    if (!active) return;
    setFlash(null);
    draft.mutate(
      {
        name: activeLead ? leadName(activeLead) : active.name || undefined,
        category: activeLead?.category || undefined,
        borough: activeLead?.borough || undefined,
        base: reply.trim() || undefined,
      },
      {
        onSuccess: (d) => setReply(d.draft),
        onError: (e) => setFlash(`Draft failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };
  const doSend = () => {
    if (!active || !isAllowed || !reply.trim() || send.isPending) return;
    setFlash(null);
    send.mutate(
      { to: active.phone, text: reply.trim() },
      {
        onSuccess: () => {
          setReply('');
          setFlash('Text sent ✓');
        },
        onError: (e) => setFlash(`Send failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };
  const doOptout = () => {
    if (!active || optout.isPending) return;
    setFlash(null);
    optout.mutate(
      { phone: active.phone },
      {
        onSuccess: () => setFlash('Marked opted-out'),
        onError: (e) => setFlash(`Opt-out failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const notAuthorized = consentQ.isError;

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>SMS</h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: C.mono,
            fontSize: 10.5,
            color: configured ? C.green : C.amber,
            border: `1px solid ${configured ? 'rgba(79,208,138,0.4)' : 'rgba(230,178,76,0.4)'}`,
            borderRadius: 7,
            padding: '3px 9px',
          }}
        >
          {configured ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {configured ? 'Telnyx connected' : 'Telnyx not configured'}
        </span>
      </div>

      {/* Compliance banner — always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 9,
          fontFamily: C.mono,
          fontSize: 11,
          color: C.ink2,
          lineHeight: 1.6,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          background: 'rgba(47,217,201,0.05)',
          padding: '10px 13px',
          marginBottom: 14,
        }}
      >
        <ShieldCheck size={15} color={C.teal} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <b style={{ color: C.ink }}>Consent-gated.</b> Only numbers with recorded TCPA opt-in can be
          texted — scraped-only leads are never messaged. Requires a registered A2P 10DLC sender. STOP /
          UNSUBSCRIBE is honored automatically and can&apos;t be undone by an inbound reply.
        </span>
      </div>

      {notAuthorized ? (
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 12,
            color: C.amber,
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: 14,
            background: 'rgba(230,178,76,0.06)',
          }}
        >
          SMS channel not available.
          <div style={{ color: C.ink3, marginTop: 6 }}>
            {consentQ.error instanceof Error ? consentQ.error.message : 'not authorized'}
          </div>
        </div>
      ) : (
        <>
          {dormant && <DormantPanel configured={configured} optedInCount={optedInCount} />}

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 260px', gap: 14, alignItems: 'start' }}>
            {/* col 1: consent ledger + add consent */}
            <div style={{ ...colCard, display: 'flex', flexDirection: 'column' }}>
              <AddConsentForm />
              <div style={{ position: 'relative', margin: '12px 0 10px' }}>
                <Search size={13} color={C.ink3} style={{ position: 'absolute', left: 9, top: 9 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search numbers…"
                  style={{ ...fieldStyle, width: '100%', paddingLeft: 28 }}
                />
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink3, marginBottom: 6 }}>
                Consent ledger · {optedInCount} opted-in
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 420, overflowY: 'auto' }}>
                {consentQ.isLoading ? (
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8 }}>loading…</div>
                ) : contacts.length === 0 ? (
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, padding: 8, lineHeight: 1.6 }}>
                    No consented numbers yet. Add an opt-in above to start.
                  </div>
                ) : (
                  contacts.map((c) => {
                    const on = c.phone === selected;
                    const out = c.status === 'opted_out';
                    const t = threadByPhone.get(c.phone);
                    const lead = leadByPhone.get(phoneKey(c.phone)) ?? null;
                    const label = lead ? leadName(lead) : c.name || c.phone;
                    return (
                      <button
                        key={c.phone}
                        onClick={() => setSelected(c.phone)}
                        style={{
                          display: 'flex',
                          gap: 9,
                          alignItems: 'center',
                          textAlign: 'left',
                          padding: '9px 10px',
                          borderRadius: 9,
                          border: `1px solid ${on ? C.teal : 'transparent'}`,
                          background: on ? 'rgba(47,217,201,0.08)' : 'transparent',
                          cursor: 'pointer',
                          opacity: out ? 0.55 : 1,
                        }}
                      >
                        <div style={{ ...avatar, background: out ? C.panel2 : C.panel2, color: out ? C.red : C.teal }}>
                          {out ? <Ban size={13} /> : label.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: C.sans,
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: on ? C.teal : C.ink,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textDecoration: out ? 'line-through' : 'none',
                              }}
                            >
                              {label}
                            </span>
                            <span style={{ flex: 1 }} />
                            {t && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.ink3 }}>{relTime(t.last_at)}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t?.last_text || c.phone}
                            </span>
                            <span style={{ flex: 1 }} />
                            <StatusPill status={c.status} />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* col 2: thread + compose */}
            <div style={{ ...colCard, display: 'flex', flexDirection: 'column', minHeight: 460, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${C.line}`, minWidth: 0 }}>
                <div style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
                  {active ? (activeLead ? leadName(activeLead) : active.name || active.phone) : 'Conversation'}
                </div>
                {active && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>{active.phone} · SMS</div>}
                <span style={{ flex: 1 }} />
                {active && <StatusPill status={active.status} />}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320, padding: '10px 2px' }}>
                {!active ? (
                  <Center>Pick a consented number.</Center>
                ) : threadQ.isLoading ? (
                  <Center>loading…</Center>
                ) : messages.length === 0 ? (
                  <Center>No messages yet.</Center>
                ) : (
                  messages.map((m) => {
                    const out = m.direction === 'out';
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: out ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          minWidth: 0,
                          background: out ? 'rgba(47,217,201,0.12)' : C.panel2,
                          border: `1px solid ${out ? 'rgba(47,217,201,0.4)' : C.line}`,
                          borderRadius: 12,
                          padding: '8px 11px',
                          fontFamily: C.sans,
                          fontSize: 12.5,
                          color: C.ink,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.body}
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                {active && !isAllowed && (
                  <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.red, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Ban size={12} /> This number is opted-out. Texting is blocked.
                  </div>
                )}
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={isAllowed ? 'Type a message, or click AI draft…' : 'Sending disabled — no consent'}
                  disabled={!active || !isAllowed}
                  style={{ ...fieldStyle, width: '100%', minHeight: 60, resize: 'vertical', marginBottom: 8, opacity: active && isAllowed ? 1 : 0.6 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={doDraft} disabled={!active || !isAllowed || draft.isPending} style={{ ...btn(false), flex: 1 }}>
                    <Bot size={14} /> {draft.isPending ? 'Drafting…' : 'AI draft'}
                  </button>
                  <button onClick={doSend} disabled={!active || !isAllowed || !reply.trim() || send.isPending} style={{ ...btn(true), flex: 1 }}>
                    <SendIcon size={14} /> {send.isPending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                {flash && (
                  <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 11, color: flash.toLowerCase().includes('fail') ? C.red : C.green }}>
                    {flash}
                  </div>
                )}
              </div>
            </div>

            {/* col 3: contact / lead details */}
            <div style={colCard}>
              {!active ? (
                <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>—</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ ...avatar, width: 40, height: 40, fontSize: 15 }}>
                      {(activeLead ? leadName(activeLead) : active.name || active.phone).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: C.ink }}>
                        {activeLead ? leadName(activeLead) : active.name || active.phone}
                      </div>
                      <a href={`tel:${active.phone}`} style={{ fontFamily: C.mono, fontSize: 10, color: C.teal, textDecoration: 'none' }}>
                        {active.phone}
                      </a>
                    </div>
                  </div>

                  <Section label="Consent" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill status={active.status} />
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>
                      {active.status === 'opted_in'
                        ? active.opted_in_at
                          ? `since ${relTime(active.opted_in_at)}`
                          : ''
                        : active.opted_out_at
                          ? `on ${relTime(active.opted_out_at)}`
                          : ''}
                    </span>
                  </div>
                  {active.source && (
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, marginTop: 5 }}>via {active.source}</div>
                  )}
                  {active.status === 'opted_in' && (
                    <button onClick={doOptout} disabled={optout.isPending} style={{ ...btn(false), marginTop: 10, width: '100%', color: C.red, borderColor: 'rgba(224,101,90,0.4)' }}>
                      <Ban size={13} /> {optout.isPending ? 'Working…' : 'Mark opted-out'}
                    </button>
                  )}

                  <Section label="About" />
                  {activeLead ? (
                    <>
                      <Row v={activeLead.category || 'Service provider'} />
                      {activeLead.borough && <Row v={activeLead.borough} />}
                      {activeLead.website && <Row v={activeLead.website} accent={C.teal} />}
                      <Section label="Stage" />
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.ink2, textTransform: 'capitalize' }}>
                        {activeLead.stage || 'scraped'}
                      </span>
                    </>
                  ) : (
                    <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, lineHeight: 1.7 }}>
                      Not linked to a lead in the DB.
                    </div>
                  )}
                  <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 14, lineHeight: 1.6 }}>
                    Texts send from the registered 10DLC number via Telnyx — consent-gated, human-reviewed, never auto-sent.
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add-consent form (manual opt-in capture) ────────────────────────────────
function AddConsentForm() {
  const add = useSmsConsentAdd();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = () => {
    if (!phone.trim() || add.isPending) return;
    setMsg(null);
    add.mutate(
      { phone: phone.trim(), name: name.trim() || undefined, source: source.trim() || 'manual' },
      {
        onSuccess: () => {
          setMsg('Opt-in recorded ✓');
          setPhone('');
          setName('');
          setSource('');
        },
        onError: (e) => setMsg(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...btn(true), width: '100%' }}>
        <Plus size={14} /> Add consent
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, border: `1px solid ${C.line}`, borderRadius: 10, padding: 11, background: C.panel2 }}>
      <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3 }}>
        Record an opt-in
      </div>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (+1…)" style={{ ...fieldStyle, width: '100%' }} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" style={{ ...fieldStyle, width: '100%' }} />
      <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source — how they opted in" style={{ ...fieldStyle, width: '100%' }} />
      <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, lineHeight: 1.5 }}>
        Only record a real, documented opt-in. This authorizes texting this number.
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={() => setOpen(false)} style={{ ...btn(false), flex: 1 }}>Cancel</button>
        <button onClick={submit} disabled={!phone.trim() || add.isPending} style={{ ...btn(true), flex: 1 }}>
          {add.isPending ? 'Saving…' : 'Save opt-in'}
        </button>
      </div>
      {msg && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: msg.startsWith('Failed') ? C.red : C.green }}>{msg}</div>}
    </div>
  );
}

// ── Dormant state ───────────────────────────────────────────────────────────
function DormantPanel({ configured, optedInCount }: { configured: boolean; optedInCount: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        background: 'rgba(230,178,76,0.05)',
        padding: 16,
        marginBottom: 16,
      }}
    >
      <MessageSquare size={20} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
          SMS channel is ready, but dormant
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink2, lineHeight: 1.7 }}>
          The pipeline is built and consent-gated. To go live you still need:
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li style={{ color: configured ? C.green : C.amber }}>
              {configured ? '✓' : '•'} A registered A2P 10DLC sender + Telnyx creds (TELNYX_API_KEY and
              TELNYX_FROM or TELNYX_MESSAGING_PROFILE_ID)
            </li>
            <li style={{ color: optedInCount > 0 ? C.green : C.amber }}>
              {optedInCount > 0 ? '✓' : '•'} At least one opted-in contact — add a documented opt-in on the left
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── small shared bits ───────────────────────────────────────────────────────
function StatusPill({ status }: { status: SmsConsent['status'] | 'unknown' }) {
  const on = status === 'opted_in';
  const color = on ? C.green : status === 'opted_out' ? C.red : C.ink3;
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 9,
        color,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '1px 6px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {status === 'opted_in' ? 'opted-in' : status === 'opted_out' ? 'opted-out' : 'unknown'}
    </span>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ margin: 'auto', fontFamily: C.mono, fontSize: 11.5, color: C.ink3 }}>{children}</div>;
}
function Section({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink3, margin: '14px 0 6px' }}>
      {label}
    </div>
  );
}
function Row({ v, accent }: { v: string; accent?: string }) {
  return <div style={{ fontFamily: C.sans, fontSize: 12, color: accent ?? C.ink2, padding: '2px 0' }}>{v}</div>;
}

const colCard: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 12, background: 'rgba(18,21,28,0.5)', padding: 14 };
const avatar: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: C.teal };
const fieldStyle: React.CSSProperties = { fontFamily: C.mono, fontSize: 12, padding: '8px 11px', borderRadius: 9, background: C.panel2, color: C.ink, border: `1px solid ${C.line}` };
function btn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: C.mono,
    fontSize: 11.5,
    fontWeight: 600,
    padding: '9px 10px',
    borderRadius: 9,
    border: `1px solid ${primary ? C.teal : C.line}`,
    background: primary ? 'rgba(47,217,201,0.10)' : C.panel2,
    color: primary ? C.teal : C.ink2,
    cursor: 'pointer',
  };
}
