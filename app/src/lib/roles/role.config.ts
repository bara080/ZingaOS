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
  guest: {
    // Limited external role — e.g. the Meta App reviewer. Can sign in and use the
    // operator's Instagram demo (Connect + DM) only; no leads/CRM/scrape/email.
    label: 'Guest',
  },
} as const;
