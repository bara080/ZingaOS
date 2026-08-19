import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Filter, Document } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);
  const skip = (page - 1) * limit;

  const bookingId = searchParams.get('bookingId');
  const storeId = searchParams.get('storeId');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const createdFrom = searchParams.get('createdFrom');
  const createdTo = searchParams.get('createdTo');

  const db = await getDb('ZC');
  const col = db.collection('servicerequests');

  const match: Filter<Document> = {};
  if (bookingId) {
    match.bookingId = bookingId;
  }

  if (storeId) {
    match['selectedCandidate.storeId'] = storeId;
  }

  if (status) {
    match.status = status;
  }

  if (category) {
    match.category = category;
  }

  // 📅 Date range
  if (createdFrom || createdTo) {
    match.createdAt = {};
    if (createdFrom) match.createdAt.$gte = new Date(createdFrom);
    if (createdTo) match.createdAt.$lte = new Date(createdTo);
  }

  const pipeline: Document[] = [
    { $match: match },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              id: '$_id',
              requestId: 1,
              bookingId: 1,

              customerName: '$customer.name',
              customerEmail: '$customer.email',
              customerPhone: '$customer.phone',
              customerAvatar: '$customer.avatar',

              storeName: '$selectedCandidate.storeName',
              storeLogo: '$selectedCandidate.storeLogo',

              category: 1,
              serviceTitle: '$selectedCandidate.serviceTitle',

              status: 1,
              scheduledAt: 1,
              createdAt: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const result = await col.aggregate(pipeline).toArray();
  const total = result[0]?.total[0]?.count ?? 0;

  return NextResponse.json({
    bookings: result[0]?.data ?? [],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
