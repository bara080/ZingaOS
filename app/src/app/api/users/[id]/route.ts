import { NextResponse } from 'next/server';
import { isRole, Role } from '@/lib/roles';
import { can } from '@/lib/auth/guards';
import { readSession } from '@/lib/auth/session/session';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const admin = createServiceClient();

    const { data: user, error } = await admin
      .from('profiles')
      .select('id, display_name, email, role, status, invited_by, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let inviter = null;
    if (user.invited_by) {
      const { data: inv } = await admin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', user.invited_by)
        .single();
      if (inv) {
        inviter = {
          _id: inv.id,
          displayName: inv.display_name,
          email: inv.email,
          role: inv.role,
        };
      }
    }

    return NextResponse.json({
      user: {
        _id: user.id,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        inviter,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.role, 'users.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createServiceClient();

    const profileUpdates: {
      role?: Role;
      display_name?: string;
      email?: string;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };

    let newRole: Role | undefined;
    let newEmail: string | undefined;
    let newDisplayName: string | undefined;

    if (body.role !== undefined) {
      if (!isRole(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      newRole = body.role;
      profileUpdates.role = body.role;
    }

    if (body.displayName !== undefined) {
      if (typeof body.displayName !== 'string' || body.displayName.length < 2) {
        return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
      }
      newDisplayName = body.displayName.trim();
      profileUpdates.display_name = newDisplayName;
    }

    if (body.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      }
      newEmail = body.email.toLowerCase();
      profileUpdates.email = newEmail;
    }

    if (Object.keys(profileUpdates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Push authoritative auth changes first (app_metadata.role, email,
    // user_metadata.display_name). app_metadata is the RBAC source of truth.
    const authUpdate: {
      app_metadata?: { role: Role };
      email?: string;
      user_metadata?: { display_name: string };
    } = {};
    if (newRole) authUpdate.app_metadata = { role: newRole };
    if (newEmail) authUpdate.email = newEmail;
    if (newDisplayName) authUpdate.user_metadata = { display_name: newDisplayName };

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Mirror into the profiles table.
    const { error: profileError } = await admin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
