#!/usr/bin/env python3
"""Build a PAUSED Smartlead campaign from a NeverBounce-verified, Claude-personalized list.

This is the correct "send" leg (per the cold-email research): Smartlead owns delivery —
mailbox rotation, warmup, tracking, master inbox. This tool only STAGES the campaign
(create + add leads + save sequence) and leaves it PAUSED for a human to review the
sending mailboxes/schedule and press Start inside Smartlead. It never launches a live send.

    # preview payloads (no API calls):
    python3 tools/smartlead_push.py --list <verified.csv> --name "Brooklyn salons v1"

    # actually create the paused campaign in Smartlead:
    python3 tools/smartlead_push.py --list <verified.csv> --name "Brooklyn salons v1" --create

.env: SMARTLEAD_API_KEY. CSV columns used: to_email/email, owner_first_name, business_name,
subject, opener/personalization_opener (for the {{opener}} custom field).
"""
import argparse, csv, json, sys, os, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://server.smartlead.com/api/v1"

# the approved refined body, with Smartlead merge tags
SUBJECT = "quick question about {{business_name}}"
EMAIL_BODY = """<p>Hey{{first_name_sp}},</p>
<p>Saw your business online and wanted to reach out.</p>
<p>We built <b>Zinga App</b>, a booking platform independent service pros are using to move bookings off Instagram DMs. Your storefront shows your services, prices, and availability; clients book and pay in-app, and funds deposit straight to your bank.</p>
<p>We're offering new providers a free 60-day trial. Open to a quick 10-minute chat to see how it fits {{business_name}}?</p>
<p>You can also grab Zinga on <a href="https://apps.apple.com/us/app/zinga-app/id6740720049">iOS</a> or <a href="https://play.google.com/store/apps/details?id=com.zinga.app">Android</a>. Short brochure attached.</p>
<p>Best regards,<br>The Zinga Team · info@zingaapp.com · zingaapp.com</p>
<p style="color:#888;font-size:12px">Reply "unsubscribe" if not relevant. {{CAN_SPAM_ADDRESS}}</p>"""

def load_env():
    p = ROOT / ".env"; env = {}
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("="); env[k.strip()] = v.strip().strip("'\"")
    return env

def api(env, path, payload):
    key = env.get("SMARTLEAD_API_KEY")
    if not key:
        sys.exit("SMARTLEAD_API_KEY not set in .env")
    url = f"{BASE}{path}?api_key={urllib.parse.quote(key)}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def leads_from(path):
    out = []
    for row in csv.DictReader(Path(path).open(newline="")):
        email = (row.get("to_email") or row.get("email") or "").strip()
        if not email:
            continue
        out.append({
            "email": email,
            "first_name": (row.get("owner_first_name") or "").strip(),
            "last_name": (row.get("owner_last_name") or "").strip(),
            "company_name": (row.get("business_name") or "").strip(),
            "custom_fields": {"opener": (row.get("personalization_opener") or row.get("opener") or "").strip()},
        })
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--list", required=True, help="verified recipients CSV")
    ap.add_argument("--name", required=True, help="Smartlead campaign name")
    ap.add_argument("--create", action="store_true", help="actually create the PAUSED campaign via API")
    a = ap.parse_args()

    leads = leads_from(a.list)
    env = load_env()
    can_spam = env.get("CAN_SPAM_ADDRESS", "[CAN_SPAM_ADDRESS not set]")
    print(f"campaign: {a.name}\nleads: {len(leads)} (from {a.list})")
    print(f"subject: {SUBJECT}")
    print(f"CAN-SPAM footer: {can_spam}")
    for l in leads[:3]:
        print(f"  → {l['email']:<34} {l['company_name']}")
    if len(leads) > 3:
        print(f"  … +{len(leads)-3} more")

    if not a.create:
        print("\nDRY RUN — no API calls. Add --create to stage the PAUSED campaign in Smartlead.")
        print("Nothing is ever auto-started; you press Start in the Smartlead UI after reviewing mailboxes + schedule.")
        return

    if "not set" in can_spam:
        sys.exit("refusing: CAN_SPAM_ADDRESS not set in .env (required in the footer).")

    camp = api(env, "/campaigns/create", {"name": a.name})
    cid = camp.get("id") or camp.get("campaign_id")
    print(f"\ncreated campaign id={cid} (PAUSED)")
    api(env, f"/campaigns/{cid}/leads", {"lead_list": leads})
    print(f"added {len(leads)} leads")
    body = EMAIL_BODY.replace("{{CAN_SPAM_ADDRESS}}", can_spam)
    api(env, f"/campaigns/{cid}/sequences", {"sequences": [
        {"seq_number": 1, "seq_delay_details": {"delay_in_days": 0}, "subject": SUBJECT, "email_body": body}
    ]})
    print("saved sequence (step 1)")
    print("\nDONE — campaign is PAUSED. In Smartlead: attach warmed sending mailboxes,\n"
          "set the daily ramp, review, then press Start. This tool does not launch sends.")

if __name__ == "__main__":
    main()
