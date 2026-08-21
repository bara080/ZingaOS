'use client';

// CRM · Leads — real interactive table over ops.leads. Search + stage filter +
// live counts, all from real records via /api/operator/leads. Columns follow the
// plan (subset available today); more (score, owner, next action) land as those
// fields get modeled.
import { useMemo, useState } from 'react';
import { useLeads } from '../hooks';
import { leadHandle, leadName, type Lead } from '../api';
import { C } from '@/components/operator/theme';

const STAGE_COLOR: Record<string, string> = {
  scraped: C.ink3,
  prospect: C.ink2,
  contacted: C.amber,
  replied: C.teal,
  interested: C.teal,
  qualified: C.green,
  signed: C.green,
  listed: C.green,
};

function StageBadge({ stage }: { stage: string | null }) {
  const s = stage || 'scraped';
  const col = STAGE_COLOR[s] ?? C.ink2;
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 10,
        color: col,
        border: `1px solid ${col}`,
        borderRadius: 6,
        padding: '2px 7px',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {s}
    </span>
  );
}

export function LeadsView() {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const query = useLeads({ q: q.trim() || undefined, stage: stage || undefined });
  const leads = query.data?.leads ?? [];
  const counts = query.data?.counts;

  const stages = useMemo(() => {
    const ks = Object.keys(counts?.by_stage ?? {});
    return ks.sort();
  }, [counts]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>
          Leads
        </h2>
        <span style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3 }}>
          {counts ? `${counts.total.toLocaleString()} total` : query.isLoading ? 'loading…' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search business / email / @handle…"
          style={inputStyle}
        />
        <select value={stage} onChange={(e) => setStage(e.target.value)} style={selectStyle}>
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s} ({counts?.by_stage[s]})
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr>
                {['Lead', 'Handle', 'Category', 'Borough', 'Source', 'Stage', 'Contacted'].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isError ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, color: C.red }}>
                    {query.error instanceof Error ? query.error.message : 'failed to load leads'}
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, color: C.ink3 }}>
                    {query.isLoading ? 'loading…' : 'no leads match'}
                  </td>
                </tr>
              ) : (
                leads.map((l: Lead) => (
                  <tr key={l.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ ...tdStyle, color: C.ink }}>{leadName(l)}</td>
                    <td style={{ ...tdStyle, color: C.teal }}>{leadHandle(l) ?? '—'}</td>
                    <td style={tdStyle}>{l.category || '—'}</td>
                    <td style={tdStyle}>{l.borough || '—'}</td>
                    <td style={tdStyle}>{l.source || '—'}</td>
                    <td style={tdStyle}>
                      <StageBadge stage={l.stage} />
                    </td>
                    <td style={tdStyle}>{l.contacted_at || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, marginTop: 10 }}>
        Showing {leads.length} of {counts?.total ?? leads.length} · live from ops.leads
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 12,
  padding: '8px 11px',
  borderRadius: 8,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
  width: 280,
};
const selectStyle: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 12,
  padding: '8px 11px',
  borderRadius: 8,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
};
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: C.ink3,
  padding: '10px 12px',
  background: C.panel,
  whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  fontFamily: C.sans,
  fontSize: 12.5,
  color: C.ink2,
  padding: '10px 12px',
  whiteSpace: 'nowrap',
};
