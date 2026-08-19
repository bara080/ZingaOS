import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/auth/guards';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await readSession();

    if (!session || !can(session.role, 'notifications.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb('ZC');

    const jobs = await db
      .collection('push_notifications')
      .find(
        {},
        {
          projection: {
            // Exclude the large per-token results array to keep the payload light
            results: 0,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('PUSH_NOTIFICATION_STATUS_ERROR', error);
    return NextResponse.json(
      { error: 'Unable to fetch push notification status.' },
      { status: 500 },
    );
  }
}
