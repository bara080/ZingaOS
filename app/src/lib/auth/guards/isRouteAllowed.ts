import { ROUTE_PERMISSION_MAP, RouteKey } from '../permissions';
import { can } from './can';
import { Role, ROLES } from '@/lib/roles';

export function isRouteAllowed(pathname: string, role: Role) {
  const matchedRoute = (Object.keys(ROUTE_PERMISSION_MAP) as RouteKey[])
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route));

  // Default-DENY for matcher paths not in the permission map (e.g. /console,
  // /operator, /crm, /settings): allow only recognized roles instead of the old
  // fail-open `return true` (which let any non-empty role string through). Data on
  // those surfaces is separately gated by requireOperator/requireIgDemo; per-role
  // page restriction can be added by mapping the route above.
  if (!matchedRoute) return ROLES.includes(role);

  return can(role, ROUTE_PERMISSION_MAP[matchedRoute]);
}
