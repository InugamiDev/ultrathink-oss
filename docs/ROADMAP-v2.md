# UltraThink v2 Roadmap — Agent Harness OS

> Canonical plan for the 3-tier system, /forge pipeline, memory overhaul, and installation.
> Written 2026-04-06. Source of truth for all future sessions.

---

## Architecture Decisions (LOCKED)

These were decided in brainstorm sessions and are not open for debate.

| Decision | Value | Rationale |
|----------|-------|-----------|
| UltraThink is... | Agent Harness for Claude CLI | Model is commodity, harness is the moat |
| Tiers | OSS → Builder → Core | 3-tier: open → guided → full |
| Runtime location | `~/.claude/` (global) + `~/.ultrathink/` (data) | Works from ANY project directory |
| Source of truth | Neon Postgres (cloud DB) | Dashboard + Claude both write here directly |
| Obsidian vault | `~/.ultrathink/vault/` | Human interface for memory/graph, synced at session boundaries |
| Dashboard | `localhost:3333` | Real-time graph + memory editor via API routes |
| /forge default mode | `--guided` (step-by-step, no jargon) | Lower barrier for non-tech users |
| /forge follow-up | `--builder` (enforced phases, validation gates) | After user is comfortable with guided |
| Feature granularity | Phased (3-5 phases × 5-10 atomic features each) | Non-tech sees phases, tech sees features |
| Evaluator | Heavy (Playwright) but configurable via user decisions | User sets `use_playwright`, `criteria_weights`, `pass_threshold` |
| State format | JSON (not Markdown) | Models respect JSON structure, won't randomly edit it |
| Forge state location | `~/.ultrathink/forge/projects/<hash>.json` | Per-project, survives compaction |
| Memory sync | Session-boundary (not real-time) | Vault ↔ DB sync at session-start and session-end |
| Conflict resolution | `source: user` → vault wins, `source: claude` → DB wins | Each note's source field determines authority |
| Installation | Single command: `curl -sSL .../install \| bash` | Interactive prompts for tier, DB, vault location |
| Builder tier | Config layer on top of OSS (upgrade script) | Not a separate repo |

---

## Tier Feature Matrix (LOCKED)

| Layer | OSS | Builder | Core |
|---|---|---|---|
| /forge basic pipeline | yes | yes | yes |
| Enforced phase gates | no | yes | yes |
| Manual decisions | yes | yes | yes |
| Auto-decision extraction | no | yes | yes |
| Full Tekio (wheel) | no | no | yes |
| Identity graph | no | yes | yes |
| Code intelligence | no | no | yes |
| Dashboard graph (view) | yes | yes | yes |
| Dashboard graph (edit) | yes | yes | yes |
| Obsidian vault sync | yes | yes | yes |
| Playwright evaluator | no | configurable | yes |
| Search result cap hook | yes | yes | yes |
| VFS-first enforcement | yes | yes | yes |
| Linter-reject-before-apply | yes | yes | yes |

---

## File System Layout (TARGET)

```
~/.claude/                              # Claude Code global config (installed by script)
├── CLAUDE.md                           # UltraThink identity (tier-specific variant)
├── hooks/                              # Global hooks
│   ├── privacy-hook.sh                 # Block .env, .pem, credentials
│   ├── memory-auto-save.sh             # Auto-capture memories
│   ├── memory-session-start.sh         # Recall memories + vault sync (vault→DB)
│   ├── memory-session-end.sh           # Flush memories + vault sync (DB→vault)
│   ├── prompt-analyzer.ts              # Skill scoring + intent detection
│   ├── prompt-submit.sh                # Orchestrator
│   ├── format-check.sh                 # Linter-reject-before-apply (UPGRADE)
│   ├── search-cap.sh                   # NEW: cap tool results at 50 items
│   ├── vfs-enforce.sh                  # NEW: remind to use VFS before Read
│   ├── suggest-compact.sh              # Context compression (+ turn-depth trigger)
│   ├── forge-hydrate.sh                # NEW: inject forge state at session start
│   ├── decision-inject.sh              # NEW: inject decisions at session start
│   ├── decision-extract.sh             # NEW (Builder+Core): extract decisions from corrections
│   └── ... (other existing hooks)
├── skills/                             # Skill definitions
│   ├── _registry.json                  # Master index (388 OSS / 393 Core)
│   ├── forge/SKILL.md                  # NEW: /forge meta-command
│   └── ... (all other skills)
├── references/                         # Reference documents
└── settings.json                       # MCP config (tier-specific)

~/.ultrathink/                          # UltraThink data directory
├── vault/                              # Obsidian vault (memory + graph)
│   ├── .obsidian/                      # Obsidian config (auto-generated)
│   ├── memories/                       # Memory notes (.md)
│   ├── decisions/                      # Decision notes (.md)
│   ├── identity/                       # Identity graph notes (Builder+Core)
│   ├── forge/                          # Forge project notes
│   ├── adaptations/                    # Tekio adaptation notes (Core only)
│   ├── _templates/                     # Note templates for each type
│   └── .last-sync                      # Sync checkpoint timestamp
├── forge/                              # Forge runtime state
│   └── projects/                       # Per-project state
│       └── <hash>.json                 # forge-state.json (JSON, not MD)
├── decisions/                          # Decision runtime state
│   ├── global.json                     # Global decisions
│   └── projects/
│       └── <hash>.json                 # Project-scoped decisions
└── config.json                         # UltraThink config (tier, db url, vault path, etc.)

~/Documents/.../ultrathink/             # Source/development repo (NOT runtime)
├── memory/                             # Memory system source code
├── dashboard/                          # Dashboard source code
├── scripts/
│   ├── install.sh                      # Main installer (interactive, all tiers)
│   ├── upgrade-to-builder.sh           # OSS → Builder upgrade
│   ├── vault-sync.ts                   # Obsidian ↔ Postgres sync engine
│   └── parity-check.sh                 # Core/OSS parity enforcement
└── docs/
    └── ROADMAP-v2.md                   # THIS FILE
```

