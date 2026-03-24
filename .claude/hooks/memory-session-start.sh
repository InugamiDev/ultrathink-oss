#!/usr/bin/env bash
# UltraThink Memory Session Start Hook
# Fires on SessionStart — creates session, recalls memories, returns additionalContext.
# Post-compact variant: detects source=="compact" and restores state without creating a new session.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "session-start" "started"

# Read stdin JSON (Claude passes hook input via stdin)
INPUT=$(cat)

# Resolve UltraThink project root (follow symlinks back to source)
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

RUNNER="$ULTRA_ROOT/memory/scripts/memory-runner.ts"

# Load DATABASE_URL from .env
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ULTRA_ROOT/.env" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      key="${line%%=*}"
      value="${line#*=}"
      export "$key"="$value"
    done < "$ULTRA_ROOT/.env"
  fi
fi

# If no DATABASE_URL, exit silently with empty response
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo '{}'
  exit 0
fi

# Pass current working directory to the runner
export ULTRATHINK_CWD="${CWD:-$(pwd)}"

# Set auto-compact threshold to 80% (gives more room for quality summaries)
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  if ! grep -q 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE' "$CLAUDE_ENV_FILE" 2>/dev/null; then
    echo 'export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80' >> "$CLAUDE_ENV_FILE"
  fi
fi

# Detect if this is a post-compact restart
SOURCE=$(echo "$INPUT" | jq -r '.source // ""' 2>/dev/null || echo "")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")

# Export CC_SESSION_ID for process-scoped session file isolation
export CC_SESSION_ID="$SESSION_ID"

if [[ "$SOURCE" == "compact" ]]; then
  # --- Post-compact path ---
  # 1. Recall memories without creating a new session
  recall_output=$(cd "$ULTRA_ROOT" && npx tsx "$RUNNER" recall-only 2>/dev/null) || recall_output='{}'

  # 2. Read pre-compact state file if available
  STATE_DIR="/tmp/ultrathink-compact-state"
  state_context=""
  if [[ -n "$SESSION_ID" && -f "$STATE_DIR/$SESSION_ID.json" ]]; then
    state_file="$STATE_DIR/$SESSION_ID.json"
    last_task=$(jq -r '.last_task // ""' "$state_file" 2>/dev/null || echo "")
    files_json=$(jq -r '.files_modified // [] | join(", ")' "$state_file" 2>/dev/null || echo "")
    last_summary=$(jq -r '.last_summary // ""' "$state_file" 2>/dev/null || echo "")

    NL=$'\n'
    state_context="## Post-Compact State Recovery${NL}${NL}"
    if [[ -n "$last_task" ]]; then
      state_context+="**Active task**: ${last_task}${NL}${NL}"
    fi
    if [[ -n "$files_json" ]]; then
      state_context+="**Files modified this session**: ${files_json}${NL}${NL}"
    fi
    if [[ -n "$last_summary" ]]; then
      state_context+="**Where we left off**: ${last_summary}${NL}${NL}"
    fi
  fi

  # 3. Combine recalled memories + compact state via temp file (avoids shell newline issues)
  recalled=$(echo "$recall_output" | jq -r '.additionalContext // ""' 2>/dev/null || echo "")
  combined="${recalled}${state_context}"

  if [[ -n "$combined" ]]; then
    tmpctx=$(mktemp)
    trap 'rm -f "$tmpctx"' EXIT
    printf '%s' "$combined" > "$tmpctx"
    jq -n --rawfile ctx "$tmpctx" '{ additionalContext: $ctx }'
  else
    echo '{}'
  fi
  hook_log "session-start" "done"
else
  # --- Normal session start path ---
  output=$(cd "$ULTRA_ROOT" && npx tsx "$RUNNER" session-start 2>/dev/null) || output='{}'

  # Ensure valid JSON output
  if echo "$output" | jq empty 2>/dev/null; then
    # Cache identity for status line — scoped to Claude Code session
    ctx=$(echo "$output" | jq -r '.additionalContext // ""' 2>/dev/null || echo "")
    identity=$(echo "$ctx" | grep -o '\*\*Identity:\*\* [^*]*' | sed 's/\*\*Identity:\*\* //' | head -1)
    if [[ -n "$identity" ]]; then
      CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
      if [[ -n "$CC_SID" ]]; then
        mkdir -p /tmp/ultrathink-status 2>/dev/null || true
        echo "$identity" > "/tmp/ultrathink-status/identity-$CC_SID" 2>/dev/null || true
      fi
    fi

    # Extract user preferences for skill scoring (preference boosting in prompt-analyzer)
    # Uses memory-runner instead of inline npx tsx -e to avoid extra process spawn
    if [[ -n "$CC_SID" ]]; then
      (
        raw_prefs=$(cd "$ULTRA_ROOT" && npx tsx "$RUNNER" preferences 2>/dev/null) || raw_prefs='[]'
        echo "$raw_prefs" > "/tmp/ultrathink-status/preferences-${CC_SID}.json"
      ) &
      pid_prefs=$!
    fi

    # Run background jobs — fire-and-forget (DO NOT wait — these are informational)
    mkdir -p /tmp/ultrathink-status 2>/dev/null || true
    WEEKLY_SCRIPT="$ULTRA_ROOT/memory/scripts/weekly-stats.ts"
    WHEEL_SCRIPT="$ULTRA_ROOT/memory/scripts/wheel-count.ts"
    CONTEXT_TREE_SCRIPT="$ULTRA_ROOT/memory/scripts/context-tree.ts"

    # All 3 are non-critical — launch and forget (saves 2-4s on session start)
    (cd "$ULTRA_ROOT" && timeout 10 npx tsx "$WEEKLY_SCRIPT" > /tmp/ultrathink-status/weekly-stats 2>/dev/null) &
    [[ -f "$WHEEL_SCRIPT" ]] && (cd "$ULTRA_ROOT" && timeout 10 npx tsx "$WHEEL_SCRIPT" > /tmp/ultrathink-status/wheel-count 2>/dev/null) &
    [[ -f "$CONTEXT_TREE_SCRIPT" ]] && (cd "$ULTRA_ROOT" && timeout 10 npx tsx "$ULTRA_ROOT/memory/scripts/context-tree-summary.ts" > /tmp/ultrathink-status/context-tree 2>/dev/null) &

    # Only wait for preferences (needed for prompt-analyzer skill boosting)
    [[ -n "${pid_prefs:-}" ]] && wait "$pid_prefs" 2>/dev/null || true

    echo "$output"
  else
    echo '{}'
  fi

  # Send session start summary to Discord (async)
  NOTIFY_SCRIPT="$HOOK_DIR/notify.sh"
  if [[ -x "$NOTIFY_SCRIPT" ]]; then
    (
      # Gather stats for the notification
      MEM_LINE=$(cat /tmp/ultrathink-status/weekly-stats 2>/dev/null || echo "")
      MEM_N=$(echo "$MEM_LINE" | cut -d'|' -f1 2>/dev/null || echo "?")
      START_MSG="▶ New session started\n\n**Memories:** ${MEM_N}\n**Project:** $(basename "$ULTRA_ROOT")"
      bash "$NOTIFY_SCRIPT" "$START_MSG" "discord" "normal" 2>/dev/null || true
    ) &
  fi

  hook_log "session-start" "done"
fi
