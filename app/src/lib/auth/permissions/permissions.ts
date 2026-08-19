import { Role } from '@/lib/roles';

/**
 * 🔐 Permission → Allowed roles
 * Single source of truth
 */
export const PERMISSIONS = {
  'users.view': ['superadmin', 'manager', 'csr'],
  'users.create': ['superadmin', 'admin'],
  'users.edit': ['superadmin', 'admin'],
  'users.delete': ['superadmin', 'admin'],

  'admin-users.view': ['superadmin', 'admin'],
  'admin-users.edit': ['superadmin', 'admin'],

  'customers.view': ['superadmin', 'admin', 'manager', 'developer', 'csr'],
  'customers.enable': ['superadmin', 'admin', 'manager', 'csr'],
  'customers.disable': ['superadmin', 'admin', 'manager', 'csr'],
  'customers.export': ['superadmin', 'admin', 'manager'],
  'customers.delete': ['superadmin', 'admin'],

  'service-providers.view': ['superadmin', 'admin', 'manager', 'developer', 'csr'],
  'service-providers.enable': ['superadmin', 'admin', 'manager', 'csr'],
  'service-providers.disable': ['superadmin', 'admin', 'manager', 'csr'],
  'service-providers.export': ['superadmin', 'admin', 'manager'],
  'service-providers.delete': ['superadmin', 'admin'],

  'analytics.view': ['superadmin', 'admin'],
  'reports.view': ['superadmin', 'admin'],
  'notifications.view': ['superadmin', 'admin', 'manager', 'csr'],

  'banners.view': ['superadmin', 'admin', 'manager'],
  'banners.create': ['superadmin', 'admin'],
  'banners.edit': ['superadmin', 'admin'],
  'banners.delete': ['superadmin', 'admin'],

  'campaigns.view': ['superadmin', 'admin', 'manager'],
  'campaigns.create': ['superadmin', 'admin'],
  'campaigns.send': ['superadmin', 'admin'],
  'campaigns.delete': ['superadmin', 'admin'],

  'api-docs.view': ['superadmin', 'admin', 'developer'],
} as const satisfies Record<string, readonly Role[]>;
