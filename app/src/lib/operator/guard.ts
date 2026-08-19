import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';
import type { UserSession } from '@/lib/types/users';

// Shared auth gate for every /api/operator/* route. Mirrors the pattern in
// /api/operator/leads: authenticated session required, and role must be an
// operator role (superadmin | admin). Returns EITHER a NextResponse to return
// immediately (401/403) OR the trusted session. No route may skip this.
export const OPERATOR_ROLES = new Set(['superadmin', 'admin']);

export async function requireOperator(): Promise<
  { session: UserSession } | { response: NextResponse }
> {
  const session = await readSession();
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!OPERATOR_ROLES.has(session.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}
