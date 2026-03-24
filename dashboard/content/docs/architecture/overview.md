# Architecture Overview

UltraThink is a production-grade, Claude-native workflow operating system. It transforms Claude Code from a general-purpose AI assistant into a structured engineering partner with persistent memory, layered skill orchestration, privacy enforcement, and full observability.

## Core Philosophy

| Principle | Meaning |
|-----------|---------|
| **Mesh over pipeline** | Skills form a resilient graph, not a rigid linear chain |
| **Memory-enabled** | Past decisions, patterns, and lessons persist across sessions |
| **Privacy-first** | Every file access is checked against privacy rules before execution |
| **Local-first** | All data stays on your machine; the dashboard runs on localhost |
| **Opinionated** | Sensible defaults for everything; override only when needed |
| **Observable** | Dashboard provides real-time visibility into skills, memory, hooks, and health |

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ SessionStart  │  │ PromptSubmit │  │ PostToolUse      │  │
│  │              │  │              │  │                  │  │
│  │ memory-start │  │ prompt-      │  │ quality-gate     │  │
│  │ statusline   │  │ analyzer.ts  │  │ post-edit-check  │  │
│  │              │  │ memory-recall│  │ memory-auto-save │  │
│  └──────┬───────┘  └──────┬───────┘  │ tool-observe     │  │
│         │                 │          │ context-monitor  │  │
│         │                 │          │ privacy-hook     │  │
│         │                 │          └──────────────────┘  │
│         ▼                 ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Neon Postgres (pgvector + pg_trgm)      │   │
│  │                                                      │   │
│  │  memories ← memory_tags ← memory_relations          │   │
│  │  sessions ← skill_usage ← hook_events               │   │
│  │  plans ← tasks ← journals ← decisions               │   │
│  │  daily_stats, model_pricing                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲                                  │
│                          │                                  │
│  ┌───────────────────────┴─────────────────────────────┐   │
│  │           Next.js 15 Dashboard (:3333)               │   │
│  │  Memory browser | Skill mesh | Activity feed         │   │
│  │  Hook stats | Usage tracking | Kanban board          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Skill Mesh (4 layers)                    │   │
│  │                                                      │   │
│  │  Orchestrators ──► Hubs ──► Utilities ──► Domain     │   │
│  │  (gsd, plan)    (react,   (refactor,   (nextjs,     │   │
│  │                  debug)    test)        stripe)      │   │
│  │                                                      │   │
│  │  Auto-trigger: intent detection + graph traversal    │   │
│  │  125+ skills, <30ms scoring per prompt               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## The 4-Layer Skill Mesh

UltraThink organizes 125+ skills into four distinct layers. Each layer has a clear role, and skills link to each other through explicit metadata (`linksTo` / `linkedFrom`).

```
Layer 1: ORCHESTRATORS (8 skills)
    Commanders that coordinate end-to-end tasks.
    They receive user intent and delegate to hubs.
    Examples: cook, team, ship, bootstrap

        |
        v

Layer 2: WORKFLOW HUBS (18 skills)
    Mid-level coordinators for specific domains.
    They perform scoped orchestration and call utilities.
    Examples: plan, debug, fix, test, code-review, brainstorm

        |
        v

Layer 3: UTILITY PROVIDERS (35 skills)
    Reusable, mostly stateless tools and capabilities.
    They can be called by multiple hubs.
    Examples: research, sequential-thinking, mermaid, context-engineering

        |
        v

Layer 4: DOMAIN SPECIALISTS (64+ skills)
    Deep expertise in specific technologies.
    They provide focused knowledge for particular stacks.
    Examples: react, nextjs, postgresql, docker, aws, stripe
```

### How layers interact

- **Orchestrators compose hubs.** A `cook` orchestrator might invoke `plan` -> `scout` -> `test` -> `code-review` -> `commit-crafter`.
- **Hubs compose utilities and specialists.** The `debug` hub might call `scout` for codebase exploration, then `sequential-thinking` for root cause analysis.
- **Utilities are stateless and reusable.** `research` can be called by `cook`, `debug`, `brainstorm`, or any other skill.
- **Domain specialists provide deep knowledge.** `react` is consulted when building React components; `postgresql` when writing queries.

Skills never operate in isolation. Every skill declares its `linksTo` and `linkedFrom` connections, creating a machine-readable dependency graph.

## System Components

| Component | Path | Purpose |
|-----------|------|---------|
| Skill Mesh | `.claude/skills/` | 125+ skill definitions with auto-trigger |
| Agents | `.claude/agents/` | 10 specialized agent roles |
| Memory | `memory/` | Postgres-backed persistent memory with semantic search |
| Hooks | `.claude/hooks/` | 15+ lifecycle hooks for privacy, quality, memory, notifications |
| Dashboard | `dashboard/` | Next.js 15 observability UI on localhost:3333 |
| Commands | `.claude/commands/` | Slash command aliases for skills |
| Config | `.claude/ck.json` | Central configuration file |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Claude Code CLI |
| Dashboard | Next.js 15 App Router, React 19, Tailwind CSS v4 |
| Database | Neon serverless Postgres + pgvector + pg_trgm |
| Charts | Recharts |
| Icons | Lucide React |
| Language | TypeScript throughout |
| Package Manager | npm workspaces |
