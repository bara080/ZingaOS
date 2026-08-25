'use client';

// Scrape History — durable record of every scrape run (including FAILURES),
// most recent first. Reads the real ops.scrape_runs table via
// /api/operator/scrape/runs (useScrapeRuns). Degrades gracefully: if the
// history RPC isn't applied yet the route returns an empty list and this shows
// the empty state rather than crashing. Dark palette only (C). No invented data.
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, RotateCw, History as HistoryIcon, MoreVertical, Trash2, Pause } from 'lucide-react';
import { useScrapeRuns, useScrapeRunDelete, useScrapeRunAbort } from '@/components/operator/hooks';
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
  onSync,
  syncing,
}: {
  onNavigate?: (v: CrmView) => void;
  onRerun?: (seed: RerunSeed) => void;
  onSync?: () => void;
  syncing?: boolean;
}) {
  const { data, isLoading, isError } = useScrapeRuns();
  const del = useScrapeRunDelete();
  const abort = useScrapeRunAbort();
  const runs = data?.runs ?? [];
  const pager = usePager(runs, 10, runs.length);
  const hasStuck = runs.some((r) => (r.status || '').toLowerCase() === 'running');

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
        <span style={{ flex: 1 }} />
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            style={{ ...ghostBtn(false), padding: '6px 11px', color: hasStuck ? C.amber : C.ink2, borderColor: hasStuck ? C.amber : C.line }}
            title="Re-check Apify and finalize any runs stuck on 'running' (e.g. the tab closed mid-run)"
          >
            <RotateCw size={12} style={syncing ? { animation: 'operatorPulse 1s linear infinite' } : undefined} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        )}
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
                          <RowMenu
                            run={r}
                            busy={del.isPending || abort.isPending}
                            onPause={() => abort.mutate({ id: r.id, runId: r.run_id })}
                            onDelete={() => del.mutate(r.id)}
                          />
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

// ⋮ more-options menu per run — Pause (abort, running only) + Delete (with an
// inline confirm). Renders as a fixed-position dropdown anchored to the button so
// the table's overflow never clips it. Closes on outside-click / Escape.
function RowMenu({
  run,
  busy,
  onPause,
  onDelete,
}: {
  run: ScrapeRun;
  busy: boolean;
  onPause: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const running = (run.status || '').toLowerCase() === 'running';

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
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setConfirmDel(false);
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="More options"
        aria-label="More options"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 28,
          height: 28,
          borderRadius: 7,
          border: `1px solid ${open ? C.teal : C.line}`,
          background: open ? 'rgba(47,217,201,0.10)' : C.panel2,
          color: open ? C.teal : C.ink2,
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
            width: 168,
            background: '#0e1218',
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: 5,
            boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
          }}
        >
          <MenuItem
            icon={Pause}
            label="Pause"
            disabled={!running || busy}
            title={running ? 'Abort this running scrape' : 'Only a running scrape can be paused'}
            onClick={() => {
              onPause();
              setOpen(false);
            }}
          />
          {!confirmDel ? (
            <MenuItem icon={Trash2} label="Delete" danger onClick={() => setConfirmDel(true)} />
          ) : (
            <MenuItem
              icon={Trash2}
              label={busy ? 'Deleting…' : 'Confirm delete'}
              danger
              disabled={busy}
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
  title,
}: {
  icon: typeof Pause;
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
