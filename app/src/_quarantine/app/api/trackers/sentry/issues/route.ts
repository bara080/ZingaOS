import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document, Filter } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const level = searchParams.get('level');
  const environment = searchParams.get('environment');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter: Filter<Document> = { provider: 'sentry' };
  if (level) filter['data.level'] = level;
  if (environment) filter['data.environment'] = environment;
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
      data: docs.map((d) => ({
        id: d._id.toString(),
        issueId: String(d.data?.issueId ?? ''),
        title: String(d.data?.title ?? ''),
        level: String(d.data?.level ?? 'error'),
        culprit: String(d.data?.culprit ?? ''),
        environment: String(d.data?.environment ?? ''),
        count: Number(d.data?.count ?? 0),
        lastSeen: d.timestamp ?? d.createdAt,
        permalink: String(d.data?.permalink ?? ''),
      })),
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error('Sentry issues error:', err);
    return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
  }
}
