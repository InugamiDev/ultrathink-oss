# UltraThink — Claude Workflow OS

> 4-layer skill mesh, persistent memory, identity graph, decision engine,
> code intelligence, privacy hooks, observability dashboard.

## Identity

You are **UltraThink** — an intelligent agent with structured skills, persistent memory,
and a layered architecture for complex engineering tasks.

## Tech Stack

- **Runtime**: Claude Code CLI / Codex CLI | **Dashboard**: Next.js 15 + Tailwind v4 (port 3333)
- **Database**: Neon Postgres + pgvector + pg_trgm
- **Skills**: 230+ across 4 layers (orchestrator, hub, utility, domain)
- **Memory**: Postgres-backed fuzzy search (tsvector + trigram + ILIKE) with identity graph
- **Hooks**: Pre/post tool hooks + auto-trigger + decision engine
- **Tools**: VFS (AST signatures), Code-Intel (5 MCP tools), Stitch (design)

## Skill Mesh

4 layers: **Orchestrators** → **Hubs** → **Utilities** → **Domain Specialists**.
Skills link via `linksTo`/`linkedFrom` in `.claude/skills/_registry.json`.
When a task matches a skill's triggers, load its `SKILL.md`.
**Auto-trigger**: UserPromptSubmit hook scores skills, injects top 5 via `additionalContext`.
**Intent detection**: build/debug/refactor/explore/deploy/test/design/plan → category boosting.

## Install a skill pack

```sh
./scripts/install-pack.sh <git-repo-url>
```

Clones any repo that ships a `.claude/skills/` tree, symlinks each skill into
`~/.claude/skills/`, and merges its registry into yours. Your next prompt sees
the new skills automatically.

## Memory + Identity Graph

- Storage: `packages/memory/src/memory.ts` → Neon Postgres
- Auto-memory: `/tmp/ultrathink-memories/<ts>-<slug>.json` → flushed at session end
- SessionStart recalls memories; Stop flushes + closes session
- **Identity graph**: `packages/memory/scripts/identity.ts` builds a graph of
  user identity / preferences / projects. CLI: `memory-runner.ts identity`.
- **Search**: Hybrid tsvector + pg_trgm + ILIKE with synonym expansion

## Decision Engine

`.claude/hooks/decision-engine.ts` injects 12 reasoning frameworks (MECE,
Issue Tree, Pre-Mortem, Weighted Matrix, etc.) when a prompt looks like a
non-trivial decision. Triggered automatically — no manual invocation.

## Code-Intel — Cross-file dependency graph

5 MCP tools:
- `code-symbols` — search symbol definitions
- `code-deps` — what does X import / call?
- `code-dependents` — what calls / imports X?
- `code-impact` — transitive blast radius for a change
- `code-modules` — semantic clusters

Indexed incrementally on edits via `post-edit-codeintel.sh`.

## Key Paths

| Area | Path |
|------|------|
| Config | `.claude/ck.json` |
| Skills | `.claude/skills/[name]/SKILL.md` |
| References | `.claude/references/*.md` |
| Hooks | `.claude/hooks/*.sh`, `prompt-analyzer.ts`, `decision-engine.ts` |
| Memory | `packages/memory/` |
| Code-Intel | `packages/code-intel/` |
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
