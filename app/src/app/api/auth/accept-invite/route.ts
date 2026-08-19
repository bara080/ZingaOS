import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import { createServiceClient } from '@/lib/supabase/admin';

// Invite-only flow: Supabase `inviteUserByEmail` emails a magic link that lands
// the user on `/invite/accept`, establishing a session. There, the browser
// calls `supabase.auth.updateUser({ password })` to set their password, then
// POSTs here to flip their profile status from `invited` -> `active`.
export async function POST() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from('profiles')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', session._id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
