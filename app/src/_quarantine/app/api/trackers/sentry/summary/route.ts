import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb('ZG');
    const events = db.collection<WithId<Document>>('telemetry_events');

    const [openIssuesCount, recentDocs, topDocs, latestStats] = await Promise.all([
      events.countDocuments({
        provider: 'sentry',
        'data.level': { $in: ['error', 'fatal'] },
      }),

      events.find({ provider: 'sentry' }).sort({ timestamp: -1 }).limit(5).toArray(),

      events
        .aggregate([
          { $match: { provider: 'sentry', 'data.level': { $in: ['error', 'fatal'] } } },
          {
            $group: {
              _id: '$data.issueId',
              title: { $first: '$data.title' },
              level: { $first: '$data.level' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),

      db.collection('sentry_stats').findOne({}, { sort: { createdAt: -1 } }),
    ]);

    return NextResponse.json({
      openIssues: openIssuesCount,
      crashFreeRate: latestStats?.crashFreeRate ?? null,
      errorRate: latestStats?.errorRate ?? null,
      trend: latestStats?.trend ?? [],
      topIssues: topDocs.map((d) => ({
        issueId: String(d._id ?? ''),
        title: String(d.title ?? ''),
        count: Number(d.count ?? 0),
        level: String(d.level ?? 'error'),
      })),
      recentIssues: recentDocs.map((d) => ({
        issueId: String(d.data?.issueId ?? ''),
        title: String(d.data?.title ?? ''),
        level: String(d.data?.level ?? 'error'),
        culprit: String(d.data?.culprit ?? ''),
        lastSeen: d.timestamp ?? d.createdAt,
        permalink: String(d.data?.permalink ?? ''),
      })),
    });
  } catch (err) {
    console.error('Sentry summary error:', err);
    return NextResponse.json({ error: 'Failed to load Sentry summary' }, { status: 500 });
  }
}
