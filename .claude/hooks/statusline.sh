#!/bin/bash
# UltraThink Status Line — friendly, informative bar at bottom of Claude Code
# Receives JSON session data on stdin. Prints formatted status.

input=$(cat)

# --- Session data from Claude Code ---
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '(.cost.total_cost_usd // 0) | . * 100 | round | . / 100 | tostring' 2>/dev/null || echo "0")
DIR=$(echo "$input" | jq -r '.workspace.current_dir // ""')
DIR_NAME="${DIR##*/}"
SID=$(echo "$input" | jq -r '.session_id // ""' | head -c 12)

# --- UltraThink state (session-scoped via session_id) ---
CACHE_DIR="/tmp/ultrathink-status"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

IDENTITY=""
if [[ -n "$SID" && -f "$CACHE_DIR/identity-$SID" ]]; then
  IDENTITY=$(cat "$CACHE_DIR/identity-$SID" 2>/dev/null)
fi

SKILLS=""
if [[ -n "$SID" && -f "$CACHE_DIR/skills-$SID" ]]; then
  SKILLS=$(cat "$CACHE_DIR/skills-$SID" 2>/dev/null)
fi

MEM_ACTIVE=""
if [[ -n "$SID" && -f "/tmp/ultrathink-session-$SID" ]]; then
  MEM_ACTIVE="yes"
elif [[ -f /tmp/ultrathink-session-id ]]; then
  MEM_ACTIVE="yes"
fi

# --- Anthropic usage limits (5hr + 7day, cached every 60s) ---
ULTRA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
USAGE_CACHE="$CACHE_DIR/anthropic-usage.json"

fetch_usage() {
  local creds token response
  creds=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null) || return 1
  token=$(echo "$creds" | jq -r '.claudeAiOauth.accessToken') || return 1
  [[ -z "$token" || "$token" == "null" ]] && return 1
  response=$(curl -s --max-time 3 "https://api.anthropic.com/api/oauth/usage" \
    -H "Authorization: Bearer $token" \
    -H "anthropic-beta: oauth-2025-04-20" \
    -H "Content-Type: application/json" 2>/dev/null) || return 1
  echo "$response" | jq -e '.five_hour' >/dev/null 2>&1 || return 1
  echo "$response" > "$USAGE_CACHE"
}

# Refresh if older than 60s or missing
if [[ ! -f "$USAGE_CACHE" ]]; then
  fetch_usage 2>/dev/null
elif [[ "$(uname)" == "Darwin" ]]; then
  USAGE_AGE=$(( $(date +%s) - $(stat -f %m "$USAGE_CACHE" 2>/dev/null || echo 0) ))
  [[ "$USAGE_AGE" -gt 60 ]] && (fetch_usage 2>/dev/null &)
else
  USAGE_AGE=$(( $(date +%s) - $(stat -c %Y "$USAGE_CACHE" 2>/dev/null || echo 0) ))
  [[ "$USAGE_AGE" -gt 60 ]] && (fetch_usage 2>/dev/null &)
fi

USAGE_5H=""
USAGE_7D=""
if [[ -f "$USAGE_CACHE" ]]; then
  USAGE_5H=$(jq -r '.five_hour.utilization // empty' "$USAGE_CACHE" 2>/dev/null | cut -d. -f1)
  USAGE_7D=$(jq -r '.seven_day.utilization // empty' "$USAGE_CACHE" 2>/dev/null | cut -d. -f1)
fi

# --- Memory stats (cached, refreshed every 60s in background) ---
STATS_FILE="$CACHE_DIR/weekly-stats"
WEEKLY_SCRIPT="$ULTRA_ROOT/memory/scripts/weekly-stats.ts"

NEEDS_REFRESH=""
if [[ ! -f "$STATS_FILE" ]]; then
  NEEDS_REFRESH="yes"
elif [[ "$(uname)" == "Darwin" ]]; then
  FILE_AGE=$(( $(date +%s) - $(stat -f %m "$STATS_FILE" 2>/dev/null || echo 0) ))
  [[ "$FILE_AGE" -gt 60 ]] && NEEDS_REFRESH="yes"
else
  FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$STATS_FILE" 2>/dev/null || echo 0) ))
  [[ "$FILE_AGE" -gt 60 ]] && NEEDS_REFRESH="yes"
fi

