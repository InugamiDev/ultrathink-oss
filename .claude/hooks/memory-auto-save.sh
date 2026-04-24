#!/usr/bin/env bash
set -eo pipefail
umask 077

# memory-auto-save.sh — PostToolUse hook
#
# intent: Auto-save decisions when Edit/Write contains decision language
# status: done
# confidence: high
#
# Detects decision patterns in tool input and saves to memory via memory-runner.
# Rate-limited: max 1 auto-save per 120 seconds.
# Only triggers on Edit/Write — not Read, Bash, Glob, etc.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)

# Only trigger on Edit/Write
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) echo '{}'; exit 0 ;;
esac

# ── Resolve paths ──
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
RUNNER="$ULTRA_ROOT/memory/scripts/memory-runner.ts"

# ── Load .env ──
if [[ -z "${DATABASE_URL:-}" && -f "$ULTRA_ROOT/.env" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    export "$key"="$value"
  done < "$ULTRA_ROOT/.env"
fi

[[ -z "${DATABASE_URL:-}" ]] && { echo '{}'; exit 0; }

# ── Rate limit: 1 decision per 120s ──
RATE_FILE="/tmp/ultrathink-last-decision-save"
if [[ -f "$RATE_FILE" ]]; then
  LAST_TS=$(cat "$RATE_FILE" 2>/dev/null || echo "0")
  NOW_TS=$(date +%s)
  if [[ $((NOW_TS - LAST_TS)) -lt 120 ]]; then
    echo '{}'; exit 0
  fi
fi

# ── Extract content from tool input ──
# For Edit: new_string contains the decision; for Write: content
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // ""' 2>/dev/null | head -c 2000)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null)

# Need actual text content, not JSON structure
[[ -z "$NEW_STRING" || "$NEW_STRING" == "null" ]] && { echo '{}'; exit 0; }

# ── Check for decision language ──
DECISION_PATTERNS="(switch(ed|ing)? (to|from)|let'?s use|don'?t use|instead of|decided to|going with|replaced .* with|migrated? (to|from)|chose |prefer |upgraded? (to|from))"

if ! echo "$NEW_STRING" | grep -qiE "$DECISION_PATTERNS"; then
  echo '{}'; exit 0
fi

# ── Extract the decision phrase ──
DECISION_LINE=$(echo "$NEW_STRING" | grep -iE "$DECISION_PATTERNS" | head -1 | head -c 200)
[[ -z "$DECISION_LINE" ]] && { echo '{}'; exit 0; }

# Clean: strip code artifacts, keep only readable text
CLEAN_LINE=$(echo "$DECISION_LINE" | sed 's/[^a-zA-Z0-9 ._,;:/-]//g' | sed 's/  */ /g' | head -c 70)
[[ ${#CLEAN_LINE} -lt 10 ]] && { echo '{}'; exit 0; }

TITLE="Decision: $CLEAN_LINE"
SCOPE=$(pwd | rev | cut -d'/' -f1-2 | rev)

# ── Save to DB (async, non-blocking) ──
(
  date +%s > "$RATE_FILE" 2>/dev/null || true

  cd "$ULTRA_ROOT"
  SAFE_CONTENT=$(echo "$DECISION_LINE" | jq -Rs '.')
  npx tsx "$RUNNER" save "{\"title\":\"$TITLE\",\"content\":${SAFE_CONTENT},\"category\":\"decision\",\"importance\":7,\"scope\":\"$SCOPE\"}" 2>/dev/null || true
) &

echo '{}'
exit 0
