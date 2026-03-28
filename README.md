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

### Claude Code (full integration)

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

43 active skills across 4 layers, auto-triggered by intent detection on every prompt (<30ms).

| Layer | Examples | Purpose |
|-------|----------|---------|
| Orchestrator | `cook`, `ship`, `gsd` | End-to-end workflows |
| Hub | `debug`, `test`, `react` | Multi-step coordinators |
| Utility | `fix`, `refactor`, `verify` | Focused tools |
| Domain | `nextjs`, `tailwind`, `prisma` | Tech specialists |

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
│  │     Skill Mesh (4 layers, 43 active)       │  │
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
│   ├── hooks/          19 lifecycle hooks
│   ├── skills/         43 active + _archive/ (340+)
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

## Acknowledgments

| Project | Author | Integration |
|---------|--------|-------------|
| [Superpowers](https://github.com/obra/superpowers) | obra | TDD, debugging, brainstorming, plan execution |
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
