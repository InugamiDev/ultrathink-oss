# Install — Cursor

Rules-only integration. Cursor reads project rules from `.cursor/rules/*.mdc` files.

## What Works

- Project conventions and coding standards
- Skill awareness (read SKILL.md files when referenced)
- Dashboard (standalone web UI)

## What Doesn't Work

- Hooks (no lifecycle events in Cursor)
- Auto-trigger (no prompt interception)
- Persistent memory (no session API)
- Privacy guard (no pre-tool hooks)
- Statusline

## Setup

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh

# Generate Cursor rule files
./scripts/sync-editors.sh --cursor
```

This creates `.cursor/rules/` with:
- `ultrathink.mdc` — Project conventions, skill lookup table
- `quality.mdc` — Code standards (TS, React, SQL)
- `privacy.mdc` — Sensitive file patterns to avoid

## Manual Skill Use

Cursor can't auto-trigger skills, but you can reference them:

```
Read .claude/skills/react/SKILL.md and follow its workflow
```

Or paste skill content into your prompt context.

## Dashboard

The dashboard works independently:

```bash
cd ~/ultrathink && npm run dashboard:dev
# → http://localhost:3333
```
