#!/usr/bin/env python3
"""DRAFT-ONLY provider cold-email generator.

Pulls emailable, NOT-yet-contacted leads from Supabase ops.leads over the
session pooler (SUPABASE_DB_URL in .env), and writes personalized, send-ready
cold-email DRAFTS to the git-ignored runs/2026-08-19-outreach/ path.

It SENDS NOTHING, marks NOBODY contacted, and writes NO data/outreach.csv.
Personalization is done in-process from the real lead fields so that lead PII
(emails/names) never has to transit an LLM transcript. Only aggregate counts
and 3 sample drafts are printed to stdout.

Run:
  /Users/bara080/bara/zinga-os/.venv/bin/python tools/draft_outreach_batch.py
"""
import csv, sys, os
from pathlib import Path

ROOT = Path("/Users/bara080/bara/zinga-os")
sys.path.insert(0, str(ROOT / "tools"))
from migrate_leads_to_supabase import load_env, parse_dburl  # noqa: E402
import psycopg  # noqa: E402

OUTDIR = ROOT / "runs" / "2026-08-19-outreach"
OUTDIR.mkdir(parents=True, exist_ok=True)

QUERY = """
select business, owner, email, borough, category, website, notes, stage, source
from ops.leads
where email is not null and email <> ''
  and stage in ('scraped','prospect')
order by reviews desc nulls last
limit 60;
"""

ADDR = "Zinga, 727 7th Ave, 4th Floor, New York, NY 10019"

CATWORD = {
    "auto": "auto pros",
    "barber": "barbers and stylists",
    "beauty": "barbers and stylists",
    "barber/beauty": "barbers and stylists",
    "hair": "stylists",
    "salon": "stylists",
    "nail": "nail techs",
    "spa": "spa pros",
    "photography": "photographers",
    "photo": "photographers",
    "massage": "massage therapists",
}


def catword(cat):
    if not cat:
        return "local pros"
    c = cat.strip().lower()
    for k, v in CATWORD.items():
        if k in c:
            return v
    return "local pros"


def firstname(owner):
    if not owner or not owner.strip():
        return "there"
    return owner.strip().split()[0]


def build(business, owner, borough, category, website):
    biz = (business or "your business").strip()
    boro = (borough or "NYC").strip()
    cw = catword(category)
    name = firstname(owner)
    subject = f"{biz} — filling mid-week gaps in {boro}?"
    body = f"""Hi {name},

I came across {biz} in {boro}. I'm Bara — I run Zinga (zingaapp.com), where NYC customers book {cw} directly.

I'm adding a handful of {boro} {cw} right now, and {biz} looks like a good fit. No cost to be listed. The point is to fill the mid-week gaps when your calendar is light.

Worth a 2-minute look? Reply and I'll send you the link. If it's not for you, no worries at all.

Bara
Zinga — zingaapp.com

---
You're receiving this because {biz} is a {boro}-area business listed publicly. Reply "unsubscribe" and I won't email you again.
{ADDR}"""
    return subject, body


def main():
    dburl = os.environ.get("SUPABASE_DB_URL") or load_env()
    if not dburl or "[YOUR-PASSWORD]" in dburl:
        sys.exit("!! SUPABASE_DB_URL missing/placeholder in .env")
    with psycopg.connect(**parse_dburl(dburl)) as conn:
        rows = conn.execute(QUERY).fetchall()

    md = ["# Zinga provider cold-email drafts — 2026-08-19",
          "\nDRAFT ONLY. Nothing sent. Nobody marked contacted.\n",
          f"Total drafts: {len(rows)}\n", "---\n"]
    csv_rows, samples = [], []
    for i, (business, owner, email, borough, category, website, notes, stage, source) in enumerate(rows, 1):
        subject, body = build(business, owner, borough, category, website)
        md += [f"## {i}. {business or '(no name)'}",
               f"- **To:** {email}",
               f"- **Borough:** {borough or '?'}  |  **Category:** {category or '?'}  |  "
               f"**Stage:** {stage}  |  **Source:** {source or '?'}",
               f"- **Subject:** {subject}\n", body, "\n---\n"]
        csv_rows.append((email, business or "", subject))
        if i <= 3:
            samples.append((business, borough, category, subject, body))

    (OUTDIR / "email-drafts.md").write_text("\n".join(md))
    with (OUTDIR / "email-batch.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["email", "business", "subject"])
        w.writerows(csv_rows)

    from collections import Counter
    print(f"ROWS_RETURNED={len(rows)}")
    print("BY_CATEGORY=", dict(Counter((r[4] or '?') for r in rows)))
    print("BY_BOROUGH=", dict(Counter((r[3] or '?') for r in rows)))
    print("BY_STAGE=", dict(Counter((r[7] or '?') for r in rows)))
    print("FILES:")
    print("  ", OUTDIR / "email-drafts.md")
    print("  ", OUTDIR / "email-batch.csv")
    print("=== SAMPLES (3) ===")
    for biz, boro, cat, subj, body in samples:
        print(f"\n--- {biz} | {boro} | {cat} ---")
        print("SUBJECT:", subj)
        print(body)


if __name__ == "__main__":
    main()
