import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { uploadImageToFirebase } from '@/lib/firebase/upload';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/auth/guards';
import { BannerAudience } from '@/features/content/types/banner.types';

export const runtime = 'nodejs';

/**
 * GET single banner
 */
export async function GET(_req: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const resolvedParams = await params;
  const db = await getDb('ZC');
  const banners = db.collection('banners');

  const banner = await banners.findOne({
    _id: new ObjectId(resolvedParams.bannerId),
  });

  if (!banner) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(banner);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const resolvedParams = await params;
  const session = await readSession();

  if (!session || !can(session.role, 'banners.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();

  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string;
  const audience = formData.get('audience') as BannerAudience;
  const buttonText = (formData.get('buttonText') as string) || '';
  const buttonAction = (formData.get('buttonAction') as string) || 'navigate';
  const buttonTarget = (formData.get('buttonTarget') as string) || '';
  const sortOrder = Number(formData.get('sortOrder') || 0);
  const file = formData.get('image') as File | null;

  if (!title || !audience || !buttonAction || !buttonTarget) {
    return NextResponse.json(
      { error: 'Title, audience, button action, and target are required.' },
      { status: 400 },
    );
  }

  const updateDoc: Record<string, unknown> = {
    title,
    subtitle,
    audience,
    buttonText,
    buttonAction,
    buttonTarget,
    sortOrder,
  };

  if (formData.get('isActive') !== null) {
    updateDoc.isActive = formData.get('isActive') === 'true';
  }

  if (formData.get('startDate')) {
    updateDoc.startDate = formData.get('startDate');
  }

  if (formData.get('endDate')) {
    updateDoc.endDate = formData.get('endDate');
  }

  if (file && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    const imageUrl = await uploadImageToFirebase(file, 'banners');
    updateDoc.imageUrl = imageUrl;
  }

  const db = await getDb('ZC');
  const banners = db.collection('banners');

  await banners.updateOne(
    { _id: new ObjectId(resolvedParams.bannerId) },
    {
      $set: {
        ...updateDoc,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ bannerId: string }> }) {
  const resolvedParams = await params;
  const session = await readSession();

  if (!session || !can(session.role, 'banners.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb('ZC');
  const banners = db.collection('banners');

  await banners.deleteOne({
    _id: new ObjectId(resolvedParams.bannerId),
  });

  return NextResponse.json({ ok: true });
}
