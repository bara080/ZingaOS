#!/usr/bin/env python3
"""Send the approved Zinga cold email through any SMTP relay (SMTP.com, Gmail
Workspace, etc.) with the brochure PDF attached and the refined campaign copy.
not a plain-text placeholder.

Draft-first + double-gated: previews by default; sends only with --send AND
OUTREACH_APPROVED=yes in the env. Rate-limited to protect domain reputation.
CAN-SPAM: refuses to send to real prospects unless CAN_SPAM_ADDRESS is set.

    # preview the first 5 (no send, no network):
    python3 tools/gmail_sender.py --list <csv> --limit 5

    # send ONE self-test to your own inbox:
    python3 tools/gmail_sender.py --to bara@zingaapp.com --self-test --send

    # send the approved 50, spaced 90s apart:
    OUTREACH_APPROVED=yes python3 tools/gmail_sender.py --list <csv> --send --delay 90

.env keys: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (App Password),
OUTREACH_FROM, CAN_SPAM_ADDRESS. Attachment defaults to ~/Downloads/How Zinga works.pdf.
"""
import argparse, csv, os, sys, time, smtplib, mimetypes
from datetime import date
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "data" / "outreach.csv"
DEFAULT_PDF = ROOT / "assets" / "how-zinga-works.pdf"
IOS = "https://apps.apple.com/us/app/zinga-app/id6740720049"
ANDROID = "https://play.google.com/store/apps/details?id=com.zinga.app"

# The refined, approved copy (from the sent screenshots) — one clean template for all.
BODY_TEXT = """Hey,

Saw your business online and wanted to reach out.

We built Zinga App, a booking platform for independent service pros to take
bookings off Instagram DMs. The idea is simple: your storefront on
Zinga shows your services, prices, and availability. Clients can book and pay
directly through the app, and funds are deposited straight to your bank account.

We're currently offering new providers a free 60-day trial.

Would you be open to a quick 10-minute conversation to see how it could work for
your business specifically?

You can also download Zinga today on iOS ({ios}) or Android ({android}).

I've attached a short brochure that walks through how Zinga works and the benefits
for your business.

{sig}
{footer}"""

BODY_HTML = """<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">
<p>Hey,</p>
<p>Saw your business online and wanted to reach out.</p>
<p>We built <b>Zinga App</b>, a booking platform for independent service pros to take bookings off Instagram DMs. The idea is simple: your storefront on Zinga shows your services, prices, and availability. Clients can book and pay directly through the app, and funds are deposited straight to your bank account.</p>
<p>We're currently offering new providers a <b>free 60-day trial</b>.</p>
<p>Would you be open to a quick 10-minute conversation to see how it could work for your business specifically?</p>
<p>You can also download Zinga today on <a href="{ios}">iOS</a> or <a href="{android}">Android</a>.</p>
<p>I've attached a short brochure that walks through how Zinga works and the benefits for your business.</p>
<p>{sig_html}</p>
<p style="color:#888;font-size:12px">{footer}</p>
</div>"""

def load_env():
    p = ROOT / ".env"; env = {}
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("="); env[k.strip()] = v.strip().strip("'\"")
    return env

def signatures(sender):
    if "bara@" in sender:
        text = "Best,\n\nBara Ahmad\nCo-Founder & CEO, Zinga App\nbara@zingaapp.com · zingaapp.com"
        html = "Best,<br><br><b>Bara Ahmad</b><br>Co-Founder &amp; CEO, Zinga App<br>bara@zingaapp.com · zingaapp.com"
    else:
        text = "Best regards,\nThe Zinga Team\nCustomer Support\ninfo@zingaapp.com · zingaapp.com"
        html = "Best regards,<br>The Zinga Team<br>Customer Support<br>info@zingaapp.com · zingaapp.com"
    return text, html

def build(to_addr, subject, sender, footer, pdf):
    sig_t, sig_h = signatures(sender)
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.set_content(BODY_TEXT.format(ios=IOS, android=ANDROID, sig=sig_t, footer=footer))
    msg.add_alternative(BODY_HTML.format(ios=IOS, android=ANDROID, sig_html=sig_h, footer=footer), subtype="html")
    if pdf and pdf.exists():
        ctype, _ = mimetypes.guess_type(str(pdf))
        maintype, subtype = (ctype or "application/pdf").split("/", 1)
        msg.add_attachment(pdf.read_bytes(), maintype=maintype, subtype=subtype, filename=pdf.name)
    return msg

