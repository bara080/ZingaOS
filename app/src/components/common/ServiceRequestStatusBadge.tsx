import {
  SERVICE_REQUEST_STATUS_CONFIG,
  ServiceRequestStatus,
} from '@/lib/constants/serviceRequestStatus';
import { cn } from '@/lib/utils/common';

type Props = {
  status: ServiceRequestStatus;
  size?: 'sm' | 'md';
};

export function ServiceRequestStatusBadge({ status, size = 'md' }: Props) {
  const config = SERVICE_REQUEST_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border leading-tight',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
