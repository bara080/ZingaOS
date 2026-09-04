-- Operator/CRM — Facebook MESSENGER channel (Meta Messenger Platform, Page DMs).
-- A faithful clone of operator_ig_conversations.sql: a two-way message log in the
-- PRIVATE `ops` schema, threaded by the sender's PSID (page-scoped user id).
-- Messenger is the SAME Meta app + SAME /api/meta/webhook as Instagram — the only
-- difference is the webhook payload arrives with object='page' and recipients are
-- addressed by PSID (from messaging[].sender.id) rather than an IGSID/handle.
--
-- ⚠️  APPLY THIS via the Supabase MCP (apply_migration) before the Messenger
--     routes/UI will work. Nothing in the app creates these objects.
--
-- Same security model as operator_ig_conversations.sql / operator_whatsapp.sql:
-- ops is a non-public schema NOT exposed to PostgREST and RLS deny-all, so
-- supabase-js cannot touch it directly. Every function below is SECURITY DEFINER
-- (runs as owner, bypassing RLS), lives in `public` (reachable via PostgREST RPC),
-- and has EXECUTE revoked from public/anon/authenticated and granted ONLY to
-- service_role. Callers:
--   • /api/meta/webhook (service-role) — persists inbound after HMAC verify.
--   • /api/operator/messenger/* (service-role, gated on requireOperator).
-- Messenger DM text + PSIDs are provider/customer PII — they live here, never in
-- git or stdout.

create schema if not exists ops;

-- ── message store (inbound + outbound) ──────────────────────────────────────
create table if not exists ops.messenger_messages (
  id          bigint generated always as identity primary key,
  page_id     text not null,                 -- Zinga Page id
  psid        text not null,                 -- page-scoped user id (the "thread key")
  mid         text unique,                   -- provider message id (dedup)
  direction   text not null check (direction in ('in','out')),
  body        text,
  attachments jsonb,
  sender_name text,                          -- best-effort, from profile lookup
  lead_id     bigint references ops.leads(id),
  created_at  timestamptz not null default now(),
  provider_ts timestamptz                    -- Meta's timestamp
);
alter table ops.messenger_messages enable row level security;  -- deny-all: no policies defined

-- Thread reads: newest-first within one PSID's conversation.
create index if not exists ix_messenger_messages_psid_created
  on ops.messenger_messages (psid, created_at desc);

-- Fetch-by-page-and-contact.
create index if not exists ix_messenger_messages_page_psid
  on ops.messenger_messages (page_id, psid);

-- ── store inbound (Meta webhook) — dedup-safe on mid ────────────────────────
-- Idempotent: replayed webhooks collide on the unique `mid` and are dropped.
-- Best-effort link to ops.leads by matching the sender name to a lead's business
-- or owner (Messenger gives no handle, so this is heuristic and optional).
create or replace function public.operator_messenger_store_inbound(
  p_page_id     text,
  p_psid        text,
  p_mid         text,
  p_body        text,
  p_attachments jsonb,
  p_sender_name text,
  p_provider_ts timestamptz
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare
  v_lead bigint;
  new_id bigint;
begin
  if p_psid is null or p_psid = '' then raise exception 'psid required'; end if;

  if nullif(p_sender_name,'') is not null then
    select id into v_lead
    from ops.leads
    where lower(business) = lower(p_sender_name)
       or lower(owner)    = lower(p_sender_name)
    limit 1;
  end if;

  insert into ops.messenger_messages
    (page_id, psid, mid, direction, body, attachments, sender_name, lead_id, provider_ts)
  values
    (p_page_id, p_psid, nullif(p_mid,''), 'in', p_body, p_attachments,
     nullif(p_sender_name,''), v_lead, p_provider_ts)
  on conflict (mid) do nothing
  returning id into new_id;

  return new_id;  -- null when the redelivery was deduped
end
$$;

-- ── store outbound (after a successful approved send) ───────────────────────
create or replace function public.operator_messenger_store_outbound(
  p_page_id text,
  p_psid    text,
  p_mid     text,
  p_body    text
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare
  v_lead bigint;
  new_id bigint;
begin
  if p_psid is null or p_psid = '' then raise exception 'psid required'; end if;

  -- Reuse a lead link already known for this PSID, if any.
  select lead_id into v_lead
  from ops.messenger_messages
  where psid = p_psid and lead_id is not null
  order by created_at desc
  limit 1;

  insert into ops.messenger_messages
    (page_id, psid, mid, direction, body, lead_id)
  values
    (p_page_id, p_psid, nullif(p_mid,''), 'out', p_body, v_lead)
  returning id into new_id;

  return new_id;
end
$$;

-- ── threads: one row per psid, most-recent first ────────────────────────────
create or replace function public.operator_messenger_threads(p_limit integer default 50)
returns table (
  psid           text,
  sender_name    text,
  lead_id        bigint,
  last_text      text,
  last_at        timestamptz,
  last_direction text,
  msg_count      bigint
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select distinct on (m.psid)
    m.psid,
    -- most recent non-null sender_name seen for this psid
    first_value(m.sender_name) over (
      partition by m.psid
      order by (m.sender_name is not null) desc, m.created_at desc
    ) as sender_name,
    first_value(m.lead_id) over (
      partition by m.psid
      order by (m.lead_id is not null) desc, m.created_at desc
    ) as lead_id,
    m.body       as last_text,
    m.created_at as last_at,
    m.direction  as last_direction,
    count(*) over (partition by m.psid) as msg_count
  from ops.messenger_messages m
  order by m.psid, m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

-- ── thread: full message history for one psid, oldest-first ─────────────────
create or replace function public.operator_messenger_thread(
  p_psid  text,
  p_limit integer default 100
)
returns table (
  id          bigint,
  direction   text,
  body        text,
  attachments jsonb,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select t.id, t.direction, t.body, t.attachments, t.created_at
  from (
    select m.id, m.direction, m.body, m.attachments, m.created_at
    from ops.messenger_messages m
    where m.psid = p_psid
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) t
  order by t.created_at asc, t.id asc;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_messenger_store_inbound(text, text, text, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.operator_messenger_store_outbound(text, text, text, text)                          from public, anon, authenticated;
revoke all on function public.operator_messenger_threads(integer)                                                from public, anon, authenticated;
revoke all on function public.operator_messenger_thread(text, integer)                                           from public, anon, authenticated;

grant execute on function public.operator_messenger_store_inbound(text, text, text, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.operator_messenger_store_outbound(text, text, text, text)                          to service_role;
grant execute on function public.operator_messenger_threads(integer)                                                to service_role;
grant execute on function public.operator_messenger_thread(text, integer)                                           to service_role;

notify pgrst, 'reload schema';
