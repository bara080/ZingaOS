import { NextResponse } from 'next/server';
import { isRole } from '@/lib/roles';
import { readSession } from '@/lib/auth/session/session';
import { can } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!can(session.role, 'users.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const role = searchParams.get('role');
    const registeredFrom = searchParams.get('registeredFrom');
    const registeredTo = searchParams.get('registeredTo');

    // Service role: admin listing of ALL profiles (bypasses RLS).
    const admin = createServiceClient();

    let query = admin
      .from('profiles')
      .select('id, display_name, email, role, status, created_at', { count: 'exact' });

    if (name) query = query.ilike('display_name', `%${name}%`);
    if (email) query = query.ilike('email', `%${email}%`);
    if (role && isRole(role)) query = query.eq('role', role);
    if (registeredFrom) query = query.gte('created_at', new Date(registeredFrom).toISOString());
    if (registeredTo) query = query.lte('created_at', new Date(registeredTo).toISOString());

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users: (data ?? []).map((u) => ({
        _id: u.id,
        displayName: u.display_name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
      })),
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
