-- Operator console — WRITE + aggregate access to the PRIVATE ops.leads table,
-- plus an ops.audit trail. Companion to operator_leads.sql (read side).
--
-- Same security model as operator_leads.sql: ops is a non-public schema NOT
-- exposed to PostgREST and RLS deny-all, so supabase-js cannot touch it directly.
-- Every function below is SECURITY DEFINER (runs as owner, bypassing RLS), lives
-- in `public` (reachable via PostgREST RPC), and has EXECUTE revoked from
-- public/anon/authenticated and granted ONLY to service_role. The Next.js
-- /api/operator/* routes are the only callers; each uses the service-role key and
-- is itself gated on readSession() + role in (superadmin, admin).
--
-- Apply over the direct/pooler DB connection (same as operator_leads.sql).

-- ── audit trail ─────────────────────────────────────────────────────────────
create table if not exists ops.audit (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  actor  text,
  action text not null,
  detail text
);
alter table ops.audit enable row level security;  -- deny-all: no policies defined

-- ── upsert scraped leads (dedup-safe) ───────────────────────────────────────
-- Accepts a JSON array of lead objects; inserts new rows only. Dedup is handled
-- by the existing ux_leads_email / ux_leads_instagram partial unique indexes via
-- ON CONFLICT DO NOTHING (matches tools/load_ig_leads.py). Returns rows inserted.
create or replace function public.operator_upsert_leads(p_leads jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare
  before_ct integer;
  after_ct  integer;
begin
  select count(*) into before_ct from ops.leads;
  insert into ops.leads
    (business, owner, email, phone, instagram, website,
     borough, category, source, stage, scraped_at, notes)
  select
    nullif(x.business,''), nullif(x.owner,''), nullif(x.email,''), nullif(x.phone,''),
    nullif(x.instagram,''), nullif(x.website,''), nullif(x.borough,''),
    nullif(x.category,''), nullif(x.source,''),
    coalesce(nullif(x.stage,''),'scraped'),
    nullif(x.scraped_at,'')::date, nullif(x.notes,'')
  from jsonb_to_recordset(p_leads) as x(
    business text, owner text, email text, phone text, instagram text, website text,
    borough text, category text, source text, stage text, scraped_at text, notes text)
  on conflict do nothing;
  select count(*) into after_ct from ops.leads;
  return after_ct - before_ct;
end
$$;

-- ── campaign: emailable recipients for a source ─────────────────────────────
create or replace function public.operator_campaign_recipients(
  p_source text default null,
  p_limit  integer default 500
)
returns table (id bigint, email text, business text, stage text, contacted_at date)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select l.id, l.email, l.business, l.stage, l.contacted_at
  from ops.leads l
  where l.email is not null and l.email <> ''
    and (p_source is null or p_source = '' or l.source = p_source)
  order by (l.contacted_at is null) desc, l.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 500), 2000));
$$;

-- ── campaign: sent / pending / total counts (emailable only) ────────────────
create or replace function public.operator_campaign_counts(p_source text default null)
returns table (sent bigint, pending bigint, total bigint)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select
    count(*) filter (where l.contacted_at is not null)                                   as sent,
    count(*) filter (where l.contacted_at is null and l.stage in ('scraped','prospect')) as pending,
    count(*)                                                                             as total
  from ops.leads l
  where l.email is not null and l.email <> ''
    and (p_source is null or p_source = '' or l.source = p_source);
$$;

-- ── send batch: fetch the NEXT uncontacted emailable leads (hard cap 10) ────
create or replace function public.operator_next_batch(
  p_source text default null,
  p_limit  integer default 5
)
returns table (id bigint, email text, business text)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select l.id, l.email, l.business
  from ops.leads l
  where l.email is not null and l.email <> ''
    and l.contacted_at is null
    and l.stage in ('scraped','prospect')
    and (p_source is null or p_source = '' or l.source = p_source)
  order by l.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 5), 10));
$$;

-- ── mark leads contacted (only those still uncontacted) ─────────────────────
create or replace function public.operator_mark_contacted(
  p_ids     bigint[],
  p_subject text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare n integer;
begin
  update ops.leads
     set stage = 'contacted',
         contacted_at = current_date,
         subject = coalesce(p_subject, subject)
   where id = any(p_ids)
     and contacted_at is null;
  get diagnostics n = row_count;
  return n;
end
$$;

-- ── per-source counts (data-source picker + analytics scrape breakdown) ─────
create or replace function public.operator_source_counts()
returns table (source text, n bigint, emailable bigint)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select coalesce(l.source, '(none)') as source,
         count(*)::bigint,
         count(*) filter (where l.email is not null and l.email <> '')::bigint
  from ops.leads l
  group by 1
  order by 2 desc;
$$;

-- ── audit trail write / read ────────────────────────────────────────────────
create or replace function public.operator_audit_insert(
  p_actor  text,
  p_action text,
  p_detail text
)
returns void
language sql
volatile
security definer
set search_path = ops, pg_temp
as $$
  insert into ops.audit(actor, action, detail) values (p_actor, p_action, p_detail);
$$;

create or replace function public.operator_audit_list(p_limit integer default 40)
returns table (at timestamptz, actor text, action text, detail text)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select a.at, a.actor, a.action, a.detail
  from ops.audit a
  order by a.at desc
  limit greatest(1, least(coalesce(p_limit, 40), 200));
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_upsert_leads(jsonb)                     from public, anon, authenticated;
revoke all on function public.operator_campaign_recipients(text, integer)      from public, anon, authenticated;
revoke all on function public.operator_campaign_counts(text)                   from public, anon, authenticated;
revoke all on function public.operator_next_batch(text, integer)              from public, anon, authenticated;
revoke all on function public.operator_mark_contacted(bigint[], text)          from public, anon, authenticated;
revoke all on function public.operator_source_counts()                         from public, anon, authenticated;
revoke all on function public.operator_audit_insert(text, text, text)          from public, anon, authenticated;
revoke all on function public.operator_audit_list(integer)                     from public, anon, authenticated;

grant execute on function public.operator_upsert_leads(jsonb)                  to service_role;
grant execute on function public.operator_campaign_recipients(text, integer)   to service_role;
grant execute on function public.operator_campaign_counts(text)                to service_role;
grant execute on function public.operator_next_batch(text, integer)           to service_role;
grant execute on function public.operator_mark_contacted(bigint[], text)       to service_role;
grant execute on function public.operator_source_counts()                      to service_role;
grant execute on function public.operator_audit_insert(text, text, text)       to service_role;
grant execute on function public.operator_audit_list(integer)                  to service_role;

notify pgrst, 'reload schema';
