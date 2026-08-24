'use client';

// CRM · Scrape Leads — discover + collect leads across platforms. Layout adopts
// the reference design (header + 3 numbered steps + right Lead Profile drawer)
// but renders entirely in the Zinga OS dark palette. Wired to the REAL Apify
// pipeline: POST /scrape/start → poll /scrape/status → GET /scrape/results
// (which upserts into ops.leads). After results land we refetch leads so Step 3
// shows the new rows. Unbuilt reference features render disabled with "Soon".
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Bookmark, Plus, Radar } from 'lucide-react';
import { useScrapeResults, useScrapeStart, useScrapeStatus } from '@/components/operator/hooks';
import type { ScrapeItem, ScrapeSource } from '@/components/operator/api';
import { ConfirmModal } from '@/components/operator/ui';
import { C } from '@/components/operator/theme';
import type { Lead } from '../api';
import type { CrmView } from '../nav';
import { StepHeader, SoonTag } from './scrape/ui';
import { TargetBuilder, composeQuery } from './scrape/TargetBuilder';
import { Strategy } from './scrape/Strategy';
import { ResultsTable } from './scrape/ResultsTable';
import { LeadDrawer } from './scrape/LeadDrawer';

const SOURCE_LABEL: Record<ScrapeSource, string> = {
  google: 'Google Maps',
  ig: 'Instagram',
  tiktok: 'TikTok',
};
const TERMINAL_FAIL = new Set(['FAILED', 'ABORTED', 'TIMED-OUT', 'TIMED_OUT']);
type Phase = 'idle' | 'starting' | 'running' | 'fetching' | 'done' | 'error';

const DEFAULTS = { categories: [] as string[], location: '', source: 'google' as ScrapeSource, number: 20 };

