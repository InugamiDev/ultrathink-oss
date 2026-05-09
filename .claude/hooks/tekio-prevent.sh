#!/usr/bin/env bash
# Tekiō Prevention Loop — PostToolUse (success path)
#
# intent: When a tool succeeds, check if an adaptation was relevant to this operation.
#         If so, the rule helped prevent a failure → increment times_prevented.
# status: done
# confidence: high
#
# Flow:
#   1. Read cached adaptations from /tmp/ultrathink-status/adaptations-cache.json
#   2. Check if any trigger pattern matches the current tool input
#   3. If match found → record prevention (async, non-blocking)
#
# This hook runs on PostToolUse for Read/Edit/Write/Bash — the tools that fail most.

set -eo pipefail

INPUT=$(cat 2>/dev/null || echo "{}")
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)

# Only check tools that commonly fail
case "$TOOL_NAME" in
  Read|Edit|Write|MultiEdit|Bash|Glob|WebFetch) ;;
  *) exit 0 ;;
esac

CACHE="/tmp/ultrathink-status/adaptations-cache.json"
[[ -f "$CACHE" ]] || exit 0

# Extract tool input context for matching
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input | tostring' 2>/dev/null | head -c 500)
[[ -z "$TOOL_INPUT" ]] && exit 0

# Rate limit: max 1 prevention check per 30 seconds per tool
RATE_FILE="/tmp/ultrathink-prevent-rate/${TOOL_NAME}"
if [[ -f "$RATE_FILE" ]]; then
  LAST=$(cat "$RATE_FILE" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  [[ $((NOW - LAST)) -lt 30 ]] && exit 0
fi

# Check each cached adaptation trigger against the tool input
# Use simple substring matching — fast, no DB call
MATCHED_ID=""
while IFS= read -r line; do
  TRIGGER=$(echo "$line" | jq -r '.trigger // ""' 2>/dev/null)
  AID=$(echo "$line" | jq -r '.id // ""' 2>/dev/null)
  [[ -z "$TRIGGER" || -z "$AID" ]] && continue

  # Check if this tool invocation matches the adaptation's trigger pattern
  case "$TOOL_NAME" in
    Read)
      # EISDIR prevention: reading a path that looks like a directory
      if [[ "$TRIGGER" == *"directory"* ]] && echo "$TOOL_INPUT" | grep -qE '(^|/)([^.]+)/?$'; then
        MATCHED_ID="$AID"; break
      fi
      # File not found: reading a path
      if [[ "$TRIGGER" == *"does not exist"* ]]; then
        MATCHED_ID="$AID"; break
      fi
      # File too big
      if [[ "$TRIGGER" == *"exceeds maximum"* ]] && echo "$TOOL_INPUT" | grep -qE 'offset|limit'; then
        MATCHED_ID="$AID"; break
      fi
      ;;
    Bash)
      # Top-level await prevention
      if [[ "$TRIGGER" == *"top-level await"* ]] && echo "$TOOL_INPUT" | grep -qE 'npx tsx .+\.ts'; then
        MATCHED_ID="$AID"; break
      fi
      ;;
    Glob)
      # Glob timeout prevention
      if [[ "$TRIGGER" == *"timed out"* ]] && echo "$TOOL_INPUT" | grep -qE 'src/|specific'; then
        MATCHED_ID="$AID"; break
      fi
      ;;
    WebFetch)
      # 303 redirect prevention
      if [[ "$TRIGGER" == *"303"* ]] && echo "$TOOL_INPUT" | grep -qvE 'github\.com'; then
        MATCHED_ID="$AID"; break
      fi
      ;;
  esac
done < <(jq -c '.[]' "$CACHE" 2>/dev/null)

[[ -z "$MATCHED_ID" ]] && exit 0

# Record prevention (async, non-blocking)
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

(
  mkdir -p /tmp/ultrathink-prevent-rate 2>/dev/null || true
  date +%s > "$RATE_FILE" 2>/dev/null || true

  # Load .env
  if [[ -z "${DATABASE_URL:-}" && -f "$ULTRA_ROOT/.env" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      key="${line%%=*}"
      value="${line#*=}"
      export "$key"="$value"
    done < "$ULTRA_ROOT/.env"
  fi

  cd "$ULTRA_ROOT"
  npx tsx packages/memory/scripts/memory-runner.ts wheel-prevent "$MATCHED_ID" 2>/dev/null || true
) &

exit 0
