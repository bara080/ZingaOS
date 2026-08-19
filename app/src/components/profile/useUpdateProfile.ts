'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

type Payload = {
  displayName: string;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Payload) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Update failed');
      }

      return res.json();
    },
    onSuccess: () => {
      // 🔄 Refresh current user everywhere
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
