# zinga-os

The file-based operating system for Zinga.

    context/      small, hand-curated, always read
    brain/        large, searchable, queried on demand (gbrain vault)
    data/         state: pipeline, outreach log, metrics, testimonials
    tools/        scripts (outreach_mailer.py lives here)
    .claude/      skills, agents, commands, permissions
    automations/  n8n workflows + the schedule table
    runs/         dated append-only logs of what ran
    inbox/        raw capture, triaged weekly
    archive/      dead strategies, kept for the record

## Setup

    cp .env.example .env        # fill in, never commit
    git init && git add . && git commit -m "zinga-os v0"

Optional knowledge layer:

    bun install -g github:garrytan/gbrain    # NOT the npm package
    gbrain init --pglite
    gbrain import ./brain/
    claude mcp add gbrain -- gbrain serve --surface verbs

## The one habit that makes this work

After any meaningful call, decision, or provider conversation, drop a file in
`inbox/`. Two lines is fine. Triage weekly into `brain/`. A system nobody feeds
is just folders.
# ZingaOS
