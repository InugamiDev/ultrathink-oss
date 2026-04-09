# Install — OpenAI Codex CLI

Codex CLI integration with UltraThink: hooks, skills, memory, MCP, dashboard.

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

# Install into ~/.claude/ (hooks, skills, agents, references)
./scripts/init-global.sh
```

### Codex-specific config

UltraThink ships a `.codex/` directory with config and hooks. Copy it to your home:

```bash
# Copy Codex config to global location
mkdir -p ~/.codex
cp ~/ultrathink/.codex/config.toml ~/.codex/config.toml
cp ~/ultrathink/.codex/hooks.json ~/.codex/hooks.json
```

Or symlink for auto-updates:

```bash
mkdir -p ~/.codex
ln -sf ~/ultrathink/.codex/config.toml ~/.codex/config.toml
ln -sf ~/ultrathink/.codex/hooks.json ~/.codex/hooks.json
```

### MCP Servers

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.vfs]
command = ["vfs", "mcp"]

[mcp_servers.ultrathink-memory]
command = ["npx", "tsx", "<ULTRATHINK_ROOT>/memory/scripts/memory-runner.ts", "mcp-serve"]
```

Replace `<ULTRATHINK_ROOT>` with your actual path (e.g., `/Users/you/ultrathink`).

## Linux

Same as macOS. Codex CLI runs natively on Linux.

```bash
npm install -g @openai/codex
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/init-global.sh
mkdir -p ~/.codex
cp ~/ultrathink/.codex/config.toml ~/.codex/config.toml
cp ~/ultrathink/.codex/hooks.json ~/.codex/hooks.json
```

## Windows

See [install-windows.md](./install-windows.md) for Windows-specific instructions. Codex CLI runs in WSL2.

## How It Maps

| Claude Code | Codex CLI | Notes |
|-------------|-----------|-------|
| `CLAUDE.md` | `AGENTS.md` | Both are project instruction files |
| `.claude/settings.json` | `.codex/config.toml` | Permissions and approval policy |
| `.claude/hooks/*.sh` | `.codex/hooks.json` | Lifecycle hooks |
| `.mcp.json` | `config.toml [mcp_servers]` | MCP server definitions |
| `/command` | `/command` (if skill triggers match) | Slash commands |
| `claude` | `codex` | CLI entry point |
| `claude --resume` | `codex resume` | Session resume |

## Verify

```bash
codex
# Try: "explain how UltraThink skills work"
# Skills in .claude/skills/ are accessible — Codex reads AGENTS.md which points to them
```

## Approval Policy

Configure in `~/.codex/config.toml`:

```toml
# Options: "on-request" (default), "untrusted", "never", "granular"
approval_policy = "on-request"
```

- `on-request` — Ask before file writes and commands (recommended)
- `untrusted` — Ask before everything including reads
- `granular` — Per-tool-category control

## Hooks

UltraThink hooks are configured in `.codex/hooks.json`:

| Event | Hook | Purpose |
|-------|------|---------|
| `PreToolUse` | `privacy-hook.sh` | Block access to sensitive files |
| `SessionStart` | `memory-runner.ts session-start` | Load memory context |
| `Stop` | `memory-runner.ts flush` | Flush pending memories |

Enable hooks in config.toml:

```toml
[features]
codex_hooks = true
```

## Start Dashboard

```bash
cd ~/ultrathink
npm run dashboard:dev
# → http://localhost:3333
```

## Limitations vs Claude Code

- Codex hooks have ~5 lifecycle events vs Claude Code's 17
- No statusline widget (use dashboard instead)
- Skill auto-trigger (prompt-analyzer) is Claude Code-specific — Codex relies on AGENTS.md discovery
- Some hooks may need adaptation for Codex's sandbox model

## Uninstall

```bash
rm ~/.codex/config.toml ~/.codex/hooks.json
cd ~/ultrathink && ./scripts/init-global.sh --uninstall
```
