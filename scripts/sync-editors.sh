#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# UltraThink — Cross-Editor Sync
# Generates config files for Cursor, Windsurf, Antigravity, Copilot
# from UltraThink's CLAUDE.md and skill registry.
#
# Usage: ./scripts/sync-editors.sh [--all | --cursor | --windsurf | --antigravity | --copilot]
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[sync]${NC} $*"; }
ok()  { echo -e "${GREEN}[ok]${NC}   $*"; }

# Default: sync all
TARGETS="${1:---all}"

# ── Read CLAUDE.md ───────────────────────────────────────────────
CLAUDE_MD="$ROOT/CLAUDE.md"
if [[ ! -f "$CLAUDE_MD" ]]; then
  echo "Error: CLAUDE.md not found at $CLAUDE_MD"
  exit 1
fi

# ── Core instructions (shared across all editors) ────────────────
# Extract the essential parts of CLAUDE.md for other editors
generate_core_instructions() {
  cat << 'CORE'
# UltraThink — Workflow OS for AI Code Editors

> Persistent memory, 4-layer skill mesh, privacy hooks, and observability dashboard.

## Identity

You are **UltraThink** — an intelligent agent with structured skills, persistent memory,
and a layered architecture for complex engineering tasks.

## Tech Stack

- **Dashboard**: Next.js 15 + Tailwind v4 (port 3333)
- **Database**: Neon Postgres + pgvector + pg_trgm
- **Skills**: 370+ across 4 layers (orchestrator, hub, utility, domain)
- **Memory**: Postgres-backed fuzzy search (tsvector + trigram + ILIKE)
- **Tools**: VFS (AST signatures) via MCP

## Skill System

Skills are in `.claude/skills/[name]/SKILL.md`. Each skill has:
- Triggers (keywords that activate it)
- Inputs/outputs
- Step-by-step workflow instructions
- Links to related skills

When a task matches a skill's triggers, read and follow its SKILL.md.

## Key Paths

| Area | Path |
|------|------|
| Skills | `.claude/skills/[name]/SKILL.md` |
| References | `.claude/references/*.md` |
| Memory | `memory/` |
| Dashboard | `dashboard/` |

## Code Standards

- TypeScript strict mode, no `any`
- React: functional components, hooks, server components where possible
- CSS: Tailwind v4 with CSS custom properties for design tokens
- SQL: Parameterized queries only, no string interpolation
- Tests: Vitest for unit, Playwright for E2E
- Git: Conventional commits, no force push

## References (read on demand)

- `.claude/references/core.md` — Response patterns, skill selection, error handling
- `.claude/references/memory.md` — Memory read/write discipline
- `.claude/references/privacy.md` — File access control, sensitivity levels
- `.claude/references/quality.md` — Code standards, review checklist
CORE
}

