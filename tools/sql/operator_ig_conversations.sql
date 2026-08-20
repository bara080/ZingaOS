-- Operator console — Instagram conversation handling. Stores inbound IG DMs the
-- Meta webhook captures, and the outbound replies the operator approves-and-sends,
-- in the PRIVATE ops schema. Companion to operator_write.sql / operator_leads.sql.
--
-- Same security model as operator_write.sql: ops is a non-public schema NOT
-- exposed to PostgREST and RLS deny-all, so supabase-js cannot touch it directly.
-- Every function below is SECURITY DEFINER (runs as owner, bypassing RLS), lives
-- in `public` (reachable via PostgREST RPC), and has EXECUTE revoked from
-- public/anon/authenticated and granted ONLY to service_role. The callers are:
--   • /api/meta/webhook (service-role) — persists inbound after HMAC verify.
--   • /api/operator/ig/* (service-role, gated on readSession() + superadmin|admin).
-- IG DM text is provider/customer PII — it lives here, never in git or stdout.
--
-- Apply over the direct/pooler DB connection (same as operator_write.sql).

-- ── message store (inbound + outbound) ──────────────────────────────────────
create table if not exists ops.ig_messages (
  id         bigint generated always as identity primary key,
  igsid      text not null,
  username   text,
  direction  text not null check (direction in ('in','out')),
  text       text,
  mid        text,
  created_at timestamptz not null default now(),
  raw        jsonb
);
alter table ops.ig_messages enable row level security;  -- deny-all: no policies defined

-- Dedup Meta webhook redeliveries: a message id is unique when present. Partial
-- so multiple outbound rows (which may carry a null mid) never collide.
create unique index if not exists ux_ig_messages_mid
  on ops.ig_messages (mid) where mid is not null;

-- Thread reads: newest-first within a conversation.
create index if not exists ix_ig_messages_igsid_created
  on ops.ig_messages (igsid, created_at);

-- ── store inbound (webhook) — dedup-safe ────────────────────────────────────
create or replace function public.operator_ig_store_inbound(
  p_igsid    text,
  p_username text,
  p_text     text,
  p_mid      text,
  p_raw      jsonb
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare new_id bigint;
begin
  insert into ops.ig_messages (igsid, username, direction, text, mid, raw)
  values (p_igsid, nullif(p_username,''), 'in', p_text, nullif(p_mid,''), p_raw)
  on conflict (mid) where mid is not null do nothing
  returning id into new_id;
  return new_id;  -- null when the redelivery was deduped
end
$$;

-- ── store outbound (after a successful approved send) ───────────────────────
create or replace function public.operator_ig_store_outbound(
  p_igsid text,
  p_text  text,
  p_mid   text
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ops, pg_temp
as $$
declare new_id bigint;
begin
  insert into ops.ig_messages (igsid, direction, text, mid)
  values (p_igsid, 'out', p_text, nullif(p_mid,''))
  returning id into new_id;
  return new_id;
end
$$;

-- ── threads: one row per igsid, most-recent first ───────────────────────────
create or replace function public.operator_ig_threads(p_limit integer default 50)
returns table (
  igsid     text,
  username  text,
  last_text text,
  last_at   timestamptz,
  msg_count bigint
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select distinct on (m.igsid)
    m.igsid,
    -- most recent non-null username seen for this igsid
    first_value(m.username) over (
      partition by m.igsid
      order by (m.username is not null) desc, m.created_at desc
    ) as username,
    m.text as last_text,
    m.created_at as last_at,
    count(*) over (partition by m.igsid) as msg_count
  from ops.ig_messages m
  order by m.igsid, m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

-- ── thread: full message history for one igsid, oldest-first ────────────────
create or replace function public.operator_ig_thread(
  p_igsid text,
  p_limit integer default 100
)
returns table (
  id         bigint,
  direction  text,
  text       text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select t.id, t.direction, t.text, t.created_at
  from (
    select m.id, m.direction, m.text, m.created_at
    from ops.ig_messages m
    where m.igsid = p_igsid
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) t
  order by t.created_at asc, t.id asc;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_ig_store_inbound(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.operator_ig_store_outbound(text, text, text)              from public, anon, authenticated;
revoke all on function public.operator_ig_threads(integer)                              from public, anon, authenticated;
revoke all on function public.operator_ig_thread(text, integer)                         from public, anon, authenticated;

grant execute on function public.operator_ig_store_inbound(text, text, text, text, jsonb) to service_role;
grant execute on function public.operator_ig_store_outbound(text, text, text)             to service_role;
grant execute on function public.operator_ig_threads(integer)                             to service_role;
grant execute on function public.operator_ig_thread(text, integer)                        to service_role;

notify pgrst, 'reload schema';
