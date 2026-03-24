# Hook Lifecycle

UltraThink uses Claude Code's hook system to intercept lifecycle events and inject behavior -- privacy checks, memory persistence, quality validation, and notifications.

## Hook Events

Claude Code exposes these lifecycle events that hooks can intercept:

| Event | When | Can inject context? |
|-------|------|-------------------|
| `SessionStart` | Claude Code starts | Yes (`additionalContext`) |
| `Stop` | Claude Code exits | No |
| `UserPromptSubmit` | User sends a message | Yes (`additionalContext`) |
| `PreToolUse` | Before a tool runs | Yes (can block with `decision`) |
| `PostToolUse` | After a tool runs | No (stdout only) |
| `PostToolUseFailure` | Tool fails | No (stdout only) |
| `PreCompact` | Before context compaction | No |
| `Notification` | Background event | No |

## Hook Input

Every hook receives a JSON payload on stdin with event-specific fields:

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
```

## Hook Output

Hooks communicate back to Claude Code via stdout JSON:

- **Inject context** (SessionStart, UserPromptSubmit):
  ```json
  {"additionalContext": "Your context here"}
  ```
- **Block a tool** (PreToolUse):
  ```json
  {"decision": "block", "reason": "Blocked because..."}
  ```
- **No output needed** (PostToolUse, Stop): just `exit 0`

## All Hooks

| Event | Hook | What it does |
|-------|------|-------------|
| **SessionStart** | `memory-session-start.sh` | Recalls memories |
| **SessionStart** | `statusline.sh` | Renders 3-line CLI status bar (context %, skills, quotas) |
| **UserPromptSubmit** | `prompt-submit.sh` | Scores skills, recalls relevant memories, injects context |
| **PreToolUse** | `privacy-hook.sh` | Blocks access to `.env`, `.pem`, credentials |
| **PreToolUse** | `agent-tracker-pre.sh` | Tracks spawned subagents for statusline |
| **PostToolUse** | `post-edit-quality.sh` | Auto-formats (Biome/Prettier), validates JSON/shell |
| **PostToolUse** | `post-edit-typecheck.sh` | Runs TypeScript type checking on edited files |
| **PostToolUse** | `memory-auto-save.sh` | Saves architectural changes (migrations, schemas, configs) |
| **PostToolUse** | `tool-observe.sh` | Batches tool usage stats (file append, flushed at session end) |
| **PostToolUse** | `context-monitor.sh` | Warns at 65%/75% context usage, detects stuck agents |
| **PostToolUseFailure** | `tool-failure-log.sh` | Logs failures, detects patterns |
| **PreCompact** | `pre-compact.sh` | Saves transcript state before context compaction |
| **Stop** | `memory-session-end.sh` | Flushes pending memories, closes session |
| **Notification** | `desktop-notify.sh` | macOS desktop + Discord notifications |

## Event Flow

A typical session follows this lifecycle:

```
SessionStart
  ├── memory-session-start.sh  (recall memories)
  └── statusline.sh            (render status bar)
       │
       ▼
UserPromptSubmit (repeated per message)
  └── prompt-submit.sh         (score skills, inject context)
       │
       ▼
PreToolUse (before each tool)
  ├── privacy-hook.sh          (block sensitive files)
  └── agent-tracker-pre.sh     (track subagents)
       │
       ▼
PostToolUse (after each tool)
  ├── post-edit-quality.sh     (format + validate)
  ├── post-edit-typecheck.sh   (type check)
  ├── memory-auto-save.sh      (persist changes)
  ├── tool-observe.sh          (usage stats)
  └── context-monitor.sh       (context warnings)
       │
       ▼
PreCompact (before context compaction)
  └── pre-compact.sh           (save transcript)
       │
       ▼
Stop
  └── memory-session-end.sh    (flush memories, close session)
```

## Hook Registration

Hooks are registered in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/hook.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

## Performance Guidelines

- **Keep hooks fast** -- they block Claude's response
- **Use matchers** -- don't fire on every tool if you only need Edit/Write
- **Background heavy work** -- use `( ... ) &` for non-blocking operations
- **Debounce** -- use file-based counters to skip redundant runs
