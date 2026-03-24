# Create a Hook

How to add a new shell or TypeScript hook to UltraThink.

## Hook Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Read the hook input JSON from stdin
INPUT=$(cat)

# Extract fields (available fields depend on hook event)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)

# Your logic here
# ...

# To inject context (UserPromptSubmit/SessionStart only):
# echo '{"additionalContext": "Your context here"}'

# To block a tool (PreToolUse only):
# echo '{"decision": "block", "reason": "Blocked because..."}'

# For PostToolUse hooks, just exit cleanly:
exit 0
```

## Available Events

| Event | When | Can inject context? |
|-------|------|-------------------|
| `SessionStart` | Claude Code starts | Yes (`additionalContext`) |
| `Stop` | Claude Code exits | No |
| `UserPromptSubmit` | User sends a message | Yes (`additionalContext`) |
| `PreToolUse` | Before a tool runs | Yes (can block with `decision`) |
| `PostToolUse` | After a tool runs | No |
| `PostToolUseFailure` | Tool fails | No |
| `PreCompact` | Before context compaction | No |
| `Notification` | Background event | No |

## Register in `settings.json`

Add your hook to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/your-hook.sh",
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
- **Export functions** -- if backgrounding with `( ... ) &`, use `export -f` for shell functions

## Make it Executable

```bash
chmod +x .claude/hooks/your-hook.sh
```

## Test Manually

```bash
echo '{"tool_name": "Edit", "file_path": "/test/file.ts"}' | .claude/hooks/your-hook.sh
```
