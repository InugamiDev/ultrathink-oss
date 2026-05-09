# Codebase layout

> Target organization for the UltraThink monorepo. Inspired by Warp's
> `apps/` + `crates/` separation, adapted for our Node + Rust stack.

## Principles

1. **Surfaces vs libraries.** `apps/` is what users interact with. `packages/` is what those apps depend on. No library lives in `apps/`; no surface lives in `packages/`.
2. **First-party vs vendored.** First-party code lives at the top level. Third-party / paused code lives under `vendored/`. New developers should be able to tell at a glance what's "ours".
3. **Tools vs product.** Things that exist for development (the test harness, the Übersicht widget, smoke scripts) live under `tools/`, not at root and not in `apps/`.
4. **One npm scope for first-party.** Pick one (`@ultrathink/*` or `@inuverse/*`) and migrate. Mixed scopes are technical debt.
5. **Skills are first-class.** They're not a Claude Code implementation detail — they're a top-level artefact others can install. Visible at the root.

## Target shape

```
ultrathink/
├── apps/                       USER-FACING APPS
│   ├── studio/                 Tauri desktop app (UltraThink Studio)
│   ├── dashboard/              Next.js web dashboard
│   ├── cli/                    `ut` terminal CLI
│   └── site/                   marketing landing (ultrathink.studio)
│
├── packages/                   FIRST-PARTY LIBRARIES (apps depend on these)
│   ├── memory/                 4-wing memory + Tekiō learning + recall
│   ├── code-intel/             dependency-graph indexer
│   ├── studio-engine/          Claude Code spawn + skill router + sidecar
│   └── shared/                 (future — shared types/util across apps)
│
├── mcp/                        MCP SERVERS
│   ├── memory/
│   ├── design-doc/
│   ├── code-intel/
│   ├── transparency/
│   └── agora/
│
├── skills/                     THE SKILL LIBRARY (currently .claude/skills)
│
├── vendored/                   THIRD-PARTY / PAUSED
│   ├── paperclip/              vendored Paperclip (paused — see project_company-paused)
│   └── openclaw/
│
├── tools/                      DEV TOOLING
│   ├── harness/                evaluation harness
│   ├── widgets/                Übersicht status widget
│   └── smoke/                  smoke-test scripts
│
├── tests/                      integration / cross-package tests
│
├── docs/                       written docs
│   ├── assets/                 images, demos
│   ├── design/                 design tokens, .pen sources
│   └── scratch/                informal notes
│
├── scripts/                    one-off ops scripts (DB migration, etc.)
│
├── .claude-plugin/             plugin marketplace manifest
├── .claude/                    Claude Code config (hooks, references)
├── .github/                    CI workflows
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json          (new — shared compiler settings)
├── CLAUDE.md                   primary project doc
├── AGENTS.md                   thin alias → CLAUDE.md (multi-agent compat)
└── README.md                   public-facing
```

## Inspiration: Warp's organization

Warp's open-source repo (warpdotdev/warp, AGPL) keeps it spartan:
- `app/` — single primary client
- `crates/` — Rust library modules
- `command-signatures-v2/js/` — JS-defined command schemas
- `script/` — build/utility (singular, not "scripts")
- `resources/` — static assets
- `specs/` — design specs
- `.agents/skills` — agent configurations
- `.claude/` — Claude Code integration

What we adopt: clean `apps/` ↔ libs separation, `tools/` for dev infrastructure, `vendored/` to demote 3rd-party out of the spotlight, skills at root.

What we adapt: we use `packages/` instead of `crates/` (we're Node-first), we keep `mcp/` separate from `packages/` because it's a distinct deployment shape, and we keep `tests/` at the top because cross-package integration tests don't belong inside any one package.

## Migration phases

### Phase A — root cleanup (no workspace impact)

| Move | From | To |
|---|---|---|
| Loose smoke scripts | `smoke-*.cjs`, `smoke-*.mjs` (root) | `tools/smoke/` |
| Landing-page screenshots | `*.png` (root) | `docs/assets/landing/` |
| Brainstorm scratch | `brain-storm-with-gpt.txt` | `docs/scratch/` |
| Design source | `design-system.pen` | `docs/design/` |

Risk: zero. Nothing imports these.

### Phase B — package relocations (workspace updates required)

| Move | From | To |
|---|---|---|
| Memory lib | `memory/` | `packages/memory/` |
| Code-intel lib | `code-intel/` | `packages/code-intel/` |
| Studio engine | `apps/studio-engine/` | `packages/studio-engine/` |
| Dashboard | `dashboard/` | `apps/dashboard/` |
| Harness | `harness/` | `tools/harness/` |
| Widgets | `widgets/` | `tools/widgets/` |
| Plugin orphan | `openclaw/` | `vendored/openclaw/` |

Risk: medium. Requires:
- `pnpm-workspace.yaml` updates
- `tsconfig.json` reference updates in any package that uses TS project references
- Hardcoded path updates in scripts/hooks (especially the Übersicht widget command which calls `memory/scripts/usage-report.ts`)
- Tauri Rust sidecar resolver update (currently walks up looking for `apps/studio-engine/dist/sidecar.js`)

Workspace deps via `workspace:*` keep working — paths only need updating in workspace.yaml and any explicit `tsconfig.json` references.

### Phase C — vendored isolation (deferred)

| Move | From | To | Reason for defer |
|---|---|---|---|
| Paperclip src | `paperclip/` | `vendored/paperclip/` | 143MB, deep workspace deps, paused — high risk vs current value |
| Paperclip-era apps | `apps/discord-bot/`, `apps/ut-bridge/` | `vendored/paperclip-era/{discord-bot,ut-bridge}/` | Tied to Paperclip; move with it |

Recommend: revisit when Paperclip's fate is decided (delete vs revive).

### Phase D — naming polish (deferred)

Standardise to one npm scope for first-party. Existing inventory:

| Scope | Packages |
|---|---|
| `@ultrathink/*` | memory, code-intel, dashboard, harness, mcp-memory, mcp-design-doc, mcp-agora |
| `@inuverse/*` | studio, studio-engine, ut-cli, ut-bridge, transparency |
| `@paperclipai/*` | (vendored — leave alone) |

Recommendation: standardise to `@ultrathink/*` (matches project + skill name + most existing packages). Rename `@inuverse/*` to `@ultrathink/*` in a single PR with codemod.

### Phase E — agent-doc consolidation

Today there are 4 markdown files at root all claiming to be the entry point for AI agents:

| File | Lines | Purpose |
|---|---|---|
| `CLAUDE.md` | 144 | Primary project context (canonical) |
| `AGENTS.md` | 114 | Multi-platform agent context |
| `CLAWD.md` | 105 | Probably duplicate? |
| `GEMINI.md` | 87 | Gemini CLI variant |

Recommendation: keep `CLAUDE.md` as the source of truth. Replace the other three with 5-line aliases that point to `CLAUDE.md`. Rationale: maintainability — same content drift across 4 files = nobody reads any of them.

## What "ultrathink" means in this layout

The user named four scopes for organization: ultrathink core, harness, dashboard, Studio. After this layout:

- **ultrathink core** = `packages/memory/` + `packages/code-intel/` + `mcp/*` + `skills/`
- **harness** = `tools/harness/`
- **dashboard** = `apps/dashboard/`
- **Studio** = `apps/studio/` (client) + `packages/studio-engine/` (library)

Clean four-pillar mental model: *brain* (packages + mcp + skills), *test rig* (tools/harness), *web view* (apps/dashboard), *desktop product* (apps/studio).
