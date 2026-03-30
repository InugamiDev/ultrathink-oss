<p align="center">
  <img src="docs/assets/ultrathink-logo-1.png" alt="UltraThink" width="600" />
</p>

<h1 align="center">UltraThink</h1>
<p align="center">
  <strong>A Workflow OS for AI Code Editors</strong><br />
  Persistent memory · 4-layer skill mesh · Privacy hooks · Observability dashboard
</p>

<p align="center">
  <a href="#install">Install</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="docs/">Docs</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## What is UltraThink?

UltraThink turns AI code editors from stateless assistants into **persistent, skill-aware agents** that remember your preferences, enforce your standards, and adapt to your workflow.

```
You ──► AI Editor ──► UltraThink ──► Skills matched · Memories recalled
                                      Context injected · Better responses
```

---

## Install

### Let your AI set it up

Copy this prompt into **Claude Code, Cursor, Windsurf, or any AI editor** and it will handle everything:

<details>
<summary><strong>Copy this prompt</strong></summary>

```
I want to install UltraThink — a Workflow OS that gives you persistent memory,
auto-triggered skills, privacy hooks, and an observability dashboard.

Steps:
1. Clone the repo: git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
2. cd ~/ultrathink
3. Run ./scripts/setup.sh — this installs all dependencies (root, dashboard, memory),
   creates .env from the template, makes hooks executable, and verifies skill files.
4. Run ./scripts/init-global.sh — this symlinks skills, agents, references, and hooks
   into ~/.claude/ so every Claude Code session has UltraThink capabilities.
5. If we're in Cursor, Windsurf, Antigravity, or Copilot, also run
   ./scripts/sync-editors.sh --all to generate editor-specific config files.
6. After setup, tell me:
   - How many skills were linked
   - How many hooks were installed
   - Whether .env needs a DATABASE_URL (for memory persistence)
   - The URL for the dashboard (should be http://localhost:3333)

For the database: I need a free Neon Postgres account from https://neon.tech.
Once I have a DATABASE_URL, put it in ~/ultrathink/.env and run:
  cd ~/ultrathink/memory && npx tsx scripts/migrate.ts

To start the dashboard: npm run dashboard:dev from ~/ultrathink/

Show me the final status when done.
```

</details>

