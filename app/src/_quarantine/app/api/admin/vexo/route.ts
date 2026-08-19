import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = 50;
    const skip = (page - 1) * limit;

    const db = await getDb('ZG');
    const col = db.collection<WithId<Document>>('telemetry_events');

    const [events, total]: [WithId<Document>[], number] = await Promise.all([
      col
        .find({ provider: { $in: ['vexo', 'Vexo'] } })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      col.countDocuments({ provider: { $in: ['vexo', 'Vexo'] } }),
    ]);

    return NextResponse.json({
      data: events.map((e) => ({
        id: e._id.toString(),
        route: e.data?.route || e.data?.screen || 'Unknown',
        timestamp: e.timestamp || e.createdAt || new Date(),
        device: {
          model: e.data?.deviceModel || '-',
          os: `${e.data?.deviceSystemName || ''} ${e.data?.deviceSystemVersion || ''}`,
        },
        location: `${e.data?.city || ''}, ${e.data?.country || ''}`,
        appVersion: e.data?.appVersion || '-',
        customerUid: e.customerUid || '-',
        sessionId: e.sessionId || '-',
      })),
      page,
      total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load vexo events' }, { status: 500 });
  }
}
