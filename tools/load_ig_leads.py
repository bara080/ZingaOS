#!/usr/bin/env python3
"""Load a cleaned IG leads.csv into Supabase ops.leads (dedup-safe).

Reads username,instagram_url,biography and upserts into ops.leads with
ON CONFLICT DO NOTHING (the ux_leads_instagram / ux_leads_email partial unique
indexes handle dedupe). Connects over the session pooler via SUPABASE_DB_URL
(env override or .env), reusing the robust parser from migrate_leads_to_supabase.

Usage:
  SUPABASE_DB_URL='postgresql://...pooler...' \
  .venv/bin/python tools/load_ig_leads.py \
    --csv runs/2026-08-19-ig-leads/leads.csv \
    --source apify-ig-nyc-hair --borough nyc --category hair --scraped-at 2026-08-19
"""
import argparse, csv, os, sys
from migrate_leads_to_supabase import parse_dburl, load_env


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--source", required=True)      # e.g. apify-ig-nyc-hair
    ap.add_argument("--borough", required=True)     # e.g. nyc
    ap.add_argument("--category", required=True)    # e.g. hair
    ap.add_argument("--scraped-at", required=True)  # e.g. 2026-08-19
    args = ap.parse_args()

    rows = []
    with open(args.csv, newline="") as f:
        for r in csv.DictReader(f):
            handle = (r.get("username") or "").strip()
            if not handle:
                continue
            rows.append((
                handle,                                        # instagram
                (r.get("instagram_url") or "").strip() or None,  # website
                (r.get("biography") or "").strip()[:280] or None,  # notes
                handle,                                        # business
                args.borough, args.category, args.source,
                "scraped", args.scraped_at, "",
            ))
    if not rows:
        sys.exit(f"no rows in {args.csv}")

    dburl = os.environ.get("SUPABASE_DB_URL") or load_env()
    if not dburl or "[YOUR-PASSWORD]" in dburl:
        sys.exit("SUPABASE_DB_URL missing/placeholder")
    import psycopg

    insert = ("INSERT INTO ops.leads "
              "(instagram, website, notes, business, borough, category, source, stage, scraped_at, verify_status) "
              "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING")
    with psycopg.connect(**parse_dburl(dburl)) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT count(*) FROM ops.leads").fetchone()[0]
            cur.executemany(insert, rows)
            conn.commit()
            after = cur.execute("SELECT count(*) FROM ops.leads").fetchone()[0]
            src = cur.execute("SELECT count(*) FROM ops.leads WHERE source=%s",
                              (args.source,)).fetchone()[0]
    print(f"read {len(rows)} IG leads; inserted {after - before} new (was {before}, now {after}); "
          f"source '{args.source}' total {src}")


if __name__ == "__main__":
    main()
