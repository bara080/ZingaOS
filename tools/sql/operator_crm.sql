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
