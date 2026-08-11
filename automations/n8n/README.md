# n8n

Workflows live on the host; their JSON lives here. Export after every change or
this folder becomes a lie.

## Shape of every workflow

    [trigger] → [Execute Command] → [log + notify]

The Execute Command node:

    cd /Users/bara080/bara/zinga-os && claude -p "/outreach-run 20 queens" \
      --allowedTools "Read,Write,Edit,Bash(python3 tools/outreach_mailer.py)" \
      --permission-mode acceptEdits \
      --output-format json \
      --max-turns 25 --max-budget-usd 5.00 \
      >> "runs/$(date +%F)-outreach.json"

## Do not add `--bare`

It was in this file until 2026-08-10 and it silently broke every run.
`--bare` skips project config discovery, so `.claude/commands/` and
`.claude/skills/` are never loaded — `/outreach-run` resolves to nothing and
the process exits in 11ms with `"result":"Unknown command: /outreach-run"` and
`num_turns: 0`. Two dead runs are recorded in `runs/2026-08-10-outreach.json`.

`--setting-sources project` does **not** rescue it; the flag has to go.
`--bare` also reads auth strictly from `ANTHROPIC_API_KEY` and never from the
keychain, so it breaks `claude setup-token` auth as well.

## This workspace must be trusted first

Headless runs print:

    Ignoring 11 permissions.allow entries from .claude/settings.json:
    this workspace has not been trusted.

The entire allowlist in `.claude/settings.json` is discarded, so an automated
run cannot write to `runs/` or `data/`. Fix once, on the host that runs the
cron:

    cd /Users/bara080/bara/zinga-os && claude    # accept the trust dialog, then quit

## Before you rely on this

- n8n Cloud cannot execute commands on a laptop, and a sleeping Mac misses
  every cron. Put n8n and this repo on the same always-on host, or reach the
  host over Tailscale with the SSH node.
- Auth: `claude setup-token` for a long-lived token, or `ANTHROPIC_API_KEY`.
  Store it in n8n credentials — never in this repo.
- Branch on non-zero exit and notify yourself. A silent failed run is worse
  than no automation.
- **A dead run still exits 0.** Both failed runs above returned
  `"is_error": false`. Exit code alone will not catch this. Branch on
  `num_turns == 0` or `result` starting with `Unknown command` as well.
- Budget was `--max-budget-usd 1.00`; raised to `5.00`. Loading this repo's
  context alone costs ~$0.35 before the first useful turn, so $1.00 would
  abort a 20-provider batch partway through and bank a truncated draft set.
