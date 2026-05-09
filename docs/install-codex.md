# Install — OpenAI Codex CLI

Codex CLI integration with UltraThink: hooks, skills, memory, MCP, dashboard.

<!--
intent: keep Codex parity install guidance aligned with the current config and runtime limitations
status: done
next: update this page when Codex hook or MCP config semantics change
blockers: none
confidence: high
-->

## Prerequisites

- Node.js 18+
- Codex CLI (`npm install -g @openai/codex` or `brew install --cask codex`)
- OpenAI API key or ChatGPT Plus/Pro account
- Neon Postgres account ([neon.tech](https://neon.tech), free tier works)

## macOS

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink

# Install deps, create .env, run migrations
./scripts/setup.sh

# Install into ~/.claude/, ~/.codex/, and ~/.ultrathink/
./scripts/install.sh --tier=core
```

### Codex-specific config

UltraThink ships a `.codex/` directory with config and hooks. `scripts/install.sh` links it into your home automatically:

```bash
~/.codex/config.toml -> ~/ultrathink/.codex/config.toml
~/.codex/hooks.json  -> ~/ultrathink/.codex/hooks.json
~/.codex/AGENTS.md   -> ~/ultrathink/AGENTS.md
```

It also exposes OpenAI-compatible prompt templates here:

```bash
~/.ultrathink/runners/templates/AGENTS.md
~/.ultrathink/runners/templates/CLAUDE.md
```

Existing real files are backed up with a `.bak.<timestamp>` suffix before linking. Pass `--no-runners` to skip Codex/OpenAI-compatible runner links.

The current Codex hook flag is:

```toml
[features]
hooks = true
```

Do not use the older `[features].codex_hooks = true` key. It is deprecated and will not enable the current hook runner.

Keep `~/.codex/config.toml` secret-safe:

- Do not commit `~/.codex/config.toml` if it contains machine-specific paths, trusted project paths, or authenticated remote MCP entries.
- Do not paste API keys, database URLs, tokens, or Agora credentials into shared examples.
- Prefer environment variables loaded by your shell or local `.env` files that are ignored by `.ckignore` and `.gitignore`.
- Use absolute paths for local MCP server entrypoints so Codex can start them from any working directory.

### MCP Servers

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.vfs]
command = "/Users/you/go/bin/vfs"
args = ["mcp"]
startup_timeout_sec = 15

[mcp_servers.ultrathink-memory]
command = "npx"
args = ["tsx", "<ULTRATHINK_ROOT>/packages/memory/scripts/memory-runner.ts", "mcp-serve"]
startup_timeout_sec = 30
```

Replace `<ULTRATHINK_ROOT>` with your actual path, such as `/Users/you/ultrathink`.

Core installs may also enable additional local MCP servers:

```toml
[mcp_servers.code-intel]
command = "node"
args = ["<ULTRATHINK_ROOT>/packages/code-intel/dist/index.js"]
startup_timeout_sec = 15

[mcp_servers.agora]
command = "node"
args = ["<ULTRATHINK_ROOT>/mcp/agora/dist/index.js"]
startup_timeout_sec = 15
```

These are Core-only in some distributions. If `packages/code-intel/` or `mcp/agora/` is absent, remove those MCP blocks rather than leaving broken server definitions in Codex config.

## Linux

Same as macOS. Codex CLI runs natively on Linux.

```bash
npm install -g @openai/codex
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/install.sh --tier=core
```

## Windows

See [install-windows.md](./install-windows.md) for Windows-specific instructions. Codex CLI runs in WSL2.

## How It Maps

| Claude Code | Codex CLI | Notes |
|-------------|-----------|-------|
| `CLAUDE.md` | `AGENTS.md` | Both are project instruction files |
| `.claude/settings.json` | `.codex/config.toml` | Permissions, approval policy, features, MCP |
| `.claude/hooks/*.sh` | `.codex/hooks.json` | Lifecycle hooks, where supported |
| `.mcp.json` | `config.toml [mcp_servers]` | MCP server definitions |
| `/command` | `/command` (if skill triggers match) | Slash commands |
| `claude` | `codex` | CLI entry point |
| `claude --resume` | `codex resume` | Session resume |

## Verify

Run these checks from the UltraThink repo root unless noted otherwise.

```bash
codex --version
```

Expected output: a Codex CLI version string, not `command not found`.

```bash
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.codex/hooks.json', 'utf8')); console.log('hooks json ok')"
```

Expected output: `hooks json ok`.

```bash
grep -n "hooks = true" ~/.codex/config.toml
```

Expected output: a line containing `hooks = true`. If you only see `codex_hooks = true`, update the config.

```bash
test -e ~/.codex/config.toml && test -e ~/.codex/hooks.json && printf 'codex config installed\n'
```

Expected output: `codex config installed`.

```bash
npx tsx packages/memory/scripts/memory-runner.ts session-start
```

Expected output: memory context or a clear database/env warning. A missing `tsx`, missing `packages/memory/scripts/memory-runner.ts`, or module resolution error means dependencies are not installed or the command is being run outside the repo.

To verify behavior interactively, start `codex` in this repo and ask:

```text
explain how UltraThink skills work and cite the local instruction file you used
```

Expected behavior: Codex should use `AGENTS.md` and reference `.claude/skills/` as the skill location. Hook status messages such as memory loading or privacy checks may appear if hooks are enabled in your installed Codex version.

## Approval Policy

Configure in `~/.codex/config.toml`:

```toml
# Options depend on Codex CLI version. `on-request` is the recommended default.
approval_policy = "on-request"
```

- `on-request` asks before sensitive file writes and commands.
- `untrusted` asks before most actions.
- `never` disables approval prompts and should only be used in a safe sandbox.

## Hooks

UltraThink hooks are configured in `.codex/hooks.json`:

| Event | Hook | Purpose |
|-------|------|---------|
| `PreToolUse` | `privacy-hook.sh` | Block access to sensitive files |
| `SessionStart` | `memory-runner.ts session-start` | Load memory context |
| `Stop` | `memory-runner.ts flush` | Flush pending memories |

Enable hooks in `~/.codex/config.toml`:

```toml
[features]
hooks = true
```

`codex_hooks = true` was used by older drafts of this integration. Replace it with `hooks = true`.

Current behavior:

- Codex reads `AGENTS.md` for project instructions and follows links from there to `.claude/skills/` and references.
- Codex hooks are driven by `~/.codex/hooks.json`, not by Claude Code `.claude/settings.json`.
- The bundled Codex hook file currently wires `SessionStart`, `PreToolUse`, and `Stop`.
- Hooks run as shell commands from the active workspace, so relative paths such as `.claude/hooks/privacy-hook.sh` require launching Codex inside an UltraThink-enabled repo.

## Start Dashboard

```bash
cd ~/ultrathink
npm run dashboard:dev
# -> http://localhost:3333
```

## Limitations vs Claude Code

- Codex hooks have fewer lifecycle events than Claude Code.
- No statusline widget. Use the dashboard instead.
- Skill auto-trigger through Claude Code's prompt analyzer is not equivalent in Codex. Codex relies on `AGENTS.md`, explicit user phrasing, and model/tool discovery.
- Codex does not use `.claude/settings.json`; use `~/.codex/config.toml` and `~/.codex/hooks.json`.
- Some Claude Code hooks do not have a Codex lifecycle equivalent. Do not assume every `.claude/hooks/*.sh` script runs under Codex.
- Codex sandbox and approval settings can block commands that work in Claude Code until approved.

## MCP Troubleshooting

### General

- Use `command = "..."` and `args = [...]` in TOML. Do not use `command = ["cmd", "arg"]`.
- Prefer absolute paths for binaries and compiled MCP entrypoints.
- Rebuild TypeScript MCP servers after changing source with `npm run codeintel:build` or `npm --prefix mcp/agora run build`.
- If Codex starts slowly or reports server startup failures, raise `startup_timeout_sec` to `30`.
- If a server is optional and unavailable on your tier, remove its block from `~/.codex/config.toml`.

### code-intel

Required pieces:

- `packages/code-intel/dist/index.js` exists.
- `DATABASE_URL` is available in the environment used to launch Codex.
- `vfs` is installed and available at the configured path, or set `VFS_BIN` to the correct binary.

Useful checks:

```bash
npm run codeintel:build
test -f packages/code-intel/dist/index.js && printf 'code-intel mcp built\n'
test -n "$DATABASE_URL" && printf 'DATABASE_URL set\n'
```

Expected output: `code-intel mcp built` and `DATABASE_URL set`. If the second line prints nothing, export `DATABASE_URL` in your shell or load it from a local ignored `.env` before starting Codex.

Index a project before expecting useful graph answers:

```bash
node packages/code-intel/dist/indexer.js index .
```

Expected output: indexing progress or a clear database/VFS error. Database errors usually mean `DATABASE_URL` is missing or points at a database without the required migrations.

### Agora

Required pieces:

- `mcp/agora/dist/index.js` exists.
- Agora credentials are available in the environment used to launch Codex.
- For Conversational AI agent creation, LLM and TTS provider variables are also configured.

Useful checks:

```bash
npm --prefix mcp/agora run build
test -f mcp/agora/dist/index.js && printf 'agora mcp built\n'
test -n "$AGORA_APP_ID" && test -n "$AGORA_APP_CERTIFICATE" && printf 'agora app env set\n'
test -n "$AGORA_CUSTOMER_ID" && test -n "$AGORA_CUSTOMER_SECRET" && printf 'agora REST env set\n'
```

Expected output: `agora mcp built`, `agora app env set`, and `agora REST env set`. If the env checks print nothing, load credentials locally before starting Codex. Never commit real Agora credentials.

Common missing environment variables:

- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CUSTOMER_ID`
- `AGORA_CUSTOMER_SECRET`
- `AGORA_LLM_URL`
- `AGORA_LLM_API_KEY` or `GROQ_API_KEY`
- `AGORA_LLM_MODEL`
- `AGORA_TTS_VENDOR`
- `AGORA_MICROSOFT_TTS_KEY`
- `AGORA_MICROSOFT_TTS_REGION`

Only the first four are required for basic token and REST operations; voice-agent flows need the LLM/TTS settings too.

## Uninstall

```bash
cd ~/ultrathink && ./scripts/install.sh --uninstall
```
