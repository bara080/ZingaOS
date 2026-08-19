import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/roles';
import type { UserSession } from '@/lib/types/users';

// Supabase-backed session reader. Replaces the old jose `zinga_session` JWT.
//
// Uses the server client's `auth.getUser()` (NOT getSession) so the token is
// revalidated against Supabase and can be trusted. The authoritative role for
// RBAC lives in `app_metadata` (admin-controlled); `user_metadata` is only used
// for the display name (user-editable, never for authz).
export async function readSession(): Promise<UserSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    _id: user.id,
    email: user.email ?? '',
    displayName: (user.user_metadata?.display_name as string | undefined) ?? '',
    role: user.app_metadata?.role as Role,
  };
}
