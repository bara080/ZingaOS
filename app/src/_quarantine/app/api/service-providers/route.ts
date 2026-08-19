import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Filter, Document } from 'mongodb';

export const runtime = 'nodejs';

type StoreDoc = {
  storeName?: string;
  storeCategory?: string;
  storeDescription?: string;
  storeLogo?: string;
  storeId?: string;
  owner?: {
    displayName?: string;
    email?: string;
    phoneNumber?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  createdAt?: Date;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);
  const skip = (page - 1) * limit;

  const store = searchParams.get('store');
  const owner = searchParams.get('owner');
  const category = searchParams.get('category');
  const location = searchParams.get('location');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const db = await getDb('SP');
  const storesCol = db.collection<StoreDoc>('stores');

  const match: Filter<StoreDoc> = {};

  if (store) match.storeName = { $regex: store, $options: 'i' };
  if (owner) match['owner.displayName'] = { $regex: owner, $options: 'i' };
  if (category) match.storeCategory = category;

  if (location) {
    match.$or = [
      { 'location.city': { $regex: location, $options: 'i' } },
      { 'location.country': { $regex: location, $options: 'i' } },
    ];
  }

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const pipeline: Document[] = [
    {
      $lookup: {
        from: 'firebaseusers',
        localField: 'owner',
        foreignField: 'uid',
        as: 'owner',
      },
    },
    {
      $unwind: {
        path: '$owner',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  pipeline.push({
    $facet: {
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            id: '$storeId',
            company: '$storeName',
            category: '$storeCategory',
            storeLogo: 1,
            description: '$storeDescription',
            name: '$owner.displayName',
            email: '$owner.email',
            phone: '$owner.phoneNumber',
            city: '$location.city',
            country: '$location.country',
            createdAt: 1,
          },
        },
      ],
      total: [{ $count: 'count' }],
    },
  });

  const result = await storesCol.aggregate(pipeline).toArray();
  const total = result[0]?.total[0]?.count ?? 0;

  return NextResponse.json({
    providers: result[0]?.data ?? [],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
