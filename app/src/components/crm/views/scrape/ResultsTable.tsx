'use client';

// Scrape · Step 3 — "Live Results". Shows ONLY the leads from the current scrape
// run (the batch returned by /scrape/results), not the whole ops.leads table —
// the full list lives in the Leads tab. Stage filter tabs, drawer on click,
// @handle links out via leadUrl, Export CSVs the current filter. Columns/grid
// toggles are roadmap ("Soon"). Pagination uses the shared Pager.
import { useMemo, useState } from 'react';
import { Columns3, Download, LayoutGrid, List, ExternalLink, Eye } from 'lucide-react';
import { leadHandle, leadName, leadScore, type Lead } from '../../api';
import { usePager, Pager } from '../../Pager';
import { C } from '@/components/operator/theme';
import { SoonTag, SourceIcon, STAGE_COLOR, avatar, ghostBtn, leadUrl, relTime, scoreColor } from './ui';

type Group = 'all' | 'new' | 'qualified' | 'contacted' | 'converted';
const GROUP_STAGES: Record<Exclude<Group, 'all'>, string[]> = {
  new: ['scraped', 'prospect', 'new'],
  qualified: ['qualified'],
  contacted: ['contacted'],
  converted: ['signed', 'listed', 'won'],
};
function inGroup(g: Group, l: Lead): boolean {
  if (g === 'all') return true;
  const s = (l.stage || 'scraped').toLowerCase();
  return GROUP_STAGES[g].includes(s);
}

function toCsv(rows: Lead[]): string {
  const head = ['business', 'handle', 'category', 'location', 'source', 'score', 'stage', 'added'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((l) =>
    [
      leadName(l),
      leadHandle(l) ?? '',
      l.category ?? '',
      l.borough ?? '',
      l.source ?? '',
      String(leadScore(l)),
      l.stage ?? 'scraped',
      l.created_at ?? l.scraped_at ?? '',
    ]
      .map((v) => esc(String(v)))
      .join(','),
  );
  return [head.join(','), ...lines].join('\n');
}

export function ResultsTable({
  rows,
  busy,
  onOpenLead,
}: {
  rows: Lead[];
  busy?: boolean;
  onOpenLead: (l: Lead) => void;
}) {
  const all = useMemo(() => {
    const r = [...rows];
    // Newest first so freshly scraped leads surface at the top.
    r.sort((a, b) => {
      const ta = new Date(a.created_at || a.scraped_at || 0).getTime();
      const tb = new Date(b.created_at || b.scraped_at || 0).getTime();
      return tb - ta;
    });
    return r;
  }, [rows]);

  const [group, setGroup] = useState<Group>('all');

  const gc = useMemo(() => {
    const c: Record<Group, number> = { all: all.length, new: 0, qualified: 0, contacted: 0, converted: 0 };
    for (const l of all) {
      (['new', 'qualified', 'contacted', 'converted'] as const).forEach((g) => {
        if (inGroup(g, l)) c[g]++;
      });
    }
    return c;
  }, [all]);

  const filtered = useMemo(() => all.filter((l) => inGroup(group, l)), [all, group]);
  const pager = usePager(filtered, 25, group);

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrape-leads-${group}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: { key: Group; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'converted', label: 'Converted' },
  ];

  return (
    <div>
      {/* toolbar: stage tabs + column/export/view controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const on = group === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setGroup(t.key)}
                style={{
                  fontFamily: C.mono,
                  fontSize: 11,
                  padding: '6px 11px',
                  borderRadius: 8,
                  border: `1px solid ${on ? C.teal : C.line}`,
                  background: on ? 'rgba(47,217,201,0.10)' : 'transparent',
                  color: on ? C.teal : C.ink2,
                  cursor: 'pointer',
                }}
              >
                {t.label} <span style={{ color: C.ink3 }}>{gc[t.key]}</span>
              </button>
            );
          })}
        </div>
        <span style={{ flex: 1 }} />
        <button disabled style={{ ...ghostBtn(true) }} title="Column config — coming soon">
          <Columns3 size={13} /> Columns <SoonTag />
        </button>
        <button onClick={exportCsv} style={ghostBtn(false)} title="Export the current filter as CSV">
          <Download size={13} /> Export
        </button>
        <div style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden', opacity: 0.55 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, background: C.panel2, color: C.teal, borderRight: `1px solid ${C.line}` }}>
            <List size={14} />
          </span>
          <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, background: C.panel2, color: C.ink3, cursor: 'not-allowed' }} title="Grid view — coming soon">
            <LayoutGrid size={14} />
          </span>
        </div>
        <SoonTag />
      </div>

      {/* table */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {['Business', 'Category', 'Location', 'Source', 'Followers', 'Score', 'Stage', 'Added', ''].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...td, color: C.ink3 }}>{busy ? 'scraping…' : 'No results yet — run a scrape above. Your full lead list lives in the Leads tab.'}</td></tr>
              ) : (
                pager.slice.map((l) => {
                  const score = leadScore(l);
                  const url = leadUrl(l);
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <button onClick={() => onOpenLead(l)} style={{ ...avatar, cursor: 'pointer' }} title="Open profile">
                            {leadName(l).charAt(0).toUpperCase()}
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <button
                              onClick={() => onOpenLead(l)}
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: C.sans, fontSize: 12.5, color: C.ink, fontWeight: 600, textAlign: 'left' }}
                            >
                              {leadName(l)}
                            </button>
                            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.teal }}>
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.teal, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  {leadHandle(l) ?? l.website ?? l.email ?? '—'} <ExternalLink size={9} />
                                </a>
                              ) : (
                                leadHandle(l) ?? '—'
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, color: C.ink3 }}>{l.category || '—'}</td>
                      <td style={{ ...td, color: C.ink3 }}>{l.borough || '—'}</td>
                      <td style={td}><SourceIcon source={l.source} /></td>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono }}>—</td>
                      <td style={td}>
                        <span style={{ fontFamily: C.mono, fontSize: 11, color: scoreColor(score), border: `1px solid ${scoreColor(score)}`, borderRadius: 6, padding: '2px 7px' }}>{score}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontFamily: C.mono, fontSize: 10, color: STAGE_COLOR[(l.stage || 'scraped').toLowerCase()] ?? C.ink2, textTransform: 'capitalize' }}>
                          {l.stage || 'scraped'}
                        </span>
                      </td>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono, fontSize: 10.5 }}>{relTime(l.created_at || l.scraped_at)}</td>
                      <td style={td}>
                        <button onClick={() => onOpenLead(l)} style={{ ...ghostBtn(false), padding: '5px 9px' }} title="View profile">
                          <Eye size={12} /> View
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
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink3, padding: '10px 12px', background: C.panel, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { fontFamily: C.sans, fontSize: 12.5, color: C.ink2, padding: '9px 12px', whiteSpace: 'nowrap' };