if [[ -n "$NEEDS_REFRESH" && -f "$WEEKLY_SCRIPT" ]]; then
  (cd "$ULTRA_ROOT" && npx tsx "$WEEKLY_SCRIPT" > "$STATS_FILE.tmp" 2>/dev/null && mv "$STATS_FILE.tmp" "$STATS_FILE") &
fi

WEEK_MEMORIES=""
if [[ -f "$STATS_FILE" ]]; then
  WEEK_MEMORIES=$(jq -r '.memories // ""' "$STATS_FILE" 2>/dev/null)
fi

# --- Context remaining ---
CTX_LEFT=$((100 - PCT))

# --- Colors (warm, friendly palette) ---
RESET='\033[0m'
DIM='\033[2m'
BOLD='\033[1m'
# Warm tones
LAVENDER='\033[38;5;141m'    # Soft purple for branding
PEACH='\033[38;5;216m'       # Warm peach for identity
SKY='\033[38;5;117m'         # Soft blue for model
MINT='\033[38;5;121m'        # Fresh green for good context
AMBER='\033[38;5;214m'       # Warm amber for medium context
CORAL='\033[38;5;203m'       # Soft red for high context
SLATE='\033[38;5;248m'       # Light gray for separators
SAGE='\033[38;5;151m'        # Sage green for skills
CLOUD='\033[38;5;253m'       # Near-white for subtle text
STEEL='\033[38;5;110m'       # Steel blue for stats

# --- Context color (based on how much is LEFT) ---
if [[ "$CTX_LEFT" -gt 50 ]]; then
  CTX_COLOR="$MINT"
elif [[ "$CTX_LEFT" -gt 20 ]]; then
  CTX_COLOR="$AMBER"
else
  CTX_COLOR="$CORAL"
fi

# --- Build status lines ---
SEP=" ${SLATE}·${RESET} "

# === Line 1: Branding + Model + Gauges ===
L1=""
L1+="${BOLD}${LAVENDER}✦ ultrathink${RESET}"
if [[ -n "$IDENTITY" ]]; then
  L1+=" ${PEACH}${IDENTITY}${RESET}"
fi

SHORT_MODEL=$(echo "$MODEL" | sed 's/Claude //')
L1+="${SEP}${SKY}${SHORT_MODEL}${RESET}"

# Context remaining
L1+="${SEP}${CTX_COLOR}session ${CTX_LEFT}%${RESET}"

# 5hr usage remaining
if [[ -n "$USAGE_5H" ]]; then
  LEFT_5H=$((100 - USAGE_5H))
  if [[ "$LEFT_5H" -gt 50 ]]; then U5_COLOR="$MINT"
  elif [[ "$LEFT_5H" -gt 20 ]]; then U5_COLOR="$AMBER"
  else U5_COLOR="$CORAL"; fi
  L1+="${SEP}${U5_COLOR}5hr ${LEFT_5H}%${RESET}"
fi

# 7day usage remaining
if [[ -n "$USAGE_7D" ]]; then
  LEFT_7D=$((100 - USAGE_7D))
  if [[ "$LEFT_7D" -gt 50 ]]; then U7_COLOR="$MINT"
  elif [[ "$LEFT_7D" -gt 20 ]]; then U7_COLOR="$AMBER"
  else U7_COLOR="$CORAL"; fi
  L1+="${SEP}${U7_COLOR}weekly ${LEFT_7D}%${RESET}"
fi

echo -e "$L1"

# === Line 2: GSD Progress (when active) OR Stats ===

