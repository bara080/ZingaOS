import { AdminUsersFilters } from '../filters/adminUsers';
import { ALL_ROLES_VALUE } from '../roles';
import { AdminUserListItem, UserDoc } from '../types';

export async function fetchAdminUsers(
  page: number,
  limit: number,
  filters: AdminUsersFilters,
): Promise<{ users: AdminUserListItem[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.name) params.set('name', filters.name);
  if (filters.email) params.set('email', filters.email);

  if (filters.role !== ALL_ROLES_VALUE) {
    params.set('role', filters.role);
  }

  if (filters.registeredFrom) params.set('registeredFrom', filters.registeredFrom);
  if (filters.registeredTo) params.set('registeredTo', filters.registeredTo);

  const res = await fetch(`/api/users?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch admin users');
  }

  return res.json();
}

export async function fetchAdminUserDetails(id: string): Promise<UserDoc> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed to load user');
  const data = await res.json();
  return data.user;
}

export async function updateAdminUserRole(id: string, role: string) {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) throw new Error('Failed to update role');
  return res.json();
}

export async function updateAdminUser(id: string, data: { displayName: string; email: string }) {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Update failed');
  return res.json();
}
