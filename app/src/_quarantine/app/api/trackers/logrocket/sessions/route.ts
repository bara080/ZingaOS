import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document, Filter } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const hasErrors = searchParams.get('hasErrors');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter: Filter<Document> = { provider: 'logrocket' };
  if (hasErrors === 'true') filter['data.hasErrors'] = true;
  if (hasErrors === 'false') filter['data.hasErrors'] = false;
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
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error('LogRocket sessions error:', err);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
