# Self-hosted n8n runner (recommended)

One always-on host runs n8n **and** the repo together, so the Execute Command
node runs `claude -p` directly — no SSH, no n8n Cloud round-trip, secrets never
leave the box.

## Why not the alternatives

- **Vercel** — serverless, stateless, no filesystem, short runtime. It hosts the
  static dashboard (`web/`) only. It cannot run the agent pipeline.
- **n8n Cloud + SSH** — works (`../n8n/workflows/ig-lead-scrape-ssh.json`) but you
  still need an always-on host for it to SSH into, plus a private key in n8n
  credentials. If you have that host, self-hosting n8n on it (below) is simpler.

## Run it

```bash
cd automations/docker
cp .env.example .env      # fill in ANTHROPIC_API_KEY, APIFY_TOKEN, META_*
docker compose up -d --build
# open http://<host>:5678, import ../n8n/workflows/ig-lead-scrape.json
```

## One edit after import

The workflow JSON targets the Mac path `/Users/bara080/bara/zinga-os`. Inside the
container the repo is mounted at **`/repo`** — change the Execute Command `cwd`
(and the `cd` in the command) to `/repo`.

## First-run auth + trust

```bash
docker exec -it zinga-n8n sh
cd /repo && claude            # accept the trust dialog once, then quit
# (or `claude setup-token` for a long-lived token; persisted in the claude_home volume)
```

Trust matters: an untrusted workspace discards `.claude/settings.json` and the
run can't write to `runs/` or `data/` (see `../n8n/README.md`).
