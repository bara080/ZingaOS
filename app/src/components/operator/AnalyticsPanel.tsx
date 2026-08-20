'use client';

// Analytics tab — full-width. Two sections: Overview (KPI stat tiles + the
// Sourced→Engaged→Emailable→Sent funnel) and Social Media (animated recharts
// histogram of leads per platform). All data comes from GET /api/operator/analytics.
import { useAnalytics } from './hooks';
import { Card, Eyebrow, Tile } from './ui';
import { SocialBarChart, type PlatformPoint } from './SocialBarChart';
import { C } from './theme';

export function AnalyticsPanel({ active }: { active: boolean }) {
  const { data, isLoading, isError, error } = useAnalytics(active);

  if (isLoading && !data) {
    return <LoadingBlock label="loading analytics…" />;
  }
  if (isError) {
    return <ErrorBlock message={error instanceof Error ? error.message : 'analytics failed'} />;
  }
  if (!data) return null;

  const tiles: { accent: 'g' | 'a' | 'r'; label: string; value: number; hint: string }[] = [
    { accent: 'g', label: 'Sourced', value: data.supply.sourced, hint: 'leads in pipeline' },
    { accent: 'g', label: 'Engaged', value: data.supply.icp, hint: 'beyond scraped' },
    { accent: 'g', label: 'Signed', value: data.supply.signed, hint: 'on platform' },
    {
      accent: 'a',
      label: 'Sent',
      value: data.send.sent,
      hint: `${data.send.pending} pending · ${data.send.total} emailable`,
    },
    {
      accent: data.trust.testimonials ? 'g' : 'r',
      label: 'Testimonials',
      value: data.trust.testimonials,
      hint: 'with permission',
    },
    { accent: 'r', label: 'Bookings', value: data.demand.bookings, hint: 'demand side' },
    { accent: 'g', label: 'Google leads', value: data.scrape.google, hint: 'scraped rows' },
    { accent: 'g', label: 'IG leads', value: data.scrape.ig, hint: 'scraped rows' },
    { accent: 'g', label: 'TikTok leads', value: data.scrape.tiktok, hint: 'scraped rows' },
  ];

  const funnel: { label: string; value: number }[] = [
    { label: 'Sourced', value: data.supply.sourced },
    { label: 'Engaged', value: data.supply.icp },
    { label: 'Emailable', value: data.send.total },
    { label: 'Sent', value: data.send.sent },
  ];
  const fMax = Math.max(1, ...funnel.map((f) => f.value));

  // Map source counts → platform histogram. Facebook / X have no scrape source
  // yet, so they render as 0 (still shown).
  const platforms: PlatformPoint[] = [
    { platform: 'Instagram', leads: data.scrape.ig },
    { platform: 'Facebook', leads: 0 },
    { platform: 'X', leads: 0 },
    { platform: 'TikTok', leads: data.scrape.tiktok },
    { platform: 'Google', leads: data.scrape.google },
  ];

  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>Overview</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        {tiles.map((t) => (
          <Tile key={t.label} accent={t.accent} label={t.label} value={t.value} hint={t.hint} />
        ))}
      </div>

      <Eyebrow>Funnel · Sourced → Engaged → Emailable → Sent</Eyebrow>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funnel.map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  fontFamily: C.mono,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.ink2,
                  flex: '0 0 90px',
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 26,
                  background: C.panel2,
                  borderRadius: 7,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${f.value ? Math.max((f.value / fMax) * 100, 8) : 0}%`,
                    background: `linear-gradient(90deg, ${C.teal}, ${C.green})`,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                    fontFamily: C.mono,
                    fontSize: 11,
                    color: C.bg,
                    fontWeight: 600,
                    transition: 'width 0.6s ease',
                  }}
                >
                  {f.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Eyebrow>Social Media · leads per platform</Eyebrow>
      <Card>
        <SocialBarChart data={platforms} />
      </Card>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <Card style={{ color: C.ink3, fontFamily: C.mono, fontSize: 12 }}>{label}</Card>
  );
}
function ErrorBlock({ message }: { message: string }) {
  return (
    <Card style={{ color: C.red, fontFamily: C.mono, fontSize: 12 }}>⚠ {message}</Card>
  );
}
