import { AdminUserListItem } from '@/lib/types';
import { RowAction } from '@/components/common/RowActions';
import { AdminUserAction } from '@/lib/api/adminUserActions';

/**
 * Dependencies required to generate row actions.
 * Keeps the factory pure and reusable.
 */
type Deps = {
  onEdit: (id: string) => void;
  onRequestAction: (userId: string, action: AdminUserAction) => void;
};

/**
 * Factory that returns row actions for a single admin user.
 *
 * WHY:
 * - Keeps UI config out of the page
 * - Avoids inline closures
 * - Easy to test and reuse
 */
export const createAdminUserRowActions =
  ({ onEdit, onRequestAction }: Deps) =>
  (user: AdminUserListItem): RowAction<AdminUserListItem>[] => {
    const actions: RowAction<AdminUserListItem>[] = [
      {
        label: 'Edit user',
        onClick: () => onEdit(user._id),
      },
    ];

    if (user.status === 'invited') {
      actions.push(
        {
          label: 'Resend invitation',
          onClick: () => onRequestAction(user._id, 'invite.resend'),
        },
        {
          label: 'Cancel invitation',
          destructive: true,
          onClick: () => onRequestAction(user._id, 'invite.cancel'),
        },
      );
    }

    if (user.status === 'active') {
      actions.push({
        label: 'Disable user',
        onClick: () => onRequestAction(user._id, 'user.disable'),
      });
    }

    if (user.status === 'disabled') {
      actions.push({
        label: 'Enable user',
        onClick: () => onRequestAction(user._id, 'user.enable'),
      });
    }

    actions.push({
      separatorBefore: true,
      label: 'Delete user',
      destructive: true,
      onClick: () => onRequestAction(user._id, 'user.delete'),
    });

    return actions;
  };
