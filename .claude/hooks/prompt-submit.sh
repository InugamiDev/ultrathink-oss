#!/usr/bin/env bash
# UltraThink Prompt Analyzer — UserPromptSubmit Hook
# Fires on every user prompt. Analyzes content, returns matching skill hints.
# Output: { additionalContext: "## Active Skills\n..." }

set -euo pipefail
umask 077

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "prompt-submit" "started"

# Read stdin JSON from Claude Code
INPUT=$(cat)

# Extract user prompt from hook input
USER_PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // .prompt // ""' 2>/dev/null || echo "")

# Get Claude Code session ID for scoped caching
CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
STATUS_DIR="/tmp/ultrathink-status"
mkdir -p "$STATUS_DIR" 2>/dev/null || true

# Skip short prompts (< 30 chars) — confirmations, "yes", "ok", "next" etc.
# These don't benefit from skill scoring or memory recall
if [[ ${#USER_PROMPT} -lt 30 ]]; then
  [[ -n "$CC_SID" ]] && rm -f "$STATUS_DIR/skills-$CC_SID" 2>/dev/null || true
  echo '{}'
  exit 0
fi

# Resolve paths
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
# Use pre-compiled JS for speed (28ms vs 500-1000ms with npx tsx)
ANALYZER="$HOOK_DIR/dist/prompt-analyzer.js"
RUNNER="$ULTRA_ROOT/memory/scripts/memory-runner.ts"

# Run skill analyzer AND memory recall in parallel
# Memory recall searches the DB for memories relevant to the user's prompt
output_file=$(mktemp)
recall_file=$(mktemp)
trap 'rm -f "$output_file" "$recall_file"' EXIT

# Pre-compiled JS — no npx tsx overhead
(cd "$ULTRA_ROOT" && node "$ANALYZER" "$USER_PROMPT" 2>/dev/null > "$output_file") &
pid_analyzer=$!

# Task-aware memory recall — search DB for memories matching this prompt
# TTL cache: skip recall if last one was < 5 min ago (memories don't change mid-session)
RECALL_CACHE="$STATUS_DIR/recall-cache-$CC_SID"
RECALL_TTL=300  # 5 minutes
USE_CACHED_RECALL=false

if [[ -f "$RECALL_CACHE" ]]; then
  cache_age=$(( $(date +%s) - $(stat -f%m "$RECALL_CACHE" 2>/dev/null || echo 0) ))
  if [[ $cache_age -lt $RECALL_TTL ]]; then
    cp "$RECALL_CACHE" "$recall_file"
    USE_CACHED_RECALL=true
  fi
fi

if [[ "$USE_CACHED_RECALL" == "false" && -f "$ULTRA_ROOT/.env" ]]; then
  scope=$(pwd | rev | cut -d/ -f1-2 | rev)
  (cd "$ULTRA_ROOT" && npx tsx "$RUNNER" context-recall "$USER_PROMPT" "$scope" 2>/dev/null > "$recall_file" && cp "$recall_file" "$RECALL_CACHE" 2>/dev/null) &
  pid_recall=$!
else
  pid_recall=""
fi

# Wait for both to complete (analyzer is required, recall is best-effort)
wait "$pid_analyzer" 2>/dev/null || true
[[ -n "$pid_recall" ]] && { wait "$pid_recall" 2>/dev/null || true; }

output=$(cat "$output_file" 2>/dev/null) || output='{}'
recall_context=$(cat "$recall_file" 2>/dev/null | jq -r '.context // ""' 2>/dev/null) || recall_context=""

# Extract context from analyzer output
context=$(echo "$output" | jq -r '.context // ""' 2>/dev/null || echo "")

# Merge: skill context first, then recalled memories (cap at 2KB to save tokens)
if [[ -n "$recall_context" ]]; then
  recall_trimmed="${recall_context:0:2048}"
  if [[ -n "$context" ]]; then
    context="$context"$'\n\n'"## Recalled Memories"$'\n'"$recall_trimmed"
  else
    context="## Recalled Memories"$'\n'"$recall_trimmed"
  fi
fi

if [[ -n "$context" ]]; then
  # Cache active skills for status line (session-scoped)
  skill_names=$(echo "$output" | jq -r '[.skills[]?.name] | join(", ")' 2>/dev/null)
  skill_csv=$(echo "$output" | jq -r '[.skills[]?.name] | join(",")' 2>/dev/null)
  if [[ -n "$skill_names" && -n "$CC_SID" ]]; then
    echo "$skill_names" > "$STATUS_DIR/skills-$CC_SID" 2>/dev/null || true
  fi
  hook_log "prompt-submit" "done" "skills=$skill_names"

  # Log skill usage to DB (fire-and-forget — does not block prompt response)
  if [[ -n "$skill_csv" ]]; then
    SESSION_ID=""
    if [[ -n "$CC_SID" && -f "/tmp/ultrathink-session-${CC_SID}" ]]; then
      SESSION_ID=$(cat "/tmp/ultrathink-session-${CC_SID}" 2>/dev/null || true)
    elif [[ -f /tmp/ultrathink-session-id ]]; then
      SESSION_ID=$(cat /tmp/ultrathink-session-id 2>/dev/null || true)
    fi
    (cd "$ULTRA_ROOT" && npx tsx "$RUNNER" log-skill "$skill_csv" "$SESSION_ID" >/dev/null 2>&1) &
  fi

  tmpctx=$(mktemp)
  trap 'rm -f "$output_file" "$recall_file" "$tmpctx"' EXIT
  printf '%s' "$context" > "$tmpctx"
  jq -n --rawfile ctx "$tmpctx" '{ additionalContext: $ctx }'
else
  # Clear skills cache when no skills match
  [[ -n "$CC_SID" ]] && rm -f "$STATUS_DIR/skills-$CC_SID" 2>/dev/null || true
  hook_log "prompt-submit" "done" "no-match"
  echo '{}'
fi
