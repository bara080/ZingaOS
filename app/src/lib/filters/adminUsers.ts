import { FilterField } from './types';
import { ALL_ROLES_VALUE, Role, roleFilterOptions } from '@/lib/roles';

export type AdminUsersFilters = {
  name: string;
  email: string;
  role: Role | typeof ALL_ROLES_VALUE;
  invitedby: string;
  registeredFrom: string;
  registeredTo: string;
};

export const adminUserFiltersConfig: FilterField<AdminUsersFilters>[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    placeholder: 'All roles',
    options: roleFilterOptions,
  },
  { name: 'invitedby', label: 'Invited By', type: 'text' },
  { name: 'registeredFrom', label: 'Registered From', type: 'date' },
  { name: 'registeredTo', label: 'Registered To', type: 'date' },
];
