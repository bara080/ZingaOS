#!/bin/bash
# Zinga OS — nightly: refresh the PII-free public snapshot from the local data layer,
# then redeploy zinga-os-web to Vercel. Local data (CSV + SQLite) never leaves the host.
# Scheduled by ~/Library/LaunchAgents/com.zinga.snapshot.plist (launchd).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
OS="/Users/bara080/bara/zinga-os"
WEB="$OS/web"   # web/ now lives inside the repo (was external zinga-os-web)
LOG="$OS/runs/nightly-snapshot.log"
{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') nightly snapshot ==="
  cd "$OS"  && python3 tools/export_snapshot.py
  cd "$WEB" && vercel deploy --prod --yes --scope zinga 2>&1 | tail -2
  echo "--- done ---"
} >> "$LOG" 2>&1
