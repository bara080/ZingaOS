import { NextResponse } from 'next/server';
import { getDb, ensureLogRocketIndexes } from '@/lib/db';

export const runtime = 'nodejs';

async function lrFetch(path: string) {
  const res = await fetch(`https://api.logrocket.com/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.LOGROCKET_API_KEY}` },
  });
  if (!res.ok) throw new Error(`LogRocket API ${res.status}: ${path}`);
  return res.json();
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.LOGROCKET_APP_ID!;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const data = await lrFetch(
      `/${appId}/sessions?limit=500&startTime=${sevenDaysAgo.toISOString()}&endTime=${now.toISOString()}`,
    );

    const sessions: {
      id: string;
      startTime: string;
      duration?: number;
      errors?: { message: string }[];
    }[] = Array.isArray(data?.sessions)
      ? data.sessions
      : Array.isArray(data?.data)
        ? data.data
        : [];

    // Aggregate per day
    const byDay: Record<string, { sessions: number; errorSessions: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      byDay[isoDateOnly(d)] = { sessions: 0, errorSessions: 0 };
    }

    let totalErrors = 0;
    let totalDuration = 0;

    for (const s of sessions) {
      const day = isoDateOnly(new Date(s.startTime));
      if (byDay[day]) {
        byDay[day].sessions++;
        const hasErrors = (s.errors?.length ?? 0) > 0;
        if (hasErrors) {
          byDay[day].errorSessions++;
          totalErrors++;
        }
      }
      totalDuration += s.duration ?? 0;
    }

    const trend = Object.entries(byDay).map(([date, v]) => ({
      date,
      sessions: v.sessions,
      errorSessions: v.errorSessions,
    }));

    const totalSessions = sessions.length;
    const errorFreeRate =
      totalSessions > 0
        ? Number((((totalSessions - totalErrors) / totalSessions) * 100).toFixed(2))
        : null;
    const avgDuration =
      totalSessions > 0 ? Number((totalDuration / totalSessions).toFixed(1)) : null;

    const db = await getDb('ZG');
    await ensureLogRocketIndexes();
    await db.collection('logrocket_stats').insertOne({
      totalSessions,
      errorSessions: totalErrors,
      errorFreeRate,
      avgDuration,
      trend,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, totalSessions, errorFreeRate, trend });
  } catch (err) {
    console.error('LogRocket cron sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
