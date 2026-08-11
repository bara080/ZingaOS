#!/usr/bin/env python3
"""Render outreach drafts to per-recipient emails. Draft-only unless --send.

Reads the .md drafts an outreach run wrote to runs/<date>-outreach/, pairs each
with its provider row in data/providers.csv, and prints what would be sent.
Sending is opt-in via --send and appends a row to data/outreach.csv per message.

    python3 tools/outreach_mailer.py --run runs/2026-08-10-outreach
    python3 tools/outreach_mailer.py --run runs/2026-08-10-outreach --send

Draft file format — front matter, blank line, then the body:

    provider_id: p_014
    to: someone@example.com
    subject: Quick question about your Saturday slots

    Body text here.
"""

import argparse
import csv
import os
import smtplib
import sys
from datetime import date
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROVIDERS = ROOT / "data" / "providers.csv"
OUTREACH_LOG = ROOT / "data" / "outreach.csv"

REQUIRED_HEADERS = ("provider_id", "to", "subject")


def load_env():
    """Read .env into a dict. Never printed, never committed."""
    env_path = ROOT / ".env"
    if not env_path.exists():
        return {}
    env = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip("'\"")
    return env


def parse_draft(path):
    """Split a draft .md into (headers, body). Raises ValueError if malformed."""
    raw = path.read_text()
    head, sep, body = raw.partition("\n\n")
    if not sep:
        raise ValueError(f"{path.name}: no blank line separating headers from body")

    headers = {}
    for line in head.splitlines():
        if ":" not in line:
            raise ValueError(f"{path.name}: header line without a colon: {line!r}")
        key, _, value = line.partition(":")
        headers[key.strip()] = value.strip()

    missing = [h for h in REQUIRED_HEADERS if not headers.get(h)]
    if missing:
        raise ValueError(f"{path.name}: missing header(s): {', '.join(missing)}")
    if not body.strip():
        raise ValueError(f"{path.name}: empty body")

    return headers, body.strip()


def provider_names():
    if not PROVIDERS.exists():
        return {}
    with PROVIDERS.open() as fh:
        return {row["id"]: row.get("name", "") for row in csv.DictReader(fh) if row.get("id")}


def log_send(headers, template, replied=""):
    """Append one row per send. Creates the header row if the file is absent."""
    fields = [
        "date", "provider_id", "channel", "template",
        "subject", "sent_by", "replied", "reply_summary",
    ]
    exists = OUTREACH_LOG.exists() and OUTREACH_LOG.stat().st_size > 0
    with OUTREACH_LOG.open("a", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        if not exists:
            writer.writeheader()
        writer.writerow({
            "date": date.today().isoformat(),
            "provider_id": headers["provider_id"],
            "channel": "email",
            "template": template,
            "subject": headers["subject"],
            "sent_by": "outreach_mailer.py",
            "replied": replied,
            "reply_summary": "",
        })


def send(messages, env):
    host = env.get("SMTP_HOST")
    user = env.get("SMTP_USER")
    password = env.get("SMTP_PASSWORD")
    sender = env.get("OUTREACH_FROM", user)
    port = int(env.get("SMTP_PORT", "587"))

    missing = [k for k, v in
               (("SMTP_HOST", host), ("SMTP_USER", user), ("SMTP_PASSWORD", password))
               if not v]
    if missing:
        sys.exit(f"refusing to send: {', '.join(missing)} not set in .env")

    with smtplib.SMTP(host, port) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        for headers, body, path in messages:
            msg = EmailMessage()
            msg["From"] = sender
            msg["To"] = headers["to"]
            msg["Subject"] = headers["subject"]
            msg.set_content(body)
            smtp.send_message(msg)
            log_send(headers, template=path.stem)
            print(f"sent    {headers['provider_id']:<8} {headers['to']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", required=True,
                        help="directory of drafts, e.g. runs/2026-08-10-outreach")
    parser.add_argument("--send", action="store_true",
                        help="actually send. Requires session approval. Default is draft-only.")
    args = parser.parse_args()

    run_dir = Path(args.run)
    if not run_dir.is_absolute():
        run_dir = ROOT / run_dir
    if not run_dir.is_dir():
        sys.exit(f"no such run directory: {run_dir}")

    drafts = sorted(run_dir.glob("*.md"))
    if not drafts:
        sys.exit(f"no .md drafts in {run_dir}")

    names = provider_names()
    messages, errors = [], []
    for path in drafts:
        try:
            headers, body = parse_draft(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if headers["provider_id"] not in names:
            errors.append(f"{path.name}: provider_id {headers['provider_id']} not in providers.csv")
            continue
        messages.append((headers, body, path))

    for err in errors:
        print(f"SKIP    {err}", file=sys.stderr)

    if not messages:
        sys.exit("nothing valid to send")

    if not args.send:
        print(f"DRAFT ONLY — {len(messages)} message(s), nothing sent.\n")
        for headers, body, path in messages:
            who = names.get(headers["provider_id"], "?")
            print(f"--- {path.name} → {who} <{headers['to']}>")
            print(f"    subject: {headers['subject']}")
            for line in body.splitlines():
                print(f"    {line}")
            print()
        print("Re-run with --send after explicit approval.")
        return

    if os.environ.get("OUTREACH_APPROVED") != "yes":
        sys.exit("refusing to send: --send requires OUTREACH_APPROVED=yes in the "
                 "environment, set only after a human approves this batch.")

    send(messages, load_env())
    print(f"\n{len(messages)} sent, logged to data/outreach.csv")


if __name__ == "__main__":
    main()
