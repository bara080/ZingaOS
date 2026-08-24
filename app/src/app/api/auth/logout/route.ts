import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SEEN_COOKIE, START_COOKIE } from '@/lib/auth/session/policy';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Clear our session-lifetime markers too, so a stale zinga_start can't
  // instantly expire the NEXT login.
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SEEN_COOKIE);
  res.cookies.delete(START_COOKIE);
  return res;
}
