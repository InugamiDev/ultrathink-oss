# UltraThink for OpenClaw

Expose UltraThink's skill mesh and memory system to OpenClaw agents via MCP.

## Quick Start

```bash
# 1. Copy skills into OpenClaw
cp -r skills/* ~/.openclaw/skills/

# 2. Add MCP servers to openclaw.json
# See mcp_config.json for the server definitions

# 3. Or use extraDirs to point at this repo
# In ~/.openclaw/openclaw.json:
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/ultrathink/openclaw/skills"]
    }
  }
}
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `ultrathink` | Core orchestrator — routes prompts to UltraThink's skill mesh |
| `ultrathink-memory` | Query and save to UltraThink's persistent memory |
| `ultrathink-review` | Multi-pass code review powered by UltraThink's quality gate |

### MCP Servers

| Server | Tools | Purpose |
|--------|-------|---------|
| `ultrathink-memory` | `memory-search`, `memory-save`, `memory-recall` | Persistent memory access |

## Architecture

```
OpenClaw Agent
    │
    ├─ SKILL.md (ultrathink) ── teaches agent how to use UltraThink
    │
    └─ MCP: ultrathink-memory ── Neon Postgres memory backend
```

## Requirements

- OpenClaw 2026.1+ with MCP support
- Node.js 20+
- UltraThink repo cloned locally
- `DATABASE_URL` set for memory features (optional)
