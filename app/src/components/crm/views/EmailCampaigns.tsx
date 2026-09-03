'use client';

// CRM · Campaigns → Email channel (pragmatic UI on the durable engine, Stage 2).
// Create an email campaign (name + subject + body) → launch a run against a lead
// segment → "Send batch" drains one chunk at a time (real SMTP send via the
// engine), with live progress + pause/stop. The heavy cadence/health-gate engine
// runs underneath; this UI keeps it simple. In production a Vercel Workflow auto-
// drains (Stage 3); here the Send-batch button drives it. Dark palette only.
import { useState } from 'react';
import { Play, Pause, Square, SendHorizonal, Plus, FlaskConical } from 'lucide-react';
import {
  useEmailCampaigns,
  useEmailCampaignCreate,
  useEmailRuns,
  useEmailRunLaunch,
  useEmailRun,
  useEmailRunControl,
  useEmailRunDrain,
  useEmailRunRecipients,
  useEmailTestSend,
  useSegments,
} from '../hooks';
import type { EmailEngineCampaign, EmailEngineRun } from '../api';
import { C } from '@/components/operator/theme';

export function EmailCampaigns() {
  const listQ = useEmailCampaigns();
  const segsQ = useSegments();
  const create = useEmailCampaignCreate();
  const campaigns = listQ.data?.campaigns ?? [];

  const [selId, setSelId] = useState<string | null>(null);

  // create form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {name},\n\nQuick note from Zinga — we help beauty & grooming pros fill mid-week gaps with direct bookings, no cost to be listed.\n\nOpen to a 2-minute look?\n\n— Bara, Zinga',
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testFlash, setTestFlash] = useState<string | null>(null);
  const testSend = useEmailTestSend();

  const sendTest = () => {
    if (!testEmail.trim() || testSend.isPending) return;
    setTestFlash(null);
    testSend.mutate(
      { to: testEmail.trim(), subject: subject.trim() || name.trim(), body },
      {
        onSuccess: (r) => setTestFlash(`✓ Test sent to ${r.to}`),
        onError: (e) => setTestFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  const submit = () => {
    if (!name.trim() || create.isPending) return;
    setFlash(null);
    create.mutate(
      { name: name.trim(), subject: subject.trim() || name.trim(), text: body },
      {
        onSuccess: (r) => {
          setFlash('Campaign created ✓');
          setName('');
          const created = (r as { campaign?: EmailEngineCampaign }).campaign;
          if (created?.id) setSelId(created.id);
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
      {/* ── campaigns + runs ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        {listQ.isError ? (
          <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
            {listQ.error instanceof Error ? listQ.error.message : 'failed to load'}
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{ ...card, color: C.ink3, fontFamily: C.mono, fontSize: 12 }}>
            {listQ.isLoading ? 'loading…' : 'No email campaigns yet — create one on the right.'}
          </div>
        ) : (
          campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              c={c}
              open={c.id === selId}
              onToggle={() => setSelId(c.id === selId ? null : c.id)}
              segments={(segsQ.data?.segments ?? []).map((s) => ({ source: s.source, n: s.emailable ?? s.n }))}
            />
          ))
        )}
      </div>

      {/* ── create builder ───────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
          Create email campaign
        </div>
        <Field label="Campaign name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Salons NYC — intro" style={input} />
        </Field>
        <Field label="Subject line">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Fill your mid-week gaps with Zinga" style={input} />
        </Field>
        <Field label="Body · {name} {business} {category} merge">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ ...input, minHeight: 150, resize: 'vertical', lineHeight: 1.5, fontFamily: C.sans }} />
        </Field>
        <button onClick={submit} disabled={!name.trim() || create.isPending} style={primaryBtn(!!name.trim(), create.isPending)}>
          <Plus size={13} /> {create.isPending ? 'Creating…' : 'Create campaign'}
        </button>
        {flash && (
          <div style={{ marginTop: 10, fontFamily: C.mono, fontSize: 11, color: flash.startsWith('Failed') ? C.red : C.green }}>{flash}</div>
        )}

        {/* Send test — preview to your own address, NO leads touched */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <label style={eyebrow}><FlaskConical size={10} style={{ display: 'inline', marginRight: 4 }} /> Send test (no leads touched)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendTest(); }}
              placeholder="you@example.com"
              style={{ ...input, flex: 1, minWidth: 0 }}
            />
            <button onClick={sendTest} disabled={!testEmail.trim() || testSend.isPending} style={{ ...pill(!!testEmail.trim()), padding: '9px 12px', whiteSpace: 'nowrap', opacity: testEmail.trim() ? 1 : 0.6 }}>
              {testSend.isPending ? 'Sending…' : 'Send test'}
            </button>
          </div>
          {testFlash && <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 10.5, color: testFlash.startsWith('Failed') ? C.red : C.green }}>{testFlash}</div>}
        </div>

        <div style={{ marginTop: 12, fontFamily: C.mono, fontSize: 9, color: C.ink3, lineHeight: 1.6 }}>
          Sends via the Gmail bridge (info@zingaapp.com), unsubscribe footer added, suppressed/contacted excluded. Send a test first, then create + launch to a segment.
        </div>
      </div>
    </div>
  );
}

function CampaignCard({
  c,
  open,
  onToggle,
  segments,
}: {
  c: EmailEngineCampaign;
  open: boolean;
  onToggle: () => void;
  segments: { source: string; n: number }[];
}) {
  const runsQ = useEmailRuns(c.id, open);
  const launch = useEmailRunLaunch(c.id);
  const runs = runsQ.data?.runs ?? [];

  const [source, setSource] = useState('all');
  const [limit, setLimit] = useState(50);
  const [flash, setFlash] = useState<string | null>(null);

  const doLaunch = () => {
    if (launch.isPending) return;
    setFlash(null);
    launch.mutate(
      { audienceMode: 'segment', audienceFilter: { source: source === 'all' ? undefined : source, limit }, stagePlan: [] },
      {
        // snapshot.count is the true resolved audience (audience_count on the run
        // row is 0 until the snapshot updates it).
        onSuccess: (r) => setFlash(`Run launched · ${r.snapshot?.count ?? 0} recipient(s) queued`),
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={card}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.teal, flexShrink: 0 }}>
          <SendHorizonal size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: open ? C.teal : C.ink }}>{c.name}</div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, textTransform: 'capitalize' }}>{c.status} · {runs.length} run{runs.length === 1 ? '' : 's'}</div>
        </div>
      </button>

      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {/* launch controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={eyebrow}>Segment</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={input}>
                <option value="all">All emailable</option>
                {segments.map((s) => (
                  <option key={s.source} value={s.source}>{s.source} ({s.n})</option>
                ))}
              </select>
            </div>
            <div style={{ width: 90 }}>
              <label style={eyebrow}>Limit</label>
              <input type="number" min={1} max={100000} value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))} style={input} />
            </div>
            <button onClick={doLaunch} disabled={launch.isPending} style={{ ...pill(true), padding: '9px 14px', whiteSpace: 'nowrap' }}>
              <Play size={12} /> {launch.isPending ? 'Launching…' : 'Launch run'}
            </button>
          </div>
          {flash && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: flash.startsWith('Failed') ? C.red : C.teal, marginBottom: 10 }}>{flash}</div>}

          {/* runs */}
          {runs.length === 0 ? (
            <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>No runs yet — launch one above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {runs.map((r) => <RunRow key={r.id} run={r} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: EmailEngineRun }) {
  const detailQ = useEmailRun(run.id, true);
  const drain = useEmailRunDrain(run.id);
  const control = useEmailRunControl(run.id);
  const [note, setNote] = useState<string | null>(null);
  const [showRecips, setShowRecips] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const recipsQ = useEmailRunRecipients(run.id, { enabled: showRecips });
  const recipients = recipsQ.data?.recipients ?? [];

  const d = detailQ.data;
  const p = (d?.progress ?? run.progress ?? {}) as Record<string, number>;
  const total = p.total ?? run.audience_count ?? 0;
  const accepted = p.accepted ?? 0;
  const failed = p.failed ?? 0;
  const done = accepted + failed;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const status = d?.run?.status ?? run.status;
  const active = ['queued', 'running', 'sending', 'preparing'].includes(status);

  const pending = p.pending ?? 0;
  const batchN = Math.min(50, pending); // engine chunk size

  const sendBatch = () => {
    if (drain.isPending) return;
    setConfirming(false);
    setNote(null);
    drain.mutate(undefined, {
      onSuccess: (res) => {
        const o = res.outcome || {};
        setNote(
          o.done ? 'Run complete ✓'
            : o.gated ? 'Gated — review before continuing'
            : o.capReached ? 'Daily cap reached'
            : o.paused ? 'Paused'
            : o.stopped ? 'Stopped'
            : `Sent ${o.sentNow ?? 0} this batch`,
        );
      },
      onError: (e) => setNote(`Failed: ${e instanceof Error ? e.message : 'error'}`),
    });
  };

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: 10, background: C.panel2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: active ? C.teal : status === 'completed' ? C.green : C.ink2, border: `1px solid ${active ? C.teal : status === 'completed' ? C.green : C.line}`, borderRadius: 6, padding: '2px 8px', textTransform: 'capitalize' }}>{status}</span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>{done}/{total} · {accepted} sent{failed ? ` · ${failed} failed` : ''}</span>
        <span style={{ flex: 1 }} />
        {active && (
          confirming ? (
            <>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber }}>
                ⚠ Email {batchN} real lead{batchN === 1 ? '' : 's'}?
              </span>
              <button onClick={sendBatch} disabled={drain.isPending || batchN === 0} style={{ ...pill(true), padding: '5px 10px', borderColor: C.amber, color: C.amber, background: 'rgba(230,178,76,0.10)' }}>
                {drain.isPending ? 'Sending…' : 'Confirm send'}
              </button>
              <button onClick={() => setConfirming(false)} style={{ ...miniBtn, width: 'auto', padding: '0 10px', fontFamily: C.mono, fontSize: 10 }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirming(true)} disabled={drain.isPending || pending === 0} title={pending === 0 ? 'Nothing pending' : 'Send next batch (real email)'} style={{ ...pill(true), padding: '5px 10px', opacity: pending === 0 ? 0.5 : 1 }}>
                <SendHorizonal size={11} /> {drain.isPending ? 'Sending…' : 'Send batch'}
              </button>
              <button onClick={() => control.mutate(status === 'paused' ? 'resume' : 'pause')} title={status === 'paused' ? 'Resume' : 'Pause'} style={miniBtn}>
                {status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
              </button>
              <button onClick={() => control.mutate('stop')} title="Stop" style={{ ...miniBtn, color: C.red }}>
                <Square size={12} />
              </button>
            </>
          )
        )}
      </div>
      {/* progress bar */}
      <div style={{ height: 6, borderRadius: 4, background: C.panel, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: status === 'completed' ? C.green : C.teal, transition: 'width 200ms' }} />
      </div>
      {note && <div style={{ marginTop: 6, fontFamily: C.mono, fontSize: 10, color: note.startsWith('Failed') ? C.red : C.ink2 }}>{note}</div>}

      {/* who's in this run (transparency) */}
      <button onClick={() => setShowRecips((s) => !s)} style={{ marginTop: 8, background: 'none', border: 'none', color: C.ink3, fontFamily: C.mono, fontSize: 10, cursor: 'pointer', padding: 0 }}>
        {showRecips ? '▾ hide recipients' : '▸ view recipients'}
      </button>
      {showRecips && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
          {recipsQ.isLoading ? (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>loading…</span>
          ) : recipients.length === 0 ? (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>no recipients</span>
          ) : (
            recipients.map((rc) => (
              <div key={rc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: rc.status === 'accepted' ? C.green : rc.status === 'failed' || rc.status === 'bounced' ? C.red : rc.status === 'sending' ? C.teal : C.ink3 }} />
                <span style={{ color: C.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.normalized_email}</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: C.ink3 }}>{rc.status}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── shared styles (match CampaignsView / C palette) ──────────────────────────
const card: React.CSSProperties = { border: `1px solid ${C.line}`, borderRadius: 12, background: 'rgba(18,21,28,0.5)', padding: 16 };
const input: React.CSSProperties = { width: '100%', fontFamily: C.mono, fontSize: 12.5, padding: '9px 11px', borderRadius: 9, background: C.panel2, color: C.ink, border: `1px solid ${C.line}` };
const eyebrow: React.CSSProperties = { fontFamily: C.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, display: 'block', marginBottom: 5 };
const miniBtn: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.line}`, background: C.panel, color: C.ink2, cursor: 'pointer' };
function pill(on: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: C.mono, fontSize: 11, padding: '7px 11px', borderRadius: 8, border: `1px solid ${on ? C.teal : C.line}`, background: on ? 'rgba(47,217,201,0.10)' : C.panel2, color: on ? C.teal : C.ink2, cursor: 'pointer' };
}
function primaryBtn(enabled: boolean, pending: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 4, fontFamily: C.mono, fontSize: 12.5, fontWeight: 600, padding: 12, borderRadius: 10, border: `1px solid ${enabled ? C.teal : C.line}`, background: enabled ? 'rgba(47,217,201,0.10)' : C.panel2, color: enabled ? C.teal : C.ink3, cursor: enabled && !pending ? 'pointer' : 'not-allowed' };
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={eyebrow}>{label}</label>
      {children}
    </div>
  );
}
