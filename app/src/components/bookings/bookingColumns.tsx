import { CategoryBadge } from '@/components/category/CategoryBadge';
import { formatDate } from '@/lib/utils/common';
import { ServiceRequestStatusBadge } from '../common/ServiceRequestStatusBadge';
import { AvatarCell } from '../common/AvatarCell';
import { ServiceRequestListItem } from '@/lib/types';

export const bookingColumns = [
  {
    key: 'booking',
    header: 'Booking',
    render: (b: ServiceRequestListItem) => (
      <div>
        <div className="font-medium">{b.bookingId}</div>
        <div className="text-xs text-muted-foreground">{b.serviceTitle || '-'}</div>
      </div>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: (b: ServiceRequestListItem) => (
      <AvatarCell
        name={b.customerName}
        avatar={b.customerAvatar}
        subtitle={b.customerEmail || b.customerPhone}
        size={32}
        rounded="full"
      />
    ),
  },
  {
    key: 'store',
    header: 'Store',
    render: (b: ServiceRequestListItem) =>
      b.storeName ? (
        <AvatarCell
          name={b.storeName}
          avatar={b.storeLogo}
          subtitle={b.serviceTitle}
          size={40}
          rounded="md"
        />
      ) : (
        '-'
      ),
  },
  {
    key: 'category',
    header: 'Category',
    render: (b: ServiceRequestListItem) =>
      b.category ? <CategoryBadge category={b.category} /> : '-',
  },
  {
    key: 'status',
    header: 'Status',
    render: (b: ServiceRequestListItem) => <ServiceRequestStatusBadge status={b.status} />,
  },
  {
    key: 'created',
    header: 'Created',
    render: (b: ServiceRequestListItem) => formatDate(b.createdAt),
  },
];
