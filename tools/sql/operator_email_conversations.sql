-- Operator/CRM — EMAIL conversation handling (Inbox email channel). Mirrors
-- operator_ig_conversations.sql: inbound emails (fetched by the IMAP poller of
-- info@zingaapp.com) and outbound replies (sent via smtp.ts) stored in the PRIVATE
-- ops schema. Threaded by the CONTACT'S email address.
--
-- Same security model: ops is a non-public schema (RLS deny-all, not exposed to
-- PostgREST). Every function is SECURITY DEFINER, lives in `public`, EXECUTE
-- revoked from public/anon/authenticated, granted ONLY to service_role. Callers:
--   • /api/operator/email/poll  (service-role) — persists inbound after IMAP fetch.
--   • /api/operator/email/*      (service-role, gated on requireOperator).
-- Email bodies are PII — they live here, never in git or stdout.

-- ── message store (inbound + outbound) ──────────────────────────────────────
create table if not exists ops.email_messages (
  id          bigint generated always as identity primary key,
  contact     text not null,                 -- the OTHER party's email (thread key), lowercased
  name        text,                          -- display name if parsed
  direction   text not null check (direction in ('in','out')),
  subject     text,
  body        text,
  message_id  text,                          -- RFC 5322 Message-ID
  in_reply_to text,                          -- threading hint
  created_at  timestamptz not null default now(),
  raw         jsonb
);
alter table ops.email_messages enable row level security;  -- deny-all: no policies

-- Dedup IMAP re-fetches: Message-ID unique when present. Partial so outbound rows
-- with a null message_id never collide.
create unique index if not exists ux_email_messages_msgid
  on ops.email_messages (message_id) where message_id is not null;

-- Thread reads: newest-first within a contact's conversation.
create index if not exists ix_email_messages_contact_created
  on ops.email_messages (contact, created_at);

-- ── IMAP poll state (one row) — remembers the last mailbox position ─────────
create table if not exists ops.email_poll_state (
  mailbox        text primary key,           -- e.g. 'INBOX'
  last_uid       bigint not null default 0,  -- highest IMAP UID processed
  uid_validity   bigint,                     -- IMAP UIDVALIDITY (reset last_uid if it changes)
  last_polled_at timestamptz
);
alter table ops.email_poll_state enable row level security;

create or replace function public.operator_email_poll_get(p_mailbox text)
returns table (last_uid bigint, uid_validity bigint)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select last_uid, uid_validity from ops.email_poll_state where mailbox = p_mailbox;
$$;

create or replace function public.operator_email_poll_set(
  p_mailbox text, p_last_uid bigint, p_uid_validity bigint
)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  insert into ops.email_poll_state(mailbox, last_uid, uid_validity, last_polled_at)
  values (p_mailbox, p_last_uid, p_uid_validity, now())
  on conflict (mailbox) do update
    set last_uid = excluded.last_uid,
        uid_validity = excluded.uid_validity,
        last_polled_at = now();
$$;

-- ── store inbound (IMAP poller) — dedup-safe ────────────────────────────────
create or replace function public.operator_email_store_inbound(
  p_contact     text,
  p_name        text,
  p_subject     text,
  p_body        text,
  p_message_id  text,
  p_in_reply_to text,
  p_raw         jsonb
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare new_id bigint;
begin
  insert into ops.email_messages (contact, name, direction, subject, body, message_id, in_reply_to, raw)
  values (lower(nullif(p_contact,'')), nullif(p_name,''), 'in', p_subject, p_body,
          nullif(p_message_id,''), nullif(p_in_reply_to,''), p_raw)
  on conflict (message_id) where message_id is not null do nothing
  returning id into new_id;
  return new_id;  -- null when the re-fetch was deduped
end
$$;

-- ── store outbound (after a successful reply send) ──────────────────────────
create or replace function public.operator_email_store_outbound(
  p_contact    text,
  p_subject    text,
  p_body       text,
  p_message_id text
)
returns bigint
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare new_id bigint;
begin
  insert into ops.email_messages (contact, direction, subject, body, message_id)
  values (lower(nullif(p_contact,'')), 'out', p_subject, p_body, nullif(p_message_id,''))
  returning id into new_id;
  return new_id;
end
$$;

-- ── threads: one row per contact, most-recent first (+ last_direction) ──────
create or replace function public.operator_email_threads(p_limit integer default 50)
returns table (
  contact        text,
  name           text,
  last_subject   text,
  last_text      text,
  last_at        timestamptz,
  last_direction text,
  msg_count      bigint
)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select distinct on (m.contact)
    m.contact,
    first_value(m.name) over (
      partition by m.contact order by (m.name is not null) desc, m.created_at desc
    ) as name,
    m.subject as last_subject,
    m.body    as last_text,
    m.created_at as last_at,
    m.direction as last_direction,
    count(*) over (partition by m.contact) as msg_count
  from ops.email_messages m
  order by m.contact, m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

-- ── thread: full history for one contact, oldest-first ──────────────────────
create or replace function public.operator_email_thread(
  p_contact text,
  p_limit   integer default 100
)
returns table (
  id         bigint,
  direction  text,
  subject    text,
  body       text,
  created_at timestamptz
)
language sql stable security definer set search_path = ops, pg_temp
as $$
  select t.id, t.direction, t.subject, t.body, t.created_at
  from (
    select m.id, m.direction, m.subject, m.body, m.created_at
    from ops.email_messages m
    where m.contact = lower(p_contact)
    order by m.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  ) t
  order by t.created_at asc, t.id asc;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_email_poll_get(text)                                       from public, anon, authenticated;
revoke all on function public.operator_email_poll_set(text, bigint, bigint)                        from public, anon, authenticated;
revoke all on function public.operator_email_store_inbound(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.operator_email_store_outbound(text, text, text, text)                from public, anon, authenticated;
revoke all on function public.operator_email_threads(integer)                                      from public, anon, authenticated;
revoke all on function public.operator_email_thread(text, integer)                                 from public, anon, authenticated;
grant execute on function public.operator_email_poll_get(text)                                       to service_role;
grant execute on function public.operator_email_poll_set(text, bigint, bigint)                        to service_role;
grant execute on function public.operator_email_store_inbound(text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.operator_email_store_outbound(text, text, text, text)                to service_role;
grant execute on function public.operator_email_threads(integer)                                      to service_role;
grant execute on function public.operator_email_thread(text, integer)                                 to service_role;

notify pgrst, 'reload schema';
