import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

const VEXO_FILTER = { provider: { $in: ['vexo', 'Vexo'] } };

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const db = await getDb('ZG');
    const col = db.collection<WithId<Document>>('telemetry_events');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFilter = { ...VEXO_FILTER, timestamp: { $gte: sevenDaysAgo } };

    const [totalEvents, topRoutesDocs, topDevicesDocs] = await Promise.all([
      col.countDocuments(recentFilter),

      col
        .aggregate([
          { $match: recentFilter },
          {
            $group: {
              _id: { $ifNull: ['$data.route', { $ifNull: ['$data.screen', 'Unknown'] }] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray(),

      col
        .aggregate([
          { $match: recentFilter },
          {
            $group: {
              _id: { $ifNull: ['$data.deviceModel', 'Unknown'] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ])
        .toArray(),
    ]);

    // Unique users + sessions from distinct values
    const [uniqueUsersDocs, uniqueSessionsDocs] = await Promise.all([
      col.distinct('customerUid', recentFilter),
      col.distinct('sessionId', recentFilter),
    ]);

    // Build 7-day trend by counting events per day
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      byDay[isoDateOnly(d)] = 0;
    }

    const trendDocs = await col
      .aggregate([
        { $match: recentFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    for (const d of trendDocs) {
      if (typeof d._id === 'string' && byDay[d._id] !== undefined) {
        byDay[d._id] = Number(d.count ?? 0);
      }
    }

    const trend = Object.entries(byDay).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      totalEvents,
      uniqueUsers: uniqueUsersDocs.filter((u) => u && u !== 'unknown').length,
      uniqueSessions: uniqueSessionsDocs.filter((s) => s).length,
      activeRoutes: topRoutesDocs.length,
      trend,
      topRoutes: topRoutesDocs.map((d) => ({
        route: String(d._id ?? 'Unknown'),
        count: Number(d.count ?? 0),
      })),
      topDevices: topDevicesDocs.map((d) => ({
        model: String(d._id ?? 'Unknown'),
        count: Number(d.count ?? 0),
      })),
    });
  } catch (err) {
    console.error('Vexo summary error:', err);
    return NextResponse.json({ error: 'Failed to load Vexo summary' }, { status: 500 });
  }
}
