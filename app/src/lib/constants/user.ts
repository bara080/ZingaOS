// Mirrors the Supabase `public.user_status` enum.
export const USER_STATUSES = {
  INVITED: 'invited',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DISABLED: 'disabled',
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];
