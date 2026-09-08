-- Lead data cleanup — 2026-09-08
-- Applied to Supabase (project xprrkepdjhixzztuqqqv) via apply_migration
-- `lead_cleanup_denylist_2026_09_08`. Non-destructive: rows kept, stage='skipped'.
--
-- Removed 16 non-provider junk handles from the DM queue (brand/corp, tourism/media,
-- adult/dating, non-US geo) that slipped through broad IG scrape terms ("usa",
-- "brooklyn"). Also retroactively skips any queued lead whose handle was already on
-- the denylist (e.g. the seeded civic/gov handles nypd/nycmayor/nycgov).
--
-- NOTE: icp_pass=false is NOT a junk signal here — most icp_fail leads are real
-- barbers/salons with no Google category. Cleanup is by explicit junk pattern, not ICP.

insert into ops.lead_denylist (handle, reason, actor)
select h, r, 'cleanup-2026-09-08' from (values
  ('usa_young_girls','adult/dating — not a provider'),
  ('usa_dating_giral6','adult/dating — not a provider'),
  ('aldiusa','brand/corp — not a provider'),
  ('bmwusa','brand/corp — not a provider'),
  ('toyotausa','brand/corp — not a provider'),
  ('toyotausanews','brand/corp — not a provider'),
  ('visittheusa','tourism/media — not a provider'),
  ('visitusafrance','tourism/media — not a provider'),
  ('usatoday','tourism/media — not a provider'),
  ('usatodayco','tourism/media — not a provider'),
  ('usatodaytravel','tourism/media — not a provider'),
  ('usatodaywinefood','tourism/media — not a provider'),
  ('brooklyn_barbers_echuca','non-US (Australia) — US-only market'),
  ('brooklynbarbersglanmire','non-US (Ireland) — US-only market'),
  ('hairstylistsaustralia','non-US (Australia) — US-only market'),
  ('usa_australia_canada_uk','non-US mixed geo — US-only market')
) as v(h,r)
where not exists (select 1 from ops.lead_denylist d where d.handle = v.h);

update ops.leads l
set stage = 'skipped', updated_at = now()
where l.stage in ('scraped','contacted','new','follow-up')
  and lower(regexp_replace(coalesce(l.instagram,''), '^@', '')) in (
    select handle from ops.lead_denylist
  );
