'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminUserAction } from '@/lib/api/adminUserActions';

type Props = {
  open: boolean;
  action: AdminUserAction;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ACTION_COPY: Record<AdminUserAction, { title: string; description: string }> = {
  'invite.resend': {
    title: 'Resend invitation?',
    description:
      'A new invite email will be sent and the previous invite link will be invalidated.',
  },
  'invite.cancel': {
    title: 'Cancel invitation?',
    description: 'This will cancel the invitation and remove the user.',
  },
  'user.disable': {
    title: 'Disable user?',
    description: 'This user will no longer be able to access the system.',
  },
  'user.enable': {
    title: 'Enable user?',
    description: 'This user will regain access to the system.',
  },
  'user.delete': {
    title: 'Delete user?',
    description: 'This user will be permanently removed.',
  },
};

export function AdminUserActionConfirmDialog({
  open,
  action,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const copy = ACTION_COPY[action];

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !loading) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>

          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
