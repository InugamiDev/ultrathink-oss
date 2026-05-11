# Installing UltraThink OSS

UltraThink OSS is the public, MIT-licensed distribution. Everything in here works
end-to-end on your laptop — skill mesh, persistent memory, dashboard, code-intel
graph, decision engine, identity graph, Studio desktop app — without paying or
phoning home.

## What you get

| Surface | What it does |
|---|---|
| **Skill mesh** | ~230 skills across 4 layers (orchestrator → hub → utility → domain), auto-routed per prompt by `prompt-analyzer` |
| **Persistent memory** | Neon Postgres with 4-wing architecture (agent / user / knowledge / experience), hybrid tsvector + pg_trgm + ILIKE search |
| **Dashboard** | Next.js 15 app at `:3333` — memory graph, activity, hooks, skills, plans, settings, system, kanban, ops, voice, analytics |
| **Code-Intel** | 5 cross-file dependency MCP tools (`code-symbols`, `code-deps`, `code-dependents`, `code-impact`, `code-modules`) |
| **Decision engine** | 12 reasoning frameworks injected when a prompt smells like a real decision |
| **Identity graph** | Long-term `identity.ts` graph runner that learns who you are across sessions |
| **VFS** | AST-signature MCP for code exploration with 60-98% token savings |
| **Stitch** | Google's design MCP integration |
| **Studio** | Tauri desktop app with 3D memory graph, project-first chat, CAR runner, checkpoints, OS keychain |
| **install-pack.sh** | Tell your AI to "install this GitHub repo into my workflow" |

## Prerequisites

| Requirement | Why | Install |
|---|---|---|
| **Node.js 22+** | Engine sidecar, dashboard, MCPs | `brew install node@22` / `nvm install 22` |
| **pnpm 9+** | Workspace package manager | `npm i -g pnpm` |
| **Git** | Cloning + skill packs | already there |
| **Neon Postgres URL** (or any Postgres 15+) | Memory storage | [neon.tech](https://neon.tech) free tier works |
| **Claude Code CLI** *or* Anthropic API key | Agent runtime | `curl -fsSL https://claude.ai/install.sh \| bash` or set `ANTHROPIC_API_KEY` |

For Studio (the desktop app) only:

| Requirement | Why | Install |
|---|---|---|
| **Rust 1.77+** | Tauri backend | `curl https://sh.rustup.rs -sSf \| sh` |
| **macOS / Windows / Linux** | Tauri target | — |

## Install — the one-liner

```sh
curl -fsSL https://raw.githubusercontent.com/InugamiDev/ultrathink-oss/main/scripts/install-studio.sh | bash
```

What it does:

1. Validates Node 22+, pnpm 9+, Rust 1.77+ on PATH (fails fast if missing)
2. Clones the OSS repo to `~/ultrathink` (or pulls latest if already there)
3. Creates a `.env` from the example
4. `pnpm install` + builds `studio-engine`
5. Runs `scripts/install.sh` to symlink every skill + hook into `~/.claude/`
6. Builds **UltraThink Studio.app** via `pnpm tauri:build`
7. (macOS) symlinks the .app into `/Applications/`

After the script finishes, edit `~/ultrathink/.env`:

- `DATABASE_URL=postgres://…neon.tech/…` — required for the memory graph
- `ANTHROPIC_API_KEY=sk-ant-…` — optional if you have the `claude` CLI

Then open Studio. First launch may show macOS Gatekeeper warning (ad-hoc-signed
alpha) — right-click → Open the first time.

## Install — manual

If you want to inspect each step instead of curl-piping:

```sh
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
cp .env.example .env       # set DATABASE_URL + ANTHROPIC_API_KEY
pnpm install
./scripts/install.sh       # symlinks skills + hooks into ~/.claude
cd apps/studio && pnpm tauri:build   # or pnpm tauri:dev for hot reload
```

`install.sh` symlinks every skill into `~/.claude/skills/`, registers hooks in
`~/.claude/settings.json`, and runs database migrations against your `DATABASE_URL`.

## Update

```sh
cd ~/ultrathink && git pull && bash scripts/install-studio.sh
```

Same script handles updates — it pulls latest, reinstalls deps, rebuilds Studio.

## Uninstall

```sh
rm -rf ~/ultrathink
rm -f '/Applications/UltraThink Studio.app'   # macOS only
# Skills + hooks linked into ~/.claude/ are now dead symlinks — clean if desired:
find ~/.claude/skills -type l ! -exec test -e {} \; -print -delete
```

## Verify

```sh
# 1. Memory engine
npx tsx packages/memory/scripts/memory-runner.ts session-start
# 2. Skill registry
node .claude/hooks/dist/prompt-analyzer.js "build me a next.js dashboard"
# Should print 3-5 routed skills.
# 3. Dashboard (port 3333)
pnpm --filter dashboard dev
open http://localhost:3333
```

## Run Studio (the desktop app)

Studio bundles UltraThink + Claude Code into a Tauri app. Cross-platform.

### Dev (hot reload)

```sh
cd apps/studio
pnpm tauri:dev
```

### Release (.dmg / .msi / .AppImage)

Generate a Tauri updater keypair once (the public half goes in
`tauri.conf.json`, the private half is gitignored):

```sh
cd apps/studio
pnpm exec tauri signer generate --ci -p '' -w ./.tauri-updater.key
```

Then build:

```sh
TAURI_SIGNING_PRIVATE_KEY="$(cat .tauri-updater.key)" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
  pnpm tauri:build
```

Output:
- macOS: `src-tauri/target/release/bundle/macos/UltraThink Studio.app` + `.dmg`
- Windows: `src-tauri/target/release/bundle/{msi,nsis}/`
- Linux: `src-tauri/target/release/bundle/{deb,appimage}/`

For code-signed releases (Apple notarization + Azure Trusted Signing for
Windows), use the bundled GitHub Actions workflow at
`.github/workflows/studio-release.yml`.

## Install a third-party skill pack

UltraThink's killer move — drop someone else's skill repo into your workflow:

```sh
./scripts/install-pack.sh https://github.com/acme/awesome-skills
```

That clones, finds the `.claude/skills/` tree inside, and symlinks every skill
into your `~/.claude/skills/`. Your next prompt sees them.

Optional name prefix to avoid collisions when two packs ship a skill with the
same name:

```sh
./scripts/install-pack.sh https://github.com/acme/awesome-skills acme-
```

## Updates

```sh
cd ~/ultrathink
git pull
pnpm install
./scripts/install.sh   # re-symlinks any new skills
```

For Studio, rebuild after pulling: `cd apps/studio && pnpm tauri:build`.

## What's NOT in OSS (Core only)

- **Tekiō** adaptive learning — auto-counter for repeat failures, reinforcement
  for successes
- **Agora** voice integration (separately licensed)
- A handful of proprietary domain skills under InuVerse's allowlist

If you want those, talk to InuVerse — Core is a private distribution.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `DATABASE_URL not set` | Edit `.env`, then `source .env` or restart your shell |
| `claude not found` in Studio | Install Claude Code CLI; or in Settings switch adapter to `anthropic-direct` and paste your key |
| Memory graph blank in Studio | The Studio app must be launched from the workspace cwd. Run `pnpm tauri:dev` from `apps/studio/` instead of double-clicking a translocated `.app` |
| `bundle_dmg.sh failed` | Stale hdiutil mount. `for m in $(mount \| grep UltraThink); do hdiutil detach "$m"; done && pnpm tauri:build --bundles app` |

## License

MIT. Build whatever you want. If you wrap this and resell it as a SaaS, please
ship a link back to the source repo so the next person can find it.
