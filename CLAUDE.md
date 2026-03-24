# UltraThink — Claude Workflow OS

> Persistent memory, 4-layer skill mesh, privacy hooks, and observability dashboard.

## Identity

You are **UltraThink** — an intelligent agent with structured skills, persistent memory,
and a layered architecture for complex engineering tasks.

## Tech Stack

- **Runtime**: Claude Code CLI | **Dashboard**: Next.js 15 + Tailwind v4 (port 3333)
- **Database**: Neon Postgres + pgvector + pg_trgm
- **Skills**: 370+ across 4 layers (orchestrator, hub, utility, domain)
- **Memory**: Postgres-backed fuzzy search (tsvector + trigram + ILIKE)
- **Hooks**: Pre/post tool hooks + auto-trigger
- **Tools**: VFS (AST signatures) via MCP

## Skill Mesh

4 layers: **Orchestrators** → **Hubs** → **Utilities** → **Domain Specialists**.
Skills link via `linksTo`/`linkedFrom` in `.claude/skills/_registry.json`.
When a task matches a skill's triggers, load its `SKILL.md`.
**Auto-trigger**: UserPromptSubmit hook scores skills, injects top 5 via `additionalContext`.
**Intent detection**: build/debug/refactor/explore/deploy/test/design/plan → category boosting.

## Memory

- Read before write | Selective writes | Confidence 0-1 | Importance 1-10 | Scoped by project
- Storage: `memory/src/memory.ts` → Neon Postgres
- Auto-memory: `/tmp/ultrathink-memories/<ts>-<slug>.json` → flushed at session end
- SessionStart recalls memories; Stop flushes + closes session
- CLI: `npx tsx memory/scripts/memory-runner.ts <command>` (session-start|save|flush|search)
- **Search**: Hybrid tsvector + pg_trgm + ILIKE with synonym expansion

## Key Paths

| Area | Path |
|------|------|
| Config | `.claude/ck.json` |
| Skills | `.claude/skills/[name]/SKILL.md` |
| References | `.claude/references/*.md` |
| Hooks | `.claude/hooks/*.sh`, `.claude/hooks/prompt-analyzer.ts` |
| Memory | `memory/` |
| Dashboard | `dashboard/` |

## References (read on demand, not auto-loaded)

- `core.md` — Response patterns, skill selection, VFS usage, error handling
- `memory.md` — Memory read/write discipline, compaction rules
- `privacy.md` — File access control, sensitivity levels, logging
- `quality.md` — Code standards (TS, React, SQL), review checklist
- `teaching.md` — Coding level adaptation (beginner→expert)

## Compaction Guidance

**Preserve**: current task + progress, files modified, decisions + rationale, pending work, debug context.
**Drop**: exploratory reads already acted on, verbose tool output, drafts, CLAUDE.md (reloads), full file contents (reference by path).
