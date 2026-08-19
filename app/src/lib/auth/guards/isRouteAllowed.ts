import { ROUTE_PERMISSION_MAP, RouteKey } from '../permissions';
import { can } from './can';
import { Role } from '@/lib/roles';

export function isRouteAllowed(pathname: string, role: Role) {
  const matchedRoute = (Object.keys(ROUTE_PERMISSION_MAP) as RouteKey[])
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route));

  if (!matchedRoute) return true;

  return can(role, ROUTE_PERMISSION_MAP[matchedRoute]);
}
