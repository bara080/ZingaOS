import { Permission } from './types';

export const ROUTE_PERMISSION_MAP = {
  '/users': 'users.view',
  '/admin-users': 'admin-users.view',
  '/analytics': 'analytics.view',
  '/reports': 'reports.view',
  '/notifications': 'notifications.view',
  '/api-doc': 'api-docs.view',
  '/campaigns': 'campaigns.view',
} as const satisfies Record<string, Permission>;

export type RouteKey = keyof typeof ROUTE_PERMISSION_MAP;
