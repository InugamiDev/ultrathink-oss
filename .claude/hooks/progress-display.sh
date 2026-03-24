#!/usr/bin/env bash
# UltraThink Progress Display — PostToolUse (Agent tool)
# Two modes:
#   1. GSD mode: reads /tmp/ultrathink-progress-{session} for per-agent task bars
#   2. Auto mode: reads /tmp/ultrathink-agents-{session} tracker (populated by agent-tracker-pre.sh)
# Shows per-agent lines with status icons and progress.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || true)
[[ "$TOOL_NAME" != "Agent" ]] && exit 0

CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
[[ -z "$CC_SID" ]] && exit 0

# --- Colors ---
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'
LAVENDER='\033[38;5;141m'
MINT='\033[38;5;121m'
AMBER='\033[38;5;214m'
CORAL='\033[38;5;203m'
SKY='\033[38;5;117m'
SAGE='\033[38;5;151m'
SLATE='\033[38;5;248m'
CLOUD='\033[38;5;253m'

render_bar() {
  local completed=$1 total=$2 width=${3:-10}
  local filled=0
  [[ $total -gt 0 ]] && filled=$(( (completed * width) / total ))
  local empty=$((width - filled))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="▓"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo "$bar"
}

# ============================================================
# MODE 1: GSD progress file (detailed per-agent task tracking)
# ============================================================
PROGRESS_FILE="/tmp/ultrathink-progress-${CC_SID}"
if [[ -f "$PROGRESS_FILE" ]]; then
  STATE=$(cat "$PROGRESS_FILE" 2>/dev/null || echo "{}")
  MODE=$(echo "$STATE" | jq -r '.mode // ""' 2>/dev/null || true)

  if [[ -n "$MODE" ]]; then
    # Debounce
    AGENTS_JSON=$(echo "$STATE" | jq -c '.agents // []')
    TASKS_JSON=$(echo "$STATE" | jq -c '.tasks // {}')
    HASH_FILE="/tmp/ultrathink-progress-hash-${CC_SID}"
    CUR_HASH=$(echo "${AGENTS_JSON}${TASKS_JSON}" | md5 2>/dev/null || echo "${AGENTS_JSON}${TASKS_JSON}" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "x")
    LAST_HASH=""
    [[ -f "$HASH_FILE" ]] && LAST_HASH=$(cat "$HASH_FILE" 2>/dev/null || true)
    [[ "$CUR_HASH" == "$LAST_HASH" ]] && exit 0
    echo "$CUR_HASH" > "$HASH_FILE" 2>/dev/null || true

    WAVE=$(echo "$STATE" | jq -r '.wave // 0')
    TOTAL_WAVES=$(echo "$STATE" | jq -r '.total_waves // 0')
    AGENTS_TOTAL=$(echo "$STATE" | jq -r '.agents | length // 0')
    AGENTS_DONE=$(echo "$STATE" | jq -r '[.agents[] | select(.status == "done")] | length // 0')
    AGENTS_FAILED=$(echo "$STATE" | jq -r '[.agents[] | select(.status == "failed")] | length // 0')

    OUTPUT=$(printf "${BOLD}${LAVENDER}⚡ GSD${RESET}")
    [[ $TOTAL_WAVES -gt 0 ]] && OUTPUT+=$(printf " ${SLATE}wave ${WAVE}/${TOTAL_WAVES}${RESET}")
    OUTPUT+=$(printf "  ${BOLD}${AGENTS_DONE}/${AGENTS_TOTAL} agents${RESET}")
    [[ $AGENTS_FAILED -gt 0 ]] && OUTPUT+=$(printf "  ${CORAL}${AGENTS_FAILED} failed${RESET}")

    AGENT_COUNT=$(echo "$STATE" | jq -r '.agents | length')
    for ((idx=0; idx<AGENT_COUNT; idx++)); do
      PLAN=$(echo "$STATE" | jq -r ".agents[$idx].plan // \"agent-$idx\"")
      STATUS=$(echo "$STATE" | jq -r ".agents[$idx].status // \"pending\"")
      TASKS_T=$(echo "$STATE" | jq -r ".agents[$idx].tasks_total // 0")
      TASKS_D=$(echo "$STATE" | jq -r ".agents[$idx].tasks_done // 0")
      CURRENT=$(echo "$STATE" | jq -r ".agents[$idx].current_task // \"\"")

      case "$STATUS" in
        done)    ICON="✓"; COLOR="$MINT" ;;
        running) ICON="⟳"; COLOR="$AMBER" ;;
        failed)  ICON="✗"; COLOR="$CORAL" ;;
        *)       ICON="·"; COLOR="$SLATE" ;;
      esac

      LINE="\n  ${COLOR}${ICON}${RESET} ${BOLD}${PLAN}${RESET}"
      if [[ "$TASKS_T" -gt 0 ]]; then
        ABAR=$(render_bar "$TASKS_D" "$TASKS_T" 10)
        [[ "$TASKS_D" -eq "$TASKS_T" ]] && ABAR_COLOR="$MINT" || ABAR_COLOR="$SKY"
        LINE+=" ${ABAR_COLOR}${ABAR}${RESET} ${DIM}${TASKS_D}/${TASKS_T}${RESET}"
      else
        case "$STATUS" in
          done)    LINE+=" ${MINT}complete${RESET}" ;;
          running) LINE+=" ${AMBER}running${RESET}" ;;
          failed)  LINE+=" ${CORAL}failed${RESET}" ;;
          *)       LINE+=" ${SLATE}${STATUS}${RESET}" ;;
        esac
      fi
      [[ -n "$CURRENT" && "$STATUS" == "running" ]] && LINE+="  ${DIM}${CURRENT}${RESET}"
      OUTPUT+="$LINE"
    done

    GTASKS_TOTAL=$(echo "$STATE" | jq -r '.tasks.total // 0')
    GTASKS_DONE=$(echo "$STATE" | jq -r '.tasks.completed // 0')
    if [[ "$GTASKS_TOTAL" -gt 0 ]]; then
      GBAR=$(render_bar "$GTASKS_DONE" "$GTASKS_TOTAL" 16)
      [[ "$GTASKS_DONE" -eq "$GTASKS_TOTAL" ]] && GBAR_COLOR="$MINT" || GBAR_COLOR="$SAGE"
      OUTPUT+="\n  ${CLOUD}total${RESET} ${GBAR_COLOR}${GBAR}${RESET} ${BOLD}${GTASKS_DONE}/${GTASKS_TOTAL} tasks${RESET}"
    fi

    [[ $AGENTS_TOTAL -gt 0 && $AGENTS_DONE -eq $AGENTS_TOTAL && $AGENTS_FAILED -eq 0 ]] && \
      OUTPUT+="\n  ${MINT}${BOLD}✓ All agents complete${RESET}"

    printf '%b\n' "$OUTPUT"
    exit 0
  fi
