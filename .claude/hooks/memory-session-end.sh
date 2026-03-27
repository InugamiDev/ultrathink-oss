#!/usr/bin/env bash
# UltraThink Memory Session End Hook
# Fires on Stop — flushes pending memory files to Neon DB and closes session

set -euo pipefail
umask 077

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "session-end" "started"

# Read stdin early (Stop hook receives JSON with session_id)
HOOK_INPUT=$(cat 2>/dev/null || echo "{}")  # stdin read — keep /dev/null

MEMORIES_DIR="/tmp/ultrathink-memories"

# Resolve UltraThink project root
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

RUNNER="$ULTRA_ROOT/memory/scripts/memory-runner.ts"

# Load DATABASE_URL from .env
# Values may contain unquoted special chars (?&), so we read line-by-line and
# export with proper quoting to avoid glob/background expansion.
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

# If no DATABASE_URL, exit silently
if [[ -z "${DATABASE_URL:-}" ]]; then
  exit 0
fi

# Export CC_SESSION_ID for process-scoped session file isolation
CC_SID_FULL=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")
export CC_SESSION_ID="$CC_SID_FULL"

# ── CRITICAL PATH (blocking) — flush memories + close session ──
FLUSHED_COUNT=0
if [[ -d "$MEMORIES_DIR" ]]; then
  FLUSHED_COUNT=$(find "$MEMORIES_DIR" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$FLUSHED_COUNT" -gt 0 ]]; then
    timeout 15 npx tsx "$RUNNER" flush 2>>/tmp/ultrathink-errors.log || true
  fi
fi

# Close the session (updates ended_at) — must happen before exit
timeout 5 npx tsx "$RUNNER" session-end 2>>/tmp/ultrathink-errors.log || true

# ── NON-CRITICAL (fire-and-forget background) — don't block shutdown ──
(
  cd "$ULTRA_ROOT"

  # Process pending Tekiō wheel turns
  WHEEL_DIR="/tmp/ultrathink-wheel-turns"
  if [[ -d "$WHEEL_DIR" ]]; then
    for f in "$WHEEL_DIR"/*-correction.json; do
      [[ -f "$f" ]] || continue
      correction=$(jq -r '.correction // ""' "$f" 2>/dev/null)
      correct_approach=$(jq -r '.correct_approach // ""' "$f" 2>/dev/null)
      scope_val=$(jq -r '.scope // ""' "$f" 2>/dev/null)
      if [[ -n "$correction" && -n "$correct_approach" ]]; then
        timeout 10 npx tsx "$RUNNER" wheel-correct "$correction" "$correct_approach" "$scope_val" 2>/dev/null 1>/dev/null || true
      fi
      rm -f "$f"
    done
    for f in "$WHEEL_DIR"/*-success.json; do
      [[ -f "$f" ]] || continue
      pattern=$(jq -r '.pattern // ""' "$f" 2>/dev/null)
      insight=$(jq -r '.insight // ""' "$f" 2>/dev/null)
      scope_val=$(jq -r '.scope // ""' "$f" 2>/dev/null)
      [[ -n "$pattern" && -n "$insight" ]] && timeout 10 npx tsx "$RUNNER" wheel-learn "$pattern" "$insight" "$scope_val" 2>/dev/null 1>/dev/null || true
      rm -f "$f"
    done
  fi

  # Deactivate stale adaptations (bundled into session-end command to avoid extra npx tsx spawn)

  # Daily stats aggregate
  timeout 10 npx tsx "$RUNNER" daily-stats 2>/dev/null || true

  # Flush batched tool usage
  CC_SID=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
  TOOL_BATCH="/tmp/ultrathink-tool-usage-${CC_SID}"
  if [[ -n "$CC_SID" && -f "$TOOL_BATCH" ]]; then
    SESSION_ID=""
    [[ -f "/tmp/ultrathink-session-${CC_SID}" ]] && SESSION_ID=$(cat "/tmp/ultrathink-session-${CC_SID}" 2>/dev/null || true)
    if [[ -n "$SESSION_ID" ]]; then
      TOOL_CSV=$(cut -f1 "$TOOL_BATCH" 2>/dev/null | sort | uniq -c | sort -rn | awk '{print $2 ":" $1}' | tr '\n' ',' | sed 's/,$//')
      timeout 10 npx tsx "$RUNNER" log-tool "$TOOL_CSV" "$SESSION_ID" >/dev/null 2>&1 || true
    fi
    rm -f "$TOOL_BATCH" 2>/dev/null || true
  fi

  # Console.log scan
  if command -v git &>/dev/null; then
    ALL_MODIFIED=$(printf '%s\n%s' "$(git diff --name-only HEAD 2>/dev/null)" "$(git diff --cached --name-only 2>/dev/null)" | sort -u | grep -E '\.(ts|tsx)$' || true)
    CONSOLE_LOG_WARNINGS=""
    while IFS= read -r rel_file; do
      [[ -z "$rel_file" ]] && continue
      abs_file="$ULTRA_ROOT/$rel_file"
      [[ -f "$abs_file" ]] || continue
      case "$rel_file" in *.test.*|*.spec.*|*__tests__*|*/node_modules/*) continue ;; esac
      HITS=$(grep -n 'console\.log' "$abs_file" 2>/dev/null | head -5 || true)
      [[ -n "$HITS" ]] && CONSOLE_LOG_WARNINGS="${CONSOLE_LOG_WARNINGS}\n  ${rel_file}:\n${HITS}"
    done <<< "$ALL_MODIFIED"
    if [[ -n "$CONSOLE_LOG_WARNINGS" ]]; then
      NOTIFY_SCRIPT="$HOOK_DIR/notify.sh"
      [[ -x "$NOTIFY_SCRIPT" ]] && "$NOTIFY_SCRIPT" "⚠ Leftover console.log:${CONSOLE_LOG_WARNINGS}" "discord" "normal" 2>/dev/null || true
    fi
  fi
) &

# Clean up session-scoped caches
CC_SID=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
if [[ -n "$CC_SID" ]]; then
  rm -f "/tmp/ultrathink-status/identity-$CC_SID" 2>/dev/null || true
  rm -f "/tmp/ultrathink-status/skills-$CC_SID" 2>/dev/null || true
  rm -f "/tmp/ultrathink-status/preferences-$CC_SID" 2>/dev/null || true
fi

# Notify Discord — session end summary
NOTIFY_SCRIPT="$HOOK_DIR/notify.sh"
if [[ -x "$NOTIFY_SCRIPT" ]]; then
  WHEEL_N=$(cat /tmp/ultrathink-status/wheel-count 2>/dev/null || echo "?")
  END_PARTS="⏹ Session ended"
  [[ "$FLUSHED_COUNT" -gt 0 ]] && END_PARTS="${END_PARTS}\n**Memories saved:** ${FLUSHED_COUNT}"
  END_PARTS="${END_PARTS}\n**☸ Tekiō:** ${WHEEL_N} adaptations active"
  # Console.log warnings are now in background subshell — skip here
  "$NOTIFY_SCRIPT" "$END_PARTS" "discord" "normal" 2>>/tmp/ultrathink-errors.log || true
fi

# Kill Playwright MCP browser (Google Chrome for Testing / ms-playwright chromium)
# Identifies only Playwright MCP browsers by their user-data-dir pattern, not regular Chrome.
PLAYWRIGHT_PIDS=$(pgrep -f "playwright_chromiumdev_profile\|ms-playwright/mcp-chrome\|ms-playwright/chromium.*--remote-debugging" 2>/dev/null || true)
if [[ -n "$PLAYWRIGHT_PIDS" ]]; then
  echo "$PLAYWRIGHT_PIDS" | xargs kill 2>/dev/null || true
  hook_log "session-end" "killed-playwright-browser" "pids=$PLAYWRIGHT_PIDS"
fi

hook_log "session-end" "done" "flushed=$FLUSHED_COUNT"
exit 0
