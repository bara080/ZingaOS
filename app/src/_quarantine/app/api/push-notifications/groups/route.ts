import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/auth/guards';

export const runtime = 'nodejs';

// GET /api/push-notifications/groups — list all groups
export async function GET() {
  try {
    const session = await readSession();

    if (!session || !can(session.role, 'notifications.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb('ZC');
    const groups = await db
      .collection('notification_groups')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('NOTIFICATION_GROUPS_GET_ERROR', error);
    return NextResponse.json({ error: 'Unable to fetch groups.' }, { status: 500 });
  }
}

// POST /api/push-notifications/groups — create or update a group
export async function POST(req: Request) {
  try {
    const session = await readSession();

    if (!session || !can(session.role, 'notifications.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();
    const uids: string[] = Array.isArray(body.uids)
      ? body.uids.map((u: unknown) => String(u).trim()).filter(Boolean)
      : [];

    const dedupedUids = [...new Set(uids)];

    if (!name) {
      return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
    }
    if (!dedupedUids.length) {
      return NextResponse.json({ error: 'At least one UID is required.' }, { status: 400 });
    }

    const db = await getDb('ZC');

    // Upsert: if a group with this name already exists, replace its uids
    await db.collection('notification_groups').updateOne(
      { name },
      {
        $set: { name, uids: dedupedUids, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, name, uids });
  } catch (error) {
    console.error('NOTIFICATION_GROUPS_POST_ERROR', error);
    return NextResponse.json({ error: 'Unable to create group.' }, { status: 500 });
  }
}

// DELETE /api/push-notifications/groups — delete a group by name
export async function DELETE(req: Request) {
  try {
    const session = await readSession();

    if (!session || !can(session.role, 'notifications.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
    }

    const db = await getDb('ZC');
    await db.collection('notification_groups').deleteOne({ name });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('NOTIFICATION_GROUPS_DELETE_ERROR', error);
    return NextResponse.json({ error: 'Unable to delete group.' }, { status: 500 });
  }
}
