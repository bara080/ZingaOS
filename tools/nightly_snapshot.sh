#!/bin/bash
# Zinga OS — nightly: refresh the PII-free public snapshot from the local data layer,
# then redeploy zinga-os-web to Vercel. Local data (CSV + SQLite) never leaves the host.
# Scheduled by ~/Library/LaunchAgents/com.zinga.snapshot.plist (launchd).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
OS="/Users/bara080/bara/zinga-os"
# The zinga-os-web Vercel project now serves the auth-gated app/ and auto-deploys on
# push to main (Root Directory = app). So the nightly job refreshes the snapshot and
# lets GIT trigger the deploy — commit the PII-free snapshot and push. No CLI deploy
# (that would break now that rootDirectory=app). Local CSV/SQLite never leaves the host.
LOG="$OS/runs/nightly-snapshot.log"
{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') nightly snapshot ==="
  cd "$OS" && python3 tools/export_snapshot.py
  cd "$OS" && git add app/public/console/data/snapshot.json web/data/snapshot.json
  if git diff --cached --quiet; then
    echo "snapshot unchanged — nothing to deploy"
  else
    git commit -m "nightly: refresh public snapshot $(date '+%Y-%m-%d')" --quiet \
      && git push --quiet 2>&1 | tail -2 \
      && echo "pushed — Vercel will auto-build app/ from main"
  fi
  echo "--- done ---"
} >> "$LOG" 2>&1
