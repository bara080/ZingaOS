'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { ROLES, roleLabelMap, isRole, Role } from '@/lib/roles';
import { sendAdminInvite } from '@/lib/api/sendAdminInvite';

type Props = {
  open: boolean;
  onClose: () => void;
  onInvited?: () => void;
};

export function InviteUserDialog({ open, onClose, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | ''>('');

  const inviteMutation = useMutation({
    mutationFn: sendAdminInvite,
    onSuccess: () => {
      setEmail('');
      setRole('');
      onInvited?.();
      onClose();
    },
  });

  function handleInvite() {
    if (!email || !role) {
      return;
    }

    inviteMutation.mutate({ email, role });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New Admin User</DialogTitle>
          <p className="text-sm text-muted-foreground">An invite email will be sent to the user.</p>
        </DialogHeader>

        <div className="space-y-4">
          {inviteMutation.error instanceof Error && (
            <p className="text-sm text-red-500">{inviteMutation.error.message}</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(v) => isRole(v) && setRole(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabelMap[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={inviteMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
