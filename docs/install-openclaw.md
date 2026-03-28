# Install — OpenClaw

Bridge UltraThink's skill mesh, memory, and code intelligence into OpenClaw via MCP.

## What Works

- UltraThink skills as OpenClaw-native SKILL.md files
- Persistent memory via MCP server (`memory-search`, `memory-save`, `memory-recall`)
- Code intelligence via MCP server (`code-symbols`, `code-deps`, `code-impact`)
- Multi-pass code review skill
- Discord, Telegram, Slack channel access

## Prerequisites

- OpenClaw 2026.1+ with MCP support
- Node.js 20+
- Neon Postgres (for memory + code-intel features)

## Setup

### Option A: Copy Skills

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink

# Copy OpenClaw-compatible skills
cp -r openclaw/skills/* ~/.openclaw/skills/
```

### Option B: Use extraDirs

Point OpenClaw at the skill directory without copying:

```json
// ~/.openclaw/openclaw.json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/ultrathink-oss/openclaw/skills"]
    }
  }
}
```

### Add MCP Servers

Add to `~/.openclaw/openclaw.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "ultrathink-memory": {
      "command": "npx",
      "args": ["tsx", "/path/to/ultrathink-oss/memory/scripts/memory-runner.ts", "mcp-serve"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host.neon.tech/neondb?sslmode=require"
      }
    },
    "ultrathink-code-intel": {
      "command": "node",
      "args": ["/path/to/ultrathink-oss/code-intel/dist/mcp-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host.neon.tech/neondb?sslmode=require"
      }
    }
  }
}
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `ultrathink` | Core orchestrator — routes prompts to skill mesh |
| `ultrathink_memory` | Search, save, recall memories via MCP |
| `ultrathink_code_intel` | Symbol search, dependency graphs, impact analysis |
| `ultrathink_review` | Multi-pass code review (correctness, security, perf) |

## CLAWD.md

The project includes a `CLAWD.md` at the root — OpenClaw's equivalent of `CLAUDE.md`. It defines:
- Bot identity and persona
- Skill exposure tiers (full, suggest-only, blocked)
- Channel permissions (Discord, Telegram, Slack)
- Safety rules

## Verify

```bash
# In OpenClaw, try:
# "@bot explain the auth flow in this repo"
# Should trigger ultrathink + scout skills
```

## Publishing to ClawHub

```bash
clawhub package publish openclaw/skills/ultrathink \
  --owner InugamiDev \
  --source-repo InugamiDev/ultrathink-oss
```
