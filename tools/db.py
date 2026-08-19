#!/usr/bin/env python3
"""Zinga OS local data layer — one SQLite file (data/zinga.db) as the source of truth.

Stdlib only (sqlite3). The scraper→send pipeline lives in ONE `leads` table with a
UNIQUE email (so no more duplicate sends) and a per-lead `stage`. CSVs become
import-only (Apify) and export-only (Smartlead).

    python3 tools/db.py migrate   # build/refresh the DB from the Apify batch + outreach.csv
    python3 tools/db.py stats     # counts by stage
    python3 tools/db.py pending   # rows ready to send
"""
import sqlite3, csv, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "zinga.db"
OUTREACH = ROOT / "data" / "outreach.csv"
BATCH = Path("/Users/bara080/bara/zingaSocialMediaCampaign/for-providers/prospect-batches/2026-05-16_batch_brooklyn_hairsalon.csv")

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads(
  id INTEGER PRIMARY KEY,
  place_id TEXT, business TEXT, owner TEXT,
  email TEXT UNIQUE, phone TEXT, instagram TEXT, website TEXT,
  rating REAL, reviews INTEGER, borough TEXT, category TEXT,
  source TEXT, scraped_at TEXT,
  verify_status TEXT DEFAULT '',      -- neverbounce: valid/invalid/risky/''
  icp_pass INTEGER DEFAULT 0,
  stage TEXT DEFAULT 'scraped',       -- scraped→prospect→contacted→replied→signed→listed→unsub
  subject TEXT, contacted_at TEXT, replied_at TEXT, reply_text TEXT, notes TEXT
);
CREATE INDEX IF NOT EXISTS ix_stage ON leads(stage);
"""

def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    c.executescript(SCHEMA); return c

def import_batch(c):
    if not BATCH.exists(): return 0
    n = 0
    for r in csv.DictReader(BATCH.open(newline="")):
        email = (r.get("email") or "").strip() or None
        icp = 1 if (r.get("icp_pass") or "").strip().upper() == "YES" else 0
        stage = "prospect" if (icp and email) else "scraped"
        try:
            c.execute("""INSERT INTO leads(place_id,business,owner,email,phone,instagram,website,
                rating,reviews,borough,category,source,scraped_at,icp_pass,stage,notes)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                ((r.get("place_id") or "").strip(), (r.get("business_name") or "").strip(),
                 (r.get("owner_first_name") or "").strip(), email, (r.get("phone") or "").strip(),
                 (r.get("instagram") or "").strip(), (r.get("website") or "").strip(),
                 float(r["google_rating"]) if r.get("google_rating") else None,
                 int(r["google_review_count"]) if r.get("google_review_count") else None,
                 (r.get("city") or "").strip(), (r.get("vertical") or "").strip(),
                 "apify-gmaps-2026-05-16-brooklyn", "2026-05-16", icp, stage,
                 f"score {r.get('score','')}"))
            n += 1
        except sqlite3.IntegrityError:
            pass  # duplicate email — dedupe
    c.commit(); return n

def sync_from_outreach(c):
    """Mark leads contacted from real cold sends in outreach.csv (idempotent)."""
    if not OUTREACH.exists(): return 0
    n = 0
    for r in csv.DictReader(OUTREACH.open(newline="")):
        pid = (r.get("provider_id") or "").strip()
        if pid == "TEST-SMOKE" or "baraahmad232" in pid or "@" not in pid: continue
        cur = c.execute("""UPDATE leads SET stage='contacted', contacted_at=?, verify_status='valid',
            subject=COALESCE(NULLIF(subject,''),?) WHERE email=? AND stage NOT IN ('contacted','replied','signed','listed')""",
            (r.get("date", ""), r.get("subject", ""), pid))
        n += cur.rowcount
    c.commit(); return n

def pending(c, limit=None):
    q = """SELECT * FROM leads WHERE stage='prospect' AND email IS NOT NULL AND email!=''
           AND icp_pass=1 AND verify_status!='invalid' ORDER BY reviews DESC"""
    if limit: q += f" LIMIT {int(limit)}"
    return c.execute(q).fetchall()

def stats(c):
    rows = c.execute("SELECT stage, COUNT(*) n FROM leads GROUP BY stage").fetchall()
    by = {r["stage"]: r["n"] for r in rows}
    total = c.execute("SELECT COUNT(*) n FROM leads").fetchone()["n"]
    icp = c.execute("SELECT COUNT(*) n FROM leads WHERE icp_pass=1").fetchone()["n"]
    contacted = by.get("contacted", 0) + by.get("replied", 0) + by.get("signed", 0) + by.get("listed", 0)
    return {"total": total, "icp": icp, "by_stage": by, "contacted": contacted,
            "pending": len(pending(c))}

def leads_min(c):
    rows = c.execute("""SELECT email, business, stage FROM leads
        WHERE email IS NOT NULL AND email!='' AND
        (stage IN ('contacted','replied','signed','listed') OR (stage='prospect' AND icp_pass=1))
        ORDER BY reviews DESC""").fetchall()
    out = []
    for r in rows:
        st = "sent" if r["stage"] in ("contacted", "replied", "signed", "listed") else "pending"
        out.append({"email": r["email"], "biz": r["business"], "status": st})
    return out

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    c = conn()
    if cmd == "migrate":
        imported = import_batch(c)
        synced = sync_from_outreach(c)
        s = stats(c)
        print(f"imported {imported} new leads; marked {synced} contacted from outreach.csv")
        print(f"total={s['total']} icp={s['icp']} pending={s['pending']} by_stage={s['by_stage']}")
    elif cmd == "pending":
        for r in pending(c, 10): print(f"  {r['email']:<34} {r['business']}")
        print(f"  … {len(pending(c))} pending total")
    else:
        print(stats(c))

if __name__ == "__main__":
    main()
