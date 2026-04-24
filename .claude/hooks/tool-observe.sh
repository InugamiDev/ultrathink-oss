#!/usr/bin/env bash
# UltraThink Tool Observer — PostToolUse (all tools)
# Batches tool usage to a file; flushed to DB by session-end hook.
# Also detects successful Bash commands and queues wheel-learn events.
# NO per-call process spawning — just file append.

set -euo pipefail
umask 077  # UltraThink: restrict temp files to owner only

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
[[ -z "$TOOL_NAME" ]] && exit 0

# Session-scoped batch file
CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
[[ -z "$CC_SID" ]] && CC_SID="unknown"

BATCH_FILE="/tmp/ultrathink-tool-usage-${CC_SID}"

# Append tool name + timestamp (one line per call, ~20 bytes each)
echo "${TOOL_NAME}	$(date +%s)" >> "$BATCH_FILE" 2>/dev/null || true

# ☸ Tekiō — auto-detect successful patterns from Bash commands
# Queue wheel-learn events for notable successes (processed at session-end)
if [[ "$TOOL_NAME" == "Bash" ]]; then
  EXIT_STATUS=$(echo "$INPUT" | jq -r '.tool_result.exit_status // 0' 2>/dev/null || echo "0")
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null | head -c 200)

  # Only learn from successful, notable commands
  if [[ "$EXIT_STATUS" == "0" && -n "$COMMAND" ]]; then
    SHOULD_LEARN=""
    PATTERN=""
    INSIGHT=""

    case "$COMMAND" in
      *"npm test"*|*"npx vitest"*|*"npx jest"*|*"bun test"*)
        SHOULD_LEARN=true
        PATTERN="test suite passed"
        INSIGHT="Test suite passes — current test approach is working"
        ;;
      *"npm run build"*|*"npx tsc"*|*"bun build"*)
        SHOULD_LEARN=true
        PATTERN="build succeeded"
        INSIGHT="Build passes — TypeScript compiles cleanly"
        ;;
      *"npm run lint"*|*"npx biome"*|*"npx eslint"*)
        SHOULD_LEARN=true
        PATTERN="lint passed"
        INSIGHT="Lint passes — code meets style requirements"
        ;;
      *"docker build"*|*"docker compose up"*)
        SHOULD_LEARN=true
        PATTERN="docker build succeeded"
        INSIGHT="Docker build/compose succeeded — container config is valid"
        ;;
    esac

    if [[ -n "$SHOULD_LEARN" ]]; then
      # Rate limit: max 1 learn per pattern per 10 minutes
      LEARN_LOCK="/tmp/ultrathink-wheel-turns/learn-lock-$(echo "$PATTERN" | tr ' ' '-')"
      if [[ ! -f "$LEARN_LOCK" ]] || [[ $(( $(date +%s) - $(cat "$LEARN_LOCK" 2>/dev/null || echo 0) )) -gt 600 ]]; then
        WHEEL_DIR="/tmp/ultrathink-wheel-turns"
        mkdir -p "$WHEEL_DIR" 2>/dev/null || true
        TS=$(date +%s%N | head -c 13)
        SCOPE=$(pwd | rev | cut -d/ -f1-2 | rev)
        printf '{"type":"success-pattern","timestamp":"%s","pattern":"%s","insight":"%s","scope":"%s"}' \
          "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PATTERN" "$INSIGHT" "$SCOPE" \
          > "$WHEEL_DIR/${TS}-success.json" 2>/dev/null || true
        echo "$(date +%s)" > "$LEARN_LOCK" 2>/dev/null || true
      fi
    fi
  fi
fi

exit 0
