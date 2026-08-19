import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb('ZG');
    const events = db.collection<WithId<Document>>('telemetry_events');

    const [totalRatings, recentDocs, latestStats] = await Promise.all([
      events.countDocuments({ provider: 'google_play' }),

      events.find({ provider: 'google_play' }).sort({ timestamp: -1 }).limit(10).toArray(),

      db.collection('google_play_stats').findOne({}, { sort: { createdAt: -1 } }),
    ]);

    return NextResponse.json({
      averageRating: latestStats?.averageRating ?? null,
      totalRatings,
      ratingDistribution: latestStats?.ratingDistribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      trend: latestStats?.trend ?? [],
      recentReviews: recentDocs.map((d) => ({
        id: d._id.toString(),
        rating: Number(d.data?.rating ?? 0),
        text: String(d.data?.text ?? ''),
        authorName: String(d.data?.authorName ?? ''),
        language: String(d.data?.language ?? ''),
        thumbsUpCount: Number(d.data?.thumbsUpCount ?? 0),
        replyText: d.data?.replyText != null ? String(d.data.replyText) : null,
        reviewedAt: (d.timestamp ?? d.createdAt)?.toISOString?.() ?? new Date().toISOString(),
      })),
    });
  } catch (err) {
    console.error('Google Play summary error:', err);
    return NextResponse.json({ error: 'Failed to load Google Play summary' }, { status: 500 });
  }
}
