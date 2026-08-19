import { AdminUserListItem } from '@/lib/types';
import { avatarColor, getInitials } from '@/lib/utils/common';
import { Badge } from '@/components/ui/badge';
import { RowAction, RowActions } from '../common/RowActions';

type Props = {
  user: AdminUserListItem;
  rowActions?: RowAction<AdminUserListItem>[];
};

export function AdminUserCard({ user, rowActions }: Props) {
  const ACTIONS_SLOT_WIDTH = 'w-8';

  const hasActions = rowActions && rowActions.length > 0;

  return (
    <div className="rounded-lg border p-3 hover:bg-muted/50 transition">
      <div className="flex items-start justify-between gap-3">
        {/* Left content */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold ${avatarColor(
              user.displayName,
            )}`}
          >
            {getInitials(user.displayName)}
          </div>

          <div className="min-w-0">
            <div className="font-medium truncate">{user.displayName || '-'}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email || '-'}</div>
          </div>
        </div>

        {/* Actions slot */}
        <div className={ACTIONS_SLOT_WIDTH} onClick={(e) => e.stopPropagation()}>
          {hasActions ? <RowActions item={user} actions={rowActions} /> : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Role: <span className="capitalize">{user.role}</span>
        </span>

        <Badge variant="secondary" className="capitalize">
          {user.status}
        </Badge>
      </div>
    </div>
  );
}
