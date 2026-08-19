#!/usr/bin/env python3
"""Run the Apify instagram-scraper actor (run-sync) and dump raw dataset items.

Reads APIFY_TOKEN from the repo .env (never from the shell / never committed).
Draft/export tooling only — this pulls public profile data; it does not message
anyone. See skills: ig-lead-scrape (mechanics), ig-geo-sourcing (strategy).

Usage:
    python3 tools/apify_ig_scrape.py --query "hair stylist nyc" --type user --limit 20
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, ".env")
ACTOR_ENDPOINT = (
    "https://api.apify.com/v2/acts/apify~instagram-scraper/"
    "run-sync-get-dataset-items?token={token}"
)


def load_env(path):
    vals = {}
    if not os.path.exists(path):
        return vals
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", required=True)
    ap.add_argument("--type", default="user")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    token = load_env(ENV_PATH).get("APIFY_TOKEN", "")
    if not token:
        print("APIFY_TOKEN missing — cannot scrape", file=sys.stderr)
        sys.exit(2)

    out = args.out or os.path.join(
        REPO, "runs", f"{date.today().isoformat()}-ig-leads", "raw.json"
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)

    # Input shape matches the PROVEN n8n config (automations/n8n/workflows/ig-leads-cron.json)
    # that returned 10 real leads on 2026-08-14. The actor's search field is `search`
    # (NOT `searchQuery` — that key is ignored and yields an empty "no_items" result),
    # and it needs resultsType=details to expand profiles.
    # searchLimit is the LEAD-COUNT lever: number of profiles the search expands.
    # (Empirically: searchLimit=1 -> 1 lead. resultsLimit governs items *per* profile.)
    body = {
        "search": args.query,
        "searchType": args.type,
        "searchLimit": args.limit,
        "resultsType": "details",
        "resultsLimit": args.limit,
    }
    req = urllib.request.Request(
        ACTOR_ENDPOINT.format(token=token),
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"NETWORK_ERROR: {e}", file=sys.stderr)
        sys.exit(3)

    with open(out, "w") as f:
        json.dump(data, f, indent=2)
    print(f"wrote {len(data)} records -> {out}")


if __name__ == "__main__":
    main()
