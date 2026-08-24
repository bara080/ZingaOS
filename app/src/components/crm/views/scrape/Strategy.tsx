'use client';

// Scrape · Step 2 — "Scraping Strategy (Auto-generated)". Every value is DERIVED
// from the real Step 1 selections — no invented scores. Active Campaigns reads
// the real ops campaigns via useCampaigns; if it fails/empty it degrades to 0s.
import { useMemo } from 'react';
import { C } from '@/components/operator/theme';
import { useCampaigns } from '../../hooks';
import { StatTile, card } from './ui';

// A transparent, clearly-estimated duration band from the requested lead count.
function estDuration(n: number): string {
  if (n <= 50) return '~1–3 min';
  if (n <= 120) return '~3–6 min';
  return '~6–10 min';
}

export function Strategy({
  query,
  sourceLabel,
  number,
}: {
  query: string;
  sourceLabel: string;
  number: number;
}) {
  const campaignsQ = useCampaigns();
  const campaigns = useMemo(() => campaignsQ.data?.campaigns ?? [], [campaignsQ.data]);
  const running = campaigns.filter((c) => (c.status || '').toLowerCase() === 'active').length;
  const queued = campaigns.filter((c) => {
    const s = (c.status || '').toLowerCase();
    return s === 'queued' || s === 'draft' || s === 'paused';
  }).length;

  const queryCount = query ? 1 : 0;

  return (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatTile label="Search Queries" value={String(queryCount)} />
        <StatTile label="Sources Selected" value={query ? '1' : '0'} hint="one per run" />
        <StatTile label="Est. Duration" value={estDuration(Math.max(1, Math.min(200, number || 20)))} hint="estimate" />
        <StatTile label="Lead Quality" value="—" hint="filters not wired" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, marginTop: 14 }}>
        {/* Preview Queries — the actual string(s) sent to Apify */}
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, marginBottom: 8 }}>
            Preview Queries
          </div>
          {query ? (
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 12,
                color: C.ink,
                border: `1px solid ${C.line}`,
                borderRadius: 9,
                background: C.panel2,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: C.teal }}>{sourceLabel}</span>
              <span style={{ color: C.ink3 }}>›</span>
              <span>&ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, border: `1px dashed ${C.line}`, borderRadius: 9, padding: '10px 12px' }}>
              Pick a category or type a location to compose the query.
            </div>
          )}
        </div>

        {/* Active Campaigns — real counts */}
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, marginBottom: 8 }}>
            Active Campaigns
          </div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, background: C.panel2, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <MiniRow k="Running" v={campaignsQ.isLoading ? '…' : String(running)} accent={C.green} />
            <MiniRow k="Queued" v={campaignsQ.isLoading ? '…' : String(queued)} accent={C.amber} />
            <MiniRow k="Total" v={campaignsQ.isLoading ? '…' : String(campaigns.length)} accent={C.ink2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ k, v, accent }: { k: string; v: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>{k}</span>
      <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: accent }}>{v}</span>
    </div>
  );
}
