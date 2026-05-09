#!/usr/bin/env bash
# intent: Preserve critical session state before context compaction
# status: done
# confidence: high
#
# UltraThink PreCompact Hook
# Extracts session state from the transcript before compaction and INJECTS it
# back as additionalContext so the compacted conversation retains critical info.
# Also saves state to /tmp/ultrathink-compact-state/<session_id>.json for
# session-start recovery.
#
# IMPORTANT: This hook MUST NOT exit non-zero — Claude Code interprets that as
# "block compaction" and the user is then stuck unable to compact when context
# fills up. The trap below logs unexpected failures + emits an empty {} so
# compaction proceeds even on internal hook bugs.

set -uo pipefail
set -E  # propagate ERR trap into shell functions + command substitutions
umask 077  # UltraThink: restrict temp files to owner only

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }

# ANY uncaught error → log it, emit empty additionalContext, exit clean. Never
# block compaction on a hook bug.
on_err() {
  local code=$?
  hook_log "pre-compact" "fatal exit=$code at line ${1:-?} — emitting empty result"
  echo "{}"
  exit 0
}
trap 'on_err $LINENO' ERR

hook_log "pre-compact" "started"

# ─── MemPalace: Flush in-flight memories before compaction ────────────
# intent: prevent auto-memories in /tmp from being lost during context compression
# status: done
# confidence: high
FLUSH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Flush pending auto-memories (10s timeout, failure-tolerant)
if ls /tmp/ultrathink-memories/*.json 1>/dev/null 2>&1; then
  hook_log "pre-compact" "flushing pending auto-memories"
  timeout 10 bash -c "cd '$FLUSH_ROOT' && npx tsx packages/memory/scripts/memory-runner.ts flush" 2>/dev/null \
    || hook_log "pre-compact" "warning: memory flush failed or timed out (non-blocking)"
fi

# Flush pending decisions (10s timeout, failure-tolerant)
if ls /tmp/ultrathink-pending-decisions/*.json 1>/dev/null 2>&1; then
  hook_log "pre-compact" "flushing pending decisions"
  timeout 10 bash -c "cd '$FLUSH_ROOT' && npx tsx packages/memory/scripts/memory-runner.ts flush-decisions" 2>/dev/null \
    || hook_log "pre-compact" "warning: decision flush failed or timed out (non-blocking)"
fi

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
SID_SHORT=$(echo "$SESSION_ID" | head -c 12)

mkdir -p "$STATE_DIR"

# Extract state from transcript
STATE_JSON=""
if [[ -n "$TRANSCRIPT_PATH" && -f "$TRANSCRIPT_PATH" && -f "$EXTRACT_SCRIPT" ]]; then
  STATE_JSON=$(cd "$ULTRA_ROOT" && npx tsx "$EXTRACT_SCRIPT" "$TRANSCRIPT_PATH" "$SESSION_ID" 2>/dev/null) || STATE_JSON=""
fi

# Validate JSON
if [[ -z "$STATE_JSON" ]] || ! echo "$STATE_JSON" | jq empty 2>/dev/null; then
  STATE_JSON=$(jq -n --arg sid "$SESSION_ID" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{ session_id: $sid, extracted_at: $ts, files_modified: [], last_task: null, last_summary: null, decisions: [], pending_work: [] }')
fi

# Enrich with GSD progress state if active. Validate JSON BEFORE --argjson —
# otherwise a malformed/empty tracker file aborts the hook (set -e) and blocks
# the compaction entirely. Soft-fail every step.
GSD_PROGRESS="/tmp/ultrathink-progress-${SID_SHORT}"
if [[ -f "$GSD_PROGRESS" && -s "$GSD_PROGRESS" ]]; then
  GSD_STATE=$(cat "$GSD_PROGRESS" 2>/dev/null || true)
  if [[ -n "$GSD_STATE" ]] && echo "$GSD_STATE" | jq empty 2>/dev/null; then
    NEW_JSON=$(echo "$STATE_JSON" | jq --argjson gsd "$GSD_STATE" '. + { gsd_progress: $gsd }' 2>/dev/null) \
      && STATE_JSON="$NEW_JSON"
  else
    hook_log "pre-compact" "skip gsd: invalid JSON in $GSD_PROGRESS"
  fi
fi

# Enrich with active agent states (same defensive pattern).
AGENT_TRACKER="/tmp/ultrathink-agents-${SID_SHORT}"
if [[ -f "$AGENT_TRACKER" && -s "$AGENT_TRACKER" ]]; then
  AGENTS=$(cat "$AGENT_TRACKER" 2>/dev/null || true)
  if [[ -n "$AGENTS" ]] && echo "$AGENTS" | jq empty 2>/dev/null; then
    NEW_JSON=$(echo "$STATE_JSON" | jq --argjson agents "$AGENTS" '. + { active_agents: $agents }' 2>/dev/null) \
      && STATE_JSON="$NEW_JSON"
  else
    hook_log "pre-compact" "skip agents: invalid JSON in $AGENT_TRACKER"
  fi
fi

# Save state file for session-start recovery
echo "$STATE_JSON" > "$STATE_DIR/$SESSION_ID.json"

# Build additionalContext string for injection back into compacted conversation
LAST_TASK=$(echo "$STATE_JSON" | jq -r '.last_task // ""')
FILES_MOD=$(echo "$STATE_JSON" | jq -r '.files_modified // [] | join(", ")')
LAST_SUMMARY=$(echo "$STATE_JSON" | jq -r '.last_summary // ""')
DECISIONS=$(echo "$STATE_JSON" | jq -r '.decisions // [] | join("\n- ")')
PENDING=$(echo "$STATE_JSON" | jq -r '.pending_work // [] | join("\n- ")')

CTX=""

# Always include files modified — critical for not re-reading
if [[ -n "$FILES_MOD" ]]; then
  CTX+="Files modified this session: ${FILES_MOD}\n\n"
fi

# Include last task for continuity
if [[ -n "$LAST_TASK" ]]; then
  CTX+="Last user request: ${LAST_TASK}\n\n"
fi

# Include decisions made
if [[ -n "$DECISIONS" ]]; then
  CTX+="Key decisions made:\n- ${DECISIONS}\n\n"
fi

# Include pending work
if [[ -n "$PENDING" ]]; then
  CTX+="Pending work:\n- ${PENDING}\n\n"
fi

# Include last summary (truncated)
if [[ -n "$LAST_SUMMARY" ]]; then
  CTX+="Last progress update: ${LAST_SUMMARY:0:400}\n\n"
fi

# Include GSD state if active
if [[ -f "$GSD_PROGRESS" ]]; then
  WAVE=$(echo "$STATE_JSON" | jq -r '.gsd_progress.wave // 0')
  TOTAL_WAVES=$(echo "$STATE_JSON" | jq -r '.gsd_progress.total_waves // 0')
  TASKS_DONE=$(echo "$STATE_JSON" | jq -r '.gsd_progress.tasks.completed // 0')
  TASKS_TOTAL=$(echo "$STATE_JSON" | jq -r '.gsd_progress.tasks.total // 0')
  CTX+="GSD execution in progress: wave ${WAVE}/${TOTAL_WAVES}, ${TASKS_DONE}/${TASKS_TOTAL} tasks complete\n"
fi

# Output with additionalContext if we have anything to inject
if [[ -n "$CTX" ]]; then
  ESCAPED_CTX=$(printf '%s' "$CTX" | jq -Rs .)
  echo "{\"additionalContext\": ${ESCAPED_CTX}}"
else
  echo '{}'
fi

hook_log "pre-compact" "done" "state preserved, $(echo "$STATE_JSON" | jq -r '.files_modified | length') files tracked"
