import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document, Filter } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const rating = searchParams.get('rating');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter: Filter<Document> = { provider: 'google_play' };
  if (rating) filter['data.rating'] = Number(rating);
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
        rating: Number(d.data?.rating ?? 0),
        text: String(d.data?.text ?? ''),
        authorName: String(d.data?.authorName ?? ''),
        language: String(d.data?.language ?? ''),
        thumbsUpCount: Number(d.data?.thumbsUpCount ?? 0),
        replyText: d.data?.replyText != null ? String(d.data.replyText) : null,
        reviewedAt: (d.timestamp ?? d.createdAt)?.toISOString?.() ?? new Date().toISOString(),
      })),
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error('Google Play reviews error:', err);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}
