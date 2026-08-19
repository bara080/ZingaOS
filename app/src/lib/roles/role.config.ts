export const ALL_ROLES_VALUE = '__all__' as const;

export const ROLE_CONFIG = {
  superadmin: {
    label: 'Super Admin',
  },
  admin: {
    label: 'Admin',
  },
  manager: {
    label: 'Manager',
  },
  developer: {
    label: 'Developer',
  },
  csr: {
    label: 'Customer Service Representative',
  },
} as const;
