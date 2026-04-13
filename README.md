<p align="center">
  <img src="docs/assets/ultrathink-logo-1.png" alt="UltraThink" width="600" />
</p>

<h1 align="center">UltraThink</h1>
<p align="center">
  <strong>A Workflow OS for Claude Code, with Codex-aware project integration</strong><br />
  Persistent memory, 4-layer skill mesh, privacy hooks, and an observability dashboard — all running inside your CLI.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#database-schema">Schema</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## What is UltraThink?

UltraThink transforms Claude Code from a stateless assistant into a **persistent, skill-aware agent** that remembers your preferences, enforces your coding standards, and adapts to your workflow — across sessions.

This repo also ships a Codex-facing `AGENTS.md`, so Codex can inherit the same skill lookup, memory discipline, privacy rules, and agent roster when working inside this codebase. Claude-specific hooks and statusline behavior remain Claude-native.

```
You ──► Claude Code ──► UltraThink hooks fire ──► Skills matched, memories recalled
                                                  ──► Context injected into Claude
                                                  ──► Better, personalized responses
```

### Why?

Claude Code is powerful but stateless. Every session starts fresh. UltraThink fixes that:

- **Memory**: Claude remembers your architectural decisions, patterns, and preferences across sessions
- **Skills**: 388 domain skills auto-activate based on intent detection (build, debug, deploy, design...)
- **Privacy**: Hooks block access to `.env`, `.pem`, credentials before Claude sees them
- **Observability**: Dashboard shows memory usage, skill activations, hook events, and token costs
- **Quality gates**: Auto-format on edit, JSON validation, shell syntax checking

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **OS** | macOS or Linux (bash required). Windows: WSL2 only — native PowerShell is not supported. |
| **Runtime** | Node.js 18+ and npm |
| **CLI tools** | `jq` (install via `brew install jq` or `apt install jq`), `grep`, `sed` |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` |
| **Database** | PostgreSQL ([Neon](https://neon.tech) free tier works) — required for memory + dashboard |

---

## What UltraThink Does for Your AI Agent

Out of the box, Claude Code is stateless — every session starts from zero. UltraThink upgrades it into a persistent, context-aware agent:

| Capability | Without UltraThink | With UltraThink |
|---|---|---|
| **Memory** | Forgets everything between sessions | Remembers decisions, preferences, patterns across sessions |
| **Skills** | Generic responses for every task | 388 domain skills auto-activate based on what you're doing |
| **Quality** | No guardrails on edits | Auto-formats code, validates JSON/shell, blocks credential access |
| **Observability** | Black box | Dashboard with memory browser, skill mesh, hook stats, token costs |
| **Context** | You repeat yourself every session | Intent detection + memory recall inject relevant context automatically |

Works with **Claude Code** (hooks + statusline) and **Codex** (AGENTS.md + skills).

---

## Quickstart

### One-liner install

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git && cd ultrathink-oss && ./scripts/setup.sh && ./scripts/install.sh
```

That's it. Open `claude` in any project and UltraThink is active.

### Step-by-step install

<details>
<summary>Click to expand full setup walkthrough</summary>

#### 1. Prerequisites

