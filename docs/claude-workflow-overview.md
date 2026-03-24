# UltraThink: Claude Workflow OS

## What Is UltraThink?

UltraThink is a production-grade, Claude-native workflow operating system. It transforms Claude Code from a general-purpose AI assistant into an opinionated, structured engineering partner with persistent memory, layered skill orchestration, privacy enforcement, and full observability.

UltraThink is **not a chatbot framework**. It is an agent operating system where skills cooperate to finish real work, memory persists across sessions, and every action is auditable.

## Core Philosophy

> "You do not need thousands of disconnected skills. You need a linked ecosystem where skills cooperate to finish real work."

UltraThink is built on these principles:

| Principle | Meaning |
|-----------|---------|
| **Mesh over pipeline** | Skills form a resilient graph, not a rigid linear chain |
| **Memory-enabled** | Past decisions, patterns, and lessons persist across sessions |
| **Privacy-first** | Every file access is checked against privacy rules before execution |
| **Local-first** | All data stays on your machine; the dashboard runs on localhost |
| **Opinionated** | Sensible defaults for everything; override only when needed |
| **Observable** | Dashboard provides real-time visibility into skills, memory, hooks, and health |

## Architecture: The 4-Layer Skill Mesh

UltraThink organizes its 104 skills into four distinct layers. Each layer has a clear role in the system, and skills link to each other through explicit metadata.

```
Layer 1: ORCHESTRATORS (7 skills)
    Commanders that coordinate end-to-end tasks.
    They receive user intent and delegate to hubs.
    Examples: cook, team, ship, bootstrap

        |
        v

Layer 2: WORKFLOW HUBS (15 skills)
    Mid-level coordinators for specific domains.
    They perform scoped orchestration and call utilities.
    Examples: plan, debug, fix, test, code-review, brainstorm, scout

        |
        v

Layer 3: UTILITY PROVIDERS (30 skills)
    Reusable, mostly stateless tools and capabilities.
    They can be called by multiple hubs.
    Examples: research, sequential-thinking, mermaid, repomix, context-engineering

        |
        v

Layer 4: DOMAIN SPECIALISTS (52 skills)
    Deep expertise in specific technologies.
    They provide focused knowledge for particular stacks.
    Examples: react, nextjs, postgresql, docker, aws, stripe
```

### How Layers Interact

- Orchestrators compose hubs. A `cook` orchestrator might invoke `plan` -> `scout` -> `test` -> `code-review` -> `commit-crafter`.
- Hubs compose utilities and specialists. The `debug` hub might call `scout` for codebase exploration, then `sequential-thinking` for root cause analysis.
- Utilities are stateless and reusable. `research` can be called by `cook`, `debug`, `brainstorm`, or any other skill.
- Domain specialists provide deep knowledge. `react` is consulted when building React components; `postgresql` when writing queries.

Skills never operate in isolation. Every skill declares its `linksTo` and `linkedFrom` connections in YAML frontmatter, creating a machine-readable dependency graph.

## System Components

### Skill Mesh (`.claude/skills/`)

104 skills organized as described above. Each skill has a `SKILL.md` file with YAML frontmatter (metadata) and Markdown body (instructions). See [Skills Catalog](./skills-catalog.md) and [Skill Linking Model](./skill-linking-model.md).

### Agents (`.claude/agents/`)

10 specialized agents for distinct roles: planner, architect, code-reviewer, debugger, security-auditor, scout, researcher, tester, docs-writer, and memory-curator. See [Agents Catalog](./agents-catalog.md).

### Memory System (`memory/`)

Persistent Postgres-backed memory with semantic search via pgvector. Memories are tagged, scoped, and confidence-rated. The system enforces read-before-write discipline and automatic compaction. See [Memory System](./memory-system.md) and [Memory Schema](./memory-schema.md).

### Privacy Hooks (`.claude/hooks/`)

Four hooks enforce privacy, manage memory persistence, validate formatting, and dispatch notifications. The privacy hook checks every file access against `.ckignore` patterns and built-in blocklists. See [Hooks and Privacy](./hooks-and-privacy.md).

### Dashboard (`dashboard/`)

A Next.js 15 dark-themed control center running on localhost:3333 with 10 pages: Home, Analytics, Skills, Plans, Kanban, Testing, Memory, Hooks, Settings, and Health. See [Dashboard Overview](./dashboard-overview.md).

### Command System (`.claude/commands/`)

Commands are skill aliases that provide shortcut access to skills. `/cook`, `/plan`, `/debug`, `/review`, `/ship`, `/kanban`, and more. See [Command System](./command-system.md).

### Configuration (`.claude/ck.json`)

Central configuration file controlling language, coding level, memory policies, privacy settings, notifications, dashboard preferences, and more. See [ck.json Config](./ck-json-config.md).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Claude Code CLI |
| Dashboard | Next.js 15 App Router, React 19, Tailwind CSS v4 |
| Database | Neon serverless Postgres + pgvector |
| Charts | Recharts |
| Icons | Lucide React |
| Language | TypeScript throughout |
| Package Manager | npm workspaces |

## Project Structure

```
ultrathink/
  .claude/
    agents/          # 10 agent definitions
    commands/        # Command aliases for skills
    hooks/           # 4 hooks (privacy, memory-save, format-check, notify)
    rules/           # 5 rule files (core, memory, privacy, quality, teaching)
    skills/          # 104 skill directories, each with SKILL.md
    ck.json          # Main configuration file
    settings.json    # Claude Code settings
  dashboard/         # Next.js 15 dashboard app
    app/             # App Router pages and API routes
    components/      # UI components (charts, kanban, layout)
    lib/             # Shared utilities
  memory/            # Memory subsystem
    migrations/      # 5 SQL migration files
    schema/          # Combined schema reference
    scripts/         # compact.ts, migrate.ts, seed.ts
    src/             # TypeScript services (client, memory, plans, hooks)
  docs/              # Documentation (this directory)
  plans/             # Plan documents
  reports/           # Generated reports (UI tests, hook events)
  scripts/           # Shell scripts (setup, dashboard, migrate)
  package.json       # Workspace root
  CLAUDE.md          # Claude system prompt
  AGENTS.md          # Cross-agent instructions
  PLAN.md            # Build plan
```

## Quick Start

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Set up the database**: Create a Neon Postgres database and set `DATABASE_URL` in `.env`.

3. **Run migrations**:
   ```bash
   npm run migrate
   ```

4. **Start the dashboard**:
   ```bash
   npm run dashboard:dev
   ```
   Open `http://localhost:3333`.

5. **Use skills in Claude Code**: When working with Claude Code in this repository, skills activate automatically based on triggers. Use commands like `/cook`, `/plan`, `/debug` for direct access.

## Related Documentation

- [Command System](./command-system.md) -- Available commands and how to create new ones
- [Skills Catalog](./skills-catalog.md) -- Complete catalog of all 104 skills
- [Skill Linking Model](./skill-linking-model.md) -- How skills connect to each other
- [Agents Catalog](./agents-catalog.md) -- All 10 agents and their roles
- [Memory System](./memory-system.md) -- Memory architecture and policies
- [Memory Schema](./memory-schema.md) -- Database schema reference
- [Hooks and Privacy](./hooks-and-privacy.md) -- Privacy enforcement and hook system
- [Dashboard Overview](./dashboard-overview.md) -- Dashboard architecture and pages
- [ck.json Config](./ck-json-config.md) -- Configuration reference
- [Coding Levels](./coding-levels.md) -- How coding levels affect behavior
- [Troubleshooting](./troubleshooting.md) -- Common issues and solutions
