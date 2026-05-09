# UltraThink Tier Manifest

Canonical boundary between **UltraThink Core** (private) and **UltraThink OSS** (public, MIT).
Shared-file parity is enforced by `scripts/parity-check.sh`; export safety is enforced by `tests/oss-boundary.test.ts`.

UltraThink is **one product** shipped in two tiers:

- **Core** — full workflow engine (this repo, private)
- **OSS** — public subset at `github.com/InuVerse/ultrathink` (sibling repo `../ultrathink-oss`)

---

## Core-only (never ship to OSS)

These subsystems are the strategic moat. They stay in Core.

| Artifact | Reason |
|----------|--------|
| `packages/memory/src/adaptation.ts`, `packages/memory/src/team-tekio.ts` — Tekiō Cycle of Nova | Strategic moat |
| `packages/memory/scripts/wheel-count.ts`, `seed-adaptations.ts`, `cache-adaptations.ts` | Tekiō tooling |
| `.claude/hooks/tekio-prevent.sh` | Tekiō prevention loop |
| `packages/memory/scripts/archive-failures.ts`, `re-enrich-all.ts` | Core ops only |
| MCP server `agora` | Non-portable / business-specific |
| MCP memory server Tekiō tools (`tekio_status`, `tekio_turn`) | Strategic moat |
| `apps/studio/` — Tauri desktop app + CAR runner | Premium product |
| `dashboard/app/agora/`, `dashboard/app/api/agora/` | Agora-credentials gated surface |
| `AUDIT-*.md`, `docs/audit/` internals | Internal documents |
| Proprietary domain skills listed in the private skill allowlist | Business-specific |

## Recently moved to OSS (2026-05-09)

- `packages/memory/scripts/identity.ts` — identity graph runner
- `packages/memory/scripts/archive-bad-identity.ts`, `archive-bad-prefs.ts`
- `.claude/hooks/decision-engine.ts` — 12 reasoning frameworks
- `.claude/hooks/post-edit-codeintel.sh`, `codeintel-session-check.sh`
- `packages/code-intel/` — 5 cross-file dependency MCP tools
- `stitch` MCP server (registered in OSS `.mcp.json`)
- `scripts/install-pack.sh` — clone-and-link any skill repo into the workflow
- **Full Next.js dashboard** — all pages (memory graph, activity, hooks,
  skills, usage, plans, settings, system, cmo, ops, voice, testing,
  analytics, kanban, integrations) and all dashboard APIs except agora.
  Previously kept Core-only as a moat; now public so the OSS dashboard
  matches Core 1:1 minus agora-dependent surfaces.

---

## OSS-only (public surface)

Files that exist only in the OSS repo and do not need Core parity.

- `scripts/setup.sh`, `scripts/init-global.sh`, `scripts/sync-editors.sh` (public installer)
- `README.md` banner, quickstart, badges
- `LICENSE` (MIT)
- `CONTRIBUTING.md`, `CHANGELOG.md`
- `AGENTS.md` (Codex integration surface)
- `.github/` workflows for public CI

---

## Shared (byte-identical required)

Enforced by `scripts/parity-check.sh`. Any change to a file in this list must land
in **both** repos before the next release.

- `.claude/hooks/memory-auto-save.sh`
- `.claude/hooks/memory-session-start.sh`
- `.claude/hooks/memory-session-end.sh`
- `.claude/hooks/privacy-hook.sh`
- `.claude/hooks/prompt-analyzer.ts`
- `.claude/hooks/prompt-submit.sh`
- `.claude/hooks/tool-failure-log.sh`
- `.claude/hooks/codeintel-session-check.sh`
- `.claude/hooks/post-edit-codeintel.sh`
- `.claude/hooks/decision-engine.ts`
- `code-intel/` (entire workspace — indexer, query, clusterer, 5 MCP tools)
- `memory/src/memory.ts`
- `memory/src/enrich.ts`
- `memory/src/hooks.ts`
- `memory/src/plans.ts`
- `memory/src/analytics.ts`
- `memory/src/client.ts`
- `memory/scripts/identity.ts` (identity graph runner)
- `memory/scripts/memory-runner.ts` (including `agent-rules` command)
- `memory/migrations/*.sql` (every migration)
- `.claude/skills/_registry.json` entries for the shared skill set
- `.claude/skills/gsd/` (full GSD internals)
- `.claude/references/gsd.md`
- `reports/` (directory structure)
- `dashboard/` (entire tree, minus any Core-only feature-flagged pages)
- `tests/` (shared suite)

`prompt-analyzer.ts` is on this list **today** but will be refactored with an
adapter boundary (see improvement plan SI-3) so Core can inject Tekiō and
code-intel scoring hooks without touching the shared file.

---

## Backport rule

1. Author changes in **Core** first.
2. Run `scripts/parity-check.sh` — must pass before PR.
3. If a shared file changed, copy it to OSS and land a matching PR there.
4. Tag both repos with the same semver on release.

Human memory cannot keep two repos in sync across months; the parity check is
the authoritative mechanism.