| Requirement | Install |
|---|---|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| PostgreSQL | [neon.tech](https://neon.tech) free tier (required for memory + dashboard) |
| jq | `brew install jq` (macOS) or `apt install jq` (Linux) |

#### 2. Clone and setup

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git
cd ultrathink-oss

# Installs dependencies, creates .env template, runs database migrations
./scripts/setup.sh
```

Edit `.env` with your Neon connection string before proceeding.

#### 3. Install into Claude Code

```bash
# Symlinks skills, hooks, agents, references into ~/.claude/
# Creates ~/.ultrathink/ for vault, forge state, and decisions
./scripts/install.sh
```

**Installer flags:**
- `--dry-run` — preview what would change without modifying anything
- `--uninstall` — fully remove all UltraThink symlinks and hooks
- `--no-identity` — skip modifying your CLAUDE.md
- `--yes` / `-y` — auto-approve all prompts

#### 4. Verify

```bash
claude
# You should see the UltraThink statusline with memory count, skills, and usage
# Try: "explain how UltraThink hooks work" — teaching mode should auto-activate
```

</details>

### Use with Codex CLI

```bash
codex
# Codex reads AGENTS.md automatically in this repository

# Regenerate after major CLAUDE.md changes
./scripts/sync-editors.sh --codex
```

Codex inherits UltraThink's operating model through `AGENTS.md`, `.claude/skills/`, `.claude/references/`, and the repo MCP config.

### Tiers

This is the **OSS** tier — skills, memory, hooks, and /forge guided mode. Free and open source. Builder and Core tiers with additional features are coming soon.

### Start the dashboard

```bash
npm run dashboard:dev
# Open http://localhost:3333
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ SessionStart  │  │ PromptSubmit │  │ PostToolUse      │  │
│  │              │  │              │  │                  │  │
│  │ memory-start │  │ prompt-      │  │ quality-gate     │  │
│  │ codeintel-   │  │ analyzer.ts  │  │ codeintel-index  │  │
│  │ check        │  │ memory-recall│  │ memory-auto-save │  │
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
│  │  388 skills, <30ms scoring per prompt                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Hook Lifecycle

| Event | Hook | What it does |
|-------|------|-------------|
| **SessionStart** | `memory-session-start.sh` | Recalls memories, loads context |
| **UserPromptSubmit** | `prompt-submit.sh` | Scores skills, recalls relevant memories, injects context |
| **PreToolUse** | `privacy-hook.sh` | Blocks access to `.env`, `.pem`, credentials |
| **PreToolUse** | `agent-tracker-pre.sh` | Tracks spawned subagents for statusline |
| **PostToolUse** | `post-edit-quality.sh` | Auto-formats (Biome/Prettier), validates JSON/shell |
| **PostToolUse** | `memory-auto-save.sh` | Saves architectural changes (migrations, schemas, configs) |
| **PostToolUse** | `tool-observe.sh` | Batches tool usage stats (file append, flushed at session end) |
| **PostToolUse** | `context-monitor.sh` | Warns at 65%/75% context usage, detects stuck agents |
| **PostToolUseFailure** | `tool-failure-log.sh` | Logs failures, detects patterns |
| **PreCompact** | `pre-compact.sh` | Saves transcript state before context compaction |
| **Stop** | `memory-session-end.sh` | Flushes pending memories, closes session |
| **Notification** | `desktop-notify.sh` | macOS desktop + Discord notifications |

---

## Features

### Memory System

Postgres-backed persistent memory organized as a **Second Brain** with 4 wings:

| Wing | Purpose | Halls |
|------|---------|-------|
| `agent` | Who the agent is | core, rules, skills |
| `user` | Who the user is | profile, preferences, projects |
| `knowledge` | What has been learned | decisions, patterns, insights, reference |
| `experience` | What happened | sessions, outcomes, errors |

**3-tier hybrid search** with write-time synonym enrichment:

1. **tsvector** full-text search (best precision)
2. **pg_trgm** trigram fuzzy matching (typo-tolerant)
3. **ILIKE** substring fallback

Two-pass ranking with temporal stopword recall, frequency decay protection, and tag-content enrichment ensure the right memory surfaces first.

Memories are scoped by project, categorized (preference, solution, architecture, pattern, insight, decision), and ranked by importance (1-10) and confidence (0-1). An Obsidian vault at `~/.ultrathink/vault/` mirrors the MemPalace structure for human editing.

```bash
# CLI commands
npx tsx memory/scripts/memory-runner.ts search "authentication pattern"
npx tsx memory/scripts/memory-runner.ts save "content" "category" importance
npx tsx memory/scripts/memory-runner.ts flush
npx tsx memory/scripts/memory-runner.ts session-start
```

### LongMemEval Benchmark

The memory system is validated against a LongMemEval-inspired benchmark (50 questions, 5 ability categories):

| Ability | Questions | Pass Threshold | Score |
|---------|-----------|---------------|-------|
| Information Extraction | 10 | ≥80% | **100%** |
| Multi-Session Reasoning | 10 | ≥60% | **100%** |
| Temporal Reasoning | 10 | ≥60% | **100%** |
| Knowledge Updates | 10 | ≥70% | **100%** |
| Abstention | 10 | ≥80% | **100%** |

**50/50 (100%)** — Tests retrieval quality across information extraction, cross-memory synthesis, temporal ordering, knowledge freshness, and refusal-when-uncertain. No LLM in the loop — pure search ranking validation.

```bash
npx vitest run tests/longmemeval.test.ts
```

### AAAK — Lossless Shorthand Dialect

AAAK compresses natural language into a structured shorthand that any LLM can decode — ~1.5x compression on recall output, zero information loss.

```
Natural (~1000 tokens):
  "Priya manages the Driftwood team: Kai (backend, 3 years), Soren (frontend),
   Maya (infrastructure), and Leo (junior, started last month). They're building
   a SaaS analytics platform. Current sprint: auth migration to Clerk."

AAAK (~120 tokens):
  TEAM: PRI(lead) | KAI(backend,3yr) SOR(frontend) MAY(infra) LEO(junior,new)
  PROJ: DRIFTWOOD(saas.analytics) | SPRINT: auth.migration→clerk
```

Used in recall context injection to fit more memories into the token budget. Grammar supports category codes, structural markers (`|`, `→`, `+`, `>`), and automatic abbreviation of common dev terms.

```bash
# AAAK-compressed context injection
npx tsx memory/scripts/memory-runner.ts aaak-context

# Programmatic
recall(scope, { aaak: true })
```

### Skill Mesh

4-layer architecture with auto-trigger on every prompt:

| Layer | Count | Purpose | Example |
|-------|-------|---------|---------|
| **Orchestrator** | 8 | Multi-step workflows | `gsd`, `plan`, `cook` |
| **Hub** | 18 | Domain coordinators | `react`, `debug`, `test` |
| **Utility** | 35 | Focused tools | `refactor`, `fix`, `audit` |
| **Domain** | 64+ | Specific tech | `nextjs`, `stripe`, `drizzle` |

Skills auto-activate via intent detection. The prompt analyzer classifies each prompt into an intent (build, debug, refactor, explore, deploy, test, design, plan) and scores matching skills from `_registry.json`. Top 5 skills are injected as context directives.

### Dashboard

Next.js 15 app with 18 pages:

- `/dashboard` — Stats overview, skill mesh visualization
- `/memory` — Memory browser with semantic search
- `/activity` — Hook event feed, memory writes
- `/hooks` — Performance stats, duplicate detection
- `/skills` — Registry browser with graph connections
- `/usage` — Token costs, API quotas
- `/kanban` — Task board with drag-and-drop
- `/plans` — Workflow planning
- `/system` — Health checks

### Desktop Widget

macOS Ubersicht widget showing:
- Anthropic API usage (5hr/7day quotas)
- Active session stats
- Memory count
- Token costs

### Statusline

3-line Claude Code statusline showing:
- Model, context %, API quotas
- Active skills, agent progress
- Recent hook activity feed

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    sessions {
        uuid id PK
        timestamptz started_at
        timestamptz ended_at
        text summary
        text task_context
        int memories_created
        int memories_accessed
        bigint input_tokens
        bigint output_tokens
        bigint cache_read_tokens
        bigint cache_write_tokens
        varchar model
        decimal cost_usd
    }

    memories {
        uuid id PK
        text content
        varchar category
        smallint importance
        decimal confidence
        varchar scope
        varchar source
        uuid session_id FK
        uuid plan_id FK
        text file_path
        vector embedding
        tsvector search_vector
        text search_enrichment
        varchar wing
        varchar hall
        smallint layer
        boolean is_archived
        boolean is_compacted
        int access_count
        timestamptz created_at
        timestamptz updated_at
        timestamptz accessed_at
    }

    memory_tags {
        uuid memory_id PK,FK
        varchar tag PK
    }

    memory_relations {
        uuid source_id PK,FK
        uuid target_id PK,FK
        varchar relation_type
        decimal strength
    }

    summaries {
        uuid id PK
        varchar scope
        text summary
        int memory_count
        timestamptz date_range_start
        timestamptz date_range_end
    }

    plans {
        uuid id PK
        varchar title
        varchar status
        text file_path
        text summary
        uuid session_id FK
        timestamptz created_at
        timestamptz archived_at
    }

    tasks {
        uuid id PK
        varchar title
        text description
        varchar status
        smallint priority
        uuid plan_id FK
        varchar board
        int position
        varchar assignee
        text_arr labels
        timestamptz due_date
    }

    decisions {
        uuid id PK
        varchar title
        text context
        text decision
        text consequences
        text alternatives
        varchar status
        uuid superseded_by FK
    }

    journals {
        uuid id PK
        uuid plan_id FK
        text planned
        text implemented
        text blockers
        text outcomes
        text lessons
        text followup_debt
    }

    hook_events {
        uuid id PK
        varchar event_type
        varchar severity
        text description
        text path_accessed
        varchar action_taken
        varchar hook_name
        uuid session_id FK
    }

    security_incidents {
        uuid id PK
        uuid hook_event_id FK
        varchar title
        text description
        varchar status
        text resolution
        timestamptz resolved_at
    }

    skill_usage {
        uuid id PK
        varchar skill_id
        timestamptz invoked_at
        int duration_ms
        boolean success
        text error_message
        uuid session_id FK
    }

    daily_stats {
        date date PK
        int total_sessions
        int total_memories_created
        int total_skills_invoked
        int total_hook_events
        int total_tasks_completed
        jsonb top_skills
        bigint total_input_tokens
        bigint total_output_tokens
        decimal total_cost_usd
        jsonb cost_by_model
    }

    model_pricing {
        varchar model PK
        decimal input_per_mtok
        decimal output_per_mtok
        decimal cache_read_per_mtok
        decimal cache_write_per_mtok
        date effective_from
    }

    sessions ||--o{ memories : "creates"
    sessions ||--o{ plans : "creates"
    sessions ||--o{ hook_events : "logs"
    sessions ||--o{ skill_usage : "tracks"

    memories ||--o{ memory_tags : "tagged"
    memories ||--o{ memory_relations : "source"
    memories ||--o{ memory_relations : "target"

    plans ||--o{ tasks : "contains"
    plans ||--o{ journals : "records"
    plans ||--o{ memories : "references"

    decisions ||--o| decisions : "supersedes"

    hook_events ||--o| security_incidents : "escalates"

```

### Key Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| memories | `search_vector` | GIN | Full-text search |
| memories | `content_trgm` | GIN (trigram) | Fuzzy matching |
| memories | `embedding` | IVFFlat | Vector similarity |
| memories | `scope_category` | B-tree | Scoped queries |

### Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram fuzzy search
```

---

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require

# Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3333
PORT=3333

# Optional — Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Optional — Embedding provider (for vector search)
OPENAI_API_KEY=
```

### Project Configuration (`.claude/ck.json`)

```json
{
  "project": "ultrathink",
  "version": "1.0.0",
  "codingLevel": "practical-builder",
  "memory": {
    "provider": "neon",
    "autoRecall": true,
    "writePolicy": "selective",
    "compactionThreshold": 100
  },
  "privacyHook": {
    "enabled": true,
    "sensitivityLevel": "standard",
    "logEvents": true
  },
  "dashboard": { "port": 3333 }
}
```

### Skill Registry

Skills are defined in `.claude/skills/<name>/SKILL.md` and registered in `.claude/skills/_registry.json`:

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

---

## Project Structure

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
│   ├── skills/            # 388 skill definitions (SKILL.md files)
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
├── widgets/               # Desktop widget (macOS Ubersicht)
├── scripts/
│   ├── setup.sh           # One-command project setup
│   ├── install.sh         # Global ~/.claude/ integration
│   └── sync-editors.sh    # Regenerate editor/Codex instruction files
├── docs/                  # 21 documentation files
├── tests/                 # Vitest test suite
├── Dockerfile             # Production container build
└── .github/workflows/     # CI pipeline (lint, typecheck, test)
```

---

## CLI Commands

```bash
# Setup
./scripts/setup.sh              # Full project setup
./scripts/install.sh            # Install into ~/.claude/ globally
./scripts/install.sh --uninstall     # Remove from ~/.claude/
./scripts/sync-editors.sh --codex     # Regenerate AGENTS.md for Codex
./scripts/sync-editors.sh --all       # Refresh all editor instruction files

# Database
npm run migrate                 # Run all pending migrations
npm run seed                    # Populate sample data

# Dashboard
npm run dashboard:dev           # Start dev server (port 3333)
npm run dashboard:build         # Production build

# Memory
npx tsx memory/scripts/memory-runner.ts search "query"
npx tsx memory/scripts/memory-runner.ts flush
npx tsx memory/scripts/memory-runner.ts compact

# Quality
npm run lint                    # ESLint
npm run format                  # Prettier
npm run typecheck               # TypeScript validation
npm run test                    # Vitest
```

---

## Self-Hosting

### Option A: Local (recommended for development)

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink
./scripts/setup.sh
# Edit .env with your Neon DATABASE_URL
npm run migrate
npm run dashboard:dev
```

### Option B: Docker

```bash
docker build -t ultrathink .
docker run -p 3333:3333 \
  -e DATABASE_URL="postgresql://..." \
  ultrathink
```

### Option C: Existing project integration

You don't need to clone the full repo. The global installer symlinks everything:

```bash
# Clone once to a permanent location
git clone https://github.com/InuVerse/ultrathink.git ~/ultrathink

# Install globally
cd ~/ultrathink && ./scripts/setup.sh && ./scripts/install.sh

# Now every `claude` session has UltraThink capabilities
```

---

## Roadmap

- [ ] SQLite fallback for local-only mode (no Neon required)
- [ ] `npx ultrathink init` — one-command installer
- [ ] WebSocket/SSE real-time dashboard updates
- [ ] Plugin marketplace for community skills
- [ ] VS Code extension for dashboard access
- [ ] Multi-user memory isolation

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick start for contributors:**

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink
./scripts/setup.sh
npm run test
```

**Rebuilding hooks after modifications:**

```bash
cd .claude/hooks && npx tsc --target ES2022 --module ES2022 --moduleResolution node --outDir dist prompt-analyzer.ts
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/InuVerse">InuVerse</a>
</p>
