#!/usr/bin/env bash
# intent: Auto-extract decisions from user corrections (Builder+Core)
# status: done
# confidence: medium
# next: improve extraction heuristics with LLM scoring
# PostToolUse hook for Agent (fires when subagent completes)

set -euo pipefail
umask 077

ULTRA_DATA="$HOME/.ultrathink"
CONFIG="$ULTRA_DATA/config.json"

# Only run for Builder+ tiers
if [[ ! -f "$CONFIG" ]]; then exit 0; fi
TIER=$(jq -r '.tier // "oss"' "$CONFIG" 2>/dev/null)
[[ "$TIER" == "oss" ]] && exit 0

INPUT=$(cat)

# Look for correction patterns in the tool output
# This is a heuristic — looks for phrases that indicate user corrections
TOOL_OUTPUT=$(echo "$INPUT" | jq -r '.tool_output.stdout // ""' 2>/dev/null || echo "")
[[ -z "$TOOL_OUTPUT" ]] && exit 0

# Detection patterns for user corrections (common phrases)
CORRECTION_PATTERNS="no,? ?(not|don't|dont|stop|instead|rather|actually|use .* instead|prefer|always|never)"

# Check if the output contains correction-like text
if echo "$TOOL_OUTPUT" | grep -iEq "$CORRECTION_PATTERNS" 2>/dev/null; then
  # Extract the correction line
  CORRECTION=$(echo "$TOOL_OUTPUT" | grep -iE "$CORRECTION_PATTERNS" | head -1 | tr -d '"' | head -c 200)

  if [[ -n "$CORRECTION" ]]; then
    # Save as pending decision for review (don't auto-apply — user should confirm)
    PENDING_DIR="/tmp/ultrathink-pending-decisions"
    mkdir -p "$PENDING_DIR"
    TS=$(date +%s)

    PROJECT_PATH="${CWD:-$(pwd)}"
    HASH=$(echo -n "$PROJECT_PATH" | shasum -a 256 | cut -c1-8)

    jq -n \
      --arg rule "$CORRECTION" \
      --arg scope "$PROJECT_PATH" \
      --arg hash "$HASH" \
      --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
      '{rule: $rule, scope: $scope, project_hash: $hash, extracted_at: $ts, confirmed: false}' \
      > "$PENDING_DIR/${TS}-decision.json"
  fi
fi

exit 0
