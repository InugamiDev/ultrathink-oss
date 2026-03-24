#!/usr/bin/env bash
# UltraThink Context Monitor — PostToolUse (all tools)
# Monitors context usage via bridge file + tool call count.
# Merges suggest-compact logic (count-based) with context-bridge (% based).
# Also detects stuck agents.

set -euo pipefail

INPUT=$(cat)

CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
[[ -z "$CC_SID" ]] && exit 0

# ── Tool call counter (absorbed from suggest-compact.sh) ──
COUNTER_FILE="/tmp/ultrathink-toolcount-${CC_SID}"
COUNT=0
if [[ -f "$COUNTER_FILE" ]]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
  COUNT=$((COUNT + 0)) 2>/dev/null || COUNT=0
fi
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE" 2>/dev/null || true

# ── Context percentage from bridge file (statusline writes this) ──
BRIDGE_FILE="/tmp/ultrathink-ctx-${CC_SID}"
CONTEXT_PCT=0
HAS_BRIDGE=false

if [[ -f "$BRIDGE_FILE" ]]; then
  CONTEXT_PCT=$(jq -r '.context_pct // 0' "$BRIDGE_FILE" 2>/dev/null || echo "0")
  CONTEXT_PCT=$((CONTEXT_PCT + 0)) 2>/dev/null || CONTEXT_PCT=0
  HAS_BRIDGE=true
fi

# ── Determine severity ──
# Use bridge % if available, otherwise fall back to tool count heuristic
SEVERITY="none"
if [[ "$HAS_BRIDGE" == "true" ]]; then
  if [[ $CONTEXT_PCT -ge 75 ]]; then
    SEVERITY="critical"
  elif [[ $CONTEXT_PCT -ge 65 ]]; then
    SEVERITY="warning"
  fi
else
  # Fallback: tool count heuristic (from suggest-compact)
  THRESHOLD=${ULTRATHINK_COMPACT_THRESHOLD:-50}
  INTERVAL=${ULTRATHINK_COMPACT_INTERVAL:-25}
  if [[ $COUNT -eq $THRESHOLD ]]; then
    SEVERITY="count_hint"
  elif [[ $COUNT -gt $THRESHOLD ]]; then
    PAST=$((COUNT - THRESHOLD))
    if [[ $((PAST % INTERVAL)) -eq 0 ]]; then
      SEVERITY="count_hint"
    fi
  fi
fi

# ── Emit context warnings (skip if severity is "none") ──
if [[ "$SEVERITY" != "none" ]]; then
  LAST_SEVERITY_FILE="/tmp/ultrathink-ctx-severity-${CC_SID}"
  LAST_SEVERITY=$(cat "$LAST_SEVERITY_FILE" 2>/dev/null || echo "none")
  DEBOUNCE_INTERVAL=5

  CALLS_SINCE=$((COUNT % DEBOUNCE_INTERVAL))
  if [[ $CALLS_SINCE -eq 0 || "$SEVERITY" != "$LAST_SEVERITY" ]]; then
    echo "$SEVERITY" > "$LAST_SEVERITY_FILE" 2>/dev/null || true

    case "$SEVERITY" in
      critical)
        echo "🔴 CRITICAL: Context at ${CONTEXT_PCT}% — Run /compact NOW. Quality will degrade rapidly. Consider spawning subagents for remaining work."
        ;;
      warning)
        echo "🟡 WARNING: Context at ${CONTEXT_PCT}% — Consider running /compact at the next logical boundary. Delegate heavy work to subagents."
        ;;
      count_hint)
        echo "💡 Context checkpoint: $COUNT tool calls this session. Consider running /compact at the next logical boundary."
        ;;
    esac
  fi
fi

# ── Stuck agent detection (runs on EVERY call, not just warnings) ──
AGENT_TRACKER="/tmp/ultrathink-agents-${CC_SID}"
if [[ -f "$AGENT_TRACKER" ]]; then
  NOW_TS=$(date +%s)
  STUCK_WARN_FILE="/tmp/ultrathink-stuck-warned-${CC_SID}"
  LAST_STUCK_WARN=$(cat "$STUCK_WARN_FILE" 2>/dev/null || echo "0")
  # Only check every 120s
  [[ $((NOW_TS - LAST_STUCK_WARN)) -lt 120 ]] && exit 0

  STUCK_AGENTS=""
  AGENT_CT=$(jq 'length' "$AGENT_TRACKER" 2>/dev/null || echo "0")
  for ((aidx=0; aidx<AGENT_CT; aidx++)); do
    A_STATUS=$(jq -r ".[$aidx].status" "$AGENT_TRACKER" 2>/dev/null)
    A_STARTED=$(jq -r ".[$aidx].started // 0" "$AGENT_TRACKER" 2>/dev/null)
    A_DESC=$(jq -r ".[$aidx].description" "$AGENT_TRACKER" 2>/dev/null)
    [[ "$A_STATUS" != "running" ]] && continue
    [[ "$A_STARTED" == "0" ]] && continue
    ELAPSED=$((NOW_TS - A_STARTED))
    if [[ $ELAPSED -ge 600 ]]; then
      STUCK_AGENTS="${STUCK_AGENTS}  - ${A_DESC} (${ELAPSED}s)\n"
    fi
  done

  if [[ -n "$STUCK_AGENTS" ]]; then
    echo "$NOW_TS" > "$STUCK_WARN_FILE" 2>/dev/null || true
    printf "🔴 STUCK AGENTS detected (>10 min). Consider stopping and restarting:\n%b" "$STUCK_AGENTS"
  fi
fi

exit 0