# Check for active GSD progress
PROGRESS_FILE="/tmp/ultrathink-progress-${SID}"
GSD_ACTIVE=""
if [[ -n "$SID" && -f "$PROGRESS_FILE" ]]; then
  GSD_STATE=$(cat "$PROGRESS_FILE" 2>/dev/null || echo "{}")
  GSD_MODE=$(echo "$GSD_STATE" | jq -r '.mode // ""' 2>/dev/null || true)
  if [[ -n "$GSD_MODE" ]]; then
    GSD_ACTIVE="yes"

    # Read progress data
    GSD_AGENTS_TOTAL=$(echo "$GSD_STATE" | jq -r '.agents | length // 0' 2>/dev/null || echo "0")
    GSD_AGENTS_DONE=$(echo "$GSD_STATE" | jq -r '[.agents[] | select(.status == "done")] | length // 0' 2>/dev/null || echo "0")
    GSD_AGENTS_RUNNING=$(echo "$GSD_STATE" | jq -r '[.agents[] | select(.status == "running")] | length // 0' 2>/dev/null || echo "0")
    GSD_TASKS_TOTAL=$(echo "$GSD_STATE" | jq -r '.tasks.total // 0' 2>/dev/null || echo "0")
    GSD_TASKS_DONE=$(echo "$GSD_STATE" | jq -r '.tasks.completed // 0' 2>/dev/null || echo "0")
    GSD_WAVE=$(echo "$GSD_STATE" | jq -r '.wave // 0' 2>/dev/null || echo "0")
    GSD_TOTAL_WAVES=$(echo "$GSD_STATE" | jq -r '.total_waves // 0' 2>/dev/null || echo "0")
    GSD_CURRENT=$(echo "$GSD_STATE" | jq -r '.tasks.current // ""' 2>/dev/null || true)

    # Build mini progress bar (10 chars)
    GSD_BAR=""
    if [[ "$GSD_AGENTS_TOTAL" -gt 0 ]]; then
      FILLED=$(( (GSD_AGENTS_DONE * 10) / GSD_AGENTS_TOTAL ))
      EMPTY=$((10 - FILLED))
      for ((i=0; i<FILLED; i++)); do GSD_BAR+="▓"; done
      for ((i=0; i<EMPTY; i++)); do GSD_BAR+="░"; done
    fi

    # Color based on status
    if [[ "$GSD_AGENTS_DONE" -eq "$GSD_AGENTS_TOTAL" && "$GSD_AGENTS_TOTAL" -gt 0 ]]; then
      GSD_COLOR="$MINT"
    elif [[ "$GSD_AGENTS_RUNNING" -gt 0 ]]; then
      GSD_COLOR="$AMBER"
    else
      GSD_COLOR="$SKY"
    fi

    L2="  ${BOLD}${LAVENDER}⚡${RESET}"
    if [[ "$GSD_TOTAL_WAVES" -gt 0 ]]; then
      L2+=" ${SLATE}w${GSD_WAVE}/${GSD_TOTAL_WAVES}${RESET}"
    fi
    if [[ -n "$GSD_BAR" ]]; then
      L2+=" ${GSD_COLOR}${GSD_BAR}${RESET} ${BOLD}${GSD_AGENTS_DONE}/${GSD_AGENTS_TOTAL}${RESET}"
    fi
    if [[ "$GSD_TASKS_TOTAL" -gt 0 ]]; then
      L2+="${SEP}${SAGE}${GSD_TASKS_DONE}/${GSD_TASKS_TOTAL} tasks${RESET}"
    fi
    if [[ -n "$GSD_CURRENT" ]]; then
      L2+=" ${DIM}${GSD_CURRENT}${RESET}"
    fi

    # Still show cost at end
    L2+="${SEP}${CLOUD}\$${COST}${RESET}"
  fi
fi

