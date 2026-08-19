'use client';

import { useQuery } from '@tanstack/react-query';
import { UserDoc } from '@/lib/types/users';

async function fetchMe(): Promise<UserDoc | null> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

  return {
    user: query.data ?? null,
    loading: query.isLoading,
  };
}
