-- Scrape-run history: durable record of every Apify scrape run (including
-- FAILURES) started from the CRM · Scrape Leads view. Companion to
-- operator_crm.sql — SAME security model: `ops` is a private schema (RLS
-- deny-all, NOT exposed to PostgREST). Functions live in `public`, are
-- SECURITY DEFINER, EXECUTE revoked from public/anon/authenticated and granted
-- ONLY to service_role. The Next.js /api/operator/scrape/* routes are the only
-- callers; each uses the service-role key and is gated on requireOperator().
--
-- ⚠ MUST BE APPLIED to Supabase BEFORE the Scrape History feature works.
-- Apply over the session pooler / direct DB connection (or via Supabase MCP
-- execute_sql) to project xprrkepdjhixzztuqqqv. Until it is applied the scrape
-- still runs and results still save normally — recording is BEST-EFFORT and
-- swallowed on error — but the Scrape History table stays empty (the UI
-- degrades gracefully to an empty/graceful state, it does not crash).

-- ── run log: one row per scrape run, filled in on finish ────────────────────
create table if not exists ops.scrape_runs (
  id           bigint generated always as identity primary key,
  actor        text,                                  -- operator email
  source       text,                                  -- 'ig' | 'google' | 'tiktok'
  query        text,
  number       int,
  run_id       text,                                  -- Apify run id
  dataset_id   text,                                  -- Apify dataset id
  status       text not null default 'running',       -- 'running' | 'succeeded' | 'failed'
  found        int,
  dropped      int,
  inserted     int,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  duration_ms  int
);
alter table ops.scrape_runs enable row level security;  -- deny-all: RPC-only
-- Index the list query's sort column (most-recent-first history feed).
create index if not exists ix_scrape_runs_started
  on ops.scrape_runs(started_at desc);

-- ── start a run: insert status='running', return the new id ─────────────────
create or replace function public.operator_scrape_run_start(
  p_actor      text,
  p_source     text,
  p_query      text,
  p_number     int,
  p_run_id     text,
  p_dataset_id text
)
returns bigint
language sql
volatile
security definer
set search_path = ops, pg_temp
as $$
  insert into ops.scrape_runs(actor, source, query, number, run_id, dataset_id, status)
  values (nullif(p_actor,''), nullif(p_source,''), nullif(p_query,''), p_number,
          nullif(p_run_id,''), nullif(p_dataset_id,''), 'running')
  returning id;
$$;

-- ── finish a run: set status + yield counts + duration ──────────────────────
-- Status is normalized to 'failed' unless explicitly 'succeeded'. Duration:
-- callers that finalize in-band (the results route, tab open) omit p_duration_ms
-- and we compute now()-started_at, which fairly reflects start→results. The
-- reconcile route (which may finalize an orphaned run long after it actually ran)
-- passes p_duration_ms = the REAL Apify runtime so history isn't inflated.
create or replace function public.operator_scrape_run_finish(
  p_id          bigint,
  p_status      text,
  p_found       int,
  p_dropped     int,
  p_inserted    int,
  p_error       text,
  p_duration_ms int default null
)
returns void
language sql
volatile
security definer
set search_path = ops, pg_temp
as $$
  update ops.scrape_runs
     set status      = case when p_status = 'succeeded' then 'succeeded' else 'failed' end,
         found       = p_found,
         dropped     = p_dropped,
         inserted    = p_inserted,
         error       = nullif(p_error,''),
         finished_at = now(),
         duration_ms = coalesce(p_duration_ms, (extract(epoch from (now() - started_at)) * 1000)::int)
   where id = p_id;
$$;

-- ── list recent runs (most recent first) ────────────────────────────────────
create or replace function public.operator_scrape_runs_list(p_limit int default 50)
returns setof ops.scrape_runs
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select *
  from ops.scrape_runs
  order by started_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- ── runs still marked 'running' (for server-side reconcile) ─────────────────
-- The browser drives the poll→fetch→finalize flow; if the tab closes mid-run the
-- run is orphaned as 'running'. The /scrape/reconcile route lists these, checks
-- Apify directly, then finalizes (succeeded+leads / failed). Self-heals.
create or replace function public.operator_scrape_runs_running()
returns setof ops.scrape_runs
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select * from ops.scrape_runs where status = 'running' order by started_at asc limit 50;
$$;

-- ── lock down: service_role only ────────────────────────────────────────────
revoke all on function public.operator_scrape_runs_running()
  from public, anon, authenticated;
grant execute on function public.operator_scrape_runs_running()
  to service_role;
comment on function public.operator_scrape_runs_running() is
  'Returns scrape_runs still in status=running, oldest first (max 50). Used by '
  'POST /api/operator/scrape/reconcile to self-heal runs orphaned when the '
  'browser tab closed mid-run: it re-checks Apify and finalizes them '
  '(succeeded+upsert leads / failed). service_role only.';

revoke all on function public.operator_scrape_run_start(text, text, text, int, text, text)
  from public, anon, authenticated;
revoke all on function public.operator_scrape_run_finish(bigint, text, int, int, int, text)
  from public, anon, authenticated;
revoke all on function public.operator_scrape_runs_list(int)
  from public, anon, authenticated;
grant execute on function public.operator_scrape_run_start(text, text, text, int, text, text)
  to service_role;
grant execute on function public.operator_scrape_run_finish(bigint, text, int, int, int, text)
  to service_role;
grant execute on function public.operator_scrape_runs_list(int)
  to service_role;

notify pgrst, 'reload schema';
