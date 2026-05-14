<p align="center">
  <img src="docs/assets/ultrathink-logo-1.png" alt="UltraThink" width="540" />
</p>

<h1 align="center">UltraThink — OSS</h1>
<p align="center">
  <strong>Build Until Ship.</strong> Get and build your own pipeline.
</p>

<p align="center">
  <a href="INSTALL.md">Install</a> &bull;
  <a href="#what-you-get">Features</a> &bull;
  <a href="#install-a-skill-pack">Skill packs</a> &bull;
  <a href="#license">License</a>
</p>

---

UltraThink is an opinionated workflow OS for AI coding agents. It turns
Claude Code (and Codex, OpenAI-compatible runners, Ollama) from a stateless
chat into a **persistent, skill-aware engineer** that remembers your
decisions, enforces your standards, and adapts to how *you* build software.

**Our principle:** software gets shipped by people who own their pipeline.
UltraThink gives you the pipeline. You own it. You ship.

## What you get

- **230+ skills** in a 4-layer mesh (orchestrator → hub → utility → domain),
  auto-routed per prompt
- **Persistent memory** on Postgres with a 4-wing knowledge graph, hybrid
  search, and Zettelkasten relations
- **Code intelligence** — 5 cross-file dependency MCP tools that answer
  "what breaks if I change this?" without reading a single file
- **Decision engine** — 12 reasoning frameworks injected when a prompt
  smells like a real architectural call
- **Identity graph** — long-term `who is this user, what do they prefer,
  what are they building` that survives session boundaries
- **VFS** — AST-signature MCP for code exploration with 60–98% token savings
- **Studio** — cross-platform Tauri desktop app: 3D knowledge graph,
  project-first chat, concurrent agent runner, OS keychain, checkpoints
- **Dashboard** — Next.js 15 observability surface at `:3333` (memory graph,
  activity, hooks, skills, ops, kanban, analytics)
- **install-pack.sh** — `./install-pack.sh https://github.com/acme/skills`
  drops any skill repo into your workflow

## Install — one line

```sh
curl -fsSL https://raw.githubusercontent.com/InuVerse/ultrathink/main/scripts/install-studio.sh | bash
```

This clones the repo to `~/ultrathink`, installs deps, builds Studio.app, and
(macOS) symlinks it into `/Applications/`. Prereqs: **Node 22+**, **pnpm 9+**,
**Rust 1.77+** (for the Studio Tauri build). It will tell you what's missing.

After install, edit `~/ultrathink/.env` and set:

- `DATABASE_URL=postgres://...neon.tech/...` — required for the memory graph
- `ANTHROPIC_API_KEY=sk-ant-...` — optional if you have the `claude` CLI

Open Studio: `open '/Applications/UltraThink Studio.app'` (or run from
`~/ultrathink/apps/studio/src-tauri/target/release/bundle/macos/`).

## Install — manual

```sh
git clone https://github.com/InuVerse/ultrathink.git ~/ultrathink
cd ~/ultrathink
cp .env.example .env  # set DATABASE_URL + ANTHROPIC_API_KEY
pnpm install
./scripts/install.sh          # symlinks skills + hooks into ~/.claude
cd apps/studio && pnpm tauri:dev   # or: pnpm tauri:build
```

See **[INSTALL.md](INSTALL.md)** for prereq details, troubleshooting, and the
dashboard/release flows.

## Install a skill pack

The killer move — drop someone else's skill repo into your workflow:

```sh
./scripts/install-pack.sh https://github.com/acme/awesome-skills
```

Optional name prefix to avoid collisions:

```sh
./scripts/install-pack.sh https://github.com/acme/awesome-skills acme-
```

That's `Build Until Ship` in two lines: someone else's pipeline becomes
yours, your next prompt sees it, you keep moving.

## What's NOT here (Core only)

- **Tekiō** — adaptive learning that auto-counters repeat failures and
  reinforces successes
- **Agora** — voice-driven agent integration (separately licensed)
- A handful of proprietary domain skills under InuVerse's allowlist

Some integrations still require separate credentials or licenses.

## License

MIT. Build whatever you want with it.

---

<p align="center">
  <em>UltraThink isn't the AI. UltraThink is <strong>you</strong> — and it makes you the master of your AI.</em>
</p>
