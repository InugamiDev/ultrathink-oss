---
name: dashboard
description: Start the UltraThink dashboard web UI
disable-model-invocation: true
allowed-tools: Bash
argument-hint: "[stop]"
---

# UltraThink Dashboard

Start the UltraThink Next.js dashboard.

## Dashboard location

The dashboard source is at `${ULTRATHINK_DIR}/dashboard/` (defaults to `~/Documents/GitHub/InuVerse/ai-agents/ultrathink`).

## Actions

**Start the dashboard:**

```bash
cd "${ULTRATHINK_DIR:-$HOME/Documents/GitHub/InuVerse/ai-agents/ultrathink}" && ./scripts/dashboard.sh
```

The dashboard runs at **http://localhost:3333** with these pages:

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Health cards, system status |
| Skills | `/skills` | Skill catalog (104 skills) |
| Memory | `/memory` | Memory browser with search |
| Kanban | `/kanban` | Task board |
| Plans | `/plans` | Plan registry |
| Analytics | `/analytics` | Usage charts |
| Hooks | `/hooks` | Privacy event log |
| Testing | `/testing` | UI test reports |
| Settings | `/settings` | Config editor |

If `$ARGUMENTS` is "stop", kill the running dashboard process instead:

```bash
lsof -ti :3333 | xargs kill 2>/dev/null && echo "Dashboard stopped" || echo "No dashboard running on port 3333"
```

After starting, tell the user the URL and available pages.
