<p align="center">
  <img src="docs/assets/ultrathink-banner.png" alt="UltraThink" width="600" />
</p>

<h1 align="center">UltraThink</h1>
<p align="center">
  <strong>A Workflow OS for Claude Code</strong><br />
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

```
You ──► Claude Code ──► UltraThink hooks fire ──► Skills matched, memories recalled
                                                  ──► Context injected into Claude
                                                  ──► Better, personalized responses
```

### Why?

Claude Code is powerful but stateless. Every session starts fresh. UltraThink fixes that:

- **Memory**: Claude remembers your architectural decisions, patterns, and preferences across sessions
- **Skills**: 125+ domain skills auto-activate based on intent detection (build, debug, deploy, design...)
- **Privacy**: Hooks block access to `.env`, `.pem`, credentials before Claude sees them
- **Observability**: Dashboard shows memory usage, skill activations, hook events, and token costs
- **Quality gates**: Auto-format on edit, JSON validation, shell syntax checking

---

## Quickstart

### Prerequisites

- **Node.js 18+** and npm
- **Claude Code** CLI installed (`npm install -g @anthropic-ai/claude-code`)
- **Neon Postgres** account (free tier works) — [neon.tech](https://neon.tech)

### Install

```bash
# Clone the repo
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink

# Run setup (installs deps, creates .env, runs migrations)
./scripts/setup.sh

# Install globally into ~/.claude/ (hooks, skills, agents)
./scripts/init-global.sh
```

### Quick integration into an existing project

```bash
# From any project directory:
/path/to/ultrathink/scripts/init-global.sh

# This symlinks skills, hooks, agents, and references into ~/.claude/
# Every Claude Code session now has UltraThink capabilities
```

### Verify installation

```bash
# Start Claude Code in any project
claude

# You should see the UltraThink statusline with memory count, skills, and usage
# Try: "explain how UltraThink hooks work" — teaching mode should auto-activate
```

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

### Hook Lifecycle

| Event | Hook | What it does |
|-------|------|-------------|
| **SessionStart** | `memory-session-start.sh` | Recalls memories |
| **SessionStart** | `statusline.sh` | Renders 3-line CLI status bar (context %, skills, quotas) |
| **UserPromptSubmit** | `prompt-submit.sh` | Scores skills, recalls relevant memories, injects context |
| **PreToolUse** | `privacy-hook.sh` | Blocks access to `.env`, `.pem`, credentials |
| **PreToolUse** | `agent-tracker-pre.sh` | Tracks spawned subagents for statusline |
| **PostToolUse** | `post-edit-quality.sh` | Auto-formats (Biome/Prettier), validates JSON/shell |
| **PostToolUse** | `post-edit-typecheck.sh` | Runs TypeScript type checking on edited files |
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

Postgres-backed persistent memory with 3-tier search:

1. **tsvector** full-text search (best precision)
2. **pg_trgm** trigram fuzzy matching (typo-tolerant)
3. **ILIKE** substring fallback

Memories are scoped by project, categorized (preference, solution, architecture, pattern, insight, decision), and ranked by importance (1-10) and confidence (0-1).

```bash
# CLI commands
npx tsx memory/scripts/memory-runner.ts search "authentication pattern"
npx tsx memory/scripts/memory-runner.ts save "content" "category" importance
npx tsx memory/scripts/memory-runner.ts flush
npx tsx memory/scripts/memory-runner.ts session-start
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

---

## CLI Commands

```bash
# Setup
./scripts/setup.sh              # Full project setup
./scripts/init-global.sh        # Install into ~/.claude/ globally
./scripts/init-global.sh --uninstall  # Remove from ~/.claude/

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
cd ~/ultrathink && ./scripts/setup.sh && ./scripts/init-global.sh

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

---

## What Makes UltraThink Different

- **Skill chaining**: Skills link via `linksTo`/`linkedFrom` edges — when `react` fires, it pulls in `nextjs`, `tailwindcss`, and `testing-library` automatically. No manual `/skill` invocations needed.
- **Auto-activate**: Every prompt is scored against the full skill registry (<30ms). Top 5 skills inject their context automatically via `additionalContext`. You type naturally; skills fire behind the scenes.
- **Full skill library**: 125+ skills across 4 layers — from orchestrators (`gsd`, `plan`, `cook`) down to domain specialists (`stripe`, `drizzle`, `shadcn-ui`). Fork and add your own.
- **Open for contribution**: Clean skill format (single `SKILL.md`), registry-based graph, and documented hook lifecycle. Adding a skill takes 5 minutes. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Quality of life**: Session-persistent memory, privacy hooks that block credential access, auto-formatting on every edit, context-aware statusline, desktop notifications, stuck-agent detection, and a full observability dashboard.

---

## Acknowledgments

UltraThink builds on ideas and tools from the community. Credit where it's due.

**Core Integrations**

| Project | Author | What we use |
|---------|--------|-------------|
| [Superpowers](https://github.com/obra/superpowers) | **obra** (Jesse Vincent) | Workflow skills (TDD, systematic debugging, brainstorming, plan execution, verification) merged into the auto-trigger engine |
| [VFS](https://github.com/TrNgTien/vfs) | **TrNgTien** (Tien Tran) | Virtual Function Signatures — AST-based token compression (60-98% savings) |
| [Get Shit Done](https://github.com/gsd-build/get-shit-done) | **gsd-build** | Structured task execution framework — spec-driven planning, wave-based parallel execution, goal-backward verification |
| [Impeccable](https://github.com/pbakaus/impeccable) | **pbakaus** (Paul Bakaus) | Frontend design skill suite — audit, polish, animate, adapt, critique, and more |
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | **nextlevelbuilder** | UI/UX design intelligence and best practices |
| [Anthropic Skills](https://github.com/anthropics/skills) | **Anthropic** | Official skill format and conventions that UltraThink's skill mesh builds on |

**Skill Inspirations**

| Project | Author | What we use |
|---------|--------|-------------|
| [Promptfoo](https://github.com/promptfoo/promptfoo) | **promptfoo** | LLM red teaming and eval patterns |
| [OpenViking](https://github.com/IcelandicIcecworker/openviking) | **IcelandicIcecworker** | Context window optimization patterns |
| [Heretic](https://github.com/Heretic-Coder/heretic) | **Heretic-Coder** | Automated refactoring patterns |
| [MiroFish](https://github.com/mirofish/mirofish) | **MiroFish** | Swarm intelligence concepts for multi-agent coordination |

**Concepts & Community**

| Concept | Origin | How it influenced UltraThink |
|---------|--------|------------------------------|
| Building a Second Brain | **Tiago Forte** | The persistent memory system — scoped memories, importance ranking, session recall — follows the "capture, organize, distill, express" pattern |
| Second Brain Skills | [**coleam00**](https://github.com/coleam00/second-brain-skills) (Cole Medin) | Pioneered the "second brain" framing for Claude Code skills |
| CLAUDE.md Memory Bank | [**centminmod**](https://github.com/centminmod/my-claude-code-setup) | The `MEMORY.md` index pattern and `/update-memory-bank` concept |
| Everything Claude Code | [**affaan-m**](https://github.com/affaan-m/everything-claude-code) (Affaan Mustafa) | The large-scale skill + agent + hook architecture pattern |
| Claude Forge | [**sangrokjung**](https://github.com/sangrokjung/claude-forge) | Multi-layer skill mesh and security hook patterns |
| Claude Code Hooks Mastery | [**disler**](https://github.com/disler/claude-code-hooks-mastery) | Hook lifecycle patterns and observability approach |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built by <a href="https://github.com/InuVerse">InuVerse</a>
</p>
