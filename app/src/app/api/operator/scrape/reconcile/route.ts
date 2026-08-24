import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import { apifyStatus, apifyItems, isScrapeSource, type ScrapeSource, type CleanRow } from '@/lib/operator/apify';

// POST /api/operator/scrape/reconcile
// Self-heals scrape runs that were orphaned as 'running' — this happens when the
// browser tab that started a run closed before Apify finished, so the client
// never saw the terminal status and never fetched/saved results. Here we re-check
// each running run against Apify SERVER-SIDE and finalize it:
//   SUCCEEDED → fetch dataset → upsert into ops.leads → finish 'succeeded' + counts
//   FAILED/ABORTED/TIMED-OUT → finish 'failed'
//   still running → leave it (an active tab may still be polling)
// Auth-gated (operator roles). Best-effort per run — one bad run never blocks the
// others. Called on the Scrape Leads view mount + the Scrape History "Sync" button.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FAIL = new Set(['FAILED', 'ABORTED', 'TIMED-OUT', 'TIMED_OUT']);

type RunningRow = {
  id: number;
  source: string | null;
  run_id: string | null;
  dataset_id: string | null;
};

export async function POST() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_scrape_runs_running');
  if (error) {
    // RPC not applied yet / transient — degrade gracefully, never 500 the UI.
    return NextResponse.json({ reconciled: 0, checked: 0, error: error.message });
  }

  const running = (data ?? []) as RunningRow[];
  const scrapedAt = new Date().toISOString().slice(0, 10);
  let reconciled = 0;
  // Healed SUCCEEDED runs — returned so the client can surface the recovered
  // leads in Live Results (not just the History row).
  const healed: { source: ScrapeSource; items: CleanRow[]; found: number; dropped: number; inserted: number }[] = [];

  for (const r of running) {
    try {
      const source = r.source;
      const runId = r.run_id ?? '';
      const datasetId = r.dataset_id ?? '';
      if (!runId || !isScrapeSource(source)) continue;

      const st = await apifyStatus(runId);
      const s = (st.status ?? '').toUpperCase();

      if (s === 'SUCCEEDED') {
        const items = await apifyItems(datasetId, source);
        if ('error' in items) continue; // leave running; try again next reconcile

        let inserted = 0;
        if (items.items.length) {
          const payload = items.items.map((row) => ({
            business: row.business,
            owner: row.owner,
            email: row.email,
            phone: row.phone,
            instagram: row.instagram,
            website: row.website,
            borough: '',
            category: '',
            source: `apify-${source}`,
            stage: 'scraped',
            scraped_at: scrapedAt,
            notes: row.notes,
          }));
          const up = await admin.rpc('operator_upsert_leads', { p_leads: payload });
          inserted = Number(up.data) || 0;
        }
        await admin.rpc('operator_scrape_run_finish', {
          p_id: r.id,
          p_status: 'succeeded',
          p_found: items.found,
          p_dropped: items.dropped,
          p_inserted: inserted,
          p_error: null,
          p_duration_ms: st.durationMs ?? null, // REAL Apify runtime, not now()-started_at
        });
        healed.push({ source, items: items.items, found: items.found, dropped: items.dropped, inserted });
        reconciled++;
      } else if (FAIL.has(s)) {
        await admin.rpc('operator_scrape_run_finish', {
          p_id: r.id,
          p_status: 'failed',
          p_found: 0,
          p_dropped: 0,
          p_inserted: 0,
          p_error: `run ${s.toLowerCase()}`,
          p_duration_ms: st.durationMs ?? null,
        });
        reconciled++;
      }
      // else: still running — leave it for a future reconcile / active tab.
    } catch {
      /* best-effort: skip this run, keep going */
    }
  }

  return NextResponse.json({ reconciled, checked: running.length, healed });
}
