import { Customer } from '@/lib/types';
import { formatDate } from '@/lib/utils/common';
import { AvatarCell } from '../common/AvatarCell';

export const customerColumns = [
  {
    key: 'name',
    header: 'Name',
    render: (c: Customer) => (
      <AvatarCell
        name={c.displayName}
        avatar={c.avatar}
        subtitle={c.email || c.phoneNumber}
        size={32}
        rounded="full"
      />
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (c: Customer) => c.email || '-',
  },
  {
    key: 'phone',
    header: 'Phone',
    render: (c: Customer) => c.phoneNumber || '-',
  },
  {
    key: 'uid',
    header: 'UID',
    render: (c: Customer) => <span className="font-mono text-xs">{c.uid}</span>,
  },
  {
    key: 'created',
    header: 'Created',
    render: (c: Customer) => formatDate(c.createdAt),
  },
];
