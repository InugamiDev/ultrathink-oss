#!/usr/bin/env bash
# UltraThink Suggest-Compact
# PreToolUse hook on Edit|Write — tracks tool call count, suggests compaction at logical boundaries.
# Adapted from everything-claude-code's suggest-compact.js

set -euo pipefail

# Session-scoped counter file
CC_SID="${CC_SESSION_ID:-unknown}"
COUNTER_FILE="/tmp/ultrathink-toolcount-${CC_SID:0:12}"
THRESHOLD=${ULTRATHINK_COMPACT_THRESHOLD:-50}
INTERVAL=${ULTRATHINK_COMPACT_INTERVAL:-25}

# Read current count
COUNT=0
if [[ -f "$COUNTER_FILE" ]]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
  # Sanitize
  COUNT=$((COUNT + 0)) 2>/dev/null || COUNT=0
fi

# Increment
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE" 2>/dev/null || true

# Check if we should suggest compaction
SHOULD_SUGGEST=false
if [[ $COUNT -eq $THRESHOLD ]]; then
  SHOULD_SUGGEST=true
elif [[ $COUNT -gt $THRESHOLD ]]; then
  PAST=$((COUNT - THRESHOLD))
  if [[ $((PAST % INTERVAL)) -eq 0 ]]; then
    SHOULD_SUGGEST=true
  fi
fi

if [[ "$SHOULD_SUGGEST" == "true" ]]; then
  echo "💡 Context checkpoint: $COUNT tool calls this session. Consider running /compact at the next logical boundary (after completing current task, before starting new one)."
fi

exit 0
