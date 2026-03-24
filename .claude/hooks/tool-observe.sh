#!/usr/bin/env bash
# UltraThink Tool Observer — PostToolUse (all tools)
# Batches tool usage to a file; flushed to DB by session-end hook.
# NO per-call process spawning — just file append.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
[[ -z "$TOOL_NAME" ]] && exit 0

# Session-scoped batch file
CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
[[ -z "$CC_SID" ]] && CC_SID="unknown"

BATCH_FILE="/tmp/ultrathink-tool-usage-${CC_SID}"

# Append tool name + timestamp (one line per call, ~20 bytes each)
echo "${TOOL_NAME}	$(date +%s)" >> "$BATCH_FILE" 2>/dev/null || true

exit 0
