#!/usr/bin/env python3
"""Publish drafted social posts to Meta (Facebook Page + Instagram Business).

Draft-first, like outreach_mailer.py: this PREVIEWS by default and only posts
publicly with --publish AND explicit human approval in the session.

    python3 tools/social_publish.py --run runs/2026-08-11-marketing            # dry run
    python3 tools/social_publish.py --run runs/2026-08-11-marketing --publish   # goes live

Draft format (one .md per post):

    platform: instagram        # instagram | facebook | both
    image_url: https://...     # REQUIRED for instagram; optional photo for facebook
    link: https://zingaapp.com # optional (facebook link posts only)

    <the caption / post body goes here, after the blank line>

Env (.env, never committed): META_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID,
optional META_GRAPH_VERSION (default v21.0).
"""
import argparse, csv, sys, json, urllib.request, urllib.parse
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "data" / "social_log.csv"
REQUIRED = ("platform",)

def load_env():
    p = ROOT / ".env"; env = {}
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("="); env[k.strip()] = v.strip().strip("'\"")
    return env

def parse_draft(path):
    head, sep, body = path.read_text().partition("\n\n")
    if not sep: raise ValueError(f"{path.name}: no blank line between headers and caption")
    h = {}
    for line in head.splitlines():
        if ":" not in line: raise ValueError(f"{path.name}: bad header {line!r}")
        k, _, v = line.partition(":"); h[k.strip()] = v.strip()
    for r in REQUIRED:
        if not h.get(r): raise ValueError(f"{path.name}: missing header {r}")
    if not body.strip(): raise ValueError(f"{path.name}: empty caption")
    return h, body.strip()

def graph(env, node, params):
    ver = env.get("META_GRAPH_VERSION", "v21.0")
    params = {**params, "access_token": env["META_ACCESS_TOKEN"]}
    url = f"https://graph.facebook.com/{ver}/{node}"
    data = urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=data)) as r:
        return json.loads(r.read())

def post_facebook(env, caption, h):
    page = env["META_PAGE_ID"]
    if h.get("image_url"):
        return graph(env, f"{page}/photos", {"url": h["image_url"], "caption": caption})
    params = {"message": caption}
    if h.get("link"): params["link"] = h["link"]
    return graph(env, f"{page}/feed", params)

def post_instagram(env, caption, h):
    ig = env["META_IG_USER_ID"]
    if not h.get("image_url"):
        raise ValueError("instagram requires image_url (a publicly reachable image)")
    container = graph(env, f"{ig}/media", {"image_url": h["image_url"], "caption": caption})
    return graph(env, f"{ig}/media_publish", {"creation_id": container["id"]})

def log(platform, draft, status, post_id="", error=""):
    fields = ["date", "platform", "draft", "status", "post_id", "error"]
    exists = LOG.exists() and LOG.stat().st_size > 0
    with LOG.open("a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        if not exists: w.writeheader()
        w.writerow({"date": date.today().isoformat(), "platform": platform,
                    "draft": draft, "status": status, "post_id": post_id, "error": error})

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", required=True, help="directory of post drafts")
    ap.add_argument("--publish", action="store_true", help="actually post publicly (needs approval)")
    a = ap.parse_args()
    run = Path(a.run);  run = run if run.is_absolute() else ROOT / run
    if not run.is_dir(): sys.exit(f"no such run directory: {run}")
    drafts = sorted(run.glob("*.md"))
    if not drafts: sys.exit(f"no .md post drafts in {run}")

    env = load_env()
    if a.publish:
        missing = [k for k in ("META_ACCESS_TOKEN", "META_PAGE_ID") if not env.get(k)]
        if missing: sys.exit(f"refusing to publish: {', '.join(missing)} not set in .env")

    posted = 0
    for d in drafts:
        h, caption = parse_draft(d)
        plats = ["facebook", "instagram"] if h["platform"] == "both" else [h["platform"]]
        print(f"\n--- {d.name}  →  {', '.join(plats)}")
        print(f"    {caption[:200]}{'…' if len(caption) > 200 else ''}")
        if h.get("image_url"): print(f"    image: {h['image_url']}")
        if not a.publish:
            continue
        for plat in plats:
            try:
                res = post_facebook(env, caption, h) if plat == "facebook" else post_instagram(env, caption, h)
                pid = res.get("id", "")
                print(f"    posted {plat}: {pid}")
                log(plat, d.name, "posted", pid); posted += 1
            except Exception as e:
                print(f"    FAILED {plat}: {e}")
                log(plat, d.name, "failed", error=str(e))

    if not a.publish:
        print(f"\n{len(drafts)} post drafts previewed. Nothing posted.")
        print("Re-run with --publish after explicit approval.")
    else:
        print(f"\n{posted} posts published, logged to data/social_log.csv")

if __name__ == "__main__":
    main()
