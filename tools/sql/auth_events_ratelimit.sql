-- Auth events + Supabase-backed rate limiting (no external store needed).
-- Applied to Supabase via apply_migration `auth_events_ratelimit`.
-- Private ops schema, RLS deny-all; written only via SECURITY DEFINER RPCs (service_role).
-- Used by /api/auth/login (5 fails / 15 min per IP+email) and /api/waitlist (15/hr per IP).

create table if not exists ops.auth_events (
  id          bigint generated always as identity primary key,
  kind        text not null,          -- 'login' | 'login_fail' | 'logout' | 'waitlist' | ...
  key         text,                   -- rate-limit key (e.g. 'ip|email' or 'wl|ip')
  email       text,                   -- lowercased; login events (private table)
  ip          text,
  user_agent  text,
  ok          boolean,
  created_at  timestamptz not null default now()
);
create index if not exists auth_events_kind_key_time on ops.auth_events (kind, key, created_at desc);
create index if not exists auth_events_time on ops.auth_events (created_at desc);
alter table ops.auth_events enable row level security;  -- deny-all

create or replace function public.auth_log_event(
  p_kind text, p_key text, p_email text, p_ip text, p_ua text, p_ok boolean
) returns void
language sql security definer set search_path = ops, pg_temp as $$
  insert into ops.auth_events (kind, key, email, ip, user_agent, ok)
  values (p_kind, nullif(p_key,''), lower(nullif(p_email,'')), nullif(p_ip,''), nullif(p_ua,''), p_ok);
$$;

create or replace function public.auth_recent_count(
  p_kind text, p_key text, p_window_secs integer
) returns integer
language sql security definer set search_path = ops, pg_temp as $$
  select count(*)::int from ops.auth_events
  where kind = p_kind and key = p_key
    and created_at > now() - make_interval(secs => greatest(p_window_secs, 1));
$$;

revoke all on function public.auth_log_event(text,text,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.auth_recent_count(text,text,integer) from public, anon, authenticated;
grant execute on function public.auth_log_event(text,text,text,text,text,boolean) to service_role;
grant execute on function public.auth_recent_count(text,text,integer) to service_role;

notify pgrst, 'reload schema';
