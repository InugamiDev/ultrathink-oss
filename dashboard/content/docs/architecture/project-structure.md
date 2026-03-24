# Project Structure

```
ultrathink/
├── .claude/
│   ├── hooks/             # 15+ lifecycle hooks (shell + TypeScript)
│   │   ├── prompt-analyzer.ts   # Intent detection + skill scoring engine
│   │   ├── prompt-submit.sh     # UserPromptSubmit orchestrator
│   │   ├── privacy-hook.sh      # File access control
│   │   ├── post-edit-quality.sh # Auto-format + validation
│   │   ├── statusline.sh        # CLI status bar
│   │   └── ...
│   ├── skills/            # 125+ skill definitions (SKILL.md files)
│   │   ├── _registry.json # Master skill index with triggers + graph edges
│   │   ├── react/SKILL.md
│   │   ├── nextjs/SKILL.md
│   │   └── ...
│   ├── agents/            # 10 specialized agent definitions
│   ├── references/        # Behavioral rules (loaded on demand)
│   └── commands/          # Slash commands (/usage, /context-tree, etc.)
├── memory/
│   ├── migrations/        # 12 SQL migration files (001-012)
│   ├── src/
│   │   ├── memory.ts      # Core CRUD + 3-tier search
│   │   ├── client.ts      # Neon Postgres connection
│   │   ├── hooks.ts       # Hook event logging
│   │   ├── analytics.ts   # Usage tracking
│   │   ├── enrich.ts      # Synonym expansion for search
│   │   └── plans.ts       # Workflow integration
│   └── scripts/
│       ├── memory-runner.ts  # CLI entry point (session-start|save|flush|search)
│       ├── migrate.ts        # Migration runner
│       └── ...
├── dashboard/             # Next.js 15 + Tailwind v4 observability UI
│   ├── app/               # 18 pages (App Router)
│   │   ├── dashboard/     # Stats overview
│   │   ├── memory/        # Memory browser
│   │   ├── hooks/         # Hook performance
│   │   ├── skills/        # Skill registry
│   │   ├── activity/      # Event feed
│   │   ├── usage/         # Token costs
│   │   └── ...
│   └── lib/               # Shared utilities, DB client
├── scripts/
│   ├── setup.sh           # One-command project setup
│   └── init-global.sh     # Global ~/.claude/ integration
├── docs/                  # 21 documentation files
├── tests/                 # Vitest test suite
├── Dockerfile             # Production container build
└── .github/workflows/     # CI pipeline (lint, typecheck, test)
```

## Directory Details

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

## Key Files

| File | Purpose |
|------|---------|
| `.claude/ck.json` | Central configuration |
| `.claude/skills/_registry.json` | Master skill index with triggers and graph edges |
| `.claude/hooks/prompt-analyzer.ts` | Intent detection and skill scoring engine |
| `memory/src/memory.ts` | Core memory CRUD and 3-tier search |
| `memory/src/client.ts` | Neon Postgres connection |
| `CLAUDE.md` | Claude system prompt (loaded at session start) |
| `AGENTS.md` | Cross-agent instructions and protocols |
| `.ckignore` | Privacy hook patterns |

## Skill Registry

The `_registry.json` file maps every skill to its metadata:

```json
{
  "react": {
    "layer": "hub",
    "category": "frontend",
    "description": "React patterns, hooks, server components",
    "triggers": ["react", "component", "useState", "useEffect", "jsx"],
    "linksTo": ["nextjs", "tailwindcss", "testing-library"],
    "websearch": true
  }
}
```

The prompt analyzer reads this registry on every `UserPromptSubmit` to score and match skills in under 30ms.
