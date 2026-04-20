# UltraThink Tier Manifest

Canonical boundary between **UltraThink Core** (private) and **UltraThink OSS** (public, MIT).
Enforced mechanically by `scripts/parity-check.sh`.

UltraThink is **one product** shipped in two tiers:

- **Core** — full workflow engine (this repo, private)
- **OSS** — public subset at `github.com/InuVerse/ultrathink` (sibling repo `../ultrathink-oss`)

---

## Core-only (never ship to OSS)

These subsystems are the strategic moat. They stay in Core.

| Artifact | Reason |
|----------|--------|
| `memory/src/adaptation.ts` — Tekiō Cycle of Nova | Strategic moat |
| `memory/scripts/wheel-count.ts`, `seed-adaptations.ts` | Tekiō tooling |
| `memory/scripts/cache-adaptations.ts` | Tekiō tooling |
| `.claude/hooks/tekio-prevent.sh` | Tekiō prevention loop |
| `memory/scripts/archive-bad-identity.ts`, `archive-bad-prefs.ts`, `archive-failures.ts`, `re-enrich-all.ts` | Core ops only |
| MCP servers in `.mcp.json`: `agora`, `stitch` | Non-portable / business-specific |
| MCP memory server Tekiō tools (`tekio_status`, `tekio_turn`) | Strategic moat |
| `AUDIT-*.md`, `docs/audit/` internals | Internal documents |
| Proprietary domain skills listed in the private skill allowlist | Business-specific |

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
