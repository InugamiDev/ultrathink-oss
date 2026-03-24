# CLI Commands

All commands available for working with UltraThink from the terminal.

## Setup

```bash
# Full project setup (deps, .env, migrations, dashboard build)
./scripts/setup.sh

# Install into ~/.claude/ globally (hooks, skills, agents)
./scripts/init-global.sh

# Remove from ~/.claude/
./scripts/init-global.sh --uninstall
```

## Database

```bash
# Run all pending migrations
npm run migrate

# Populate sample data
npm run seed

# Run compaction on low-importance memories
npm run compact
```

## Dashboard

```bash
# Start dev server (port 3333, hot reload)
npm run dashboard:dev

# Production build
npm run dashboard:build

# Start production server
cd dashboard && npm run start
```

## Memory

All memory commands go through the CLI runner:

```bash
# Search memories
npx tsx memory/scripts/memory-runner.ts search "authentication pattern"

# Save a memory
npx tsx memory/scripts/memory-runner.ts save "content" "category" importance

# Flush pending memories to database
npx tsx memory/scripts/memory-runner.ts flush

# Start a session (recalls memories)
npx tsx memory/scripts/memory-runner.ts session-start

# Run compaction
npx tsx memory/scripts/memory-runner.ts compact
```

## Quality

```bash
# ESLint
npm run lint

# Prettier
npm run format

# Prettier check (no write)
npm run format:check

# TypeScript validation
npm run typecheck

# Vitest test suite
npm run test
```

## Hooks

```bash
# Validate shell syntax of a hook
bash -n .claude/hooks/your-hook.sh

# Test privacy hook manually
.claude/hooks/privacy-hook.sh /path/to/file
echo $?   # 0 = allowed, 1 = blocked

# Send a test notification
.claude/hooks/notify.sh "Test message" telegram normal

# Rebuild prompt-analyzer TypeScript
cd .claude/hooks && npx tsc
```

## Health Checks

```bash
# Dashboard health API
curl http://localhost:3333/api/health

# View recent hook events
tail -20 reports/hook-events.jsonl | jq .

# Check memory stats
npx tsx memory/scripts/memory-runner.ts stats
```
