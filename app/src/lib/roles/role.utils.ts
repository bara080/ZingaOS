import { ROLE_CONFIG, ALL_ROLES_VALUE } from './role.config';
import { Role } from './role.types';

/** Ordered role values */
export const ROLES = Object.keys(ROLE_CONFIG) as Role[];

/** Select-friendly options */
export const roleOptions = ROLES.map((role) => ({
  value: role,
  label: ROLE_CONFIG[role].label,
}));

/** Label lookup */
export const roleLabelMap: Record<Role, string> = Object.fromEntries(
  ROLES.map((role) => [role, ROLE_CONFIG[role].label]),
) as Record<Role, string>;

/** Type guard */
export function isRole(value: string): value is Role {
  return value in ROLE_CONFIG;
}

/** Filter options (with "All") */
export const roleFilterOptions = [{ value: ALL_ROLES_VALUE, label: 'All Roles' }, ...roleOptions];
