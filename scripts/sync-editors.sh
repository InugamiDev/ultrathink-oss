#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# UltraThink — Cross-Editor Sync
# Generates config files for Cursor, Windsurf, Antigravity, Copilot, and Codex
# from UltraThink's canonical agent instruction files.
#
# Usage: ./scripts/sync-editors.sh [--all | --cursor | --windsurf | --antigravity | --copilot | --codex]
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
# OSS-safe content only — no Tekiō, Code-Intel, identity graph
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
- **Skills**: 125 across 4 layers (8 orchestrator, 18 hub, 35 utility, 64 domain)
- **Memory**: Postgres-backed Second Brain with 4-wing architecture
- **Search**: Hybrid tsvector + pg_trgm + ILIKE with synonym expansion
- **Tools**: VFS (AST signatures, 60-98% token savings) via MCP

## Memory (Second Brain)

- **4-wing structure**: agent (WHO I am) | user (WHO you are) | knowledge (WHAT learned) | experience (WHAT happened)
- **4-layer recall**: L0 core (~100tok) → L1 essential (~300tok) → L2 context (~500tok) → L3 on-demand
- **Zettelkasten linking**: Relations typed as learned-from | contradicts | supports | applies-to | caused-by | supersedes
- **AAAK**: Lossless shorthand dialect for ~1.5x compression on recall output

### Memory Commands

```bash
npx tsx memory/scripts/memory-runner.ts session-start  # Load context
npx tsx memory/scripts/memory-runner.ts search "query"  # Search memories
npx tsx memory/scripts/memory-runner.ts save "content" "category" importance
npx tsx memory/scripts/memory-runner.ts flush            # Flush pending
```

## Skill System

Skills are folders in `.claude/skills/[name]/` containing:
- `SKILL.md` — Core instructions (loaded on trigger)
- `references/` — API docs, edge cases (loaded on demand)
- `scripts/` — Helper scripts the agent can run
- `assets/` — Templates, data files

Progressive disclosure: metadata at startup (~100tok/skill), body on trigger, references on demand.

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
- Tests: Vitest for unit
- Git: Conventional commits, no force push

## References (read on demand)

- `.claude/references/core.md` — Response patterns, skill selection, error handling
- `.claude/references/memory.md` — Memory read/write discipline
- `.claude/references/privacy.md` — File access control, sensitivity levels
- `.claude/references/quality.md` — Code standards, review checklist
- `.claude/references/teaching.md` — Coding level adaptation
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
Skills are folders containing SKILL.md + references + scripts + assets.
Progressive disclosure: only load what you need.

To find relevant skills:
1. Look at the task keywords
2. Check `.claude/skills/_registry.json` for matching triggers
3. Read the matching `SKILL.md` file
4. Read `references/` only when you need deeper context
5. Follow the workflow

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
- 4-wing architecture: agent/user/knowledge/experience
- 3-tier search: tsvector → pg_trgm → ILIKE with synonym expansion
- All queries parameterized — no string interpolation
- Importance scale 1-10, confidence 0-1
- Read before write — always check existing memories before saving
- Quality gates: reject <20 chars, code dumps, raw errors
EOF
  ok ".cursor/rules/memory.mdc"
}

# ── 2. Windsurf (.windsurf/rules/) ──────────────────────────────
sync_windsurf() {
  log "Syncing Windsurf rules..."
  mkdir -p "$ROOT/.windsurf/rules"

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

  # Use the hand-curated GEMINI.md if it exists, otherwise generate
  if [[ -f "$ROOT/GEMINI.md" ]]; then
    ok "GEMINI.md (kept existing — hand-curated)"
  else
    {
      echo "# UltraThink — Gemini Agent Instructions"
      echo ""
      generate_core_instructions
      cat << 'EOF'

## Key Skills for Common Tasks

| Task | Skill | Trigger |
|------|-------|---------|
| Build a feature | `gsd` | "build", "implement" |
| Debug an issue | `debug` | "fix this", "why is" |
| Write tests | `test` | "write tests" |
| Plan architecture | `plan` | "how should we" |
| UI design | `ui-design-pipeline` | "design a page" |
| Code review | `code-review` | "review this" |
| Optimize perf | `optimize` | "make it faster" |
EOF
    } > "$ROOT/GEMINI.md"
    ok "GEMINI.md (generated)"
  fi
}

