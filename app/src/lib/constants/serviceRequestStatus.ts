import { ServiceRequestListItem } from '../types';

export type ServiceRequestStatus = ServiceRequestListItem['status'];

export const SERVICE_REQUEST_STATUS_CONFIG: Record<
  ServiceRequestStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 dark:bg-yellow-600/10 text-yellow-600 border-yellow-600',
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-blue-100 dark:bg-blue-600/10 text-blue-600 border-blue-600',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 dark:bg-green-600/10 text-green-600 border-green-600',
  },
  canceled: {
    label: 'Cancelled',
    className: 'bg-gray-100 dark:bg-gray-600/10 text-gray-600 border-gray-600',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 dark:bg-red-600/10 text-red-600 border-red-600',
  },
};