---

## Build Phases

### Phase A: Foundation (do first)
1. **`scripts/install.sh`** — Interactive installer. Detects Claude Code, asks tier, copies files to `~/.claude/` and `~/.ultrathink/`, runs smoke test.
2. **`scripts/upgrade-to-builder.sh`** — Adds Builder hooks + identity + forge gates on top of OSS install.
3. **`~/.ultrathink/config.json`** — Tier config, DB URL, vault path, evaluator preferences.
4. **Tier-specific `CLAUDE.md` variants** — `CLAUDE-oss.md`, `CLAUDE-builder.md`, `CLAUDE-core.md` in source repo. Installer copies the right one.
5. **Smoke test** — Verify hooks load, skills count matches tier, memory ping (if DB), vault dir exists.

### Phase B: Memory Overhaul
1. **Vault note format** — Standardize frontmatter schema for memories, decisions, identity, forge, adaptations.
2. **`scripts/vault-sync.ts`** — Bidirectional sync engine. Parse .md ↔ Postgres. Session-boundary triggers.
3. **Vault templates** — `_templates/memory.md`, `_templates/decision.md`, etc. for Obsidian template plugin.
4. **Hook integration** — Modify `memory-session-start.sh` to call vault-sync (vault→DB). Modify `memory-session-end.sh` to call vault-sync (DB→vault).
5. **Obsidian config** — Auto-generate `.obsidian/` with graph view settings, color groups, template plugin config.

### Phase C: Dashboard Graph + Editor
1. **`/dashboard/graph`** — React Flow (@xyflow/react) interactive graph page. Nodes = DB records. Edges = relationships. Editable.
2. **`/dashboard/memories`** — Memory CRUD editor with search, filters, bulk actions.
3. **API routes** — `/api/graph/nodes`, `/api/graph/edges`, `/api/memories/[id]`, `/api/decisions/[id]`.
4. **Real-time updates** — Dashboard writes to DB, graph re-renders.

### Phase D: /forge Pipeline
1. **`.claude/skills/forge/SKILL.md`** — The meta-command. 7 phases: clarify → feasibility → plan → build → validate → improve → ship.
2. **Forge state manager** — Read/write `~/.ultrathink/forge/projects/<hash>.json`.
3. **Phase gates (Builder+Core)** — Must pass feasibility (score >3) to plan. Must pass validation to ship.
4. **Evaluator** — Light: build + test + structural checks. Heavy: + Playwright click-through. Configurable via decisions.
5. **`--guided` mode** — Default. Step-by-step, plain language, explains each phase before executing.
6. **`--builder` mode** — Enforced phases, validation gates, auto-decision extraction.
7. **Forge vault notes** — Each forge project generates a summary note in `vault/forge/`.

### Phase E: Decision Layer
1. **`memory/src/decisions.ts`** — CRUD for decision rules. Global + project-scoped.
2. **`decision-inject.sh`** — Session start hook: load decisions from `~/.ultrathink/decisions/` + DB → inject as constraints.
3. **`decision-extract.sh`** (Builder+Core) — Post-agent hook: detect user corrections → extract as decision rules.
4. **Decision vault notes** — Sync decisions to `vault/decisions/` as .md files.

### Phase F: Harness Engineering Hooks
1. **`search-cap.sh`** — PostToolUse hook: if Bash/Grep/Glob output > 50 lines, inject "refine your query" message.
2. **`vfs-enforce.sh`** — PreToolUse hook on Read: if VFS not called yet in session, inject reminder.
3. **`format-check.sh` upgrade** — Return `"decision": "block"` on syntax errors (reject before apply).
4. **`suggest-compact.sh` upgrade** — Add turn-depth trigger (5 turns → suggest compression).

---

## Pending Questions (OPEN)

- [ ] Obsidian vault: should it auto-open on install? Or just create the folder and let user open manually?
- [ ] Dashboard graph library: @xyflow/react (React Flow) vs d3-force? React Flow is more interactive, d3 is lighter.
- [ ] Vault sync: should it run as a background daemon, or only at session boundaries?
- [ ] /forge: should the evaluator agent be a subagent (separate context) or inline (same context)?
- [ ] Identity graph (Builder): full Postgres table or lightweight JSON at `~/.ultrathink/identity/`?
- [ ] Non-tech install: should we provide a .dmg/.exe wrapper, or is `curl | bash` sufficient?

---

## Implementation Order

```
Phase A (foundation) → Phase B (memory) → Phase D (/forge) → Phase E (decisions) → Phase C (dashboard) → Phase F (hooks)
```

Rationale: Install scripts first (unblocks testing everything else). Memory overhaul second (vault sync is foundational for decisions + forge). /forge third (the killer feature). Decisions fourth (feeds into forge). Dashboard fifth (visualization of what already works). Harness hooks last (polish).

---

## Reference Documents

- `brain-storm-with-gpt.txt` — Original brainstorm (3900 lines, read but not authoritative)
- `docs/TIER-MANIFEST.md` — Core/OSS boundary (needs update for 3-tier)
- `docs/audit/improvement-plan-2026-04-05.md` — Phase 1 quick wins (mostly done)
- `memory: project_ultrathink-vision-2026-04-06.md` — Saved vision summary
- Anthropic harness engineering paper insights — embedded in brainstorm session