# ── 4. GitHub Copilot (.github/copilot-instructions.md) ─────────
sync_copilot() {
  log "Syncing Copilot instructions..."
  mkdir -p "$ROOT/.github"

  # Use the hand-curated file if it exists, otherwise generate
  if [[ -f "$ROOT/.github/copilot-instructions.md" ]]; then
    ok ".github/copilot-instructions.md (kept existing — hand-curated)"
  else
    {
      echo "# UltraThink — Copilot Agent Instructions"
      echo ""
      generate_core_instructions
    } > "$ROOT/.github/copilot-instructions.md"
    ok ".github/copilot-instructions.md (generated)"
  fi
}

# ── 5. Codex (AGENTS.md + .codex/) ──────────────────────────────
sync_codex() {
  log "Syncing Codex instructions..."

  # Use the hand-curated AGENTS.md if it exists, otherwise generate
  if [[ -f "$ROOT/AGENTS.md" ]]; then
    ok "AGENTS.md (kept existing — hand-curated)"
  else
    {
      echo "# UltraThink — Codex Agent Instructions"
      echo ""
      generate_core_instructions
      cat << 'EOF'

## Codex Runtime Mapping

| Claude Code | Codex CLI |
|-------------|-----------|
| `CLAUDE.md` | `AGENTS.md` (this file) |
| `.claude/settings.json` | `.codex/config.toml` |
| `.claude/hooks/*.sh` | `.codex/hooks.json` |
| `.mcp.json` | `.codex/config.toml` `[mcp_servers]` |

## Operating Workflow

1. Check `.ckignore` before broad file exploration or search.
2. Use VFS (`mcp__vfs__extract`) before reading any file.
3. For non-trivial tasks, find the relevant skill in `.claude/skills/` and read its `SKILL.md`.
4. Read `.claude/references/*.md` only when the task needs extra context.
5. Read before write — check existing memories before creating new ones.

## Privacy Protocol

1. Check `.ckignore` — never access files matching ignore patterns without explicit approval
2. No secrets in output — never echo API keys, tokens, credentials, or `.mcp.json` env values
3. Ask before accessing sensitive paths
EOF
    } > "$ROOT/AGENTS.md"
    ok "AGENTS.md (generated)"
  fi

  # Codex config directory
  mkdir -p "$ROOT/.codex"
  if [[ ! -f "$ROOT/.codex/config.toml" ]]; then
    cat > "$ROOT/.codex/config.toml" << 'TOML'
# UltraThink — Codex CLI Configuration
model = "gpt-5"
approval_policy = "on-request"

[features]
codex_hooks = true

[mcp_servers.vfs]
command = ["vfs", "mcp"]
TOML
    ok ".codex/config.toml (generated)"
  else
    ok ".codex/config.toml (kept existing)"
  fi

  if [[ ! -f "$ROOT/.codex/hooks.json" ]]; then
    cat > "$ROOT/.codex/hooks.json" << 'JSON'
{
  "hooks": {
    "PreToolUse": [
      {
        "command": [".claude/hooks/privacy-hook.sh"],
        "description": "Block access to sensitive files"
      }
    ],
    "SessionStart": [
      {
        "command": ["npx", "tsx", "memory/scripts/memory-runner.ts", "session-start"],
        "description": "Load memory context and adaptive learning rules"
      }
    ],
    "Stop": [
      {
        "command": ["npx", "tsx", "memory/scripts/memory-runner.ts", "flush"],
        "description": "Flush pending memories and close session"
      }
    ]
  }
}
JSON
    ok ".codex/hooks.json (generated)"
  else
    ok ".codex/hooks.json (kept existing)"
  fi
}

# ── Execute ──────────────────────────────────────────────────────
case "$TARGETS" in
  --all)
    sync_cursor
    sync_windsurf
    sync_antigravity
    sync_copilot
    sync_codex
    ;;
  --cursor)      sync_cursor ;;
  --windsurf)    sync_windsurf ;;
  --antigravity) sync_antigravity ;;
  --copilot)     sync_copilot ;;
  --codex)       sync_codex ;;
  *)
    echo "Usage: $0 [--all | --cursor | --windsurf | --antigravity | --copilot | --codex]"
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
[[ "$TARGETS" == "--all" || "$TARGETS" == "--codex" ]] && echo "    AGENTS.md + .codex/      (Codex)"
echo ""
echo "  All editors now share UltraThink's skill system and conventions."
echo ""
