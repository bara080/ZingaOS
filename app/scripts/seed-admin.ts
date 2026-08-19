/**
 * Seed the first superadmin for the invite-only Zinga admin console.
 *
 * This creates (or invites) a single user whose AUTHORITATIVE role lives in
 * Supabase `app_metadata` (never user_metadata). The `handle_new_user` trigger
 * seeds the matching `public.profiles` row.
 *
 * Usage (does NOT run automatically — no creds are committed):
 *
 *   # Ensure these are set (e.g. in app/.env.local, loaded however you prefer):
 *   #   NEXT_PUBLIC_SUPABASE_URL
 *   #   SUPABASE_SECRET_KEY
 *   #
 *   # Invite (emails a magic link -> /invite/accept to set a password):
 *   npx tsx scripts/seed-admin.ts admin@zingaapp.com
 *
 *   # Or create with a password immediately (no email):
 *   SEED_ADMIN_PASSWORD='a-strong-password' npx tsx scripts/seed-admin.ts admin@zingaapp.com
 *
 * The email may also be passed via SEED_ADMIN_EMAIL instead of an arg.
 */
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in the environment.',
    );
  }

  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    throw new Error('Provide the admin email as an argument or via SEED_ADMIN_EMAIL.');
  }

  const password = process.env.SEED_ADMIN_PASSWORD;
  const displayName = email.split('@')[0];

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (password) {
    // Create immediately with a password (skips the email step).
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'superadmin', display_name: displayName },
      app_metadata: { role: 'superadmin' },
    });
    if (error) throw error;
    console.log(`Created superadmin ${email} (id: ${data.user?.id})`);
  } else {
    // Invite via email (user sets password on /invite/accept).
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { role: 'superadmin', display_name: displayName },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/accept`,
    });
    if (error) throw error;

    // Set the authoritative role in app_metadata.
    if (data.user) {
      const { error: metaError } = await admin.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role: 'superadmin' },
      });
      if (metaError) throw metaError;
    }
    console.log(`Invited superadmin ${email} (id: ${data.user?.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
