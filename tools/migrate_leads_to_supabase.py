#!/usr/bin/env python3
"""Phase 1 data migration: copy leads from local SQLite (data/zinga.db) -> Supabase ops.leads.

Runs entirely on this host over a DIRECT Postgres connection, so lead PII (emails,
names, phones) never transits an LLM transcript or the Data API. Idempotent: re-running
skips rows that already exist (ON CONFLICT DO NOTHING against the unique email/instagram
indexes), so a partial run is safe to repeat.

Setup (one time):
  1. Put the real DB connection string in .env as SUPABASE_DB_URL, e.g.
       SUPABASE_DB_URL=postgresql://postgres:<PERCENT-ENCODED-PASSWORD>@db.xprrkepdjhixzztuqqqv.supabase.co:5432/postgres
     (Get/reset the password at Supabase Dashboard -> Settings -> Database. If it
     contains @ : / etc., percent-encode it.)
  2. pip install "psycopg[binary]"

Run:
  python3 tools/migrate_leads_to_supabase.py            # migrate
  python3 tools/migrate_leads_to_supabase.py --dry-run  # show what would move, touch nothing
"""
import os, sys, sqlite3, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQLITE = ROOT / "data" / "zinga.db"
ENV = ROOT / ".env"

STAGES = {"scraped", "prospect", "contacted", "replied", "signed", "listed", "unsub"}

# ops.leads columns we write, in order. id is preserved from SQLite.
COLS = ["id", "place_id", "business", "owner", "email", "phone", "instagram", "website",
        "rating", "reviews", "borough", "category", "source", "scraped_at",
        "verify_status", "icp_pass", "stage", "subject", "contacted_at",
        "replied_at", "reply_text", "notes"]


def load_env():
    """Minimal .env reader (KEY=VALUE lines). Returns SUPABASE_DB_URL or None."""
    if not ENV.exists():
        return None
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        if k.strip() == "SUPABASE_DB_URL":
            return v.strip().strip('"').strip("'")
    return None


def parse_dburl(url):
    """Parse postgresql://user:pass@host:port/dbname into psycopg kwargs.

    Robust to a password containing an unencoded '@' or ':' (splits on the LAST
    '@' for the host, FIRST ':' for the password). Decodes %XX if the password was
    percent-encoded. Avoids URL-parsing pitfalls entirely by connecting via kwargs.
    """
    from urllib.parse import unquote
    rest = url.split("://", 1)[1]
    authority, _, dbname = rest.partition("/")
    userinfo, _, hostport = authority.rpartition("@")   # last '@' separates host
    user, _, password = userinfo.partition(":")          # first ':' separates password
    host, _, port = hostport.partition(":")
    if "%" in password:
        password = unquote(password)
    return dict(host=host, port=int(port or 5432), user=user or "postgres",
                password=password, dbname=(dbname or "postgres").split("?")[0])


def blank_to_none(v):
    return None if v is None or str(v).strip() == "" else v


def as_date(v):
    v = blank_to_none(v)
    if v is None:
        return None
    s = str(v).strip()[:10]
    try:
        datetime.date.fromisoformat(s)
        return s
    except ValueError:
        return None  # unparseable -> leave null rather than crash the row


def row_to_tuple(r):
    stage = (r["stage"] or "scraped").strip()
    if stage not in STAGES:
        stage = "scraped"
    return (
        r["id"],
        blank_to_none(r["place_id"]), blank_to_none(r["business"]), blank_to_none(r["owner"]),
        blank_to_none(r["email"]), blank_to_none(r["phone"]), blank_to_none(r["instagram"]),
        blank_to_none(r["website"]),
        r["rating"], r["reviews"],
        blank_to_none(r["borough"]), blank_to_none(r["category"]),
        blank_to_none(r["source"]), as_date(r["scraped_at"]),
        (r["verify_status"] or ""),
        bool(r["icp_pass"]),
        stage,
        blank_to_none(r["subject"]), as_date(r["contacted_at"]), as_date(r["replied_at"]),
        blank_to_none(r["reply_text"]), blank_to_none(r["notes"]),
    )


def read_sqlite():
    if not SQLITE.exists():
        sys.exit(f"!! SQLite DB not found: {SQLITE}")
    c = sqlite3.connect(SQLITE)
    c.row_factory = sqlite3.Row
    rows = c.execute(f"SELECT {', '.join(COLS)} FROM leads").fetchall()
    c.close()
    return [row_to_tuple(r) for r in rows]


def main():
    dry = "--dry-run" in sys.argv
    rows = read_sqlite()
    print(f"read {len(rows)} leads from {SQLITE.name}")
    by_stage = {}
    for t in rows:
        by_stage[t[16]] = by_stage.get(t[16], 0) + 1  # stage is index 16
    print(f"  by stage: {by_stage}")
    if dry:
        print("dry-run: nothing written.")
        return

    dburl = os.environ.get("SUPABASE_DB_URL") or load_env()
    if not dburl or "[YOUR-PASSWORD]" in dburl:
        sys.exit("!! SUPABASE_DB_URL missing or still a placeholder in .env. "
                 "Add the real connection string (see this file's docstring).")
    try:
        import psycopg
        from psycopg import sql
    except ImportError:
        sys.exit('!! psycopg not installed. Run: pip install "psycopg[binary]"')

    placeholders = ", ".join(["%s"] * len(COLS))
    insert = (f"INSERT INTO ops.leads ({', '.join(COLS)}) VALUES ({placeholders}) "
              f"ON CONFLICT DO NOTHING")
    with psycopg.connect(**parse_dburl(dburl)) as conn:
        with conn.cursor() as cur:
            before = cur.execute("SELECT count(*) FROM ops.leads").fetchone()[0]
            cur.executemany(insert, rows)
            conn.commit()
            after = cur.execute("SELECT count(*) FROM ops.leads").fetchone()[0]
            # keep the identity sequence ahead of the preserved ids
            cur.execute("SELECT setval(pg_get_serial_sequence('ops.leads','id'), "
                        "COALESCE((SELECT MAX(id) FROM ops.leads), 1))")
            conn.commit()
            stagerows = cur.execute(
                "SELECT stage, count(*) FROM ops.leads GROUP BY stage ORDER BY 2 DESC").fetchall()
    print(f"inserted {after - before} new rows (was {before}, now {after}).")
    print(f"  ops.leads by stage: {dict(stagerows)}")


if __name__ == "__main__":
    main()
