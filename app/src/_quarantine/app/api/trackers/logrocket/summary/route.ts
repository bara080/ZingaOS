import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb('ZG');
    const events = db.collection<WithId<Document>>('telemetry_events');

    const [totalSessions, errorSessionsDocs, recentDocs, topErrorDocs, latestStats] =
      await Promise.all([
        events.countDocuments({ provider: 'logrocket' }),

        events.countDocuments({ provider: 'logrocket', 'data.hasErrors': true }),

        events.find({ provider: 'logrocket' }).sort({ timestamp: -1 }).limit(5).toArray(),

        events
          .aggregate([
            { $match: { provider: 'logrocket', 'data.hasErrors': true } },
            { $unwind: '$data.errors' },
            {
              $group: {
                _id: '$data.errors.message',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ])
          .toArray(),

        db.collection('logrocket_stats').findOne({}, { sort: { createdAt: -1 } }),
      ]);

    return NextResponse.json({
      totalSessions,
      errorFreeRate: latestStats?.errorFreeRate ?? null,
      errorSessions: errorSessionsDocs,
      avgDuration: latestStats?.avgDuration ?? null,
      trend: latestStats?.trend ?? [],
      topErrors: topErrorDocs.map((d) => ({
        message: String(d._id ?? ''),
        count: Number(d.count ?? 0),
      })),
      recentSessions: recentDocs.map((d) => ({
        id: d._id.toString(),
        sessionId: String(d.data?.sessionId ?? ''),
        url: String(d.data?.url ?? ''),
        pageUrl: String(d.data?.pageUrl ?? ''),
        duration: Number(d.data?.duration ?? 0),
        hasErrors: Boolean(d.data?.hasErrors ?? false),
        errorCount: Number(d.data?.errorCount ?? 0),
        errors: (d.data?.errors as { message: string; file: string; line: number }[]) ?? [],
        os: String(d.data?.os ?? ''),
        browser: String(d.data?.browser ?? ''),
        identity: {
          uid: String((d.data?.identity as Record<string, unknown>)?.uid ?? ''),
          name: String((d.data?.identity as Record<string, unknown>)?.name ?? ''),
          email: String((d.data?.identity as Record<string, unknown>)?.email ?? ''),
        },
        lastSeen: (d.timestamp ?? d.createdAt)?.toISOString?.() ?? new Date().toISOString(),
      })),
    });
  } catch (err) {
    console.error('LogRocket summary error:', err);
    return NextResponse.json({ error: 'Failed to load LogRocket summary' }, { status: 500 });
  }
}
