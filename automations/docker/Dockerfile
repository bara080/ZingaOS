# Zinga OS worker image — runs `claude -p` against the mounted /repo.
#
# n8n's own image is now a Docker Hardened Image (no package manager), so the agent
# runtime lives HERE on a normal Node/Debian base instead of being baked into n8n.
# n8n orchestrates; this worker executes. (finalArchitecture.md: decoupled planes.)
FROM node:22-bookworm-slim

# git (worktrees + repo ops) + python3 (Zinga tools) + the Claude Code CLI.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         git python3 python3-pip ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @anthropic-ai/claude-code

# Run as non-root; home holds the persisted Claude auth (claude_home volume).
RUN useradd -m worker
USER worker
WORKDIR /repo
