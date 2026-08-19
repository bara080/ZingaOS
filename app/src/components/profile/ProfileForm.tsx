'use client';

import { useState } from 'react';
import { UserDoc } from '@/lib/types/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateProfile } from './useUpdateProfile';

type Props = {
  user: UserDoc;
};

export default function ProfileForm({ user }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const mutation = useUpdateProfile();

  const isDirty = displayName.trim() !== (user.displayName ?? '');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({ displayName });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Email</Label>
        <Input value={user.email} disabled />
      </div>

      <div className="space-y-1">
        <Label>Display Name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>

        {mutation.isSuccess && <span className="text-sm text-green-600">Profile updated</span>}

        {mutation.isError && (
          <span className="text-sm text-red-500">{(mutation.error as Error).message}</span>
        )}
      </div>
    </form>
  );
}
