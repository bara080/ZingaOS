import { ROLE_CONFIG, ALL_ROLES_VALUE } from './role.config';

export type Role = keyof typeof ROLE_CONFIG;
export type RoleValue = Role | typeof ALL_ROLES_VALUE;
