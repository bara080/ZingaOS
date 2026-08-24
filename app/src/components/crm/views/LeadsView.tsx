'use client';

// CRM · Leads — refactored to the Outreachify mockup: stage filter tabs with
// counts, header Import/Add-lead actions, and a rich table (avatar + name/@handle,
// Platform icon, Score, Stage, Last contacted, Next action, Actions). All real
// over ops.leads; Score/Next-action are deterministic heuristics (api.ts).
import { useMemo, useState } from 'react';
import { Instagram, Mail, Globe, Plus, Download, X } from 'lucide-react';
import { useLeads, useLeadAdd } from '../hooks';
import { leadHandle, leadName, leadNextAction, leadScore, type Lead } from '../api';
import { usePager, Pager } from '../Pager';
import type { CrmView } from '../nav';
import { C } from '@/components/operator/theme';

const STAGE_COLOR: Record<string, string> = {
  scraped: C.ink3, prospect: C.ink2, new: C.ink2,
  contacted: C.amber, replied: C.teal, interested: C.teal,
  qualified: C.green, signed: C.green, listed: C.green, won: C.green,
};

type Group = 'all' | 'new' | 'contacted' | 'replied' | 'qualified' | 'customers';
const GROUP_STAGES: Record<Exclude<Group, 'all'>, string[]> = {
  new: ['scraped', 'prospect', 'new'],
  contacted: ['contacted'],
  replied: ['replied'],
  qualified: ['qualified'],
  customers: ['signed', 'listed', 'won'],
};
function inGroup(g: Group, l: Lead): boolean {
  if (g === 'all') return true;
  const s = (l.stage || 'scraped').toLowerCase();
  if (g === 'replied') return s === 'replied' || !!l.replied_at;
  return GROUP_STAGES[g].includes(s);
}

function platformOf(l: Lead): 'instagram' | 'email' | 'other' {
  if (l.instagram) return 'instagram';
  if (l.email) return 'email';
  return 'other';
}
function PlatformIcon({ l }: { l: Lead }) {
  const p = platformOf(l);
  if (p === 'instagram') return <Instagram size={15} color={C.teal} />;
  if (p === 'email') return <Mail size={15} color={C.green} />;
  return <Globe size={15} color={C.ink3} />;
}
function scoreColor(n: number): string {
  return n >= 80 ? C.green : n >= 60 ? C.teal : n >= 40 ? C.amber : C.ink3;
}
// Where clicking a lead goes: IG profile first, then website, then email.
function leadUrl(l: Lead): string | null {
  if (l.instagram) return `https://instagram.com/${l.instagram.replace(/^@/, '')}`;
  if (l.website) return l.website.startsWith('http') ? l.website : `https://${l.website}`;
  if (l.email) return `mailto:${l.email}`;
  return null;
}

