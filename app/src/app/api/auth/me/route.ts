import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // RLS lets an authenticated user read their own profile row.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, status, invited_by, created_at, updated_at')
    .eq('id', session._id)
    .single();

  const user = profile
    ? {
        _id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        invitedBy: profile.invited_by,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      }
    : {
        _id: session._id,
        displayName: session.displayName,
        email: session.email,
        role: session.role,
      };

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { displayName } = await req.json();

  if (!displayName || typeof displayName !== 'string' || displayName.length < 2) {
    return NextResponse.json(
      { error: 'Display name must be at least 2 characters' },
      { status: 400 },
    );
  }

  // Update the user's own auth metadata (display_name lives in user_metadata).
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Mirror into the profiles table via service role (writes bypass RLS).
  const admin = createServiceClient();
  await admin
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', session._id);

  return NextResponse.json({
    ok: true,
    user: {
      ...session,
      displayName,
    },
  });
}