fi

# ============================================================
# MODE 2: Auto-track from agent-tracker-pre.sh
# ============================================================
TRACKER="/tmp/ultrathink-agents-${CC_SID}"
[[ ! -f "$TRACKER" ]] && exit 0

# Mark the most recent "running" agent as done
DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null || true)
NOW=$(date +%s)

if [[ -n "$DESCRIPTION" ]]; then
  # Mark matching agent as done
  jq --arg desc "$DESCRIPTION" --argjson now "$NOW" \
    '[ .[] | if (.description == $desc and .status == "running") then .status = "done" | .finished = $now else . end ]' \
    "$TRACKER" > "${TRACKER}.tmp" 2>/dev/null && mv "${TRACKER}.tmp" "$TRACKER"
fi

# Read tracker state
AGENTS=$(cat "$TRACKER" 2>/dev/null || echo "[]")
TOTAL=$(echo "$AGENTS" | jq 'length')
[[ "$TOTAL" -eq 0 ]] && exit 0

DONE=$(echo "$AGENTS" | jq '[.[] | select(.status == "done")] | length')
RUNNING=$(echo "$AGENTS" | jq '[.[] | select(.status == "running")] | length')

# Debounce — include per-agent progress in hash
HASH_FILE="/tmp/ultrathink-agents-hash-${CC_SID}"
PROGRESS_HASH=""
for ((idx=0; idx<TOTAL; idx++)); do
  PF=$(echo "$AGENTS" | jq -r ".[$idx].progress_file // \"\"")
  if [[ -n "$PF" && -f "$PF" ]]; then
    PSTEP=$(jq -r '.step // 0' "$PF" 2>/dev/null || echo "0")
    PROGRESS_HASH="${PROGRESS_HASH}-${PSTEP}"
  fi
done
CUR_HASH="${DONE}-${RUNNING}-${TOTAL}${PROGRESS_HASH}"
LAST_HASH=""
[[ -f "$HASH_FILE" ]] && LAST_HASH=$(cat "$HASH_FILE" 2>/dev/null || true)
[[ "$CUR_HASH" == "$LAST_HASH" ]] && exit 0
echo "$CUR_HASH" > "$HASH_FILE" 2>/dev/null || true

# Build overall bar
BAR=$(render_bar "$DONE" "$TOTAL" 14)
if [[ "$DONE" -eq "$TOTAL" ]]; then
  BAR_COLOR="$MINT"
elif [[ "$RUNNING" -gt 0 ]]; then
  BAR_COLOR="$SKY"
