# Statusline

A 3-line status bar rendered inside Claude Code sessions via the `statusline.sh` hook.

## What it Shows

**Line 1**: Model name, context window usage percentage, API quotas
**Line 2**: Active skills, agent progress (if subagents are running)
**Line 3**: Recent hook activity feed

## How it Works

The `statusline.sh` hook fires on `SessionStart` and renders the status bar using data from:

- Claude Code's session metadata (model, context %)
- The skill scoring engine (active skills)
- The agent tracker (subagent progress)
- Hook event logs (recent activity)

## Configuration

Control what the statusline displays via `ck.json`:

```json
{
  "statusline": {
    "showMode": true,
    "showMemory": true,
    "showContext": true
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `showMode` | `true` | Show current skill or idle state |
| `showMemory` | `true` | Show memory stats (count, last write) |
| `showContext` | `true` | Show context window usage |

## Visibility

The statusline appears automatically when you start a Claude Code session in a project with UltraThink installed. No manual activation needed.