export function ScrapeLeadsView({ onNavigate }: { onNavigate?: (v: CrmView) => void }) {
  const qc = useQueryClient();

  // ── Step 1 form state ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>(DEFAULTS.categories);
  const [location, setLocation] = useState(DEFAULTS.location);
  const [source, setSource] = useState<ScrapeSource>(DEFAULTS.source);
  const [number, setNumber] = useState(DEFAULTS.number);
  const query = composeQuery(categories, location);

  // ── scrape lifecycle ───────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  // Only THIS run's rows are shown in Step 3 (the full list lives in the Leads tab).
  const [batch, setBatch] = useState<Lead[]>([]);

  const start = useScrapeStart();
  const results = useScrapeResults();
  const polling = phase === 'running' && !!runId;
  const { data: status } = useScrapeStatus(runId, polling);
  const running = phase === 'starting' || phase === 'running' || phase === 'fetching';

  const resetForm = () => {
    setCategories(DEFAULTS.categories);
    setLocation(DEFAULTS.location);
    setSource(DEFAULTS.source);
    setNumber(DEFAULTS.number);
    setNote(null);
    setPhase('idle');
    setBatch([]);
  };

  const confirmRun = () => {
    setConfirmOpen(false);
    const q = query.trim();
    if (!q) return;
    const n = Math.max(1, Math.min(200, number || 20));
    setNote(null);
    setPhase('starting');
    start.mutate(
      { source, query: q, number: n },
      {
        onSuccess: (d) => {
          setDatasetId(d.datasetId);
          setRunId(d.runId);
          setPhase('running');
          setNote('Scraping… this spends Apify credits and saves to the private leads DB.');
        },
        onError: (e) => {
          setPhase('error');
          setNote(`⚠ ${e instanceof Error ? e.message : 'start failed'}`);
        },
      },
    );
  };

  // React to Apify run status transitions (mirrors the operator ScrapePanel).
  useEffect(() => {
    if (!polling || !status?.status) return;
    const s = status.status.toUpperCase();
    if (s === 'SUCCEEDED') {
      setRunId(null);
      setPhase('fetching');
      setNote('Fetching + saving results…');
      if (datasetId) {
        results.mutate(
          { dataset: datasetId, source },
          {
            onSuccess: (d: { found: number; dropped: number; inserted: number; items: ScrapeItem[]; dbError: string | null }) => {
              setNote(
                `✓ ${d.found} found · ${d.dropped} dropped · ${d.inserted} new saved` +
                  (d.dbError ? ` · DB: ${d.dbError}` : ''),
              );
              setPhase('done');
              // Show ONLY this run's rows in Step 3 (full list is in the Leads tab).
              setBatch(itemsToLeads(d.items, `apify-${source}`));
              // The rows were also upserted into ops.leads — refresh the Leads tab + stats.
              qc.invalidateQueries({ queryKey: ['crm', 'leads'] });
              qc.invalidateQueries({ queryKey: ['crm', 'stats'] });
            },
            onError: (e) => {
              setNote(`⚠ ${e instanceof Error ? e.message : 'results failed'}`);
              setPhase('error');
            },
          },
        );
      }
    } else if (TERMINAL_FAIL.has(s)) {
      setRunId(null);
      setNote(`⚠ run ${s.toLowerCase()}`);
      setPhase('error');
    } else {
      setNote(`Scraping… (${s.toLowerCase()})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status, polling]);

  const noteColor = phase === 'error' ? C.red : phase === 'done' ? C.green : running ? C.teal : C.ink3;

  return (
    <div style={{ width: '100%' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radar size={20} color={C.teal} />
          <div>
            <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: 0 }}>Scrape Leads</h2>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3 }}>
              Discover and collect high-quality leads across platforms
            </div>
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button disabled style={headerBtn(true)} title="Saved query templates — coming soon">
          <LayoutTemplate size={13} /> Templates <SoonTag />
        </button>
        <button disabled style={headerBtn(true)} title="Saved targets — coming soon">
          <Bookmark size={13} /> Saved Targets <SoonTag />
        </button>
        <button onClick={resetForm} style={headerBtn(false)} title="Reset the form to defaults">
          <Plus size={13} /> New Target
        </button>
      </div>

      {/* STEP 1 */}
      <div style={{ marginBottom: 20 }}>
        <StepHeader n={1} title="Build Your Target" subtitle="Compose a query, pick a source and lead count" />
        <TargetBuilder
          categories={categories}
          setCategories={setCategories}
          location={location}
          setLocation={setLocation}
          source={source}
          setSource={setSource}
          number={number}
          setNumber={setNumber}
          onStart={() => setConfirmOpen(true)}
          running={running}
        />
      </div>

      {/* STEP 2 */}
      <div style={{ marginBottom: 20 }}>
        <StepHeader n={2} title="Scraping Strategy" subtitle="Auto-generated from your target" />
        <Strategy query={query} sourceLabel={SOURCE_LABEL[source]} number={number} />
      </div>

      {/* STEP 3 */}
      <div>
        <StepHeader
          n={3}
          title="Live Results"
          subtitle="Only this run's scraped leads · the full list lives in the Leads tab"
          right={note ? <span style={{ fontFamily: C.mono, fontSize: 11, color: noteColor }}>{note}</span> : undefined}
        />
        <ResultsTable rows={batch} busy={running} onOpenLead={setOpenLead} />
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Run scrape — spends Apify credits"
        body={`Scrape up to ${Math.max(1, Math.min(200, number || 20))} leads from ${SOURCE_LABEL[source]} for "${query}".\n\nThis runs an Apify actor and spends Apify credits. Results are saved to the private leads database.`}
        confirmLabel={`Scrape ${Math.max(1, Math.min(200, number || 20))}`}
        onConfirm={confirmRun}
        onCancel={() => setConfirmOpen(false)}
      />

      <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} onNavigate={onNavigate} />
    </div>
  );
}

// Map the scrape's returned items (CleanRow shape) into Lead rows for Step 3.
// These mirror what was just upserted into ops.leads; synthetic negative ids
// keep React keys unique and never collide with real DB ids.
function itemsToLeads(items: ScrapeItem[], sourceTag: string): Lead[] {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  return items.map((it, i) => ({
    id: -(i + 1),
    business: it.business || null,
    owner: it.owner || null,
    email: it.email || null,
    phone: it.phone || null,
    instagram: it.instagram || null,
    website: it.website || null,
    borough: null,
    category: null,
    source: sourceTag,
    stage: 'scraped',
    verify_status: null,
    scraped_at: day,
    contacted_at: null,
    replied_at: null,
    notes: it.notes || null,
    reviews: null,
    created_at: now,
  }));
}

function headerBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: C.mono,
    fontSize: 11.5,
    fontWeight: 600,
    padding: '8px 13px',
    borderRadius: 9,
    border: `1px solid ${disabled ? C.line : C.teal}`,
    background: disabled ? C.panel2 : 'rgba(47,217,201,0.10)',
    color: disabled ? C.ink3 : C.teal,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  };
}
