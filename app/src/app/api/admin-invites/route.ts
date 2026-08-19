import { NextResponse } from 'next/server';

import { isRole } from '@/lib/roles';
import { readSession } from '@/lib/auth/session/session';
import { can } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/admin';

type InviteBody = {
  email: string;
  role: string;
};

export async function POST(req: Request) {
  // 1) Auth
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Authorization
  if (!can(session.role, 'users.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3) Parse + validate
  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, role } = body;
  if (!email || !isRole(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const admin = createServiceClient();

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/accept`;
  const displayName = email.split('@')[0];

  // 4) Invite. `data` -> user_metadata (the handle_new_user trigger reads
  //    role/display_name/invited_by from here to seed the profiles row).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, display_name: displayName, invited_by: session._id },
    redirectTo,
  });

  if (error || !data?.user) {
    const status = /already|exists|registered/i.test(error?.message ?? '') ? 409 : 500;
    return NextResponse.json(
      { error: error?.message ?? 'Failed to send invite' },
      { status },
    );
  }

  // 5) Set the AUTHORITATIVE role in app_metadata (used for JWT-based RBAC).
  //    user_metadata is user-editable and must never be trusted for authz.
  const { error: metaError } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role, invited_by: session._id },
  });

  if (metaError) {
    return NextResponse.json({ error: metaError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
