# Self-hosted n8n with the Claude Code CLI baked in, so the Execute Command
# node can run `claude -p ...` against the mounted Zinga OS repo directly.
FROM n8nio/n8n:latest

USER root

# Claude Code CLI + git (for the agent) on the Alpine base image.
RUN apk add --no-cache git python3 py3-pip \
    && npm install -g @anthropic-ai/claude-code

USER node
