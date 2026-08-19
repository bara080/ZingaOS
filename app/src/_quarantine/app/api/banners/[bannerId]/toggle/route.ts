import { can, readSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function PATCH(_req: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const resolvedParams = await params;
  const session = await readSession();

  if (!session || !can(session.role, 'banners.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb('ZC');
  const banners = db.collection('banners');

  const banner = await banners.findOne({
    _id: new ObjectId(resolvedParams.bannerId),
  });

  if (!banner) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await banners.updateOne(
    { _id: new ObjectId(resolvedParams.bannerId) },
    {
      $set: {
        isActive: !banner.isActive,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
