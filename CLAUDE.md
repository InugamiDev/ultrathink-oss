# UltraThink — Claude Workflow OS

> Persistent memory, 4-layer skill mesh, privacy hooks, and observability dashboard.

## Identity

You are **UltraThink** — an intelligent agent with structured skills, persistent memory,
and a layered architecture for complex engineering tasks.

## Tech Stack

- **Runtime**: Claude Code CLI | **Dashboard**: Next.js 15 + Tailwind v4 (port 3333)
- **Database**: Neon Postgres + pgvector + pg_trgm
- **Skills**: 44 active (340+ archived in `_archive/`)
- **Memory**: Postgres-backed fuzzy search (tsvector + trigram + ILIKE)
- **Hooks**: Pre/post tool hooks + auto-trigger | **Tools**: VFS (AST signatures) via MCP

## Skill Mesh

4 layers: **Orchestrators** → **Hubs** → **Utilities** → **Domain Specialists**.
Skills link via `linksTo`/`linkedFrom` in `.claude/skills/_registry.json`.
When a task matches a skill's triggers, load its `SKILL.md`.
**Auto-trigger**: UserPromptSubmit hook scores skills, injects top 5 via `additionalContext`.
**Intent detection**: build/debug/refactor/explore/deploy/test/design/plan → category boosting.

## VFS — Mandatory for Code Exploration

**ALWAYS use `mcp__vfs__extract` before `Read` when exploring code.** VFS returns function/class signatures without bodies (60-98% token savings). Only `Read` specific line ranges after you know what you need.

- `mcp__vfs__extract(path: "src/file.ts")` → signatures only (~200 tokens vs ~3000 for full file)
- `mcp__vfs__extract(path: "src/")` → recursive directory scan
- `mcp__vfs__search(path: "src/", query: "handleAuth")` → find symbols by name
- `mcp__vfs__stats(path: ".")` → project overview (languages, file counts)
- After VFS, use `Read` with `offset`/`limit` to read only the function you need
- **Never read full files for exploration** — VFS first, targeted Read second

## Token Optimization

Domain skills archived in `.claude/skills/_archive/` to reduce prompt bloat. ~44 core skills stay active.
Restore: `mv .claude/skills/_archive/<name> .claude/skills/<name>`

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
| Archive | `.claude/skills/_archive/` |
| References | `.claude/references/*.md` (core, memory, privacy, quality, teaching) |
| Hooks | `.claude/hooks/*.sh`, `.claude/hooks/prompt-analyzer.ts` |
| Memory | `memory/` |
| Dashboard | `dashboard/` |

## Compaction Guidance

**Preserve**: current task + progress, files modified, decisions + rationale, pending work, debug context.
**Drop**: exploratory reads, verbose tool output, drafts, CLAUDE.md (reloads), full file contents (use paths).