export function LeadsView({ onNavigate }: { onNavigate?: (v: CrmView) => void }) {
  const query = useLeads();
  const all = useMemo(() => query.data?.leads ?? [], [query.data]);
  const counts = query.data?.counts;

  const [group, setGroup] = useState<Group>('all');
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('all');
  const [source, setSource] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [importNote, setImportNote] = useState(false);

  const sources = useMemo(
    () => Array.from(new Set(all.map((l) => l.source).filter(Boolean))) as string[],
    [all],
  );

  // Group counts for the tabs (from full set).
  const gc = useMemo(() => {
    const c: Record<Group, number> = { all: all.length, new: 0, contacted: 0, replied: 0, qualified: 0, customers: 0 };
    for (const l of all) {
      (['new', 'contacted', 'replied', 'qualified', 'customers'] as const).forEach((g) => {
        if (inGroup(g, l)) c[g]++;
      });
    }
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(
      (l) =>
        inGroup(group, l) &&
        (platform === 'all' || platformOf(l) === platform) &&
        (source === 'all' || l.source === source) &&
        (!s ||
          leadName(l).toLowerCase().includes(s) ||
          (l.email || '').toLowerCase().includes(s) ||
          (l.instagram || '').toLowerCase().includes(s)),
    );
  }, [all, group, platform, source, q]);

  const pager = usePager(filtered, 25, `${group}|${q}|${platform}|${source}`);

  const TABS: { key: Group; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'replied', label: 'Replied' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'customers', label: 'Customers' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Leads</h2>
        <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3 }}>
          {counts ? `${counts.total.toLocaleString()} total` : query.isLoading ? 'loading…' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => setImportNote((v) => !v)} style={btn(false)}>
          <Download size={13} /> Import leads
        </button>
        <button onClick={() => setAddOpen(true)} style={btn(true)}>
          <Plus size={13} /> Add lead
        </button>
      </div>

      {importNote && (
        <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 9, background: 'rgba(230,178,76,0.06)', padding: 10, marginBottom: 12 }}>
          Bulk import runs through the Apify sourcing pipeline (operator · Scrape). Use “Add lead” here for one-offs.
        </div>
      )}

      {/* stage tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const on = group === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setGroup(t.key)}
              style={{
                fontFamily: C.sans, fontSize: 12.5, fontWeight: on ? 600 : 500,
                color: on ? C.teal : C.ink2, background: 'transparent', border: 'none',
                borderBottom: `2px solid ${on ? C.teal : 'transparent'}`, padding: '7px 11px', marginBottom: -1, cursor: 'pointer',
              }}
            >
              {t.label} <span style={{ color: C.ink3, fontSize: 11 }}>{gc[t.key]}</span>
            </button>
          );
        })}
      </div>

      {/* filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads…" style={{ ...ctrl, width: 240 }} />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={ctrl}>
          <option value="all">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="email">Email</option>
          <option value="other">Other</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={ctrl}>
          <option value="all">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* table */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                {['Lead', 'Platform', 'Category', 'Score', 'Stage', 'Last contacted', 'Next action', ''].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isError ? (
                <tr><td colSpan={8} style={{ ...td, color: C.red }}>{query.error instanceof Error ? query.error.message : 'failed to load'}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, color: C.ink3 }}>{query.isLoading ? 'loading…' : 'no leads match'}</td></tr>
              ) : (
                pager.slice.map((l: Lead) => {
                  const score = leadScore(l);
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={td}>
                        {(() => {
                          const url = leadUrl(l);
                          const inner = (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={avatar}>{leadName(l).charAt(0).toUpperCase()}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{leadName(l)}</div>
                                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.teal }}>{leadHandle(l) ?? l.email ?? '—'}</div>
                              </div>
                            </div>
                          );
                          return url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open ${leadHandle(l) ?? l.website ?? l.email ?? 'lead'}`}
                              style={{ textDecoration: 'none' }}
                            >
                              {inner}
                            </a>
                          ) : (
                            inner
                          );
                        })()}
                      </td>
                      <td style={td}><PlatformIcon l={l} /></td>
                      <td style={{ ...td, color: C.ink3 }}>{l.category || '—'}</td>
                      <td style={td}>
                        <span style={{ fontFamily: C.mono, fontSize: 11, color: scoreColor(score), border: `1px solid ${scoreColor(score)}`, borderRadius: 6, padding: '2px 7px' }}>{score}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontFamily: C.mono, fontSize: 10, color: STAGE_COLOR[(l.stage || 'scraped').toLowerCase()] ?? C.ink2, textTransform: 'capitalize' }}>
                          {l.stage || 'scraped'}
                        </span>
                      </td>
                      <td style={{ ...td, color: C.ink3 }}>{l.contacted_at || '—'}</td>
                      <td style={{ ...td, color: C.ink2 }}>{leadNextAction(l)}</td>
                      <td style={td}>
                        <button onClick={() => onNavigate?.('dm-queue')} style={rowAction} title="Work this lead in the DM Queue">
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pager p={pager} noun="leads" />

      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} sources={sources} />}
    </div>
  );
}

function AddLeadModal({ onClose, sources }: { onClose: () => void; sources: string[] }) {
  const add = useLeadAdd();
  const [business, setBusiness] = useState('');
  const [instagram, setInstagram] = useState('');
  const [email, setEmail] = useState('');
  const [src, setSrc] = useState(sources[0] ?? 'manual');
  const [flash, setFlash] = useState<string | null>(null);
  const canAdd = !!(business.trim() || instagram.trim() || email.trim());

  const submit = () => {
    if (!canAdd || add.isPending) return;
    setFlash(null);
    add.mutate(
      { business, instagram, email, source: src },
      {
        onSuccess: (r) => {
          if (r.added) { setFlash('Lead added ✓'); setBusiness(''); setInstagram(''); setEmail(''); }
          else setFlash('Already exists (deduped) — not added.');
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: C.sans, fontSize: 15, fontWeight: 600, color: C.ink }}>Add lead</div>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...rowAction, border: 'none', background: 'transparent' }}><X size={16} /></button>
        </div>
        <L label="Business name"><input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Luxe Cuts NYC" style={ctrlFull} /></L>
        <L label="Instagram @handle"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="luxecutsnyc" style={ctrlFull} /></L>
        <L label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hi@luxecutsnyc.com" style={ctrlFull} /></L>
        <L label="Source">
          <select value={src} onChange={(e) => setSrc(e.target.value)} style={ctrlFull}>
            <option value="manual">manual</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </L>
        <button
          onClick={submit}
          disabled={!canAdd || add.isPending}
          style={{ width: '100%', marginTop: 6, fontFamily: C.mono, fontSize: 12.5, fontWeight: 600, padding: 11, borderRadius: 10, border: `1px solid ${canAdd ? C.teal : C.line}`, background: canAdd ? 'rgba(47,217,201,0.10)' : C.panel2, color: canAdd ? C.teal : C.ink3, cursor: canAdd ? 'pointer' : 'not-allowed' }}
        >
          {add.isPending ? 'Adding…' : 'Add lead'}
        </button>
        {flash && <div style={{ marginTop: 10, fontFamily: C.mono, fontSize: 11, color: flash.startsWith('Failed') ? C.red : flash.startsWith('Already') ? C.amber : C.green }}>{flash}</div>}
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink3, padding: '10px 12px', background: C.panel, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { fontFamily: C.sans, fontSize: 12.5, color: C.ink2, padding: '9px 12px', whiteSpace: 'nowrap' };
const avatar: React.CSSProperties = { width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: C.teal };
const ctrl: React.CSSProperties = { fontFamily: C.mono, fontSize: 12, padding: '8px 11px', borderRadius: 8, background: C.panel2, color: C.ink, border: `1px solid ${C.line}` };
const ctrlFull: React.CSSProperties = { ...ctrl, width: '100%' };
const rowAction: React.CSSProperties = { fontFamily: C.mono, fontSize: 10.5, padding: '5px 11px', borderRadius: 7, border: `1px solid ${C.line}`, background: C.panel2, color: C.ink2, cursor: 'pointer' };
function btn(primary: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.mono, fontSize: 11.5, fontWeight: 600, padding: '8px 13px', borderRadius: 9, border: `1px solid ${primary ? C.teal : C.line}`, background: primary ? 'rgba(47,217,201,0.10)' : C.panel2, color: primary ? C.teal : C.ink2, cursor: 'pointer' };
}
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 };
const modal: React.CSSProperties = { width: 360, maxWidth: '100%', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
