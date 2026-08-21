-- CRM outreach send log + mark-sent RPC. Companion to operator_write.sql.
--
-- Same security model: `ops` is a private schema (RLS deny-all, NOT exposed to
-- PostgREST). Functions live in `public`, are SECURITY DEFINER, EXECUTE revoked
-- from public/anon/authenticated and granted ONLY to service_role. The Next.js
-- /api/operator/crm/* routes are the only callers; each uses the service-role key
-- and is gated on readSession() + role in (superadmin, admin).
--
-- Apply over the session pooler / direct DB connection (or via Supabase MCP
-- execute_sql). Already applied to project xprrkepdjhixzztuqqqv on 2026-08-21.

-- ── send log: every outbound outreach attempt is auditable ──────────────────
create table if not exists ops.outreach_messages (
  id            bigint generated always as identity primary key,
  lead_id       bigint references ops.leads(id) on delete cascade,
  platform      text not null,
  send_mode     text not null,          -- manual | api | autopilot
  message       text,
  status        text not null default 'sent',
  external_message_id text,             -- provider message id when an API send
  actor         text,                   -- operator email
  sent_at       timestamptz not null default now()
);
alter table ops.outreach_messages enable row level security;  -- deny-all: RPC-only
create index if not exists ix_outreach_messages_lead
  on ops.outreach_messages(lead_id, sent_at desc);

-- ── mark a DM/outreach as sent + advance the lead ───────────────────────────
-- Records the send and advances the lead to 'contacted' ONLY from a pre-contact
-- stage (never downgrades a further-along lead). Writes an ops.audit row.
create or replace function public.operator_crm_mark_sent(
  p_lead_id   bigint,
  p_platform  text,
  p_send_mode text,
  p_message   text,
  p_actor     text default null
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare new_id bigint;
begin
  insert into ops.outreach_messages(lead_id, platform, send_mode, message, status, actor)
  values (p_lead_id, coalesce(nullif(p_platform,''),'instagram'),
          coalesce(nullif(p_send_mode,''),'manual'), nullif(p_message,''), 'sent', p_actor)
  returning id into new_id;

  update ops.leads
     set stage = 'contacted',
         contacted_at = coalesce(contacted_at, current_date)
   where id = p_lead_id
     and stage in ('scraped','prospect','new');

  insert into ops.audit(actor, action, detail)
  values (p_actor, 'crm_mark_sent',
          'lead ' || p_lead_id || ' via ' || coalesce(p_platform,'instagram') ||
          ' (' || coalesce(p_send_mode,'manual') || ')');

  return new_id;
end
$$;

-- ── CRM dashboard + guardrail stats (single-row aggregate) ──────────────────
-- Powers the Dashboard cards and the DM Queue daily-limit guardrail.
create or replace function public.operator_crm_stats()
returns table (
  ready_to_contact bigint,
  contacted        bigint,
  sent_total       bigint,
  sent_today       bigint,
  inbound_threads  bigint,
  qualified        bigint,
  won              bigint
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select
    (select count(*) from ops.leads l
       where l.stage in ('scraped','prospect','new')
         and (l.email is not null and l.email <> '' or l.instagram is not null and l.instagram <> '')) as ready_to_contact,
    (select count(*) from ops.leads where stage = 'contacted') as contacted,
    (select count(*) from ops.outreach_messages) as sent_total,
    (select count(*) from ops.outreach_messages where sent_at::date = current_date) as sent_today,
    (select count(distinct igsid) from ops.ig_messages where direction = 'in') as inbound_threads,
    (select count(*) from ops.leads where stage = 'qualified') as qualified,
    (select count(*) from ops.leads where stage in ('signed','listed','won')) as won;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_crm_mark_sent(bigint, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.operator_crm_mark_sent(bigint, text, text, text, text)
  to service_role;
revoke all on function public.operator_crm_stats() from public, anon, authenticated;
grant execute on function public.operator_crm_stats() to service_role;

notify pgrst, 'reload schema';

-- ── campaigns: saved segment + config; metrics computed live ────────────────
-- Applied to project xprrkepdjhixzztuqqqv on 2026-08-21.
create table if not exists ops.campaigns (
  id          bigint generated always as identity primary key,
  name        text not null,
  platform    text not null default 'instagram',
  goal        text,
  source      text,                    -- segment filter on ops.leads.source; null = all
  send_mode   text not null default 'manual',
  daily_limit integer not null default 40,
  status      text not null default 'active',   -- active | paused
  actor       text,
  created_at  timestamptz not null default now()
);
alter table ops.campaigns enable row level security;  -- deny-all: RPC-only

create or replace function public.operator_campaign_create(
  p_name text, p_platform text, p_goal text, p_source text,
  p_send_mode text, p_daily_limit integer, p_actor text default null
) returns bigint
language sql volatile security definer set search_path = ops, pg_temp as $$
  insert into ops.campaigns(name, platform, goal, source, send_mode, daily_limit, actor)
  values (nullif(p_name,''), coalesce(nullif(p_platform,''),'instagram'), nullif(p_goal,''),
          nullif(p_source,''), coalesce(nullif(p_send_mode,''),'manual'),
          greatest(1, least(coalesce(p_daily_limit,40), 500)), p_actor)
  returning id;
$$;

create or replace function public.operator_campaign_set_status(p_id bigint, p_status text)
returns void
language sql volatile security definer set search_path = ops, pg_temp as $$
  update ops.campaigns set status = case when p_status = 'paused' then 'paused' else 'active' end
   where id = p_id;
$$;

create or replace function public.operator_campaigns_list()
returns table (
  id bigint, name text, platform text, goal text, source text, send_mode text,
  daily_limit integer, status text, created_at timestamptz,
  assigned bigint, ready bigint, sent bigint, replies bigint, qualified bigint, won bigint
)
language sql stable security definer set search_path = ops, pg_temp as $$
  select c.id, c.name, c.platform, c.goal, c.source, c.send_mode, c.daily_limit,
         c.status, c.created_at,
         count(l.*)                                                        as assigned,
         count(l.*) filter (where l.stage in ('scraped','prospect','new')) as ready,
         count(l.*) filter (where l.contacted_at is not null)              as sent,
         count(l.*) filter (where l.replied_at is not null)                as replies,
         count(l.*) filter (where l.stage = 'qualified')                   as qualified,
         count(l.*) filter (where l.stage in ('signed','listed','won'))    as won
  from ops.campaigns c
  left join ops.leads l on (c.source is null or l.source = c.source)
  group by c.id
  order by c.created_at desc;
$$;

revoke all on function public.operator_campaign_create(text,text,text,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.operator_campaign_set_status(bigint,text) from public, anon, authenticated;
revoke all on function public.operator_campaigns_list() from public, anon, authenticated;
grant execute on function public.operator_campaign_create(text,text,text,text,text,integer,text) to service_role;
grant execute on function public.operator_campaign_set_status(bigint,text) to service_role;
grant execute on function public.operator_campaigns_list() to service_role;
notify pgrst, 'reload schema';