# ── 1. Cursor (.cursor/rules/) ───────────────────────────────────
sync_cursor() {
  log "Syncing Cursor rules..."
  mkdir -p "$ROOT/.cursor/rules"

  # Main project rules
  cat > "$ROOT/.cursor/rules/ultrathink.mdc" << 'EOF'
---
description: UltraThink project rules and conventions
globs:
alwaysApply: true
---
EOF
  generate_core_instructions >> "$ROOT/.cursor/rules/ultrathink.mdc"
  ok ".cursor/rules/ultrathink.mdc"

  # Skill-aware rule
  cat > "$ROOT/.cursor/rules/skills.mdc" << 'EOF'
---
description: UltraThink skill system — read matching SKILL.md files for task guidance
globs:
alwaysApply: true
---

# Skill System

When working on a task, check if any skill in `.claude/skills/` matches.
Skills contain step-by-step workflows, best practices, and constraints.

To find relevant skills:
1. Look at the task keywords
2. Check `.claude/skills/_registry.json` for matching triggers
3. Read the matching `SKILL.md` file
4. Follow its workflow

Key skills: gsd (task execution), react, nextjs, tailwindcss, debug, test, plan, research-loop, ui-design-pipeline
EOF
  ok ".cursor/rules/skills.mdc"

  # Dashboard rules
  cat > "$ROOT/.cursor/rules/dashboard.mdc" << 'EOF'
---
description: Dashboard development rules
globs: dashboard/**
alwaysApply: false
---

# Dashboard Rules

- Next.js 15 App Router with React 19
- Tailwind CSS v4 (CSS-first config, @theme directive)
- CSS custom properties for all design tokens (--color-*, --space-*)
- No external component libraries — custom components only
- API routes read from Neon Postgres or local filesystem
- Port 3333
EOF
  ok ".cursor/rules/dashboard.mdc"

  # Memory rules
  cat > "$ROOT/.cursor/rules/memory.mdc" << 'EOF'
---
description: Memory system rules
globs: memory/**
alwaysApply: false
---

# Memory System Rules

- TypeScript with strict mode
- Neon Postgres with `postgres` package (not pg)
- 3-tier search: tsvector → pg_trgm → ILIKE with synonym expansion
- All queries parameterized — no string interpolation
- Importance scale 1-10, confidence 0-1
- Read before write — always check existing memories before saving
EOF
  ok ".cursor/rules/memory.mdc"
}

# ── 2. Windsurf (.windsurf/rules/) ──────────────────────────────
sync_windsurf() {
  log "Syncing Windsurf rules..."
  mkdir -p "$ROOT/.windsurf/rules"

  # Main rules
  {
    generate_core_instructions
    cat << 'EOF'

## Windsurf-Specific

- Use Cascade's file context to read skill files when tasks match triggers
- Reference `.claude/skills/_registry.json` for the full skill index
- When modifying dashboard code, always check the existing design tokens in `globals.css`
- For memory operations, read `memory/src/memory.ts` for the API surface
EOF
  } > "$ROOT/.windsurf/rules/ultrathink.md"
  ok ".windsurf/rules/ultrathink.md"
}

# ── 3. Google Antigravity (GEMINI.md) ───────────────────────────
sync_antigravity() {
  log "Syncing Antigravity (GEMINI.md)..."

  {
    generate_core_instructions
    cat << 'EOF'

## Antigravity-Specific

- Skills are in `.claude/skills/[name]/SKILL.md` — same format as Antigravity skills
- The skill registry at `.claude/skills/_registry.json` maps triggers to skills
- MCP servers are configured in `.mcp.json` (VFS for AST signatures)
- Dashboard runs on port 3333: `cd dashboard && npm run dev`
- Memory CLI: `npx tsx memory/scripts/memory-runner.ts <command>`

## Key Skills for Common Tasks

| Task | Skill | Trigger |
|------|-------|---------|
| Build a feature | `gsd` | "/gsd", "build", "implement" |
| Debug an issue | `debug` | "/debug", "fix this", "why is" |
| Write tests | `test` | "/test", "write tests" |
| Plan architecture | `plan` | "/plan", "how should we" |
| UI design | `ui-design-pipeline` | "/design-pipeline", "design a page" |
| Experiment loop | `research-loop` | "/experiment", "iterate until" |
| Code review | `code-review` | "/review", "review this" |
| Optimize perf | `optimize` | "/optimize", "make it faster" |
EOF
  } > "$ROOT/GEMINI.md"
  ok "GEMINI.md"
}

# ── 4. GitHub Copilot (.github/copilot-instructions.md) ─────────
sync_copilot() {
  log "Syncing Copilot instructions..."
  mkdir -p "$ROOT/.github"

  generate_core_instructions > "$ROOT/.github/copilot-instructions.md"
  ok ".github/copilot-instructions.md"
}

# ── Execute ──────────────────────────────────────────────────────
case "$TARGETS" in
  --all)
    sync_cursor
    sync_windsurf
    sync_antigravity
    sync_copilot
    ;;
  --cursor)     sync_cursor ;;
  --windsurf)   sync_windsurf ;;
  --antigravity) sync_antigravity ;;
  --copilot)    sync_copilot ;;
  *)
    echo "Usage: $0 [--all | --cursor | --windsurf | --antigravity | --copilot]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Editor configs synced!${NC}"
echo ""
echo "  Generated files:"
[[ "$TARGETS" == "--all" || "$TARGETS" == "--cursor" ]] && echo "    .cursor/rules/*.mdc     (Cursor)"
[[ "$TARGETS" == "--all" || "$TARGETS" == "--windsurf" ]] && echo "    .windsurf/rules/*.md     (Windsurf)"
[[ "$TARGETS" == "--all" || "$TARGETS" == "--antigravity" ]] && echo "    GEMINI.md                (Antigravity)"
[[ "$TARGETS" == "--all" || "$TARGETS" == "--copilot" ]] && echo "    .github/copilot-instructions.md  (Copilot)"
echo ""
echo "  All editors now share UltraThink's skill system and conventions."
echo ""
