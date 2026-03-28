# Install — Windsurf

Rules-only integration via `.windsurf/rules/ultrathink.md`.

## What Works

- Project conventions and coding standards
- Cascade can read skill files from context
- Dashboard (standalone web UI)

## What Doesn't Work

- Hooks, auto-trigger, memory, privacy guard, statusline

## Setup

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/sync-editors.sh --windsurf
```

This creates `.windsurf/rules/ultrathink.md` with project conventions and a skill reference table.

## Manual Skill Use

```
Read .claude/skills/debug/SKILL.md and follow its workflow for this bug
```

## Dashboard

```bash
cd ~/ultrathink && npm run dashboard:dev
# → http://localhost:3333
```
