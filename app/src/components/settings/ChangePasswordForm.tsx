'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangePassword } from './useChangePassword';
import { useRouter } from 'next/navigation';

export default function ChangePasswordForm() {
  const router = useRouter();
  const mutation = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const isDirty = current && next && confirm;
  const isValid = next.length >= 8 && next === confirm;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          // Redirect after logout
          router.push('/login');
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div className="flex flex-col gap-2">
        <Label>Current Password</Label>
        <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>New Password</Label>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Confirm New Password</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      <Button type="submit" disabled={!isDirty || !isValid || mutation.isPending}>
        {mutation.isPending ? 'Updating…' : 'Change Password'}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-red-500">{(mutation.error as Error).message}</p>
      )}
    </form>
  );
}
