'use client';

// Scrape tab — full-width. Source pills (Google / Instagram / TikTok), a query,
// and a count. Run → POST /api/operator/scrape/start (useMutation), then poll
// /scrape/status (useQuery refetchInterval) until terminal, then fetch
// /scrape/results and render the table. A confirm dialog guards the run because
// it spends Apify credits.
import { useEffect, useMemo, useState } from 'react';
import { useScrapeResults, useScrapeStart, useScrapeStatus } from './hooks';
import type { ScrapeItem, ScrapeSource } from './api';
import { Card, ConfirmModal, Eyebrow } from './ui';
import { C } from './theme';

const SOURCES: { id: ScrapeSource; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'ig', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
];
const SOURCE_LABEL: Record<ScrapeSource, string> = {
  google: 'Google Maps',
  ig: 'Instagram',
  tiktok: 'TikTok',
};
const TERMINAL_FAIL = new Set(['FAILED', 'ABORTED', 'TIMED-OUT', 'TIMED_OUT']);

type Phase = 'idle' | 'starting' | 'running' | 'fetching' | 'done' | 'error';

export function ScrapePanel() {
  const [source, setSource] = useState<ScrapeSource>('google');
  const [query, setQuery] = useState('');
  const [num, setNum] = useState(20);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [runId, setRunId] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [statusText, setStatusText] = useState(
    'idle · scraped leads are saved to the private leads database',
  );
  const [items, setItems] = useState<ScrapeItem[]>([]);
  const [summary, setSummary] = useState('');

  const start = useScrapeStart();
  const results = useScrapeResults();
  const polling = phase === 'running' && !!runId;
  const { data: status } = useScrapeStatus(runId, polling);

  // React to Apify run status transitions.
  useEffect(() => {
    if (!polling || !status?.status) return;
    const s = status.status.toUpperCase();
    if (s === 'SUCCEEDED') {
      setRunId(null);
      setPhase('fetching');
      setStatusText('fetching results…');
      if (datasetId) {
        results.mutate(
          { dataset: datasetId, source },
          {
            onSuccess: (d) => {
              setItems(d.items ?? []);
              setSummary(`${d.found} found · ${d.dropped} dropped · ${d.inserted} new saved`);
              setStatusText(
                `✓ ${d.found} found · ${d.dropped} dropped · ${d.inserted} new saved` +
                  (d.dbError ? ` · DB: ${d.dbError}` : ''),
              );
              setPhase('done');
            },
            onError: (e) => {
              setStatusText(`⚠ ${e instanceof Error ? e.message : 'results failed'}`);
              setPhase('error');
            },
          },
        );
      }
    } else if (TERMINAL_FAIL.has(s)) {
      setRunId(null);
      setStatusText(`⚠ run ${s.toLowerCase()}`);
      setPhase('error');
    } else {
      setStatusText(`scraping… (${s.toLowerCase()})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, polling]);

  const running = phase === 'starting' || phase === 'running' || phase === 'fetching';

  const doRun = () => {
    const q = query.trim();
    if (!q) {
      setPhase('error');
      setStatusText('enter a query first');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmRun = () => {
    setConfirmOpen(false);
    const q = query.trim();
    const n = Math.max(1, Math.min(200, num || 20));
    setItems([]);
    setSummary('');
    setPhase('starting');
    setStatusText('starting…');
    start.mutate(
      { source, query: q, number: n },
      {
        onSuccess: (d) => {
          setDatasetId(d.datasetId);
          setRunId(d.runId);
          setPhase('running');
          setStatusText('scraping…');
        },
        onError: (e) => {
          setPhase('error');
          setStatusText(`⚠ ${e instanceof Error ? e.message : 'start failed'}`);
        },
      },
    );
  };

  const social = source === 'ig' || source === 'tiktok';
  const cols = social ? ['Handle', 'Link', 'Bio / icebreaker'] : ['Name', 'Email', 'Phone', 'Website'];
  const statusColor =
    phase === 'error' ? C.red : phase === 'done' ? C.green : running ? C.teal : C.ink3;

  const numClamped = useMemo(() => Math.max(1, Math.min(200, num || 20)), [num]);

  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>Scrape leads</Eyebrow>
      <Card>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flex: '0 0 270px' }}>
            {SOURCES.map((s) => {
              const on = source === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  style={{
                    flex: 1,
                    fontFamily: C.mono,
                    fontSize: 10,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `1px solid ${on ? C.teal : C.line}`,
                    background: on ? 'rgba(47,217,201,0.1)' : C.panel2,
                    color: on ? C.teal : C.ink2,
                    fontWeight: on ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !running && doRun()}
            placeholder="hair stylist nyc"
            style={{
              flex: 1,
              minWidth: 180,
              fontFamily: C.mono,
              fontSize: 12.5,
              padding: 11,
              borderRadius: 9,
              background: C.panel2,
              color: C.ink,
              border: `1px solid ${C.line}`,
            }}
          />
          <input
            type="number"
            min={1}
            max={200}
            value={num}
            onChange={(e) => setNum(parseInt(e.target.value) || 0)}
            title="how many to scrape (max 200)"
            style={{
              flex: '0 0 78px',
              fontFamily: C.mono,
              fontSize: 12.5,
              padding: 11,
              borderRadius: 9,
              background: C.panel2,
              color: C.ink,
              border: `1px solid ${C.line}`,
            }}
          />
          <button
            onClick={doRun}
            disabled={running}
            style={{
              flex: '0 0 auto',
              fontFamily: C.mono,
              fontSize: 12.5,
              padding: '12px 20px',
              borderRadius: 9,
              border: `1px solid ${C.teal}`,
              background: 'rgba(47,217,201,0.08)',
              color: C.teal,
              cursor: running ? 'not-allowed' : 'pointer',
              opacity: running ? 0.4 : 1,
              fontWeight: 600,
            }}
          >
            {running ? 'Running…' : 'Run scrape'}
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: C.mono,
            fontSize: 11,
            minHeight: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: statusColor,
          }}
        >
          {running && <Spinner />}
          {statusText}
        </div>
      </Card>

      <Eyebrow>
        Results {summary && <span style={{ color: C.ink3 }}>· {summary}</span>}
      </Eyebrow>
      <Card style={{ maxHeight: 340, overflow: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} style={th}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ ...td, color: C.ink3 }}>
                  run a scrape to see leads
                </td>
              </tr>
            ) : (
              items.slice(0, 200).map((it, i) => (
                <tr key={i}>
                  {social ? (
                    <>
                      <td style={{ ...td, fontFamily: C.mono, color: C.ink2 }}>
                        {it.instagram ? `@${it.instagram}` : '—'}
                      </td>
                      <td style={td}>
                        {it.website ? (
                          <a
                            href={it.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: C.teal, textDecoration: 'none' }}
                          >
                            open ↗
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={td}>{it.notes || ''}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{it.business}</td>
                      <td style={{ ...td, fontFamily: C.mono, color: C.ink2 }}>{it.email}</td>
                      <td style={{ ...td, fontFamily: C.mono, color: C.ink2 }}>{it.phone}</td>
                      <td style={{ ...td, fontFamily: C.mono, color: C.ink2 }}>{it.website}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="Run scrape — spends Apify credits"
        body={`Scrape up to ${numClamped} leads from ${SOURCE_LABEL[source]} for "${query.trim()}".\n\nThis runs an Apify actor and spends Apify credits. Results are saved to the private leads database.`}
        confirmLabel={`Scrape ${numClamped}`}
        onConfirm={confirmRun}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

const th: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.ink3,
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: `1px solid ${C.line}`,
  position: 'sticky',
  top: 0,
  background: C.panel,
};
const td: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: `1px solid ${C.panel2}`,
};

function Spinner() {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: C.teal,
        boxShadow: `0 0 8px ${C.teal}`,
        display: 'inline-block',
        animation: 'operatorPulse 1.1s infinite',
      }}
    />
  );
}