### Or manually

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink && ./scripts/setup.sh && ./scripts/init-global.sh
```

Then run `claude` in any project. [Full guide →](docs/install-claude-code.md)

### Other Editors

| Editor | Integration | Guide |
|--------|------------|-------|
| **Claude Code** | Full (hooks, skills, memory, auto-trigger) | [install-claude-code.md](docs/install-claude-code.md) |
| **Cursor** | Rules (`.cursor/rules/`) | [install-cursor.md](docs/install-cursor.md) |
| **Windsurf** | Rules (`.windsurf/rules/`) | [install-windsurf.md](docs/install-windsurf.md) |
| **Antigravity** | Rules (`GEMINI.md`) | [install-antigravity.md](docs/install-antigravity.md) |
| **GitHub Copilot** | Rules (`.github/copilot-instructions.md`) | [install-copilot.md](docs/install-copilot.md) |
| **OpenClaw** | Skills + MCP servers | [install-openclaw.md](docs/install-openclaw.md) |

```bash
# Generate configs for all editors at once
./scripts/sync-editors.sh --all
```

---

## Features

### Skill Mesh

45 active skills across 4 layers, auto-triggered by intent detection on every prompt (<30ms).

| Layer | Examples | Purpose |
|-------|----------|---------|
| Orchestrator | `cook`, `ship`, `gsd-verify` | End-to-end workflows |
| Hub | `debug`, `test`, `react` | Multi-step coordinators |
| Utility | `fix`, `refactor`, `verify` | Focused tools |
| Domain | `nextjs`, `tailwind`, `react` | Tech specialists |

340+ more in `_archive/` — restore any with `mv`. [Skills catalog →](docs/skills-catalog.md)

### Memory

Postgres-backed persistent memory with 3-tier search (tsvector + trigram + ILIKE). Memories are scoped by project, ranked by importance, and recalled automatically at session start.

### Privacy Hooks

Block `.env`, `.pem`, credentials, and secrets **before** the model sees them. All decisions logged.

### Dashboard

Next.js 15 on port 3333 — memory browser, skill graph, hook events, usage tracking, kanban, plans.

### Statusline

3-line CLI status bar: model, context %, quotas, active skills, memory count, Tekiō spins.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Claude Code CLI                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  SessionStart → memory recall + statusline       │
│  PromptSubmit → skill scoring → top 5 injected   │
│  PreToolUse   → privacy check (block creds)      │
│  PostToolUse  → quality gate + observe + save     │
│  Stop         → memory flush + session close      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │     Neon Postgres (pgvector + pg_trgm)     │  │
│  │  memories · sessions · hooks · skills      │  │
│  │  plans · tasks · decisions · adaptations   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │     Skill Mesh (4 layers, 45 active)       │  │
│  │  Orchestrators → Hubs → Utils → Domain     │  │
│  │  Auto-trigger + graph traversal (linksTo)  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │     Dashboard (Next.js 15, :3333)          │  │
│  │  /memory  /skills  /hooks  /usage  /kanban │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Project Structure

```
ultrathink/
├── .claude/
│   ├── hooks/          20 lifecycle hooks
│   ├── skills/         45 active + _archive/ (340+)
│   ├── agents/         10 agent definitions
│   ├── references/     Quality, privacy, teaching rules
│   └── commands/       Slash commands
├── memory/             Postgres-backed memory system
├── dashboard/          Next.js 15 observability UI
├── openclaw/           OpenClaw skill package + MCP config
├── tests/              Vitest test suite
├── scripts/            Setup + utilities
└── docs/               Installation + reference docs
```

---

## Docs

| Topic | File |
|-------|------|
| **Install: Claude Code** | [install-claude-code.md](docs/install-claude-code.md) |
| **Install: Cursor** | [install-cursor.md](docs/install-cursor.md) |
| **Install: Windsurf** | [install-windsurf.md](docs/install-windsurf.md) |
| **Install: Antigravity** | [install-antigravity.md](docs/install-antigravity.md) |
| **Install: GitHub Copilot** | [install-copilot.md](docs/install-copilot.md) |
| **Install: OpenClaw** | [install-openclaw.md](docs/install-openclaw.md) |
| Editor setup details | [editor-setup.md](docs/editor-setup.md) |
| Skills catalog | [skills-catalog.md](docs/skills-catalog.md) |
| Memory system | [memory-system.md](docs/memory-system.md) |
| Hooks & privacy | [hooks-and-privacy.md](docs/hooks-and-privacy.md) |
| Dashboard overview | [dashboard-overview.md](docs/dashboard-overview.md) |
| Creating skills | [how-to-create-a-new-skill.md](docs/how-to-create-a-new-skill.md) |
| Linking skills | [how-to-link-skills.md](docs/how-to-link-skills.md) |
| Database schema | [memory-schema.md](docs/memory-schema.md) |
| Troubleshooting | [troubleshooting.md](docs/troubleshooting.md) |
| Font pairings (230+) | [font-pairings.md](docs/font-pairings.md) |
| Design languages & UX laws | [design-languages-ux-laws.md](docs/design-languages-ux-laws.md) |
| Themes & design systems | [design-themes-and-systems.md](docs/design-themes-and-systems.md) |

---

## CLI

```bash
./scripts/setup.sh              # Full setup
./scripts/init-global.sh        # Install into ~/.claude/
./scripts/sync-editors.sh --all # Generate all editor configs
npm run dashboard:dev           # Dashboard on :3333
npm run test                    # Run tests
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Quick start:

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git
cd ultrathink-oss && ./scripts/setup.sh && npm run test
```

---

## FAQ

### How is UltraThink different from Superpowers or Everything Claude Code?

UltraThink is an **integration project**, not an innovation project. Most concepts come from the community:

| Concept | Origin |
|---------|--------|
| TDD, brainstorming, subagent workflow | [Superpowers](https://github.com/obra/superpowers) (121K+ stars) |
| Multi-agent + hook architecture | [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (115K+ stars) |
| SKILL.md format | [Anthropic Skills](https://github.com/anthropics/skills) (official) |
| Multi-layer security hooks | [Claude Forge](https://github.com/sangrokjung/claude-forge) |
| "Second brain" memory pattern | [coleam00/second-brain-skills](https://github.com/coleam00/second-brain-skills) |
| Hook lifecycle patterns | [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) |

**What UltraThink adds on top:**

- **Database-backed memory** — Real Postgres (pgvector + pg_trgm) instead of flat MEMORY.md files. Memories persist across sessions with importance ranking, fuzzy search, and synonym expansion.
- **Observability dashboard** — A full Next.js 15 UI (skill graph, memory browser, hook events, usage tracking) that no other repo provides at this level.
- **Auto-trigger engine** — Every prompt is scored against the skill registry in <30ms. Top 5 skills are injected automatically via intent detection + graph traversal. Neither Superpowers nor ECC do this.
- **Cross-editor configs** — One command generates rules for Cursor, Windsurf, Antigravity, Copilot, and OpenClaw.
- **Adaptive learning (Tekiō)** — Failures become immunity rules, successes get reinforced. Infinite wheel spins.

**Where others are stronger:**

- **Superpowers** has a tighter methodology (spec → plan → TDD → review) and a massive community.
- **Everything Claude Code** has more agents (28), more skills (126), 98% test coverage, and 115K+ stars.
- Both are battle-tested by thousands of developers. UltraThink is a personal workflow open-sourced.

**Bottom line:** If you want a proven, community-backed framework, use Superpowers or ECC. If you want database-backed memory, a visual dashboard, and auto-triggered skills wired together, UltraThink fills that gap.

---

## Acknowledgments

| Project | Author | Integration |
|---------|--------|-------------|
| [Superpowers](https://github.com/obra/superpowers) | obra | TDD, debugging, brainstorming, plan execution |
| [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) | affaan-m | Multi-agent architecture, hook patterns |
| [Claude Forge](https://github.com/sangrokjung/claude-forge) | sangrokjung | Multi-layer security hooks |
| [Second Brain Skills](https://github.com/coleam00/second-brain-skills) | coleam00 | "Second brain" framing for Claude Code |
| [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) | disler | Hook lifecycle patterns |
| [VFS](https://github.com/TrNgTien/vfs) | TrNgTien | AST-based token compression (60-98% savings) |
| [Get Shit Done](https://github.com/gsd-build/get-shit-done) | gsd-build | Spec-driven planning, wave execution |
| [Impeccable](https://github.com/pbakaus/impeccable) | pbakaus | Frontend design skill suite |
| [Anthropic Skills](https://github.com/anthropics/skills) | Anthropic | Skill format conventions |

---

## License

MIT — see [LICENSE](LICENSE).

<p align="center">
  Built by <a href="https://github.com/InuVerse">InuVerse</a>
</p>