else
  BAR_COLOR="$SLATE"
fi

OUTPUT=$(printf "${BOLD}${LAVENDER}⚡ agents${RESET} ${BAR_COLOR}${BAR}${RESET} ${BOLD}${DONE}/${TOTAL}${RESET}")

# Per-agent lines with step-level progress
for ((idx=0; idx<TOTAL; idx++)); do
  DESC=$(echo "$AGENTS" | jq -r ".[$idx].description // \"agent-$idx\"")
  STATUS=$(echo "$AGENTS" | jq -r ".[$idx].status // \"pending\"")
  BG=$(echo "$AGENTS" | jq -r ".[$idx].background // false")
  STARTED=$(echo "$AGENTS" | jq -r ".[$idx].started // 0")
  FINISHED=$(echo "$AGENTS" | jq -r ".[$idx].finished // 0")
  PF=$(echo "$AGENTS" | jq -r ".[$idx].progress_file // \"\"")

  case "$STATUS" in
    done)    ICON="✓"; COLOR="$MINT" ;;
    running) ICON="⟳"; COLOR="$AMBER" ;;
    failed)  ICON="✗"; COLOR="$CORAL" ;;
    *)       ICON="·"; COLOR="$SLATE" ;;
  esac

  LINE="\n  ${COLOR}${ICON}${RESET} ${BOLD}${DESC}${RESET}"

  # Read per-agent progress file (step-level tracking)
  if [[ -n "$PF" && -f "$PF" && "$STATUS" == "running" ]]; then
    PDATA=$(cat "$PF" 2>/dev/null || echo "{}")
    P_STEP=$(echo "$PDATA" | jq -r '.step // 0' 2>/dev/null || echo "0")
    P_TOTAL=$(echo "$PDATA" | jq -r '.total_steps // 0' 2>/dev/null || echo "0")
    P_CURRENT=$(echo "$PDATA" | jq -r '.current // ""' 2>/dev/null || true)

    if [[ "$P_TOTAL" -gt 0 ]]; then
      PBAR=$(render_bar "$P_STEP" "$P_TOTAL" 8)
      LINE+=" ${SKY}${PBAR}${RESET} ${DIM}${P_STEP}/${P_TOTAL}${RESET}"
    fi
    if [[ -n "$P_CURRENT" ]]; then
      # Truncate current step name
      if [[ ${#P_CURRENT} -gt 35 ]]; then
        P_CURRENT="${P_CURRENT:0:32}..."
      fi
      LINE+=" ${DIM}${P_CURRENT}${RESET}"
    fi
  fi

  # Show elapsed time
  if [[ "$STATUS" == "done" && "$FINISHED" != "0" && "$STARTED" != "0" ]]; then
    ELAPSED=$(( FINISHED - STARTED ))
    if [[ $ELAPSED -ge 0 && $ELAPSED -lt 3600 ]]; then
      if [[ $ELAPSED -ge 60 ]]; then
        MINS=$((ELAPSED / 60))
        SECS=$((ELAPSED % 60))
        LINE+=" ${DIM}${MINS}m${SECS}s${RESET}"
      else
        LINE+=" ${DIM}${ELAPSED}s${RESET}"
      fi
    fi
    # Clean up progress file on done
    [[ -n "$PF" && -f "$PF" ]] && rm -f "$PF" 2>/dev/null || true
  elif [[ "$STATUS" == "running" && "$STARTED" != "0" ]]; then
    ELAPSED=$(( NOW - STARTED ))
    if [[ $ELAPSED -ge 0 && $ELAPSED -lt 3600 ]]; then
      if [[ $ELAPSED -ge 60 ]]; then
        MINS=$((ELAPSED / 60))
        LINE+=" ${AMBER}${MINS}m+${RESET}"
      else
        LINE+=" ${AMBER}${ELAPSED}s${RESET}"
      fi
    fi
  fi

  [[ "$BG" == "true" ]] && LINE+=" ${DIM}bg${RESET}"

  OUTPUT+="$LINE"
done

# All done message
if [[ "$DONE" -eq "$TOTAL" && "$TOTAL" -gt 0 ]]; then
  OUTPUT+="\n  ${MINT}${BOLD}✓ All agents complete${RESET}"
  # Clean up tracker + any leftover progress files
  for ((idx=0; idx<TOTAL; idx++)); do
    PF=$(echo "$AGENTS" | jq -r ".[$idx].progress_file // \"\"")
    [[ -n "$PF" && -f "$PF" ]] && rm -f "$PF" 2>/dev/null || true
  done
  rm -f "$TRACKER" "$HASH_FILE" 2>/dev/null || true
fi

printf '%b\n' "$OUTPUT"
exit 0
