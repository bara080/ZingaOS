#!/usr/bin/env python3
"""Send WhatsApp messages via the WhatsApp Business Cloud API (Meta).

Draft-first and CONSENT-GATED. Business-initiated WhatsApp messages MUST use a
pre-approved template and go only to recipients who opted in. Free-text is allowed
only inside the 24h customer-service window (a reply to their message). Ignoring
this gets the number banned — this tool refuses to break the rule.

    python3 tools/whatsapp_send.py --run runs/2026-08-11-whatsapp             # dry run
    python3 tools/whatsapp_send.py --run runs/2026-08-11-whatsapp --send      # sends

Draft format (one .md per recipient):

    to: +17185551234           # E.164, an opted-in contact
    template: zinga_intro_v1   # a Meta-APPROVED template name
    lang: en
    vars: Frankie, Greenpoint  # ordered {{1}},{{2}} substitutions (optional)
    session: false             # true only if replying inside the 24h window

    <human-readable preview of the message, for your approval>

Env (.env): WHATSAPP_TOKEN (or META_ACCESS_TOKEN), WHATSAPP_PHONE_NUMBER_ID,
optional META_GRAPH_VERSION (default v21.0).
"""
import argparse, csv, sys, json, urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "data" / "whatsapp_log.csv"

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
    if not sep: raise ValueError(f"{path.name}: no blank line between headers and preview")
    h = {}
    for line in head.splitlines():
        if ":" not in line: raise ValueError(f"{path.name}: bad header {line!r}")
        k, _, v = line.partition(":"); h[k.strip()] = v.strip()
    if not h.get("to"): raise ValueError(f"{path.name}: missing 'to'")
    session = h.get("session", "false").lower() == "true"
    if not session and not h.get("template"):
        raise ValueError(f"{path.name}: business-initiated message needs an approved 'template' "
                         f"(or session: true to reply within the 24h window)")
    return h, body.strip(), session

def send(env, h, session):
    ver = env.get("META_GRAPH_VERSION", "v21.0")
    token = env.get("WHATSAPP_TOKEN") or env.get("META_ACCESS_TOKEN")
    pnid = env["WHATSAPP_PHONE_NUMBER_ID"]
    if session:  # free text, only valid as a reply inside 24h window
        payload = {"messaging_product": "whatsapp", "to": h["to"], "type": "text",
                   "text": {"body": h.get("preview") or "(reply)"}}
    else:
        comp = []
        if h.get("vars"):
            params = [{"type": "text", "text": v.strip()} for v in h["vars"].split(",")]
            comp = [{"type": "body", "parameters": params}]
        payload = {"messaging_product": "whatsapp", "to": h["to"], "type": "template",
                   "template": {"name": h["template"], "language": {"code": h.get("lang", "en")},
                                **({"components": comp} if comp else {})}}
    url = f"https://graph.facebook.com/{ver}/{pnid}/messages"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def log(to, template, status, mid="", error=""):
    fields = ["date", "to", "template", "status", "message_id", "error"]
    exists = LOG.exists() and LOG.stat().st_size > 0
    with LOG.open("a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        if not exists: w.writeheader()
        w.writerow({"date": date.today().isoformat(), "to": to, "template": template,
                    "status": status, "message_id": mid, "error": error})

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--run", required=True)
    ap.add_argument("--send", action="store_true", help="actually send (needs approval + opt-in)")
    a = ap.parse_args()
    run = Path(a.run); run = run if run.is_absolute() else ROOT / run
    if not run.is_dir(): sys.exit(f"no such run directory: {run}")
    drafts = sorted(run.glob("*.md"))
    if not drafts: sys.exit(f"no .md drafts in {run}")

    env = load_env()
    if a.send and not (env.get("WHATSAPP_TOKEN") or env.get("META_ACCESS_TOKEN")):
        sys.exit("refusing to send: no WHATSAPP_TOKEN / META_ACCESS_TOKEN in .env")
    if a.send and not env.get("WHATSAPP_PHONE_NUMBER_ID"):
        sys.exit("refusing to send: WHATSAPP_PHONE_NUMBER_ID not set in .env")

    sent = 0
    for d in drafts:
        h, preview, session = parse_draft(d); h["preview"] = preview
        kind = "session-reply" if session else f"template:{h.get('template')}"
        print(f"\n--- {d.name}  →  {h['to']}  ({kind})")
        print(f"    {preview[:180]}{'…' if len(preview) > 180 else ''}")
        if not a.send:
            continue
        try:
            res = send(env, h, session)
            mid = (res.get("messages", [{}])[0]).get("id", "")
            print(f"    sent: {mid}")
            log(h["to"], h.get("template", "session"), "sent", mid); sent += 1
        except Exception as e:
            print(f"    FAILED: {e}")
            log(h["to"], h.get("template", "session"), "failed", error=str(e))

    if not a.send:
        print(f"\n{len(drafts)} WhatsApp drafts previewed. Nothing sent.")
        print("Recipients must be opted in; templates must be Meta-approved. Re-run with --send after approval.")
    else:
        print(f"\n{sent} WhatsApp messages sent, logged to data/whatsapp_log.csv")

if __name__ == "__main__":
    main()
