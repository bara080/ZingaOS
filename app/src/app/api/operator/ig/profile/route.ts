import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireOperator } from '@/lib/operator/guard';
import type { IgProfile } from '@/lib/operator/meta_oauth';

// GET /api/operator/ig/profile
// Returns the Instagram account connected via Business Login (username +
// user_id) so the operator UI can show "Connected as @handle". This is the
// instagram_business_basic data the App Review screencast must display.
// Reads the httpOnly ig_profile cookie set by /api/meta/oauth/callback.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const raw = (await cookies()).get('ig_profile')?.value;
  if (!raw) return NextResponse.json({ connected: false, profile: null });

  try {
    const profile = JSON.parse(raw) as IgProfile;
    return NextResponse.json({ connected: !!profile?.username, profile });
  } catch {
    return NextResponse.json({ connected: false, profile: null });
  }
}
