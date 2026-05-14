#!/bin/bash
# Lightweight hook execution logger with timing
# Usage: source hook-log.sh; hook_log <hook_name> <status> [detail]
# Timing: hook_log "name" "started" sets HOOK_START_MS; "done" auto-calculates duration

umask 077  # UltraThink: restrict temp files to owner only

HOOK_START_MS=""

hook_log() {
  local hook_name="$1"
  local status="$2"
  local detail="${3:-}"
  local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local log_dir="/tmp/ultrathink-hook-logs"
  mkdir -p "$log_dir" 2>/dev/null || true

  local duration_ms=""

  # Track timing
  if [[ "$status" == "started" ]]; then
    # Use perl for millisecond precision (macOS date doesn't support %N)
    HOOK_START_MS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time*1000' 2>/dev/null || date +%s000)
  elif [[ "$status" == "done" && -n "$HOOK_START_MS" ]]; then
    local now_ms
    now_ms=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time*1000' 2>/dev/null || date +%s000)
    duration_ms=$(( now_ms - HOOK_START_MS ))
  fi

  # Append to daily log file — jq builds JSON so detail with newlines/quotes can't corrupt the line
  local log_file="$log_dir/$(date +%Y-%m-%d).jsonl"
  if [[ -n "$duration_ms" ]]; then
    jq -nc --arg ts "$ts" --arg hook "$hook_name" --arg status "$status" --arg detail "$detail" \
           --argjson pid "$$" --argjson duration_ms "$duration_ms" \
           '{ts:$ts,hook:$hook,status:$status,detail:$detail,pid:$pid,duration_ms:$duration_ms}' \
      >> "$log_file" 2>/dev/null || true
  else
    jq -nc --arg ts "$ts" --arg hook "$hook_name" --arg status "$status" --arg detail "$detail" \
           --argjson pid "$$" \
           '{ts:$ts,hook:$hook,status:$status,detail:$detail,pid:$pid}' \
      >> "$log_file" 2>/dev/null || true
  fi

  # Write to statusline activity cache (last 10 hook events, rotating)
  local status_dir="/tmp/ultrathink-status"
  local activity_file="$status_dir/hook-activity"
  mkdir -p "$status_dir" 2>/dev/null || true
  local epoch
  epoch=$(date +%s)
  # Sanitize detail for bar-delimited line format (strip newlines + pipes)
  local safe_detail="${detail//$'\n'/ }"
  safe_detail="${safe_detail//|/-}"
  local entry="${epoch}|${hook_name}|${status}|${safe_detail}"
  if [[ -n "$duration_ms" ]]; then
    entry+="|${duration_ms}"
  fi
  # Append and keep last 10 entries
  {
    tail -9 "$activity_file" 2>/dev/null || true
    echo "$entry"
  } > "${activity_file}.tmp" 2>/dev/null && mv "${activity_file}.tmp" "$activity_file" 2>/dev/null || true

  # Discord webhook: send notable events (async, non-blocking)
  # Skip session-start/end — handled by dedicated hooks with richer content
  # Skip high-frequency noise (privacy:allowed, tool-observe:done, etc.)
  if [[ "$status" == "done" || "$status" == "blocked" || "$status" == "error" ]]; then
    local msg=""
    case "${hook_name}:${status}" in
      prompt-submit:done)
        if [[ -n "$detail" && "$detail" != "skills=" ]]; then
          msg="⚡ Skills activated: ${detail#skills=}"
        fi ;;
      privacy:blocked)      msg="🚫 File access blocked${detail:+ — $detail}" ;;
      typecheck:error)      msg="✗ Type errors found${detail:+ — $detail}" ;;
      pre-compact:done)     msg="🗜 Context compacted — conversation compressed to save space" ;;
      tool-failure:error)
        # Suppress noise: generic/empty errors that Tekiō already filters via SKIP_WHEEL.
        # Detail arrives as "TOOL: ERROR" — strip the prefix and gate on the error itself.
        err_text="${detail#*: }"
        if [[ "$err_text" == "unknown error" \
              || "$err_text" =~ ^Exit\ code\ [0-9]+$ \
              || ${#err_text} -lt 15 ]]; then
          msg=""
        else
          msg="⚠ Tool failed: ${detail:0:120}"
        fi ;;
    esac
    if [[ -n "$msg" ]]; then
      local hook_dir
      hook_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
      local notify_script="$hook_dir/notify.sh"
      if [[ -x "$notify_script" ]]; then
        local priority="normal"
        [[ "$status" == "blocked" || "$status" == "error" ]] && priority="high"
        bash "$notify_script" "$msg" "discord" "$priority" 2>/dev/null &
      fi
    fi
  fi
}
