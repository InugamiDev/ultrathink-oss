# Contributing

Thanks for your interest in contributing to UltraThink! This guide covers development setup, contribution areas, and the process for skills, hooks, and migrations.

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Neon Postgres database (free tier: [neon.tech](https://neon.tech))
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

### Setup

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink

# Full setup (deps + migrations + dashboard)
./scripts/setup.sh

# Or step by step:
npm install
cd dashboard && npm install && cd ..
cd memory && npm install && cd ..
cp .env.example .env   # Edit with your DATABASE_URL
npm run migrate
```

### Running Tests

```bash
npm run test          # Vitest suite
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run typecheck     # TypeScript validation
```

## How to Contribute

### Good First Issues

- Add a new skill for a framework/tool you use
- Improve dashboard UI (pages, charts, accessibility)
- Add tests for hooks or memory operations
- Fix typos in docs or skill definitions
- Add a new notification channel

### Areas We Need Help

- **SQLite fallback** -- Local-only mode without Neon
- **Dashboard SSE/WebSocket** -- Real-time event streaming
- **Community skills** -- Domain skills for popular frameworks
- **Performance** -- Hook latency optimization
- **i18n** -- Dashboard internationalization

## Creating a Skill

1. Create directory: `mkdir -p .claude/skills/my-skill`
2. Write `SKILL.md` with YAML frontmatter and Markdown body
3. Register in `_registry.json` with triggers and links
4. Verify bidirectional links with connected skills
5. Test the trigger in a Claude Code session

See the [Create a Skill](/guides/create-skill) guide for full details.

## Creating a Hook

1. Write a shell script following the hook template
2. Make it executable: `chmod +x .claude/hooks/your-hook.sh`
3. Register in `~/.claude/settings.json` under the appropriate event
4. Test manually by piping JSON to stdin

See the [Create a Hook](/guides/create-hook) guide for full details.

## Database Migrations

Migrations live in `memory/migrations/` and are numbered sequentially.

### Creating a migration

```bash
touch memory/migrations/013_your_change.sql
```

### Migration format

```sql
-- Migration 013: Description
-- Date: YYYY-MM-DD

CREATE TABLE IF NOT EXISTS your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_your_table_name ON your_table(name);
```

### Rules

- Always use `IF NOT EXISTS` for idempotency
- Never drop columns or tables (deprecate first)
- Add indexes for columns used in WHERE/JOIN/ORDER BY
- Use `UUID` for primary keys, `TIMESTAMPTZ` for dates
- Keep migrations small and focused

### Running

```bash
npm run migrate
```

## Project Structure

| Directory | What | Language |
|-----------|------|---------|
| `memory/src/` | Core memory system | TypeScript |
| `memory/scripts/` | CLI tools and migration runner | TypeScript |
| `memory/migrations/` | Database schema | SQL |
| `dashboard/` | Next.js 15 observability UI | TypeScript/React |
| `.claude/hooks/` | Lifecycle hooks | Bash + TypeScript |
| `.claude/skills/` | Skill definitions | Markdown |
| `.claude/agents/` | Agent definitions | Markdown |
| `scripts/` | Setup and utility scripts | Bash |
| `tests/` | Test suite | TypeScript |
