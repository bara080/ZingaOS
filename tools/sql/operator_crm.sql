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

-- ── CRM Home dashboard + guardrail stats (single-row aggregate) ─────────────
-- Powers the Home cards/funnel/tasks and the DM Queue daily-limit guardrail.
drop function if exists public.operator_crm_stats();
create function public.operator_crm_stats()
returns table (
  total_leads      bigint,
  ready_to_contact bigint,
  contacted        bigint,
  sent_total       bigint,
  sent_today       bigint,
  inbound_threads  bigint,
  replied          bigint,
  followups        bigint,
  qualified        bigint,
  won              bigint
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select
    (select count(*) from ops.leads) as total_leads,
    (select count(*) from ops.leads l
       where l.stage in ('scraped','prospect','new')
         and (l.email is not null and l.email <> '' or l.instagram is not null and l.instagram <> '')) as ready_to_contact,
    (select count(*) from ops.leads where stage = 'contacted') as contacted,
    (select count(*) from ops.outreach_messages) as sent_total,
    (select count(*) from ops.outreach_messages where sent_at::date = current_date) as sent_today,
    (select count(distinct igsid) from ops.ig_messages where direction = 'in') as inbound_threads,
    (select count(*) from ops.leads where replied_at is not null or stage = 'replied') as replied,
    (select count(*) from ops.leads where stage = 'contacted' and replied_at is null) as followups,
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

-- ── analytics: daily time series + per-platform sends ───────────────────────
-- Applied to project xprrkepdjhixzztuqqqv on 2026-08-21.
create or replace function public.operator_crm_timeseries(p_days integer default 14)
returns table (day date, sent bigint, replies bigint)
language sql stable security definer set search_path = ops, pg_temp as $$
  with days as (
    select generate_series(
      (current_date - (greatest(1, least(coalesce(p_days,14), 90)) - 1) * interval '1 day')::date,
      current_date, interval '1 day')::date as day
  )
  select d.day,
    (select count(*) from ops.outreach_messages o where o.sent_at::date = d.day) as sent,
    (select count(*) from ops.ig_messages m where m.direction='in' and m.created_at::date = d.day) as replies
  from days d
  order by d.day;
$$;

create or replace function public.operator_crm_by_platform()
returns table (platform text, sent bigint)
language sql stable security definer set search_path = ops, pg_temp as $$
  select coalesce(nullif(o.platform,''),'unknown') as platform, count(*)::bigint as sent
  from ops.outreach_messages o
  group by 1
  order by 2 desc;
$$;

revoke all on function public.operator_crm_timeseries(integer) from public, anon, authenticated;
revoke all on function public.operator_crm_by_platform() from public, anon, authenticated;
grant execute on function public.operator_crm_timeseries(integer) to service_role;
grant execute on function public.operator_crm_by_platform() to service_role;
notify pgrst, 'reload schema';

-- ── AI agents: saved agent config (execution not wired — see plan §5) ───────
-- Config-only tables; the OpenAI Responses API / AI-SDR layer reads these once
-- an API key is provisioned. Applied to project xprrkepdjhixzztuqqqv on 2026-08-21.
create table if not exists ops.ai_agents (
  id            bigint generated always as identity primary key,
  name          text not null,
  role          text,
  tone          text,
  goal          text,
  system_prompt text,
  model         text default 'gpt-4',
  temperature   numeric default 0.5,
  escalation    text,
  enabled       boolean default true,
  actor         text,
  created_at    timestamptz default now()
);
alter table ops.ai_agents enable row level security;  -- deny-all: RPC-only

-- ── automation rules: saved trigger → action rules (engine not wired, §6) ───
create table if not exists ops.automation_rules (
  id         bigint generated always as identity primary key,
  name       text not null,
  trigger    text not null,
  action     text not null,
  enabled    boolean default true,
  actor      text,
  created_at timestamptz default now()
);
alter table ops.automation_rules enable row level security;  -- deny-all: RPC-only

-- ── AI agents RPCs ──────────────────────────────────────────────────────────
create or replace function public.operator_agents_list()
returns table (
  id bigint, name text, role text, tone text, goal text, system_prompt text,
  model text, temperature numeric, escalation text, enabled boolean,
  actor text, created_at timestamptz
)
language sql stable security definer set search_path = ops, pg_temp as $$
  select a.id, a.name, a.role, a.tone, a.goal, a.system_prompt, a.model,
         a.temperature, a.escalation, a.enabled, a.actor, a.created_at
  from ops.ai_agents a
  order by a.created_at desc;
$$;

create or replace function public.operator_agent_create(
  p_name text, p_role text, p_tone text, p_goal text, p_system_prompt text,
  p_model text, p_temperature numeric, p_escalation text, p_actor text default null
) returns bigint
language sql volatile security definer set search_path = ops, pg_temp as $$
  insert into ops.ai_agents(name, role, tone, goal, system_prompt, model, temperature, escalation, actor)
  values (nullif(p_name,''), nullif(p_role,''), nullif(p_tone,''), nullif(p_goal,''),
          nullif(p_system_prompt,''), coalesce(nullif(p_model,''),'gpt-4'),
          coalesce(p_temperature, 0.5), nullif(p_escalation,''), p_actor)
  returning id;
$$;

create or replace function public.operator_agent_set_enabled(p_id bigint, p_enabled boolean)
returns void
language sql volatile security definer set search_path = ops, pg_temp as $$
  update ops.ai_agents set enabled = coalesce(p_enabled, true) where id = p_id;
$$;

-- ── automation rules RPCs ───────────────────────────────────────────────────
create or replace function public.operator_automations_list()
returns table (
  id bigint, name text, trigger text, action text, enabled boolean,
  actor text, created_at timestamptz
)
language sql stable security definer set search_path = ops, pg_temp as $$
  select r.id, r.name, r.trigger, r.action, r.enabled, r.actor, r.created_at
  from ops.automation_rules r
  order by r.created_at desc;
$$;

create or replace function public.operator_automation_create(
  p_name text, p_trigger text, p_action text, p_actor text default null
) returns bigint
language sql volatile security definer set search_path = ops, pg_temp as $$
  insert into ops.automation_rules(name, trigger, action, actor)
  values (nullif(p_name,''), nullif(p_trigger,''), nullif(p_action,''), p_actor)
  returning id;
$$;

create or replace function public.operator_automation_set_enabled(p_id bigint, p_enabled boolean)
returns void
language sql volatile security definer set search_path = ops, pg_temp as $$
  update ops.automation_rules set enabled = coalesce(p_enabled, true) where id = p_id;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_agents_list() from public, anon, authenticated;
revoke all on function public.operator_agent_create(text,text,text,text,text,text,numeric,text,text) from public, anon, authenticated;
revoke all on function public.operator_agent_set_enabled(bigint,boolean) from public, anon, authenticated;
revoke all on function public.operator_automations_list() from public, anon, authenticated;
revoke all on function public.operator_automation_create(text,text,text,text) from public, anon, authenticated;
revoke all on function public.operator_automation_set_enabled(bigint,boolean) from public, anon, authenticated;
grant execute on function public.operator_agents_list() to service_role;
grant execute on function public.operator_agent_create(text,text,text,text,text,text,numeric,text,text) to service_role;
grant execute on function public.operator_agent_set_enabled(bigint,boolean) to service_role;
grant execute on function public.operator_automations_list() to service_role;
grant execute on function public.operator_automation_create(text,text,text,text) to service_role;
grant execute on function public.operator_automation_set_enabled(bigint,boolean) to service_role;
notify pgrst, 'reload schema';

-- ── per-lead activity feed (DM Queue · Activity tab) ────────────────────────
-- Applied to project xprrkepdjhixzztuqqqv on 2026-08-21.
create or replace function public.operator_lead_activity(p_lead_id bigint, p_limit integer default 50)
returns table (id bigint, platform text, send_mode text, message text, status text, actor text, sent_at timestamptz)
language sql stable security definer set search_path = ops, pg_temp as $$
  select o.id, o.platform, o.send_mode, o.message, o.status, o.actor, o.sent_at
  from ops.outreach_messages o
  where o.lead_id = p_lead_id
  order by o.sent_at desc
  limit greatest(1, least(coalesce(p_limit,50), 200));
$$;
revoke all on function public.operator_lead_activity(bigint, integer) from public, anon, authenticated;
grant execute on function public.operator_lead_activity(bigint, integer) to service_role;
notify pgrst, 'reload schema';
