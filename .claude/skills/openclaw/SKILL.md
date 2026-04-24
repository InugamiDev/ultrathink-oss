# OpenClaw Integration

> Bridge UltraThink's skill mesh with OpenClaw for messaging platform access.

## When to activate

- User mentions OpenClaw, ClawdBot, Moltbot, or bot integration
- Setting up Discord/Telegram/Slack bots powered by Claude
- Creating CLAWD.md configuration files
- Publishing UltraThink skills to ClawHub

## Integration Architecture

```
OpenClaw Agent
    │
    ├─ openclaw/skills/ultrathink/SKILL.md      → skill mesh routing
    ├─ openclaw/skills/ultrathink-memory/        → persistent memory via MCP
    ├─ openclaw/skills/ultrathink-code-intel/    → code graph via MCP
    └─ openclaw/skills/ultrathink-review/        → quality gate
```

## Setup Steps

1. Copy OpenClaw skills: `cp -r openclaw/skills/* ~/.openclaw/skills/`
2. Add MCP servers from `openclaw/mcp_config.json` to `~/.openclaw/openclaw.json`
3. Set `ULTRATHINK_ROOT` and `DATABASE_URL` env vars
4. Or use `extraDirs` in openclaw.json to point at `openclaw/skills/`

## CLAWD.md

`CLAWD.md` is the OpenClaw equivalent of `CLAUDE.md`. Place at project root.
It defines: identity, exposed skills, channel permissions, safety rules.
See the project's `CLAWD.md` for a working example.

## OpenClaw SKILL.md Format

OpenClaw skills use YAML frontmatter:

```yaml
---
name: skill_name
description: "One-line description"
metadata:
  openclaw:
    emoji: "icon"
    requires:
      bins: [node]
      env: [DATABASE_URL]
    primaryEnv: DATABASE_URL
---

# Instructions (numbered steps, not prose)
```

Skills go in `~/.openclaw/skills/<name>/SKILL.md` or via `clawhub install`.

## Skill Exposure Tiers

| Tier | Skills | Bot Access |
|------|--------|-----------|
| Safe | scout, debug, review, onboard | Full access |
| Guarded | fix, refactor, test, plan | Suggest-only |
| Restricted | ship, deploy, cook | Require approval |
| Blocked | secrets, env, credentials | Never expose |

## Publishing to ClawHub

```bash
clawhub package publish openclaw/skills/ultrathink \
  --owner InugamiDev \
  --source-repo InugamiDev/ultrathink-oss \
  --source-commit $(git rev-parse HEAD)
```

## Related

- `CLAWD.md` — Project-level OpenClaw config
- `openclaw/` — Full skill package + MCP config
- [openclaw-claude-code-skill](https://github.com/Enderfga/openclaw-claude-code-skill) — Claude Code as MCP for OpenClaw
- [OpenClaw docs](https://docs.openclaw.ai/tools/creating-skills) — Skill creation guide
