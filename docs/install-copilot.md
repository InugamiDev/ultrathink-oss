# Install — GitHub Copilot

Minimal integration via `.github/copilot-instructions.md`.

## What Works

- Basic project rules and conventions
- Dashboard (standalone web UI)

## What Doesn't Work

- Hooks, auto-trigger, memory, privacy, statusline
- Copilot can't read files during conversation — skills must be inlined

## Setup

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/sync-editors.sh --copilot
```

This creates `.github/copilot-instructions.md` with inlined project conventions.

## Dashboard

```bash
cd ~/ultrathink && npm run dashboard:dev
```
