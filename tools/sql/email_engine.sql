-- Zinga OS — durable relational EMAIL CAMPAIGN ENGINE (single-tenant).
-- Ported/adapted from lagosMailer's campaign-engine.sql. SINGLE-TENANT: the
-- `company` column stays on every table (tenant-ready) but is ALWAYS the server
-- constant 'zinga' — no company value ever crosses the API boundary. Every RPC
-- hard-codes company='zinga' internally.
--
-- SECURITY MODEL (identical to tools/sql/operator_email_conversations.sql):
--   • Tables live in the PRIVATE `ops` schema, RLS deny-all (no policies), NOT
--     exposed to PostgREST. supabase-js `.from('ops.*')` therefore fails — ALL
--     access is via the SECURITY DEFINER functions below.
--   • Every function lives in `public` (reachable via PostgREST RPC), runs as its
--     owner (bypasses RLS), `set search_path = ops, pg_temp`. EXECUTE is revoked
--     from public/anon/authenticated and granted ONLY to service_role.
--   • The sole callers are the Next.js routes under
--     /api/operator/email-engine/**, each gated on requireOperator() and using
--     the service-role key (createServiceClient()).
--
-- !!! THIS FILE MUST BE APPLIED BY THE PARENT VIA THE SUPABASE MCP BEFORE THE
-- !!! ENGINE RUNS. It is NOT applied automatically. Table names are prefixed
-- !!! `email_` so they never collide with the existing ops.campaigns / etc.
--
-- Apply once; re-running is safe (create-if-not-exists + create-or-replace).

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists ops.email_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  company            text not null default 'zinga',
  name               text not null,
  status             text not null default 'draft',
  current_version_id uuid,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists email_campaigns_company_idx
  on ops.email_campaigns (company, updated_at desc);

create table if not exists ops.email_campaign_versions (
  id                     uuid primary key default gen_random_uuid(),
  company                text not null default 'zinga',
  campaign_id            uuid not null references ops.email_campaigns(id) on delete cascade,
  version                integer not null,
  subject                text not null default '',
  html_body              text not null default '',
  text_body              text not null default '',
  sender_key             text not null default '',
  reply_to               text,
  personalization_schema jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  unique (campaign_id, version)
);
create index if not exists email_campaign_versions_company_idx
  on ops.email_campaign_versions (company, campaign_id);

create table if not exists ops.email_runs (
  id                  uuid primary key default gen_random_uuid(),
  company             text not null default 'zinga',
  campaign_id         uuid not null references ops.email_campaigns(id) on delete cascade,
  campaign_version_id uuid not null references ops.email_campaign_versions(id),
  status              text not null default 'preparing',
  audience_mode       text not null default 'all',
  audience_filter     jsonb not null default '{}'::jsonb,
  source_run_id       uuid,
  duplicate_policy    text not null default 'exclude_in_run',
  stage_plan          jsonb not null default '[]'::jsonb,
  current_stage       integer not null default 0,
  priority            integer not null default 100,
  dispatch_chunk_size integer not null default 50,
  max_rate_per_minute integer,
  audience_count      integer not null default 0,
  scheduled_at        timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  workflow_run_id     text,
  created_by          text,
  created_at          timestamptz not null default now()
);
create index if not exists email_runs_runnable_idx
  on ops.email_runs (company, status, priority, scheduled_at);
create index if not exists email_runs_campaign_idx
  on ops.email_runs (company, campaign_id, created_at desc);

create table if not exists ops.email_recipients (
  id                  uuid primary key default gen_random_uuid(),
  company             text not null default 'zinga',
  run_id              uuid not null references ops.email_runs(id) on delete cascade,
  campaign_id         uuid not null,
  stage_number        integer not null default 1,
  lead_id             bigint,                        -- → ops.leads.id (bigint)
  normalized_email    text not null,
  personalization     jsonb not null default '{}'::jsonb,
  status              text not null default 'pending',
  attempt_count       integer not null default 0,
  next_attempt_at     timestamptz,
  claim_token         uuid,
  claim_expires_at    timestamptz,
  provider            text,
  provider_message_id text,
  last_error_code     text,
  last_error_message  text,
  accepted_at         timestamptz,
  delivered_at        timestamptz,
  bounced_at          timestamptz,
  complained_at       timestamptz,
  created_at          timestamptz not null default now(),
  unique (run_id, normalized_email)                  -- per-run dedup Set
);
create index if not exists email_recipients_claim_idx
  on ops.email_recipients (company, run_id, stage_number, status, next_attempt_at);
create index if not exists email_recipients_lease_idx
  on ops.email_recipients (claim_expires_at) where status in ('claimed','sending');
-- cross-run exclusion: fast lookup of an address's status history in a campaign.
create index if not exists email_recipients_campaign_email_idx
  on ops.email_recipients (company, campaign_id, normalized_email, status);

create table if not exists ops.email_suppression (
  company          text not null default 'zinga',
  normalized_email text not null,
  reason           text not null default 'unsubscribe',
  source           text,
  created_at       timestamptz not null default now(),
  primary key (company, normalized_email)
);

create table if not exists ops.email_quota_buckets (
  company        text not null default 'zinga',
  channel        text not null default 'email',
  quota_date     date not null,
  limit_count    integer not null default 500,
  reserved_count integer not null default 0,
  accepted_count integer not null default 0,
  primary key (company, channel, quota_date)
);

create table if not exists ops.email_events (
  id           bigint generated always as identity primary key,
  company      text not null default 'zinga',
  run_id       uuid,
  stage_number integer,
  batch_id     uuid,
  event_type   text not null,
  actor_type   text not null default 'workflow',
  actor_id     text,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists email_events_timeline_idx
  on ops.email_events (company, run_id, created_at desc);

create table if not exists ops.email_provider_events (
  provider          text not null,
  provider_event_id text not null,
  event_type        text,
  payload           jsonb,
  created_at        timestamptz not null default now(),
  primary key (provider, provider_event_id)
);

-- RLS deny-all on every table (no policies → nothing reachable except via the
-- SECURITY DEFINER RPCs below, which run as owner).
alter table ops.email_campaigns          enable row level security;
alter table ops.email_campaign_versions  enable row level security;
alter table ops.email_runs               enable row level security;
alter table ops.email_recipients         enable row level security;
alter table ops.email_suppression        enable row level security;
alter table ops.email_quota_buckets      enable row level security;
alter table ops.email_events             enable row level security;
alter table ops.email_provider_events    enable row level security;

-- ── Campaigns + versions ────────────────────────────────────────────────────

create or replace function public.email_campaign_create(p_name text, p_created_by text)
returns jsonb
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare v_id uuid;
begin
  insert into ops.email_campaigns (company, name, created_by)
  values ('zinga', coalesce(nullif(p_name, ''), 'Untitled campaign'), nullif(p_created_by, ''))
  returning id into v_id;
  return (select to_jsonb(c) from ops.email_campaigns c where c.id = v_id);
end
$$;

create or replace function public.email_campaign_add_version(
  p_campaign_id     uuid,
  p_subject         text,
  p_html            text,
  p_text            text,
  p_sender_key      text,
  p_reply_to        text,
  p_personalization jsonb
)
returns jsonb
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare v_next int; v_id uuid;
begin
  select coalesce(max(version), 0) + 1 into v_next
  from ops.email_campaign_versions
  where company = 'zinga' and campaign_id = p_campaign_id;

  insert into ops.email_campaign_versions
    (company, campaign_id, version, subject, html_body, text_body, sender_key, reply_to, personalization_schema)
  values
    ('zinga', p_campaign_id, v_next, coalesce(p_subject, ''), coalesce(p_html, ''), coalesce(p_text, ''),
     coalesce(p_sender_key, ''), nullif(p_reply_to, ''), coalesce(p_personalization, '{}'::jsonb))
  returning id into v_id;

  update ops.email_campaigns
     set current_version_id = v_id, updated_at = now()
   where company = 'zinga' and id = p_campaign_id;

  return (select to_jsonb(v) from ops.email_campaign_versions v where v.id = v_id);
end
$$;

create or replace function public.email_campaigns_list()
returns setof jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(c)
  from ops.email_campaigns c
  where c.company = 'zinga'
  order by c.updated_at desc;
$$;

create or replace function public.email_campaign_get(p_id uuid)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(c) from ops.email_campaigns c
  where c.company = 'zinga' and c.id = p_id;
$$;

create or replace function public.email_version_get(p_version_id uuid)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(v) from ops.email_campaign_versions v
  where v.company = 'zinga' and v.id = p_version_id;
$$;

-- ── Runs ────────────────────────────────────────────────────────────────────

create or replace function public.email_run_create(
  p_campaign_id         uuid,
  p_version_id          uuid,
  p_audience_mode       text,
  p_audience_filter     jsonb,
  p_source_run_id       uuid,
  p_duplicate_policy    text,
  p_stage_plan          jsonb,
  p_dispatch_chunk_size integer,
  p_priority            integer,
  p_created_by          text
)
returns jsonb
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare v_id uuid;
begin
  insert into ops.email_runs (
    company, campaign_id, campaign_version_id, status,
    audience_mode, audience_filter, source_run_id, duplicate_policy,
    stage_plan, dispatch_chunk_size, priority, created_by
  ) values (
    'zinga', p_campaign_id, p_version_id, 'preparing',
    coalesce(nullif(p_audience_mode, ''), 'all'), coalesce(p_audience_filter, '{}'::jsonb),
    p_source_run_id, coalesce(nullif(p_duplicate_policy, ''), 'exclude_in_run'),
    coalesce(p_stage_plan, '[]'::jsonb), coalesce(p_dispatch_chunk_size, 50),
    coalesce(p_priority, 100), nullif(p_created_by, '')
  ) returning id into v_id;
  return (select to_jsonb(r) from ops.email_runs r where r.id = v_id);
end
$$;

create or replace function public.email_run_get(p_run_id uuid)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(r) from ops.email_runs r
  where r.company = 'zinga' and r.id = p_run_id;
$$;

create or replace function public.email_runs_list(p_campaign_id uuid)
returns setof jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(r)
  from ops.email_runs r
  where r.company = 'zinga' and r.campaign_id = p_campaign_id
  order by r.created_at desc;
$$;

-- Generic status setter. p_patch may carry started_at / completed_at /
-- current_stage / audience_count (only recognised keys are applied).
create or replace function public.email_run_set_status(
  p_run_id uuid, p_status text, p_patch jsonb default '{}'::jsonb
)
returns void
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
begin
  update ops.email_runs
     set status         = coalesce(nullif(p_status, ''), status),
         current_stage  = coalesce((p_patch->>'current_stage')::int, current_stage),
         audience_count = coalesce((p_patch->>'audience_count')::int, audience_count),
         started_at     = coalesce((p_patch->>'started_at')::timestamptz, started_at),
         completed_at   = case when p_patch ? 'completed_at'
                               then (p_patch->>'completed_at')::timestamptz
                               else completed_at end
   where company = 'zinga' and id = p_run_id;
end
$$;

-- ── Audit events ────────────────────────────────────────────────────────────

create or replace function public.email_event_log(
  p_run_id uuid, p_stage integer, p_type text, p_data jsonb, p_actor text
)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  insert into ops.email_events (company, run_id, stage_number, event_type, actor_type, data)
  values ('zinga', p_run_id, p_stage, p_type, coalesce(nullif(p_actor, ''), 'workflow'), coalesce(p_data, '{}'::jsonb));
$$;

create or replace function public.email_events_list(p_run_id uuid, p_limit integer default 30)
returns setof jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select to_jsonb(e)
  from ops.email_events e
  where e.company = 'zinga' and e.run_id = p_run_id
  order by e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 200));
$$;

-- ── Progress + stage/run count aggregates ───────────────────────────────────
-- Status buckets used everywhere:
--   accepted = status in ('accepted','delivered')
--   failed   = status in ('failed','bounced','complained')
--   pending  = status in ('pending','sending')
--   suppressed = status = 'suppressed'

-- Per-run live status breakdown for the monitor header.
create or replace function public.email_run_progress(p_run_id uuid)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select jsonb_build_object(
    'total',      count(*),
    'pending',    count(*) filter (where status = 'pending'),
    'sending',    count(*) filter (where status = 'sending'),
    'accepted',   count(*) filter (where status = 'accepted'),
    'delivered',  count(*) filter (where delivered_at is not null),
    'bounced',    count(*) filter (where bounced_at is not null),
    'complained', count(*) filter (where complained_at is not null),
    'failed',     count(*) filter (where status = 'failed'),
    'suppressed', count(*) filter (where status = 'suppressed'),
    'cancelled',  count(*) filter (where status = 'cancelled')
  )
  from ops.email_recipients
  where company = 'zinga' and run_id = p_run_id;
$$;

-- RECONSTRUCTED (was called but undefined in lagos engine.js) — run_stage_counts.
-- engine.js reads: s.stage_number, s.total, s.accepted, s.failed, s.pending,
-- s.suppressed (getRunDetail derives per-stage status from `pending`).
create or replace function public.email_run_stage_counts(p_run_id uuid)
returns setof jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select jsonb_build_object(
    'stage_number', stage_number,
    'total',        count(*),
    'accepted',     count(*) filter (where status in ('accepted','delivered')),
    'failed',       count(*) filter (where status in ('failed','bounced','complained')),
    'pending',      count(*) filter (where status in ('pending','sending')),
    'suppressed',   count(*) filter (where status = 'suppressed')
  )
  from ops.email_recipients
  where company = 'zinga' and run_id = p_run_id
  group by stage_number
  order by stage_number;
$$;

-- RECONSTRUCTED — campaign_run_counts. engine.js listRuns reads per run_id:
-- c.run_id, c.total, c.accepted, c.failed, c.pending, c.suppressed.
create or replace function public.email_campaign_run_counts(p_campaign_id uuid)
returns setof jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select jsonb_build_object(
    'run_id',     run_id,
    'total',      count(*),
    'accepted',   count(*) filter (where status in ('accepted','delivered')),
    'failed',     count(*) filter (where status in ('failed','bounced','complained')),
    'pending',    count(*) filter (where status in ('pending','sending')),
    'suppressed', count(*) filter (where status = 'suppressed')
  )
  from ops.email_recipients
  where company = 'zinga' and campaign_id = p_campaign_id
  group by run_id;
$$;

-- Paginated recipients for the Recipients tab (optional status filter).
create or replace function public.email_recipients_list(
  p_run_id uuid, p_status text default null, p_page integer default 1, p_limit integer default 50
)
returns jsonb
language plpgsql stable security definer set search_path = ops, pg_temp
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_page  int := greatest(1, coalesce(p_page, 1));
  v_off   int;
  v_total bigint;
  v_rows  jsonb;
begin
  v_off := (v_page - 1) * v_limit;
  select count(*) into v_total
  from ops.email_recipients
  where company = 'zinga' and run_id = p_run_id
    and (p_status is null or p_status = '' or status = p_status);

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows from (
    select jsonb_build_object(
      'id', id, 'normalized_email', normalized_email, 'status', status,
      'stage_number', stage_number, 'attempt_count', attempt_count,
      'provider', provider, 'provider_message_id', provider_message_id,
      'last_error_message', last_error_message, 'accepted_at', accepted_at
    ) as x
    from ops.email_recipients
    where company = 'zinga' and run_id = p_run_id
      and (p_status is null or p_status = '' or status = p_status)
    order by created_at asc
    offset v_off limit v_limit
  ) s;

  return jsonb_build_object('recipients', v_rows, 'total', v_total, 'page', v_page, 'limit', v_limit);
end
$$;

-- ── Cadence: assign recipients to stages ────────────────────────────────────
-- RECONSTRUCTED — assign_stages. engine.js snapshotAudience passes p_limits =
-- the run's stage_plan numeric limits (e.g. [1, 9, 90] = Test/Canary/Ramp).
-- Recipients are ranked by (created_at, id); the first `limits[0]` become stage
-- 1, the next `limits[1]` stage 2, …, and everyone BEYOND the last limit falls
-- into the "Full remainder" stage (limits.length + 1). No limits ⇒ engine never
-- calls this and everyone stays stage 1.
create or replace function public.email_assign_stages(p_run_id uuid, p_limits integer[])
returns void
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  v_cum   int := 0;
  v_stage int := 0;
  v_lim   int;
begin
  if p_limits is null or array_length(p_limits, 1) is null then
    return;
  end if;
  foreach v_lim in array p_limits loop
    v_stage := v_stage + 1;
    if v_lim > 0 then
      update ops.email_recipients rr
         set stage_number = v_stage
        from (
          select id from ops.email_recipients
          where company = 'zinga' and run_id = p_run_id
          order by created_at asc, id asc
          offset v_cum limit v_lim
        ) sub
       where rr.id = sub.id;
      v_cum := v_cum + v_lim;
    end if;
  end loop;
  -- Remainder (everyone past the last limit) → a trailing "full send" stage.
  update ops.email_recipients rr
     set stage_number = v_stage + 1
    from (
      select id from ops.email_recipients
      where company = 'zinga' and run_id = p_run_id
      order by created_at asc, id asc
      offset v_cum
    ) sub
   where rr.id = sub.id;
end
$$;

-- ── Audience snapshot (freeze the recipient list) ───────────────────────────
-- Resolves the run's audience ONCE and inserts unique recipients, excluding
-- suppressed addresses (and, for `remaining` / exclude_campaign_successes, prior
-- campaign successes). Modes:
--   all | segment | remaining → resolve from ops.leads (filtered by
--     audience_filter: source/stage/category/borough/limit).
--   previous_run | failed_only → source = prior run/campaign recipients.
-- Dedup via UNIQUE(run_id, normalized_email) (ON CONFLICT DO NOTHING).
create or replace function public.email_snapshot_audience(p_run_id uuid, p_limit integer default null)
returns jsonb
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare
  r       ops.email_runs;
  f       jsonb;
  v_src   text; v_stage text; v_cat text; v_boro text;
  v_lim   int;
  v_count int;
begin
  select * into r from ops.email_runs where company = 'zinga' and id = p_run_id;
  if not found then raise exception 'snapshot: run % not found', p_run_id; end if;
  f := coalesce(r.audience_filter, '{}'::jsonb);
  v_src   := nullif(f->>'source', '');
  v_stage := nullif(f->>'stage', '');
  v_cat   := nullif(f->>'category', '');
  v_boro  := nullif(f->>'borough', '');
  v_lim   := greatest(1, coalesce(p_limit, nullif(f->>'limit', '')::int, 100000));

  if r.audience_mode in ('previous_run', 'failed_only') then
    insert into ops.email_recipients
      (company, run_id, campaign_id, stage_number, lead_id, normalized_email, personalization)
    select 'zinga', p_run_id, r.campaign_id, 1, src.lead_id, src.normalized_email, src.personalization
    from ops.email_recipients src
    where src.company = 'zinga'
      and (case when r.source_run_id is not null
                then src.run_id = r.source_run_id
                else src.campaign_id = r.campaign_id end)
      and (case when r.audience_mode = 'failed_only'
                then src.status in ('failed', 'bounced') else true end)
      and src.normalized_email not in
        (select normalized_email from ops.email_suppression where company = 'zinga')
    on conflict (run_id, normalized_email) do nothing;
  else
    insert into ops.email_recipients
      (company, run_id, campaign_id, stage_number, lead_id, normalized_email, personalization)
    select 'zinga', p_run_id, r.campaign_id, 1, l.id, lower(l.email),
           jsonb_build_object(
             'name',     coalesce(nullif(l.owner, ''), l.business, ''),
             'business', coalesce(l.business, ''),
             'category', coalesce(l.category, '')
           )
    from ops.leads l
    where l.email is not null and l.email <> ''
      and lower(l.email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and (v_src   is null or l.source   = v_src)
      and (v_stage is null or l.stage    = v_stage)
      and (v_cat   is null or l.category = v_cat)
      and (v_boro  is null or l.borough  = v_boro)
      and lower(l.email) not in
        (select normalized_email from ops.email_suppression where company = 'zinga')
      and (
        not (r.audience_mode = 'remaining' or r.duplicate_policy = 'exclude_campaign_successes')
        or lower(l.email) not in (
          select normalized_email from ops.email_recipients
          where company = 'zinga' and campaign_id = r.campaign_id
            and status in ('accepted', 'delivered')
        )
      )
    order by l.created_at desc nulls last, l.reviews desc nulls last
    limit v_lim
    on conflict (run_id, normalized_email) do nothing;
  end if;

  select count(*) into v_count
  from ops.email_recipients where company = 'zinga' and run_id = p_run_id;
  return jsonb_build_object('count', v_count);
end
$$;

-- ── Drain-loop helpers (the send loop itself lives in the Node engine) ───────

-- Self-heal: recipients stuck 'sending' with no provider_message_id are orphans
-- from a previously interrupted drain (a chunk is single-driver, nothing is
-- legitimately mid-flight at the top of a chunk). Reset to 'pending'.
create or replace function public.email_reset_orphans(p_run_id uuid)
returns integer
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare n integer;
begin
  update ops.email_recipients
     set status = 'pending', claim_token = null, claim_expires_at = null
   where company = 'zinga' and run_id = p_run_id
     and status = 'sending' and provider_message_id is null;
  get diagnostics n = row_count;
  return n;
end
$$;

-- Pending-at-stage + pending-ahead-of-stage (the cadence gate reads both).
create or replace function public.email_stage_pending(p_run_id uuid, p_stage integer)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select jsonb_build_object(
    'pending_stage', count(*) filter (where status = 'pending' and stage_number = p_stage),
    'ahead',         count(*) filter (where status = 'pending' and stage_number > p_stage)
  )
  from ops.email_recipients
  where company = 'zinga' and run_id = p_run_id;
$$;

-- Atomically claim up to p_limit pending recipients of the current stage
-- (pending → sending) and RETURN the claimed rows. FOR UPDATE SKIP LOCKED makes
-- concurrent drains safe. This replaces lagos's racy select-then-update.
create or replace function public.email_claim_batch(p_run_id uuid, p_stage integer, p_limit integer)
returns setof jsonb
language sql volatile security definer set search_path = ops, pg_temp
as $$
  with picked as (
    select id from ops.email_recipients
    where company = 'zinga' and run_id = p_run_id
      and status = 'pending' and stage_number = p_stage
    order by created_at asc
    limit greatest(0, coalesce(p_limit, 0))
    for update skip locked
  ),
  claimed as (
    update ops.email_recipients r
       set status = 'sending'
      from picked
     where r.id = picked.id
    returning r.id, r.normalized_email, r.lead_id, r.personalization, r.attempt_count
  )
  select jsonb_build_object(
    'id', id, 'normalized_email', normalized_email, 'lead_id', lead_id,
    'personalization', personalization, 'attempt_count', attempt_count
  ) from claimed;
$$;

-- Record a per-recipient send result (accepted / failed).
create or replace function public.email_recipient_mark(
  p_id uuid, p_status text, p_provider text, p_message_id text, p_error text
)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  update ops.email_recipients
     set status              = p_status,
         provider            = coalesce(nullif(p_provider, ''), provider),
         provider_message_id = coalesce(nullif(p_message_id, ''), provider_message_id),
         accepted_at         = case when p_status = 'accepted' then now() else accepted_at end,
         last_error_message  = case when p_error is null then last_error_message else left(p_error, 500) end,
         attempt_count       = attempt_count + 1
   where company = 'zinga' and id = p_id;
$$;

-- Just-completed-stage health signal (fail+bounce rate gate).
create or replace function public.email_stage_health(p_run_id uuid, p_stage integer)
returns jsonb
language sql stable security definer set search_path = ops, pg_temp
as $$
  select jsonb_build_object(
    'total',   count(*),
    'failed',  count(*) filter (where status = 'failed'),
    'bounced', count(*) filter (where bounced_at is not null)
  )
  from ops.email_recipients
  where company = 'zinga' and run_id = p_run_id and stage_number = p_stage;
$$;

-- ── Quota (atomic, shared per company/day) — ported from lagos ───────────────

create or replace function public.email_reserve_quota(
  p_channel text, p_date date, p_want integer, p_limit integer
)
returns integer
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare v_limit int; v_reserved int; v_grant int;
begin
  insert into ops.email_quota_buckets (company, channel, quota_date, limit_count)
    values ('zinga', p_channel, p_date, p_limit)
    on conflict (company, channel, quota_date) do nothing;
  select limit_count, reserved_count into v_limit, v_reserved
    from ops.email_quota_buckets
    where company = 'zinga' and channel = p_channel and quota_date = p_date
    for update;
  if p_limit > v_limit then v_limit := p_limit; end if;
  v_grant := greatest(0, least(p_want, v_limit - v_reserved));
  update ops.email_quota_buckets
     set reserved_count = reserved_count + v_grant, limit_count = v_limit
   where company = 'zinga' and channel = p_channel and quota_date = p_date;
  return v_grant;
end
$$;

create or replace function public.email_release_quota(p_channel text, p_date date, p_n integer)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  update ops.email_quota_buckets
     set reserved_count = greatest(0, reserved_count - p_n)
   where company = 'zinga' and channel = p_channel and quota_date = p_date;
$$;

create or replace function public.email_commit_quota(p_channel text, p_date date, p_n integer)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  update ops.email_quota_buckets
     set accepted_count = accepted_count + p_n
   where company = 'zinga' and channel = p_channel and quota_date = p_date;
$$;

-- Reconcile the reservation bucket back to reality (fixes leaked reservations
-- after an interrupted/stopped run). accepted = today's actual accepted+delivered,
-- reserved = actual in-flight ('sending').
create or replace function public.email_reconcile_quota(p_channel text, p_date date, p_limit integer)
returns void
language plpgsql volatile security definer set search_path = ops, pg_temp
as $$
declare v_accepted int; v_reserved int;
begin
  select count(*) filter (where status in ('accepted','delivered') and accepted_at::date = p_date),
         count(*) filter (where status = 'sending')
    into v_accepted, v_reserved
  from ops.email_recipients where company = 'zinga';
  insert into ops.email_quota_buckets (company, channel, quota_date, limit_count, reserved_count, accepted_count)
    values ('zinga', p_channel, p_date, p_limit, coalesce(v_reserved,0), coalesce(v_accepted,0))
  on conflict (company, channel, quota_date) do update
    set reserved_count = coalesce(excluded.reserved_count, 0),
        accepted_count = coalesce(excluded.accepted_count, 0),
        limit_count    = greatest(ops.email_quota_buckets.limit_count, excluded.limit_count);
end
$$;

-- ── Suppression (unsubscribe / bounce / complaint) ──────────────────────────
create or replace function public.email_suppress(p_email text, p_reason text, p_source text)
returns void
language sql volatile security definer set search_path = ops, pg_temp
as $$
  insert into ops.email_suppression (company, normalized_email, reason, source)
  values ('zinga', lower(trim(p_email)), coalesce(nullif(p_reason, ''), 'unsubscribe'), nullif(p_source, ''))
  on conflict (company, normalized_email) do nothing;
$$;

-- ── Lock down: service_role only ────────────────────────────────────────────
revoke all on function public.email_campaign_create(text, text)                                   from public, anon, authenticated;
revoke all on function public.email_campaign_add_version(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.email_campaigns_list()                                               from public, anon, authenticated;
revoke all on function public.email_campaign_get(uuid)                                              from public, anon, authenticated;
revoke all on function public.email_version_get(uuid)                                               from public, anon, authenticated;
revoke all on function public.email_run_create(uuid, uuid, text, jsonb, uuid, text, jsonb, integer, integer, text) from public, anon, authenticated;
revoke all on function public.email_run_get(uuid)                                                  from public, anon, authenticated;
revoke all on function public.email_runs_list(uuid)                                                from public, anon, authenticated;
revoke all on function public.email_run_set_status(uuid, text, jsonb)                              from public, anon, authenticated;
revoke all on function public.email_event_log(uuid, integer, text, jsonb, text)                    from public, anon, authenticated;
revoke all on function public.email_events_list(uuid, integer)                                     from public, anon, authenticated;
revoke all on function public.email_run_progress(uuid)                                             from public, anon, authenticated;
revoke all on function public.email_run_stage_counts(uuid)                                         from public, anon, authenticated;
revoke all on function public.email_campaign_run_counts(uuid)                                      from public, anon, authenticated;
revoke all on function public.email_recipients_list(uuid, text, integer, integer)                  from public, anon, authenticated;
revoke all on function public.email_assign_stages(uuid, integer[])                                 from public, anon, authenticated;
revoke all on function public.email_snapshot_audience(uuid, integer)                               from public, anon, authenticated;
revoke all on function public.email_reset_orphans(uuid)                                            from public, anon, authenticated;
revoke all on function public.email_stage_pending(uuid, integer)                                   from public, anon, authenticated;
revoke all on function public.email_claim_batch(uuid, integer, integer)                            from public, anon, authenticated;
revoke all on function public.email_recipient_mark(uuid, text, text, text, text)                   from public, anon, authenticated;
revoke all on function public.email_stage_health(uuid, integer)                                    from public, anon, authenticated;
revoke all on function public.email_reserve_quota(text, date, integer, integer)                    from public, anon, authenticated;
revoke all on function public.email_release_quota(text, date, integer)                             from public, anon, authenticated;
revoke all on function public.email_commit_quota(text, date, integer)                              from public, anon, authenticated;
revoke all on function public.email_reconcile_quota(text, date, integer)                           from public, anon, authenticated;
revoke all on function public.email_suppress(text, text, text)                                     from public, anon, authenticated;

grant execute on function public.email_campaign_create(text, text)                                   to service_role;
grant execute on function public.email_campaign_add_version(uuid, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.email_campaigns_list()                                               to service_role;
grant execute on function public.email_campaign_get(uuid)                                              to service_role;
grant execute on function public.email_version_get(uuid)                                               to service_role;
grant execute on function public.email_run_create(uuid, uuid, text, jsonb, uuid, text, jsonb, integer, integer, text) to service_role;
grant execute on function public.email_run_get(uuid)                                                  to service_role;
grant execute on function public.email_runs_list(uuid)                                                to service_role;
grant execute on function public.email_run_set_status(uuid, text, jsonb)                              to service_role;
grant execute on function public.email_event_log(uuid, integer, text, jsonb, text)                    to service_role;
grant execute on function public.email_events_list(uuid, integer)                                     to service_role;
grant execute on function public.email_run_progress(uuid)                                             to service_role;
grant execute on function public.email_run_stage_counts(uuid)                                         to service_role;
grant execute on function public.email_campaign_run_counts(uuid)                                      to service_role;
grant execute on function public.email_recipients_list(uuid, text, integer, integer)                  to service_role;
grant execute on function public.email_assign_stages(uuid, integer[])                                 to service_role;
grant execute on function public.email_snapshot_audience(uuid, integer)                               to service_role;
grant execute on function public.email_reset_orphans(uuid)                                            to service_role;
grant execute on function public.email_stage_pending(uuid, integer)                                   to service_role;
grant execute on function public.email_claim_batch(uuid, integer, integer)                            to service_role;
grant execute on function public.email_recipient_mark(uuid, text, text, text, text)                   to service_role;
grant execute on function public.email_stage_health(uuid, integer)                                    to service_role;
grant execute on function public.email_reserve_quota(text, date, integer, integer)                    to service_role;
grant execute on function public.email_release_quota(text, date, integer)                             to service_role;
grant execute on function public.email_commit_quota(text, date, integer)                              to service_role;
grant execute on function public.email_reconcile_quota(text, date, integer)                           to service_role;
grant execute on function public.email_suppress(text, text, text)                                     to service_role;

notify pgrst, 'reload schema';
