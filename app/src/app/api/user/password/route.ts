import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  // Re-auth step: Supabase does not require the current password to update it,
  // but we keep the old behavior of verifying it by re-signing in. This also
  // rejects the change if the current password is wrong.
  if (currentPassword) {
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: currentPassword,
    });
    if (reauthError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
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
