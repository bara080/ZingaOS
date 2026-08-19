import { NextResponse } from 'next/server';
import { can } from '@/lib/auth/guards';
import { readSession } from '@/lib/auth/session/session';
import { createServiceClient } from '@/lib/supabase/admin';

// ~100y ban — Supabase blocks sign-in for banned users.
const LONG_BAN = '876000h';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await req.json();

  const admin = createServiceClient();

  const { data: user, error: fetchError } = await admin
    .from('profiles')
    .select('id, email, status')
    .eq('id', id)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  switch (action) {
    case 'invite.resend': {
      if (!can(session.role, 'users.create')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/accept`;
      const { error } = await admin.auth.admin.inviteUserByEmail(user.email, {
        data: { invited_by: session._id },
        redirectTo,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await admin.from('profiles').update({ updated_at: now }).eq('id', id);
      break;
    }

    case 'invite.cancel': {
      if (!can(session.role, 'users.create')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user.status !== 'invited') {
        return NextResponse.json({ error: 'Invalid user state' }, { status: 400 });
      }

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    case 'user.disable': {
      if (!can(session.role, 'users.edit')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user.status !== 'active') {
        return NextResponse.json({ error: 'User is not active' }, { status: 400 });
      }

      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: LONG_BAN });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await admin.from('profiles').update({ status: 'disabled', updated_at: now }).eq('id', id);
      break;
    }

    case 'user.enable': {
      if (!can(session.role, 'users.edit')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (user.status !== 'disabled') {
        return NextResponse.json({ error: 'User is not disabled' }, { status: 400 });
      }

      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: 'none' });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await admin.from('profiles').update({ status: 'active', updated_at: now }).eq('id', id);
      break;
    }

    case 'user.delete': {
      if (!can(session.role, 'users.delete')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