# Check for auto-tracked agents (generic agent spawns)
AGENT_TRACKER="/tmp/ultrathink-agents-${SID}"
AGENTS_ACTIVE=""
if [[ -z "$GSD_ACTIVE" && -n "$SID" && -f "$AGENT_TRACKER" ]]; then
  AT_STATE=$(cat "$AGENT_TRACKER" 2>/dev/null || echo "[]")
  AT_TOTAL=$(echo "$AT_STATE" | jq 'length' 2>/dev/null || echo "0")
  if [[ "$AT_TOTAL" -gt 0 ]]; then
    AT_DONE=$(echo "$AT_STATE" | jq '[.[] | select(.status == "done")] | length' 2>/dev/null || echo "0")
    AT_RUNNING=$(echo "$AT_STATE" | jq '[.[] | select(.status == "running")] | length' 2>/dev/null || echo "0")

    # Only show if agents are still running
    if [[ "$AT_RUNNING" -gt 0 ]]; then
      AGENTS_ACTIVE="yes"

      # Build mini bar
      AT_BAR=""
      FILLED=$(( (AT_DONE * 10) / AT_TOTAL ))
      EMPTY=$((10 - FILLED))
      for ((i=0; i<FILLED; i++)); do AT_BAR+="▓"; done
      for ((i=0; i<EMPTY; i++)); do AT_BAR+="░"; done

      if [[ "$AT_DONE" -eq "$AT_TOTAL" ]]; then
        AT_COLOR="$MINT"
      elif [[ "$AT_RUNNING" -gt 0 ]]; then
        AT_COLOR="$SKY"
      else
        AT_COLOR="$SLATE"
      fi

      NOW_TS=$(date +%s)
      STUCK_THRESHOLD=180  # 3 min = amber warning
      DEAD_THRESHOLD=600   # 10 min = red stuck

      L2="  ${BOLD}${LAVENDER}⚡${RESET} ${AT_COLOR}${AT_BAR}${RESET} ${BOLD}${AT_DONE}/${AT_TOTAL}${RESET}"

      # Per-agent status with step progress + elapsed time + stuck detection
      AGENT_DETAILS=""
      for ((aidx=0; aidx<AT_TOTAL; aidx++)); do
        A_STATUS=$(echo "$AT_STATE" | jq -r ".[$aidx].status" 2>/dev/null)
        A_DESC=$(echo "$AT_STATE" | jq -r ".[$aidx].description" 2>/dev/null)
        A_STARTED=$(echo "$AT_STATE" | jq -r ".[$aidx].started // 0" 2>/dev/null)
        A_PF=$(echo "$AT_STATE" | jq -r ".[$aidx].progress_file // \"\"" 2>/dev/null)
        [[ "$A_STATUS" != "running" ]] && continue

        ELAPSED=0
        [[ "$A_STARTED" != "0" ]] && ELAPSED=$((NOW_TS - A_STARTED))

        # Read step progress from agent's progress file
        STEP_INFO=""
        if [[ -n "$A_PF" && -f "$A_PF" ]]; then
          P_STEP=$(jq -r '.step // 0' "$A_PF" 2>/dev/null || echo "0")
          P_TOTAL=$(jq -r '.total_steps // 0' "$A_PF" 2>/dev/null || echo "0")
          P_CURRENT=$(jq -r '.current // ""' "$A_PF" 2>/dev/null || true)
          if [[ "$P_TOTAL" -gt 0 ]]; then
            STEP_INFO="${P_STEP}/${P_TOTAL}"
            if [[ -n "$P_CURRENT" ]]; then
              # Truncate
              [[ ${#P_CURRENT} -gt 20 ]] && P_CURRENT="${P_CURRENT:0:17}..."
              STEP_INFO+=" ${P_CURRENT}"
            fi
          fi
        fi

        # Format elapsed
        if [[ $ELAPSED -ge 60 ]]; then
          EMINS=$((ELAPSED / 60))
          ETIME="${EMINS}m"
        else
          ETIME="${ELAPSED}s"
        fi

        # Color by elapsed (stuck detection)
        if [[ $ELAPSED -ge $DEAD_THRESHOLD ]]; then
          ETIME_COLOR="$CORAL"
          ETIME_SUFFIX=" STUCK"
        elif [[ $ELAPSED -ge $STUCK_THRESHOLD ]]; then
          ETIME_COLOR="$AMBER"
          ETIME_SUFFIX=""
        else
          ETIME_COLOR="$SLATE"
          ETIME_SUFFIX=""
        fi

        # Truncate description
        if [[ ${#A_DESC} -gt 20 ]]; then
          A_DESC="${A_DESC:0:17}..."
        fi

        if [[ -n "$AGENT_DETAILS" ]]; then
          AGENT_DETAILS+="${SEP}"
        fi

        # Show: desc [step/total current] elapsed
        AGENT_DETAILS+="${DIM}${A_DESC}${RESET}"
        if [[ -n "$STEP_INFO" ]]; then
          AGENT_DETAILS+=" ${SKY}${STEP_INFO}${RESET}"
        fi
        AGENT_DETAILS+=" ${ETIME_COLOR}${ETIME}${ETIME_SUFFIX}${RESET}"
      done

      if [[ -n "$AGENT_DETAILS" ]]; then
        L2+="  ${AGENT_DETAILS}"
      fi

      L2+="${SEP}${CLOUD}\$${COST}${RESET}"
    fi
  fi
fi

# === Line 2 fallback: Stats + Extras (when no GSD or agents active) ===
if [[ -z "$GSD_ACTIVE" && -z "$AGENTS_ACTIVE" ]]; then
L2="  "

# Memories
if [[ -n "$WEEK_MEMORIES" && "$WEEK_MEMORIES" != "null" ]]; then
  L2+="${STEEL}${WEEK_MEMORIES} memories${RESET}  "
fi

# Cost
L2+="${CLOUD}\$${COST}${RESET}"

# Active skills (limit to 5)
if [[ -n "$SKILLS" ]]; then
  L2+="${SEP}"
  SKILL_COUNT=0
  IFS=', ' read -ra SKILL_ARRAY <<< "$SKILLS"
  for skill in "${SKILL_ARRAY[@]}"; do
    [[ -z "$skill" ]] && continue
    [[ $SKILL_COUNT -ge 5 ]] && break
    L2+="${SAGE}◇ ${skill}${RESET} "
    ((SKILL_COUNT++))
  done
fi

fi  # end GSD_ACTIVE fallback

echo -e "$L2"

# === Line 3: Activity feed — human-readable recent events ===
ACTIVITY_FILE="$CACHE_DIR/hook-activity"
L3=""
if [[ -f "$ACTIVITY_FILE" ]]; then
  NOW_TS=$(date +%s)
  EVENTS=""
  EVT_COUNT=0
  SEEN_HOOKS=""  # pipe-delimited dedup list

  # Read entries newest-first, dedup by hook name
  REVERSED=$(tail -r "$ACTIVITY_FILE" 2>/dev/null || cat "$ACTIVITY_FILE")
  while IFS='|' read -r h_ts h_name h_status h_detail h_dur; do
    [[ -z "$h_ts" ]] && continue
    AGE=$((NOW_TS - h_ts))
    [[ $AGE -gt 300 ]] && continue
    [[ $EVT_COUNT -ge 4 ]] && break

    # Dedup: skip if already seen this hook
    case "$SEEN_HOOKS" in *"|${h_name}|"*) continue ;; esac
    SEEN_HOOKS="${SEEN_HOOKS}|${h_name}|"

    # Map hook+status to human-readable description
    LABEL=""
    HKEY="${h_name}:${h_status}"
    case "$HKEY" in
      prompt-submit:done)
        if [[ -n "$h_detail" && "$h_detail" != "skills=" ]]; then
          SK="${h_detail#skills=}"
          # Count and show first 2
          SK_COUNT=$(echo "$SK" | tr ',' '\n' | wc -l | tr -d ' ')
          SK_FIRST=$(echo "$SK" | tr ',' '\n' | head -2 | tr '\n' ',' | sed 's/,$//')
          if [[ "$SK_COUNT" -gt 2 ]]; then
            LABEL="activated ${SK_FIRST} +$((SK_COUNT - 2)) more"
          else
            LABEL="activated ${SK_FIRST}"
          fi
        else
          LABEL="ready"
        fi ;;
      privacy:allowed)      LABEL="file access approved" ;;
      privacy:blocked)      LABEL="file access denied" ;;
      typecheck:done)       LABEL="no type errors" ;;
      typecheck:error*)     LABEL="found type errors" ;;
      session-start:done)   LABEL="session started" ;;
      session-end:done)
        if [[ "$h_detail" == *"flushed="* ]]; then
          FLUSH_N="${h_detail#*flushed=}"
          [[ "$FLUSH_N" != "0" ]] && LABEL="saved ${FLUSH_N} memories to brain"
        fi ;;
      context-monitor:done)
        [[ "$h_detail" == *"warning"* ]] && LABEL="running low on context" ;;
      format-check:done)    LABEL="code formatted" ;;
      pre-compact:done)     LABEL="compacting conversation" ;;
      agent-tracker*:done)  LABEL="tracking agent" ;;
      tool-failure*:error)  LABEL="tool error caught" ;;
      tool-failure*:done)   LABEL="learning from error" ;;
      memory-auto-save:done) LABEL="captured memory" ;;
    esac

    [[ -z "$LABEL" ]] && continue

    if [[ -n "$EVENTS" ]]; then
      EVENTS+=" ${SLATE}→${RESET}${DIM} "
    fi
    EVENTS+="${LABEL}"
    EVT_COUNT=$((EVT_COUNT + 1))
  done <<< "$REVERSED"

  if [[ -n "$EVENTS" ]]; then
    L3="  ${DIM}⚙ ${EVENTS}${RESET}"
  fi
fi

if [[ -n "$L3" ]]; then
  echo -e "$L3"
fi
