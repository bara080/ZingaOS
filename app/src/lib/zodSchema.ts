import { z } from 'zod';

// Invite-only admin console: one identity per email. There is NO public signup
// and NO role selector on login — a user's role comes from Supabase
// `app_metadata` (set by admins at invite time), never from the login form.
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
