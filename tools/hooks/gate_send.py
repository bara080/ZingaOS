#!/usr/bin/env python3
"""PreToolUse hook: block real sends/publishes unless a human left a one-shot approval.

Fires on Bash commands that invoke a send/publish surface
(smtp_send / outreach_mailer / social_publish / whatsapp_send with --send/--publish).
Allows the call only if `.send-approved` exists in the project root — then consumes it
(one approval == one send). Every attempt is logged to runs/send-audit.log.

Wired from .claude/settings.json → hooks.PreToolUse (matcher: Bash). Exit 2 blocks.
"""
import sys, json, os, re, datetime

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # not our concern
    cmd = ((data.get("tool_input") or {}).get("command") or "")

    is_sender = re.search(r"(smtp_send|outreach_mailer|social_publish|whatsapp_send)\.py", cmd)
    is_live = re.search(r"--(send|publish)\b", cmd)
    if not (is_sender and is_live):
        sys.exit(0)  # not a live send — allow

    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    marker = os.path.join(root, ".send-approved")
    audit = os.path.join(root, "runs", "send-audit.log")
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    approved = os.path.exists(marker)
    try:
        os.makedirs(os.path.dirname(audit), exist_ok=True)
        with open(audit, "a") as f:
            f.write(f"{ts}\t{'APPROVED' if approved else 'BLOCKED'}\t{cmd}\n")
    except Exception:
        pass

    if approved:
        try:
            os.remove(marker)  # one-shot: each send needs a fresh approval
        except Exception:
            pass
        sys.exit(0)

    sys.stderr.write(
        "BLOCKED by gate_send hook — this is a REAL send/publish (draft-first rule).\n"
        "A human must approve THIS one send by running:\n"
        f"    touch {marker}\n"
        "then retry. Approval is one-shot (consumed per send) and every attempt is\n"
        "logged to runs/send-audit.log.\n"
    )
    sys.exit(2)

main()
