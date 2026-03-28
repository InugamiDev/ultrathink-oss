# Install — Antigravity (Google Gemini)

Rules-only integration via `GEMINI.md` at project root.

## What Works

- Project conventions and coding standards
- Skill lookup table in GEMINI.md
- Dashboard (standalone web UI)

## What Doesn't Work

- Hooks, auto-trigger, memory, privacy, statusline

## Setup

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/sync-editors.sh --antigravity
```

This creates `GEMINI.md` with project rules and a skill reference table.

## Dashboard

```bash
cd ~/ultrathink && npm run dashboard:dev
```
