'use client';

import { ServiceRequestListItem } from '@/lib/types/serviceRequest';

import { Avatar } from '@/components/common/Avatar';
import { CategoryBadge } from '@/components/category/CategoryBadge';
import { formatDate } from '@/lib/utils/common';
import { RowAction, RowActions } from '@/components/common/RowActions';
import { ServiceRequestStatusBadge } from '../common/ServiceRequestStatusBadge';

type Props = {
  booking: ServiceRequestListItem;
  rowActions?: RowAction<ServiceRequestListItem>[];
};

export function BookingCard({ booking, rowActions }: Props) {
  const hasActions = rowActions && rowActions.length > 0;

  return (
    <div className="relative rounded-lg border p-3 space-y-3">
      {/* Actions */}
      {hasActions && (
        <div className="absolute top-2 right-2">
          <RowActions item={booking} actions={rowActions} />
        </div>
      )}

      {/* Customer */}
      <div className="flex items-center gap-3">
        <Avatar name={booking.customerName} size={40} rounded="full" />
        <div className="min-w-0">
          <div className="font-medium truncate">{booking.customerName || 'Unknown customer'}</div>
          <div className="text-xs text-muted-foreground truncate">
            {booking.customerEmail || booking.customerPhone || '-'}
          </div>
        </div>
      </div>

      {/* Category */}
      <CategoryBadge category={booking.category} />

      {/* Service / Store */}
      <div className="text-sm space-y-0.5">
        <div className="font-medium truncate">{booking.serviceTitle || 'Service'}</div>

        {booking.storeName && (
          <div className="text-xs text-muted-foreground truncate">{booking.storeName}</div>
        )}
      </div>

      {/* Meta */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <ServiceRequestStatusBadge status={booking.status} size="sm" />
        <span>{formatDate(booking.createdAt)}</span>
      </div>
    </div>
  );
}
