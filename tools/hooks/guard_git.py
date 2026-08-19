#!/usr/bin/env python3
"""PreToolUse hook: block `git commit`/`git push` that would leak secrets or PII into
the PUBLIC ZingaOS repo. Defense-in-depth over .gitignore (catches `git add -f` bypasses).

Blocks if the staged (commit) or outgoing (push) change:
  - touches a sensitive file path (providers.csv, .env, outreach/testimonial data, drafts)
  - contains a hard secret (API keys, private keys, SMTP/token = value)
  - adds a file with 3+ distinct external emails (a prospect list)

The business's own 1–2 contact emails in code are NOT flagged. Exit 2 blocks.
"""
import sys, json, os, re, subprocess

SENSITIVE_PATHS = [
    r"^\.env$", r"(^|/)\.env$",
    r"data/providers\.csv", r"data/outreach\.csv",
    r"data/social_log\.csv", r"data/whatsapp_log\.csv",
    r"runs/.*(outreach|smoke)", r"data/testimonials/(?!README)",
    r"brain/people/(?!_)", r"brain/companies/(?!\.)",
]
SECRETS = [
    (r"sk-ant-api03-[A-Za-z0-9_\-]{20,}", "Anthropic API key"),
    (r"AKIA[0-9A-Z]{16}", "AWS access key"),
    (r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----", "private key"),
    (r"(SMTP_PASSWORD|WHATSAPP_TOKEN|META_ACCESS_TOKEN|APIFY_TOKEN|SMARTLEAD_API_KEY|HUBSPOT_TOKEN)\s*=\s*\S+", "credential value"),
]
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.(?:com|net|org|io|co)\b")

def git(root, args):
    try:
        return subprocess.run(["git"] + args, cwd=root, capture_output=True, text=True, timeout=25).stdout
    except Exception:
        return ""

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    cmd = ((data.get("tool_input") or {}).get("command") or "")
    if not re.search(r"\bgit\s+(commit|push)\b", cmd):
        sys.exit(0)
    root = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    pushing = bool(re.search(r"\bgit\s+push\b", cmd))

    names = git(root, ["log", "--branches", "--not", "--remotes", "--name-only", "--pretty=format:"]) if pushing \
        else git(root, ["diff", "--cached", "--name-only"])
    content = git(root, ["log", "--branches", "--not", "--remotes", "-p", "--pretty=format:"]) if pushing \
        else git(root, ["diff", "--cached"])

    reasons = []
    for line in [n.strip() for n in names.splitlines() if n.strip()]:
        for pat in SENSITIVE_PATHS:
            if re.search(pat, line):
                reasons.append(f"sensitive file: {line}")
                break
    for pat, label in SECRETS:
        if re.search(pat, content):
            reasons.append(f"secret in diff: {label}")
    # prospect-list heuristic: many distinct emails in the added content
    added = "\n".join(l[1:] for l in content.splitlines() if l.startswith("+") and not l.startswith("+++"))
    if len(set(EMAIL.findall(added))) >= 3:
        reasons.append("3+ distinct emails added (looks like a prospect list)")

    if reasons:
        sys.stderr.write(
            "BLOCKED by guard_git hook — refusing this " + ("push" if pushing else "commit") +
            " to the PUBLIC ZingaOS repo:\n  - " + "\n  - ".join(sorted(set(reasons))) +
            "\nRemove/gitignore the offending content and retry. Nothing was committed/pushed.\n"
        )
        sys.exit(2)
    sys.exit(0)

main()
