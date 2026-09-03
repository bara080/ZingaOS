-- Lead denylist + per-lead delete/skip for the DM Queue ⋮ menu.
-- Junk accounts (e.g. nyse, nycvotes, nypd) get scraped as "leads". Denylisting a
-- handle deletes the current lead AND makes future scrapes auto-drop it (the
-- upsert RPC filters denylisted handles). Same security model as operator_crm.sql:
-- `ops` is private (RLS deny-all); RPCs live in `public`, SECURITY DEFINER,
-- service_role-only. ⚠ Apply to Supabase before the DM Queue ⋮ menu works.

-- Normalized (lowercased, @-stripped) IG handles that must never be a lead.
create table if not exists ops.lead_denylist (
  handle      text primary key,          -- normalized: lower, no leading @
  reason      text,
  actor       text,
  created_at  timestamptz not null default now()
);
alter table ops.lead_denylist enable row level security;  -- deny-all: RPC-only

-- Normalize a handle the same way everywhere.
create or replace function ops.norm_handle(p text)
returns text language sql immutable set search_path = ops, pg_temp as $$
  select nullif(lower(regexp_replace(coalesce(p,''), '^@+', '')), '');
$$;

-- Add a handle to the denylist AND delete any matching leads. Returns #leads removed.
create or replace function public.operator_lead_denylist_add(
  p_handle text, p_reason text, p_actor text
)
returns integer
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare h text; n integer;
begin
  h := ops.norm_handle(p_handle);
  if h is null then return 0; end if;
  insert into ops.lead_denylist(handle, reason, actor)
    values (h, nullif(p_reason,''), nullif(p_actor,''))
    on conflict (handle) do update set reason = coalesce(excluded.reason, ops.lead_denylist.reason);
  delete from ops.leads where ops.norm_handle(instagram) = h;
  get diagnostics n = row_count;
  return n;
end $$;

-- Delete a single lead by id.
create or replace function public.operator_lead_delete(p_id bigint)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  delete from ops.leads where id = p_id;
$$;

-- Set a lead's stage (used by "Remove from queue" → stage 'skipped', which the DM
-- Queue excludes while keeping the lead in the Leads tab).
create or replace function public.operator_lead_set_stage(p_id bigint, p_stage text)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  update ops.leads set stage = nullif(p_stage,'') where id = p_id;
$$;

-- Re-create the upsert to SKIP denylisted handles (adds the not-in-denylist filter).
create or replace function public.operator_upsert_leads(p_leads jsonb)
returns integer
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare before_ct integer; after_ct integer;
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
  where ops.norm_handle(x.instagram) is null
     or ops.norm_handle(x.instagram) not in (select handle from ops.lead_denylist)
  on conflict do nothing;
  select count(*) into after_ct from ops.leads;
  return after_ct - before_ct;
end $$;

-- List the denylist (for a future settings view).
create or replace function public.operator_lead_denylist_list(p_limit int default 200)
returns setof ops.lead_denylist
language sql stable security definer set search_path = ops, pg_temp
as $$
  select * from ops.lead_denylist order by created_at desc limit greatest(1, least(coalesce(p_limit,200), 1000));
$$;

-- Lock down: service_role only.
revoke all on function public.operator_lead_denylist_add(text, text, text) from public, anon, authenticated;
revoke all on function public.operator_lead_delete(bigint)                 from public, anon, authenticated;
revoke all on function public.operator_lead_set_stage(bigint, text)        from public, anon, authenticated;
revoke all on function public.operator_upsert_leads(jsonb)                 from public, anon, authenticated;
revoke all on function public.operator_lead_denylist_list(int)             from public, anon, authenticated;
grant execute on function public.operator_lead_denylist_add(text, text, text) to service_role;
grant execute on function public.operator_lead_delete(bigint)                 to service_role;
grant execute on function public.operator_lead_set_stage(bigint, text)        to service_role;
grant execute on function public.operator_upsert_leads(jsonb)                 to service_role;
grant execute on function public.operator_lead_denylist_list(int)             to service_role;

notify pgrst, 'reload schema';
