import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/security/origin';

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  // Step-up re-auth is REQUIRED: the current password must always be supplied and
  // verified before a change (previously it was skipped when the client omitted it).
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return NextResponse.json({ error: 'New password must be at least 12 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify the current password by re-signing in; rejects the change if it's wrong.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });
  if (reauthError) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    // Supabase rejects reusing the same password with a clear message.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Force re-login (matches old behavior).
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
