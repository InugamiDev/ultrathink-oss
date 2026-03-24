#!/usr/bin/env bash
# UltraThink PreCompact Hook
# Extracts session state from the transcript before compaction.
# Writes state to /tmp/ultrathink-compact-state/<session_id>.json

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "pre-compact" "started"

# Read stdin JSON (Claude passes hook input via stdin)
INPUT=$(cat)

# Extract fields from hook input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

# Resolve project root
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

EXTRACT_SCRIPT="$HOOK_DIR/pre-compact-extract.ts"
STATE_DIR="/tmp/ultrathink-compact-state"

mkdir -p "$STATE_DIR"

# If we have a transcript path and the extract script exists, parse it
if [[ -n "$TRANSCRIPT_PATH" && -f "$TRANSCRIPT_PATH" && -f "$EXTRACT_SCRIPT" ]]; then
  output=$(cd "$ULTRA_ROOT" && npx tsx "$EXTRACT_SCRIPT" "$TRANSCRIPT_PATH" "$SESSION_ID" 2>/dev/null) || output=""

  if [[ -n "$output" ]] && echo "$output" | jq empty 2>/dev/null; then
    echo "$output" > "$STATE_DIR/$SESSION_ID.json"
  fi
else
  # No transcript available — write minimal state marker
  jq -n --arg sid "$SESSION_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ session_id: $sid, extracted_at: $ts, files_modified: [], last_task: null, last_summary: null }' \
    > "$STATE_DIR/$SESSION_ID.json"
fi

# Output empty JSON (PreCompact hooks don't inject context)
# Get context usage for the notification
CTX_PCT=""
USAGE_CACHE="/tmp/ultrathink-status/anthropic-usage.json"
if [[ -f "$USAGE_CACHE" ]]; then
  CTX_PCT="context compacted"
else
  CTX_PCT="context compacted"
fi

hook_log "pre-compact" "done" "$CTX_PCT"
echo '{}'