def log(to_addr, subject, status, err=""):
    fields = ["date", "provider_id", "channel", "template", "subject", "sent_by", "replied", "reply_summary"]
    exists = LOG.exists() and LOG.stat().st_size > 0
    with LOG.open("a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        if not exists: w.writeheader()
        w.writerow({"date": date.today().isoformat(), "provider_id": to_addr, "channel": "email",
                    "template": "salon_v1_day0_refined", "subject": subject,
                    "sent_by": "gmail_sender.py", "replied": status, "reply_summary": err})

def recipients(args):
    if args.to:
        yield {"to_email": args.to, "subject": args.subject or "quick question about your salon", "business_name": "self-test"}
        return
    with Path(args.list).open(newline="") as fh:
        for row in csv.DictReader(fh):
            to = (row.get("to_email") or row.get("email") or "").strip()
            if not to: continue
            yield {"to_email": to, "subject": (row.get("subject") or args.subject or "quick question about your salon").strip(),
                   "business_name": (row.get("business_name") or "").strip()}

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--list", help="recipients CSV (uses to_email + subject columns)")
    ap.add_argument("--to", help="single recipient (for --self-test)")
    ap.add_argument("--self-test", action="store_true", help="skip CAN-SPAM requirement for a self-send")
    ap.add_argument("--subject", help="override subject")
    ap.add_argument("--attach", default=str(DEFAULT_PDF), help="brochure PDF path")
    ap.add_argument("--limit", type=int, default=0, help="cap number of sends (0 = all)")
    ap.add_argument("--delay", type=float, default=90, help="seconds between sends")
    ap.add_argument("--send", action="store_true", help="actually send (needs OUTREACH_APPROVED=yes)")
    ap.add_argument("--control", help="control file (run|pause|stop) checked before each send")
    args = ap.parse_args()
    if not args.list and not args.to:
        sys.exit("give --list <csv> or --to <addr>")

    env = load_env()
    sender = env.get("OUTREACH_FROM") or env.get("SMTP_USER") or ""
    BUSINESS_DOMAIN = "@zingaapp.com"
    sender_ok = sender.lower().endswith(BUSINESS_DOMAIN)
    if not sender_ok:
        print(f"!! SENDER NOT BUSINESS: '{sender or '(unset)'}' — must end with {BUSINESS_DOMAIN} "
              f"(info@ or bara@). Fix OUTREACH_FROM in .env.\n")
    pdf = Path(args.attach).expanduser()
    footer = f'Reply "unsubscribe" if not relevant. Zinga · {env.get("CAN_SPAM_ADDRESS", "[address not set]")}'

    rows = list(recipients(args))
    if args.limit: rows = rows[:args.limit]

    print(f"sender: {sender or '(unset)'}   attach: {pdf.name if pdf.exists() else 'MISSING: '+str(pdf)}")
    print(f"recipients: {len(rows)}   footer: {footer}\n")
    for r in rows[:5]:
        print(f"  → {r['to_email']:<34} | {r['subject']}")
    if len(rows) > 5: print(f"  … +{len(rows)-5} more")

    if not args.send:
        print("\nDRY RUN — nothing sent. Add --send (and OUTREACH_APPROVED=yes) to go live.")
        return

    # gates
    if not sender_ok:
        sys.exit(f"refusing: sender must be a {BUSINESS_DOMAIN} address (info@ or bara@), never a personal inbox. Got '{sender or '(unset)'}'.")
    if os.environ.get("OUTREACH_APPROVED") != "yes":
        sys.exit("refusing: set OUTREACH_APPROVED=yes to send (per-batch human approval).")
    for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        if not env.get(k): sys.exit(f"refusing: {k} not set in .env")
    if not args.self_test and (not env.get("CAN_SPAM_ADDRESS")):
        sys.exit("refusing: CAN_SPAM_ADDRESS not set — required in the footer for real prospects.")
    if not pdf.exists():
        sys.exit(f"refusing: attachment not found: {pdf}")

    host, port = env["SMTP_HOST"], int(env.get("SMTP_PORT", "587"))
    sent = 0
    with smtplib.SMTP(host, port) as s:
        s.starttls(); s.login(env["SMTP_USER"], env["SMTP_PASSWORD"])
        ctrl = Path(args.control) if args.control else None
        for i, r in enumerate(rows):
            if ctrl:
                while ctrl.exists() and ctrl.read_text().strip() == "pause":
                    time.sleep(2)
                if ctrl.exists() and ctrl.read_text().strip() == "stop":
                    print(f"\nSTOPPED by operator after {sent} sent."); break
            try:
                s.send_message(build(r["to_email"], r["subject"], sender, footer, pdf))
                print(f"sent  {r['to_email']}")
                log(r["to_email"], r["subject"], "sent"); sent += 1
            except Exception as e:
                print(f"FAIL  {r['to_email']}: {e}")
                log(r["to_email"], r["subject"], "failed", str(e))
            if i < len(rows) - 1:
                time.sleep(args.delay)
    print(f"\n{sent}/{len(rows)} sent, logged to data/outreach.csv")

if __name__ == "__main__":
    main()
