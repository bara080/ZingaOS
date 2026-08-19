# Quarantine — "Bucket B" (MongoDB → Supabase rewrite pending)

These files were moved **out of the compiled Next.js tree** (`src/`) during the
Supabase Auth migration so that `npm run build` succeeds. They are NOT compiled
and NOT routed — anything here is dead until rewritten.

## Why

The auth stack was migrated from custom `jose` JWT + MongoDB + `bcrypt` to
**Supabase Auth**. The npm packages `mongodb`, `bcryptjs`, `jose`,
`firebase-admin`, `@sendgrid/mail`, and `expo-server-sdk` were removed from
`package.json`. Every file below imports one of those packages (directly, or via
`@/lib/db` / `@/lib/telemetry` / `@/lib/firebase` / `@/lib/email`), so it can no
longer resolve its imports. These are non-auth product features (customers,
service providers, banners, campaigns, dashboard overview/revenue, push
notifications, and the telemetry/trackers/cron/webhooks/analytics suite) that
are unrelated to the auth migration and were intentionally left untouched.

## What was moved (relative structure preserved under `src/_quarantine/`)

### Library helpers
- `lib/db.ts` — MongoDB multi-cluster connection
- `lib/hash.tsx` — bcrypt password hashing
- `lib/telemetry.ts`, `lib/telemetryQueries.ts` — Mongo telemetry read/write
- `lib/email/sendInviteEmail.ts` — SendGrid invite email
- `lib/firebase/firebase-admin.ts`, `lib/firebase/upload.ts` — Firebase Storage

### Feature libs
- `features/email-campaign/api/campaigns.ts` (Mongo)
- `features/email-campaign/lib/audience.ts` (Mongo)
- `features/email-campaign/lib/sender.ts` (SendGrid)
  (The client components/hooks in `features/email-campaign` stay live — only the
  server libs were quarantined.)

### API routes (`app/api/...`)
- `admin/vexo/route.ts`
- `analytics/stripe/route.ts`
- `banners/route.ts`, `banners/[bannerId]/route.ts`, `banners/[bannerId]/toggle/route.ts`
- `campaign/route.ts`, `campaign/send/route.ts`
- `cron/{apple-sync,google-play-sync,logrocket-sync,sentry-sync,vercel-sync}/route.ts`
- `customers/route.ts`, `customers/[id]/route.ts`
- `dashboard/overview/route.ts`, `dashboard/revenue/route.ts`
- `push-notifications/{groups,status,send}/route.ts`
- `service-providers/route.ts`, `service-providers/[id]/route.ts`
- `service-requests/route.ts`
- `trackers/**` (apple, vexo, vercel, logrocket, google-play, sentry — summary/reviews/etc.)
- `webhooks/{vexo,logrocket,sentry,vercel,stripe}/route.ts`

## Notes
- `app/api/analytics/vexo/route.ts` stayed live — it is a plain `fetch` proxy to
  the Vexo API and imports no Mongo/Firebase/etc.
- The `(user-pages)` pages (banners, campaign, customers, service-providers,
  overview, push-notifications, analytics, etc.) still compile — they fetch data
  from these now-quarantined API routes at runtime and will error until the
  routes are rewritten on Supabase/Postgres. Their sidebar nav links were
  commented out in `src/lib/navigation.ts` so users don't land on broken pages.

## To rewrite
Port each file's data access from MongoDB (`getDb('ZC'|'SP'|'ZG')`) to Supabase
Postgres tables (or keep external API proxies as-is), move it back into `src/`,
and restore its nav link.
