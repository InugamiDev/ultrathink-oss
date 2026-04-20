#!/bin/bash
# PostToolUseFailure — route failures to Tekiō only (no memory creation)
#
# intent: Tekiō is the single owner of failure learning. No more double-writing.
# status: done (rewritten 2026-04-08 — was double-logging failures to both memories + Tekiō)
# confidence: high
#
# Previous version wrote a memory AND turned the wheel for every failure.
# Result: 51+ junk "Tool X failed: Y" memories that duplicated Tekiō adaptations.
# Now: Tekiō wheel-turn only. If it's worth remembering, Tekiō creates an adaptation.

set -euo pipefail
umask 077

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
ERROR=$(echo "$INPUT" | jq -r '.error // "unknown error"' 2>/dev/null | head -c 300)

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "tool-failure" "error" "$TOOL_NAME: $ERROR"

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

# ── Filter noise before Tekiō wheel turn ──
SKIP_WHEEL=""

# Generic/unhelpful errors
if [[ "$ERROR" == "Exit code 1" || "$ERROR" == "unknown error" ]]; then
  SKIP_WHEEL="generic-error"
fi

# Inline script parse failures (user experimentation)
if echo "$ERROR" | grep -qE 'File "<(string|stdin)>"|SyntaxError|json\.load|jq:'; then
  SKIP_WHEEL="inline-script-error"
fi

# Transient network errors
if echo "$ERROR" | grep -qiE 'ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|status code (502|503|504)'; then
  SKIP_WHEEL="transient-network"
fi

# Too short to be useful
if [[ ${#ERROR} -lt 15 ]]; then
  SKIP_WHEEL="too-short"
fi

# Rate limit: skip if same tool failed in last 60s
LAST_TURN_FILE="/tmp/ultrathink-wheel-turns/last-${TOOL_NAME}"
if [[ -f "$LAST_TURN_FILE" ]]; then
  LAST_TURN_TS=$(cat "$LAST_TURN_FILE" 2>/dev/null || echo "0")
  NOW_TS=$(date +%s)
  if [[ $((NOW_TS - LAST_TURN_TS)) -lt 60 ]]; then
    SKIP_WHEEL="rate-limited"
  fi
fi

# ── Tekiō wheel turn (async, non-blocking) ──
FILE_CTX=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // ""' 2>/dev/null | head -c 120)
PROJECT_SCOPE=$(pwd | rev | cut -d'/' -f1-2 | rev)

if [[ -n "${DATABASE_URL:-}" && -z "$SKIP_WHEEL" ]]; then
  mkdir -p /tmp/ultrathink-wheel-turns 2>/dev/null || true
  echo "$(date +%s)" > "$LAST_TURN_FILE" 2>/dev/null || true
  (
    cd "$ULTRA_ROOT"
    WHEEL_OUT=$(npx tsx "$RUNNER" wheel-turn "$ERROR" "$FILE_CTX" "$TOOL_NAME" "$PROJECT_SCOPE" 2>/dev/null) || true
    if [[ -n "$WHEEL_OUT" && "$WHEEL_OUT" != *"SKIP"* ]]; then
      mkdir -p /tmp/ultrathink-wheel-turns 2>/dev/null || true
      echo "$WHEEL_OUT" > /tmp/ultrathink-wheel-turns/last-notification 2>/dev/null || true

      # Update wheel count cache
      WHEEL_SCRIPT="$ULTRA_ROOT/memory/scripts/wheel-count.ts"
      [[ -f "$WHEEL_SCRIPT" ]] && npx tsx "$WHEEL_SCRIPT" > /tmp/ultrathink-status/wheel-count 2>/dev/null || true

      # Discord notification
      NOTIFY_SCRIPT="$HOOK_DIR/notify.sh"
      if [[ -f "$NOTIFY_SCRIPT" ]]; then
        WHEEL_CAT=$(echo "$WHEEL_OUT" | grep -oE '\[(DEFENSIVE|AUXILIARY|OFFENSIVE|LEARNING)\]' | head -1 | tr -d '[]')
        WHEEL_RULE=$(echo "$WHEEL_OUT" | grep -oE '→ .+' | head -1 | sed 's/^→ //')
        IS_NEW=$(echo "$WHEEL_OUT" | grep -q "NOVA" && echo "yes" || echo "no")

        if [[ "$IS_NEW" == "yes" ]]; then
          WHEEL_MSG="☸ Tekiō learned something new\n\n**Tool:** \`$TOOL_NAME\`\n**What went wrong:** ${ERROR:0:150}\n**New rule (${WHEEL_CAT:-unknown}):** ${WHEEL_RULE:0:200}\n**Scope:** $PROJECT_SCOPE"
        else
          WHEEL_MSG="☸ Tekiō recognized a known pattern\n\n**Tool:** \`$TOOL_NAME\`\n**Error:** ${ERROR:0:150}\n**Applied rule (${WHEEL_CAT:-unknown}):** ${WHEEL_RULE:0:200}"
        fi
        bash "$NOTIFY_SCRIPT" "$WHEEL_MSG" "discord" "high" 2>/dev/null || true
      fi
    fi
  ) &
fi

echo '{}'
