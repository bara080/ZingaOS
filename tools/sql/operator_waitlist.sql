-- Public waitlist for the Zinga AI landing "Request access" CTA.
-- Private ops schema, RLS deny-all; the only write path is the SECURITY DEFINER RPC
-- public.waitlist_add, callable by service_role only (the /api/waitlist route uses the
-- service client). No read RPC — the list is never exposed to the browser.

create table if not exists ops.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  name        text,
  company     text,
  note        text,
  source      text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
alter table ops.waitlist enable row level security;  -- deny-all (no policies)

create or replace function public.waitlist_add(
  p_email text, p_name text, p_company text, p_note text, p_source text, p_user_agent text
) returns boolean
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
declare e text;
begin
  e := lower(trim(coalesce(p_email, '')));
  -- basic email shape check; reject junk without erroring
  if e = '' or e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return false;
  end if;
  insert into ops.waitlist (email, name, company, note, source, user_agent)
  values (
    e,
    nullif(trim(coalesce(p_name, '')), ''),
    nullif(trim(coalesce(p_company, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    nullif(p_source, ''),
    nullif(p_user_agent, '')
  )
  on conflict (email) do nothing;
  return true;
end $$;

revoke all on function public.waitlist_add(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.waitlist_add(text, text, text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
