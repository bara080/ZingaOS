#!/usr/bin/env python3
"""Validate the Meta token and discover the Instagram business account id.

Reads META_ACCESS_TOKEN / META_GRAPH_VERSION from .env, then:
  1. confirms the token works (GET /me),
  2. lists the Pages the token can manage,
  3. prints each Page's linked instagram_business_account id.

The instagram_business_account id is your META_IG_USER_ID — add it to .env.

    python3 tools/meta_whoami.py
"""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"


def load_env():
    vals = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"_error": json.loads(e.read().decode())}
    except urllib.error.URLError as e:
        return {"_error": str(e)}


def main():
    env = load_env()
    tok = env.get("META_ACCESS_TOKEN", "")
    ver = env.get("META_GRAPH_VERSION", "v21.0")
    if not tok:
        sys.exit("META_ACCESS_TOKEN missing from .env")
    base = f"https://graph.facebook.com/{ver}"

    me = get(f"{base}/me?fields=id,name&access_token={tok}")
    if "_error" in me:
        sys.exit(f"Token check failed: {json.dumps(me['_error'], indent=2)}")
    print(f"token OK — /me = {me.get('name')} ({me.get('id')})")

    pages = get(f"{base}/me/accounts?fields=id,name,instagram_business_account&access_token={tok}")
    if "_error" in pages:
        sys.exit(f"/me/accounts failed: {json.dumps(pages['_error'], indent=2)}")

    data = pages.get("data", [])
    if not data:
        print("\nNo Pages returned. The token may be a user token without page access,\n"
              "or the IG account isn't linked to a Page you manage.")
        return
    print("\nPages + linked Instagram business accounts:")
    found = False
    for p in data:
        iba = (p.get("instagram_business_account") or {}).get("id")
        print(f"  Page: {p.get('name')} ({p.get('id')})  ->  IG business id: {iba or '(none linked)'}")
        if iba:
            found = True
            print(f"    >>> add to .env:  META_IG_USER_ID={iba}")
    if not found:
        print("\nNo instagram_business_account linked. Link the Zinga IG (Professional) to the Page first.")


if __name__ == "__main__":
    main()
