import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document, Filter } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const route = searchParams.get('route');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter: Filter<Document> = { provider: { $in: ['vexo', 'Vexo'] } };
  if (route) filter['data.route'] = route;
  if (type) filter['data.type'] = type;
  if (from || to) {
    filter.timestamp = {};
    if (from) (filter.timestamp as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.timestamp as Record<string, Date>).$lte = new Date(to);
  }

  try {
    const db = await getDb('ZG');
    const col = db.collection<WithId<Document>>('telemetry_events');

    const [docs, total] = await Promise.all([
      col.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: docs.map((e) => ({
        id: e._id.toString(),
        route: String(e.data?.route ?? e.data?.screen ?? 'Unknown'),
        type: String(e.data?.type ?? 'event'),
        timestamp: e.timestamp ?? e.createdAt,
        device: {
          model: String(e.data?.deviceModel ?? '—'),
          os: `${e.data?.deviceSystemName ?? ''} ${e.data?.deviceSystemVersion ?? ''}`.trim() || '—',
        },
        location: [e.data?.city, e.data?.country].filter(Boolean).join(', ') || '—',
        appVersion: String(e.data?.appVersion ?? '—'),
        customerUid: String(e.customerUid ?? '—'),
        sessionId: String(e.sessionId ?? '—'),
      })),
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error('Vexo events error:', err);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}
