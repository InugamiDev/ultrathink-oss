# Contributing to UltraThink

Thanks for your interest in contributing to UltraThink! This guide covers everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Creating a Skill](#creating-a-skill)
- [Creating a Hook](#creating-a-hook)
- [Database Migrations](#database-migrations)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A Neon Postgres database (free tier: [neon.tech](https://neon.tech))
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

### Running tests

```bash
npm run test          # Vitest suite
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run typecheck     # TypeScript validation
```

---

## Project Structure

| Directory | What | Language |
|-----------|------|---------|
| `memory/src/` | Core memory system (CRUD, search, enrichment) | TypeScript |
| `memory/scripts/` | CLI tools and migration runner | TypeScript |
| `memory/migrations/` | Database schema (numbered SQL files) | SQL |
| `dashboard/` | Next.js 15 observability UI | TypeScript/React |
| `.claude/hooks/` | Claude Code lifecycle hooks | Bash + TypeScript |
| `.claude/skills/` | Skill definitions with triggers | Markdown |
| `.claude/agents/` | Specialized agent definitions | Markdown |
| `.claude/references/` | Behavioral rules (loaded on demand) | Markdown |
| `scripts/` | Setup and utility scripts | Bash |
| `tests/` | Test suite | TypeScript |
| `docs/` | Documentation | Markdown |

---

## How to Contribute

### Good first issues

- Add a new skill for a framework/tool you use
- Improve dashboard UI (pages, charts, accessibility)
- Add tests for hooks or memory operations
- Fix typos in docs or skill definitions
- Add a new notification channel (email, Telegram, etc.)

### Areas we need help

- **SQLite fallback** — Local-only mode without Neon
- **Dashboard SSE/WebSocket** — Real-time event streaming
- **Community skills** — Domain skills for popular frameworks
- **Performance** — Hook latency optimization
- **i18n** — Dashboard internationalization

---

## Creating a Skill

Skills are the core unit of UltraThink's intelligence. Each skill is a Markdown file that tells Claude how to handle a specific domain.

### Step 1: Create the skill directory and file

```bash
mkdir -p .claude/skills/my-skill
```

### Step 2: Write `SKILL.md`

```markdown
# my-skill

> One-line description of what this skill does.

## When to use

- Trigger condition 1
- Trigger condition 2

## Workflow

1. Step one
2. Step two
3. Step three

## Rules

- Rule 1
- Rule 2

## Examples

### Example: [scenario name]

[Show input → output pattern]
```

### Step 3: Register in `_registry.json`

```json
{
  "my-skill": {
    "layer": "domain",
    "category": "your-category",
    "description": "What this skill does",
    "triggers": ["keyword1", "keyword2", "keyword3"],
    "linksTo": ["related-skill-1", "related-skill-2"],
    "path": ".claude/skills/my-skill"
  }
}
```

### Layer guide

| Layer | Purpose | Example |
|-------|---------|---------|
| `orchestrator` | Multi-step workflows that coordinate other skills | `gsd`, `plan` |
| `hub` | Domain coordinators that route to domain skills | `react`, `debug` |
| `utility` | Focused single-purpose tools | `refactor`, `fix` |
| `domain` | Specific technology or framework knowledge | `nextjs`, `stripe` |

### Trigger tips

- Use lowercase keywords
- Include common variations (`auth`, `authentication`, `login`)
- Include framework names (`nextjs`, `next.js`, `next`)
- Avoid overly generic triggers that would match everything

---

## Creating a Hook

Hooks are shell scripts that fire on Claude Code lifecycle events.

### Hook events

| Event | When | Can inject context? |
|-------|------|-------------------|
| `SessionStart` | Claude Code starts | Yes (additionalContext) |
| `Stop` | Claude Code exits | No |
| `UserPromptSubmit` | User sends a message | Yes (additionalContext) |
| `PreToolUse` | Before a tool runs | Yes (can block with decision) |
| `PostToolUse` | After a tool runs | No (stdout only) |
| `PostToolUseFailure` | Tool fails | No (stdout only) |
| `PreCompact` | Before context compaction | No |
| `Notification` | Background event | No |

### Hook template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Read the hook input JSON from stdin
INPUT=$(cat)

# Extract fields (available fields depend on hook event)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)

# Your logic here
# ...

# To inject context into Claude (UserPromptSubmit/SessionStart only):
# echo '{"additionalContext": "Your context here"}'

# To block a tool (PreToolUse only):
# echo '{"decision": "block", "reason": "Blocked because..."}'

# For PostToolUse hooks, just exit cleanly:
exit 0
```

### Register in `~/.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/your-hook.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### Hook performance guidelines

- **Keep hooks fast** — they block Claude's response
- **Use matchers** — don't fire on every tool if you only need Edit/Write
- **Background heavy work** — use `( ... ) &` for non-blocking operations
- **Debounce** — use file-based counters to skip redundant runs
- **Export functions** — if backgrounding with `( ... ) &`, use `export -f` for shell functions

### Hook performance benchmarks

| Hook | Typical latency | Notes |
|------|----------------|-------|
| `prompt-analyzer.ts` | ~28ms | Pre-compiled to JS; intent detection + skill scoring |
| `memory-session-start.sh` | ~1-2s | DB queries for recall + identity; runs once at session start |
| `privacy-hook.sh` | <50ms | Regex path check, no I/O |
| `post-edit-quality.sh` | <50ms | Delegates to Biome/Prettier (async) |
| `context-monitor.sh` | <50ms | Reads token count from stdin JSON |
| Other hooks | <50ms each | File-based checks, no network |

**Total per-prompt overhead**: ~100-200ms (prompt-analyzer + privacy-hook + tool hooks). Session-start hooks add ~1-2s once.

---

## Database Migrations

Migrations live in `memory/migrations/` and are numbered sequentially.

### Creating a new migration

```bash
# Create the file
touch memory/migrations/013_your_change.sql
```

### Migration format

```sql
-- Migration 013: Description of what this changes
-- Date: YYYY-MM-DD

-- Add a new table
CREATE TABLE IF NOT EXISTS your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_your_table_name ON your_table(name);

-- Add column to existing table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS your_column TEXT;
```

### Rules

- Always use `IF NOT EXISTS` / `IF NOT EXISTS` for idempotency
- Never drop columns or tables in a migration (deprecate first)
- Add indexes for any column used in WHERE/JOIN/ORDER BY
- Use `UUID` for primary keys, `TIMESTAMPTZ` for dates
- Keep migrations small and focused (one logical change per file)

### Running migrations

```bash
npm run migrate
# or
npx tsx memory/scripts/migrate.ts
```

---

## Code Standards

### TypeScript

- Strict mode where possible
- No `any` unless truly necessary (use `unknown` + type guards)
- Prefer `const` over `let`
- Use template literals over string concatenation
- Handle errors explicitly (no empty catch blocks unless intentional)

### Shell scripts

- Start with `#!/usr/bin/env bash` and `set -euo pipefail`
- Quote all variables (`"$VAR"` not `$VAR`)
- Use `[[ ]]` over `[ ]` for conditionals
- Redirect stderr for non-critical operations (`2>/dev/null || true`)
- Always `exit 0` at the end of hook scripts

### React (Dashboard)

- Server components by default (App Router)
- Client components only when needed (`"use client"`)
- Tailwind v4 for styling (no CSS modules)
- `lucide-react` for icons

### SQL

- Parameterized queries only (no string interpolation)
- `snake_case` for table and column names
- Always include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Use `BOOLEAN` not `SMALLINT` for true/false

---

## Pull Request Process

### Before submitting

1. Run the full test suite: `npm run test`
2. Run lint: `npm run lint`
3. Run format check: `npm run format:check`
4. If you changed TypeScript: `npm run typecheck`
5. If you changed a hook: `bash -n .claude/hooks/your-hook.sh`
6. If you changed `prompt-analyzer.ts`: rebuild with `cd .claude/hooks && npx tsc`

### PR template

```markdown
## Summary

- What does this change?
- Why?

## Type

- [ ] New skill
- [ ] New hook
- [ ] Dashboard feature
- [ ] Memory system change
- [ ] Database migration
- [ ] Bug fix
- [ ] Documentation

## Testing

- [ ] Tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Manually tested in Claude Code session

## Breaking changes

- None / describe any breaking changes
```

### Review process

1. All PRs require at least one review
2. Database migrations require extra scrutiny (irreversible in production)
3. Hook changes should include performance benchmarks (before/after timing)
4. Skill additions should include example prompts that trigger them

---

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for architecture questions
- Tag `@InuVerse` for urgent items
