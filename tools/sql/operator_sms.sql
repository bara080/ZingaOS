-- Operator/CRM — CONSENT-GATED SMS channel (Telnyx). Mirrors
-- operator_email_conversations.sql: a two-way message log + a consent ledger in
-- the PRIVATE `ops` schema. Threaded by the CONTACT'S phone number (E.164).
--
-- ⚠️  APPLY THIS FIRST via the Supabase MCP (apply_migration) before the SMS
--     routes/UI will work. Nothing in the app creates these objects.
--
-- LEGAL model (US marketing SMS): TCPA prior express written consent + a
-- registered A2P 10DLC sender. A phone may ONLY be texted when a row exists in
-- ops.sms_consent with status='opted_in'. The consent_is_allowed() RPC is the
-- single source of truth the send route hard-gates on. STOP/opt-out flips the
-- ledger to 'opted_out'; an INBOUND message can never flip it back (store_inbound
-- only writes ops.sms_messages, never the consent ledger) — re-opt-in requires a
-- fresh, operator-recorded consent via consent_add. Opt-out is honored + logged.
--
-- Same security model as the email/IG tables: ops is a non-public schema (RLS
-- deny-all, not exposed to PostgREST). Every function is SECURITY DEFINER, lives
-- in `public`, EXECUTE revoked from public/anon/authenticated, granted ONLY to
-- service_role. Callers:
--   • /api/operator/sms/*       (service-role, gated on requireOperator).
--   • /api/operator/sms/webhook (service-role, Telnyx-called — validates payload).
-- Phone numbers + message bodies are PII — they live here, never in git or stdout.

create schema if not exists ops;

-- ── phone normalizer (E.164-ish) — shared by every RPC so the consent ledger and
--    the message log always key on the SAME string. US-default: bare 10-digit →
--    +1XXXXXXXXXX; 11-digit leading 1 → +1…; anything with a leading + kept as-is.
create or replace function ops.norm_phone(p text)
returns text
language plpgsql immutable
as $$
declare
  digits   text;
  has_plus boolean;
begin
  if p is null then return null; end if;
  has_plus := left(btrim(p), 1) = '+';
  digits   := regexp_replace(p, '[^0-9]', '', 'g');
  if digits = '' then return null; end if;
  if has_plus then
    return '+' || digits;
  elsif length(digits) = 10 then
    return '+1' || digits;
  elsif length(digits) = 11 and left(digits, 1) = '1' then
    return '+' || digits;
  else
    return '+' || digits;  -- best-effort: preserve as international
  end if;
end
$$;

-- ── consent ledger — the ONLY thing that authorizes a text ──────────────────
create table if not exists ops.sms_consent (
  id           bigint generated always as identity primary key,
  lead_id      bigint,                         -- optional link to ops.leads
  phone        text not null unique,           -- E.164, normalized by ops.norm_phone
  name         text,
  source       text,                           -- how they opted in (web form, in-person, reply YES…)
  status       text not null default 'opted_in' check (status in ('opted_in','opted_out')),
  opted_in_at  timestamptz default now(),
  opted_out_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table ops.sms_consent enable row level security;  -- deny-all: no policies

-- ── two-way message log (inbound + outbound) ────────────────────────────────
create table if not exists ops.sms_messages (
  id          bigint generated always as identity primary key,
  phone       text not null,                   -- the OTHER party (thread key), normalized
  lead_id     bigint,
  direction   text not null check (direction in ('in','out')),
  body        text,
  provider_id text,                            -- Telnyx message id
  created_at  timestamptz not null default now()
);
alter table ops.sms_messages enable row level security;  -- deny-all: no policies

-- Dedup Telnyx inbound webhook re-deliveries by provider_id. Partial so outbound
-- rows (which may share a provider id or be null) never collide unexpectedly.
create unique index if not exists ux_sms_messages_provider
  on ops.sms_messages (provider_id) where provider_id is not null;

-- Thread reads: newest-first within one contact's conversation.
create index if not exists ix_sms_messages_phone_created
  on ops.sms_messages (phone, created_at);

-- ── consent: add / upsert opted_in (manual capture of a real opt-in) ────────
create or replace function public.operator_sms_consent_add(
  p_phone   text,
  p_name    text,
  p_lead_id bigint,
  p_source  text
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  v_phone text := ops.norm_phone(p_phone);
  v_id    bigint;
begin
  if v_phone is null then raise exception 'phone required'; end if;
  insert into ops.sms_consent (lead_id, phone, name, source, status, opted_in_at, opted_out_at)
  values (p_lead_id, v_phone, nullif(p_name,''), nullif(p_source,''), 'opted_in', now(), null)
  on conflict (phone) do update
    set status       = 'opted_in',
        opted_in_at  = now(),
        opted_out_at = null,
        name         = coalesce(nullif(excluded.name,''), ops.sms_consent.name),
        lead_id      = coalesce(excluded.lead_id, ops.sms_consent.lead_id),
        source       = coalesce(nullif(excluded.source,''), ops.sms_consent.source)
  returning id into v_id;
  return v_id;
end
$$;

-- ── consent: opt-out (STOP keyword or manual "Mark opted-out") ──────────────
-- Irreversible by inbound: only ever moves toward opted_out. Records the phone
-- even if it had no prior consent row, so a STOP is always honored + auditable.
create or replace function public.operator_sms_consent_optout(
  p_phone  text,
  p_source text
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  v_phone text := ops.norm_phone(p_phone);
  v_id    bigint;
begin
  if v_phone is null then raise exception 'phone required'; end if;
  insert into ops.sms_consent (phone, source, status, opted_in_at, opted_out_at)
  values (v_phone, nullif(p_source,''), 'opted_out', null, now())
  on conflict (phone) do update
    set status       = 'opted_out',
        opted_out_at  = now(),
        source        = coalesce(nullif(excluded.source,''), ops.sms_consent.source)
  returning id into v_id;
  return v_id;
end
$$;

-- ── consent: is this number allowed to be texted? (the send gate) ───────────
create or replace function public.operator_sms_consent_is_allowed(p_phone text)
returns boolean
language sql stable security definer set search_path = ops, pg_temp
as $$
  select exists (
    select 1 from ops.sms_consent
    where phone = ops.norm_phone(p_phone) and status = 'opted_in'
  );
$$;

-- ── consent: list (opted_in first, then opted_out; shows status) ────────────
create or replace function public.operator_sms_consent_list(p_limit integer default 200)
returns table (
  id           bigint,
  lead_id      bigint,
  phone        text,
  name         text,
  source       text,
  status       text,
  opted_in_at  timestamptz,
  opted_out_at timestamptz,
  created_at   timestamptz
)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select id, lead_id, phone, name, source, status, opted_in_at, opted_out_at, created_at
  from ops.sms_consent
  order by (status = 'opted_in') desc,
           coalesce(opted_in_at, opted_out_at, created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;

-- ── store inbound (Telnyx webhook) — dedup-safe on provider_id ──────────────
create or replace function public.operator_sms_store_inbound(
  p_phone       text,
  p_body        text,
  p_provider_id text
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  v_phone text := ops.norm_phone(p_phone);
  v_lead  bigint;
  new_id  bigint;
begin
  if v_phone is null then raise exception 'phone required'; end if;
  select lead_id into v_lead from ops.sms_consent where phone = v_phone limit 1;
  insert into ops.sms_messages (phone, lead_id, direction, body, provider_id)
  values (v_phone, v_lead, 'in', p_body, nullif(p_provider_id,''))
  on conflict (provider_id) where provider_id is not null do nothing
  returning id into new_id;
  return new_id;  -- null when the re-delivery was deduped
end
$$;

-- ── store outbound (after a successful Telnyx send) ─────────────────────────
create or replace function public.operator_sms_store_outbound(
  p_phone       text,
  p_body        text,
  p_provider_id text
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  v_phone text := ops.norm_phone(p_phone);
  v_lead  bigint;
  new_id  bigint;
begin
  if v_phone is null then raise exception 'phone required'; end if;
  select lead_id into v_lead from ops.sms_consent where phone = v_phone limit 1;
  insert into ops.sms_messages (phone, lead_id, direction, body, provider_id)
  values (v_phone, v_lead, 'out', p_body, nullif(p_provider_id,''))
  returning id into new_id;
  return new_id;
end
$$;

-- ── threads: one row per phone, most-recent first (+ consent status) ────────
create or replace function public.operator_sms_threads(p_limit integer default 100)
returns table (
  phone          text,
  name           text,
  last_text      text,
  last_at        timestamptz,
  last_direction text,
  msg_count      bigint,
  status         text
)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select distinct on (m.phone)
    m.phone,
    c.name,
    m.body       as last_text,
    m.created_at as last_at,
    m.direction  as last_direction,
    count(*) over (partition by m.phone) as msg_count,
    coalesce(c.status, 'unknown') as status
  from ops.sms_messages m
  left join ops.sms_consent c on c.phone = m.phone
  order by m.phone, m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

-- ── thread: full history for one phone, oldest-first ────────────────────────
create or replace function public.operator_sms_thread(
  p_phone text,
  p_limit integer default 200
)
returns table (
  id         bigint,
  direction  text,
  body       text,
  created_at timestamptz
)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select t.id, t.direction, t.body, t.created_at
  from (
    select m.id, m.direction, m.body, m.created_at
    from ops.sms_messages m
    where m.phone = ops.norm_phone(p_phone)
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) t
  order by t.created_at asc, t.id asc;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_sms_consent_add(text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.operator_sms_consent_optout(text, text)            from public, anon, authenticated;
revoke all on function public.operator_sms_consent_is_allowed(text)              from public, anon, authenticated;
revoke all on function public.operator_sms_consent_list(integer)                 from public, anon, authenticated;
revoke all on function public.operator_sms_store_inbound(text, text, text)       from public, anon, authenticated;
revoke all on function public.operator_sms_store_outbound(text, text, text)      from public, anon, authenticated;
revoke all on function public.operator_sms_threads(integer)                      from public, anon, authenticated;
revoke all on function public.operator_sms_thread(text, integer)                 from public, anon, authenticated;
grant execute on function public.operator_sms_consent_add(text, text, bigint, text) to service_role;
grant execute on function public.operator_sms_consent_optout(text, text)            to service_role;
grant execute on function public.operator_sms_consent_is_allowed(text)              to service_role;
grant execute on function public.operator_sms_consent_list(integer)                 to service_role;
grant execute on function public.operator_sms_store_inbound(text, text, text)       to service_role;
grant execute on function public.operator_sms_store_outbound(text, text, text)      to service_role;
grant execute on function public.operator_sms_threads(integer)                      to service_role;
grant execute on function public.operator_sms_thread(text, integer)                 to service_role;

notify pgrst, 'reload schema';
