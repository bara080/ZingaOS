import { Role } from '@/lib/roles';
import { PERMISSIONS, Permission } from '../permissions';

export function hasRole(allowed: readonly Role[], role: Role): boolean {
  return allowed.includes(role);
}

export function can(role: Role | undefined, permission?: Permission): boolean {
  if (!permission) return true;
  if (!role) return false;

  return hasRole(PERMISSIONS[permission], role);
}
