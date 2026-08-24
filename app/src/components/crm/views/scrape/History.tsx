'use client';

// Scrape History — durable record of every scrape run (including FAILURES),
// most recent first. Reads the real ops.scrape_runs table via
// /api/operator/scrape/runs (useScrapeRuns). Degrades gracefully: if the
// history RPC isn't applied yet the route returns an empty list and this shows
// the empty state rather than crashing. Dark palette only (C). No invented data.
import { ExternalLink, Eye, RotateCw, History as HistoryIcon } from 'lucide-react';
import { useScrapeRuns } from '@/components/operator/hooks';
import type { ScrapeRun } from '@/components/operator/api';
import { C } from '@/components/operator/theme';
import type { CrmView } from '../../nav';
import { usePager, Pager } from '../../Pager';
import { SourceIcon, relTime, ghostBtn } from './ui';

// A run the Step-1 form can be re-prefilled from.
export type RerunSeed = { source: ScrapeRun['source']; query: string; number: number };

// Colored status badge. running → teal, succeeded → green, failed → red.
function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const color = s === 'succeeded' ? C.green : s === 'failed' ? C.red : C.teal;
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 10,
        textTransform: 'capitalize',
        color,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {s === 'running' ? 'running…' : s || 'running'}
    </span>
  );
}

// ms → "820ms" / "1.4s" / "2m 5s". Returns "—" when absent (never fabricated).
function fmtDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function num(n: number | null): string {
  return n == null ? '—' : String(n);
}

export function History({
  onNavigate,
  onRerun,
}: {
  onNavigate?: (v: CrmView) => void;
  onRerun?: (seed: RerunSeed) => void;
}) {
  const { data, isLoading, isError } = useScrapeRuns();
  const runs = data?.runs ?? [];
  const pager = usePager(runs, 10, runs.length);

  return (
    <div>
      {/* section header (NOT numbered — plain header + subtitle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: C.panel2,
            border: `1px solid ${C.line}`,
            color: C.ink2,
            flexShrink: 0,
          }}
        >
          <HistoryIcon size={13} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: C.sans, fontSize: 14.5, fontWeight: 600, color: C.ink }}>
            Scrape History
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>
            Recent runs — monitor status, yield and failures
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr>
                {['When', 'Who', 'Source', 'Query', 'N', 'Status', 'Found', 'Dropped', 'Inserted', 'Duration', 'Apify', ''].map(
                  (h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} style={{ ...td, color: C.ink3 }}>
                    loading…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={12} style={{ ...td, color: C.ink3 }}>
                    Scrape history is unavailable right now.
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ ...td, color: C.ink3 }}>
                    No scrape runs yet.
                  </td>
                </tr>
              ) : (
                pager.slice.map((r) => {
                  const apify = r.run_id
                    ? `https://console.apify.com/actors/runs/${r.run_id}`
                    : null;
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono, fontSize: 10.5 }}>
                        {relTime(r.started_at)}
                      </td>
                      <td style={{ ...td, color: C.ink2, fontFamily: C.mono, fontSize: 10.5 }}>
                        {r.actor || '—'}
                      </td>
                      <td style={td}>
                        <SourceIcon source={r.source} />
                      </td>
                      <td style={{ ...td, color: C.ink, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.query || ''}>
                        {r.query || '—'}
                      </td>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono }}>{num(r.number)}</td>
                      <td style={td}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ ...td, color: C.ink2, fontFamily: C.mono }}>{num(r.found)}</td>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono }}>{num(r.dropped)}</td>
                      <td style={{ ...td, color: C.green, fontFamily: C.mono }}>{num(r.inserted)}</td>
                      <td style={{ ...td, color: C.ink3, fontFamily: C.mono, fontSize: 10.5 }}>
                        {fmtDuration(r.duration_ms)}
                      </td>
                      <td style={td}>
                        {apify ? (
                          <a
                            href={apify}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: C.teal, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: C.mono, fontSize: 10.5 }}
                            title="Open this run in the Apify console"
                          >
                            Run <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ color: C.ink3, fontFamily: C.mono, fontSize: 10.5 }}>—</span>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => onNavigate?.('leads')}
                            style={{ ...ghostBtn(false), padding: '5px 9px' }}
                            title="View leads in the Leads tab"
                          >
                            <Eye size={12} /> Leads
                          </button>
                          {onRerun && (
                            <button
                              onClick={() =>
                                onRerun({ source: r.source, query: r.query || '', number: r.number || 20 })
                              }
                              style={{ ...ghostBtn(false), padding: '5px 9px' }}
                              title="Prefill Step 1 from this run"
                            >
                              <RotateCw size={12} /> Re-run
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pager p={pager} noun="runs" />
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: C.ink3,
  padding: '10px 12px',
  background: C.panel,
  whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  fontFamily: C.sans,
  fontSize: 12.5,
  color: C.ink2,
  padding: '9px 12px',
  whiteSpace: 'nowrap',
};
