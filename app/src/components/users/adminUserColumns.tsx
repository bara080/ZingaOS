import { AdminUserListItem } from '@/lib/types';
import { avatarColor, formatDate, getInitials, statusColorMap } from '@/lib/utils/common';
import { Badge } from '../ui/badge';

export const adminUserColumns = [
  {
    key: 'name',
    header: 'Name',
    render: (u: AdminUserListItem) => (
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold ${avatarColor(
            u.displayName,
          )}`}
        >
          {getInitials(u.displayName)}
        </div>
        <span>{u.displayName || '-'}</span>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (u: AdminUserListItem) => u.email || '-',
  },
  {
    key: 'role',
    header: 'Role',
    render: (u: AdminUserListItem) => <span className="capitalize font-medium">{u.role}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (u: AdminUserListItem) => (
      <Badge variant="secondary" className={`capitalize ${statusColorMap[u.status]}`}>
        {u.status}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created At',
    render: (u: AdminUserListItem) => formatDate(u.createdAt),
  },
];
