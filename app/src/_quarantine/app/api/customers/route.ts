import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Filter } from 'mongodb';

export const runtime = 'nodejs';

type CustomerDoc = {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  uid?: string;
  createdAt?: Date;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(50, Number(searchParams.get('limit') || 10));
  const skip = (page - 1) * limit;

  const name = searchParams.get('name');
  const email = searchParams.get('email');
  const phone = searchParams.get('phone');
  const uid = searchParams.get('uid');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const query: Filter<CustomerDoc> = {};

  if (name) query.displayName = { $regex: name, $options: 'i' };
  if (email) query.email = { $regex: email, $options: 'i' };
  if (phone) query.phoneNumber = { $regex: phone.replace(/[^\d+]/g, '') };
  if (uid) query.uid = uid;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const db = await getDb('ZC');
  const col = db.collection<CustomerDoc>('firebaseusers');

  const [customers, total] = await Promise.all([
    col
      .find(query, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments(query),
  ]);

  return NextResponse.json({
    customers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
