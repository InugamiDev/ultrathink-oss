#!/bin/bash
# Notification hook — shows macOS desktop notification

INPUT=$(cat)
TYPE=$(echo "$INPUT" | jq -r '.type // ""' 2>/dev/null)
MESSAGE=$(echo "$INPUT" | jq -r '.message // ""' 2>/dev/null)

# Only notify for permission prompts and idle
case "$TYPE" in
  permission_prompt|idle_prompt)
    osascript - "$MESSAGE" <<'APPLESCRIPT' 2>/dev/null || true
on run argv
  display notification (item 1 of argv) with title "UltraThink" sound name "Glass"
end run
APPLESCRIPT
    ;;
esac

echo '{}'
