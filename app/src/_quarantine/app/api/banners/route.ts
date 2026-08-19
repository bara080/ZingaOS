import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { uploadImageToFirebase } from '@/lib/firebase/upload';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/auth/guards';
import { BannerAudience } from '@/features/content/types/banner.types';

export const runtime = 'nodejs';

/**
 * GET /api/banners?audience=customer|provider
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const audience = searchParams.get('audience');

  const db = await getDb('ZC');
  const banners = db.collection('banners');

  const query: Record<string, unknown> = {};

  if (audience) {
    query.audience = audience;
  }

  const data = await banners.find(query).sort({ sortOrder: 1 }).toArray();

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const session = await readSession();

    console.log('SESSION:', session);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!can(session.role, 'banners.create')) {
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
    const file = formData.get('image') as File;

    console.log({
      title,
      subtitle,
      audience,
      sortOrder,
      fileName: file?.name,
      fileType: file?.type,
    });

    if (!title || !audience || !buttonAction || !buttonTarget || !file) {
      return NextResponse.json(
        { error: 'Title, audience, button action, target URL/path, and image are required.' },
        { status: 400 },
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
    }

    // Upload image
    const imageUrl = await uploadImageToFirebase(file, 'banners');

    console.log('IMAGE URL:', imageUrl);

    const db = await getDb('ZC');

    const result = await db.collection('banners').insertOne({
      title,
      subtitle,
      audience,
      imageUrl,
      buttonText,
      buttonAction,
      buttonTarget,
      isActive: true,
      sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      id: result.insertedId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('BANNER CREATE ERROR:', error);

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
