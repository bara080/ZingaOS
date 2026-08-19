import { PERMISSIONS } from './permissions';

/**
 * All permission keys (e.g. "users.view")
 */
export type Permission = keyof typeof PERMISSIONS;

/**
 * Generic route → permission map
 */
export type RoutePermissionMap = Record<string, Permission>;
