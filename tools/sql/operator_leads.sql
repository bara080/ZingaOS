-- Operator console — read access to the PRIVATE ops.leads table.
--
-- ops is a non-public schema NOT exposed to PostgREST ("Only the following
-- schemas are exposed: public, graphql_public"), and ops.leads is RLS deny-all.
-- So supabase-js `.schema('ops').from('leads')` fails with PGRST106.
--
-- These SECURITY DEFINER functions live in `public` (so they are reachable via
-- PostgREST RPC), run as their owner (postgres, which bypasses RLS), and are
-- locked down: EXECUTE is revoked from PUBLIC and granted ONLY to service_role.
-- anon / authenticated cannot call them. The Next.js API route
-- /api/operator/leads is the only caller — it uses the service-role key and is
-- itself gated on readSession() + role in (superadmin, admin).
--
-- Apply with: python3 tools/sql/apply via the direct/pooler DB connection.

create or replace function public.operator_list_leads(
  p_stage  text    default null,
  p_source text    default null,
  p_q      text    default null,
  p_limit  integer default 500
)
returns table (
  id            bigint,
  business      text,
  owner         text,
  email         text,
  phone         text,
  instagram     text,
  website       text,
  borough       text,
  category      text,
  source        text,
  stage         text,
  verify_status text,
  scraped_at    date,
  contacted_at  date,
  replied_at    date,
  notes         text,
  reviews       integer,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select l.id, l.business, l.owner, l.email, l.phone, l.instagram, l.website,
         l.borough, l.category, l.source, l.stage, l.verify_status,
         l.scraped_at, l.contacted_at, l.replied_at, l.notes, l.reviews, l.created_at
  from ops.leads l
  where (p_stage  is null or p_stage  = '' or l.stage  = p_stage)
    and (p_source is null or p_source = '' or l.source = p_source)
    and (p_q is null or p_q = ''
         or l.business  ilike '%' || p_q || '%'
         or l.email     ilike '%' || p_q || '%'
         or l.instagram ilike '%' || p_q || '%')
  order by l.created_at desc nulls last, l.reviews desc nulls last
  limit greatest(1, least(coalesce(p_limit, 500), 2000));
$$;

-- Full, unfiltered stage counts for the funnel / "N leads" totals.
create or replace function public.operator_lead_counts()
returns table (stage text, n bigint)
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select l.stage, count(*)::bigint
  from ops.leads l
  group by l.stage
  order by 2 desc;
$$;

-- Lock down: no PUBLIC/anon/authenticated execute (Supabase grants these via
-- default privileges, so revoke each explicitly); service_role only.
revoke all on function public.operator_list_leads(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.operator_lead_counts() from public, anon, authenticated;
grant execute on function public.operator_list_leads(text, text, text, integer) to service_role;
grant execute on function public.operator_lead_counts() to service_role;

notify pgrst, 'reload schema';
