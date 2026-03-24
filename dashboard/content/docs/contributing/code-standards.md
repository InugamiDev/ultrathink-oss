# Code Standards

Conventions and standards for contributing code to UltraThink.

## TypeScript

- Strict mode where possible
- No `any` unless truly necessary (use `unknown` + type guards)
- Prefer `const` over `let`
- Use template literals over string concatenation
- Handle errors explicitly (no empty catch blocks unless intentional)

## Shell Scripts

- Start with `#!/usr/bin/env bash` and `set -euo pipefail`
- Quote all variables (`"$VAR"` not `$VAR`)
- Use `[[ ]]` over `[ ]` for conditionals
- Redirect stderr for non-critical operations (`2>/dev/null || true`)
- Always `exit 0` at the end of hook scripts

## React (Dashboard)

- Server components by default (App Router)
- Client components only when needed (`"use client"`)
- Tailwind v4 for styling (no CSS modules)
- `lucide-react` for icons

## SQL

- Parameterized queries only (no string interpolation)
- `snake_case` for table and column names
- Always include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Use `BOOLEAN` not `SMALLINT` for true/false

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Skill directories | kebab-case | `my-skill-name` |
| TypeScript files | camelCase | `memoryService.ts` |
| Database tables | snake_case | `hook_events` |
| Database columns | snake_case | `created_at` |
| Environment variables | SCREAMING_SNAKE | `DATABASE_URL` |
| CSS classes | Tailwind utilities | `bg-slate-900 text-gray-100` |

## Skill Standards

- YAML frontmatter must be valid (use spaces, not tabs)
- Every `linksTo` entry must have a corresponding `linkedFrom` in the target
- Triggers should be lowercase and avoid overly generic terms
- SKILL.md body should follow the standard template (Purpose, Workflow, Decision Points, Guardrails)

## Hook Standards

- Must handle missing inputs gracefully (`jq -r '.field // ""' 2>/dev/null || true`)
- Must not block Claude for more than 5 seconds (use matchers to limit scope)
- Background heavy operations with `( ... ) &`
- Log events to `reports/hook-events.jsonl` in the standard JSONL format
