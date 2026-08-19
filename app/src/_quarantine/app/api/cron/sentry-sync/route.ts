import { NextResponse } from 'next/server';
import { getDb, ensureSentryIndexes } from '@/lib/db';

export const runtime = 'nodejs';

async function sentryFetch(path: string) {
  const res = await fetch(`https://sentry.io/api/0${path}`, {
    headers: { Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Sentry API ${res.status}: ${path}`);
  return res.json();
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const org = process.env.SENTRY_ORG_SLUG!;
  const project = process.env.SENTRY_PROJECT_SLUG!;

  try {
    const [statsData, sessionData] = await Promise.all([
      sentryFetch(
        `/organizations/${org}/stats_v2/?field=event.count&interval=1d&statsPeriod=7d&project=${project}`,
      ),
      sentryFetch(
        `/organizations/${org}/sessions/?field=crash_free_rate(session)&field=sum(session)&statsPeriod=7d&project=${project}`,
      ),
    ]);

    const intervals: string[] = statsData?.intervals ?? [];
    const seriesValues: number[] =
      statsData?.groups?.[0]?.series?.['event.count'] ?? Array(intervals.length).fill(0);

    const trend = intervals.map((date: string, i: number) => ({
      date: date.slice(0, 10),
      count: seriesValues[i] ?? 0,
    }));

    const rawCrashFree =
      sessionData?.groups?.[0]?.totals?.['crash_free_rate(session)'];
    const crashFreeRate =
      rawCrashFree != null
        ? Number((rawCrashFree * 100).toFixed(2))
        : null;

    const totalSessions: number | null =
      sessionData?.groups?.[0]?.totals?.['sum(session)'] ?? null;
    const totalErrors = trend.reduce((s, d) => s + d.count, 0);
    const errorRate =
      totalSessions && totalSessions > 0
        ? Number(((totalErrors / totalSessions) * 100).toFixed(2))
        : null;

    const environments: string[] = [
      ...new Set<string>(
        (statsData?.groups ?? []).map(
          (g: Record<string, unknown>) =>
            String((g.by as Record<string, unknown>)?.environment ?? 'production'),
        ),
      ),
    ];

    const db = await getDb('ZG');
    await ensureSentryIndexes();
    await db.collection('sentry_stats').insertOne({
      crashFreeRate,
      errorRate,
      trend,
      environments,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, crashFreeRate, errorRate, trend });
  } catch (err) {
    console.error('Sentry cron sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
