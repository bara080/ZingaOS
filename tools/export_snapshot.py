#!/usr/bin/env python3
"""Export a PII-FREE snapshot of the data layer for the public Vercel pages.

Reads the local source of truth (SQLite + CSVs) and writes ONLY aggregate counts —
no emails, no names, no per-lead rows — to web/data/snapshot.json.
This is the ONLY thing Vercel ever sees of the data layer.

    python3 tools/export_snapshot.py     # then redeploy the web/ folder

Run it on each meaningful change (or from a cron) to keep the public numbers fresh.
"""
import csv, json, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "data" / "snapshot.json"
sys.path.insert(0, str(ROOT / "tools"))
try:
    import db as dbmod
except Exception:
    dbmod = None

def rows(p):
    p = ROOT / p
    if not p.exists(): return []
    try:
        with p.open(newline="") as fh: return list(csv.DictReader(fh))
    except Exception: return []

def build():
    prov = [r for r in rows("data/providers.csv") if r.get("id") and r["id"] != "TEST-SMOKE"]
    icp = [r for r in prov if "ICP-pass" in (r.get("notes") or "")]
    out = [r for r in rows("data/outreach.csv")
           if r.get("provider_id", "") != "TEST-SMOKE" and "baraahmad232" not in r.get("provider_id", "")]
    sent = sum(1 for r in out if r.get("replied") == "sent")
    failed = sum(1 for r in out if r.get("replied") == "failed")
    td = ROOT / "data/testimonials"
    testimonials = len([f for f in td.glob("*.md") if f.name != "README.md"]) if td.exists() else 0

    by_stage = {}
    contacted = 0
    if dbmod:
        try:
            c = dbmod.conn(); dbmod.sync_from_outreach(c); s = dbmod.stats(c); c.close()
            by_stage = s["by_stage"]; contacted = s["contacted"]
        except Exception:
            pass

    return {
        "updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "supply": {"sourced": len(prov), "icp": len(icp),
                   "contacted": contacted or sent, "signed": sum(1 for r in prov if r.get("stage") in ("signed", "listed"))},
        "trust": {"testimonials": testimonials},
        "demand": {"bookings": 0},
        "funnel": {"scraped": 1962, "open": len(prov), "icp": len(icp), "emailed": sent, "replied": 0, "signed": 0},
        "send": {"sent": sent, "failed": failed},
        "by_stage": by_stage,
        "note": "PII-free aggregates only. Raw leads stay local (data/zinga.db).",
    }

def main():
    snap = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snap, indent=2))
    print(f"wrote {OUT}")
    print(f"  supply {snap['supply']} · send {snap['send']} · by_stage {snap.get('by_stage')}")

if __name__ == "__main__":
    main()
