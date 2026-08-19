import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb('ZG');
    const events = db.collection<WithId<Document>>('telemetry_events');

    const [totalRatings, recentDocs, latestStats] = await Promise.all([
      events.countDocuments({ provider: 'apple' }),

      events.find({ provider: 'apple' }).sort({ timestamp: -1 }).limit(10).toArray(),

      db.collection('apple_stats').findOne({}, { sort: { createdAt: -1 } }),
    ]);

    return NextResponse.json({
      averageRating: latestStats?.averageRating ?? null,
      totalRatings,
      ratingDistribution: latestStats?.ratingDistribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      trend: latestStats?.trend ?? [],
      recentReviews: recentDocs.map((d) => ({
        id: d._id.toString(),
        rating: Number(d.data?.rating ?? 0),
        title: String(d.data?.title ?? ''),
        body: String(d.data?.body ?? ''),
        userName: String(d.data?.userName ?? ''),
        territory: String(d.data?.territory ?? ''),
        createdAt: (d.timestamp ?? d.createdAt)?.toISOString?.() ?? new Date().toISOString(),
      })),
    });
  } catch (err) {
    console.error('Apple summary error:', err);
    return NextResponse.json({ error: 'Failed to load Apple summary' }, { status: 500 });
  }
}
