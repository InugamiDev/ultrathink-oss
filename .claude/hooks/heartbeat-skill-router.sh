#!/usr/bin/env bash
# UltraThink × Paperclip — Heartbeat Skill Router (L2 Skill Bridge)
#
# Fires on SessionStart. If PAPERCLIP_AGENT_ID is set, scores the top-3
# UltraThink skills for the current heartbeat (role + issue + comments) and
# returns them as additionalContext. When not in heartbeat mode, no-ops.
#
# Solo-mode unchanged — UserPromptSubmit hook (prompt-submit.sh) still owns
# skill scoring for human-driven sessions; this hook fills the gap for
# Paperclip-spawned agents whose heartbeat resumes never generate a user
# prompt.
#
# Hard rules respected:
#   * Tight 4s timeout on analyzer + 2s on each curl → never blocks heartbeat.
#   * Falls back to empty {} on any failure — never errors out the hook.
#   * Read-only — does not touch DB, server, or agent runtime config.

set -euo pipefail
umask 077

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "heartbeat-skill" "started"

# Read stdin (Claude passes hook input JSON; we drain it to avoid SIGPIPE).
INPUT=$(cat 2>/dev/null || true)
: "${INPUT:=}"

# Gate: only fire inside a Paperclip heartbeat.
if [[ -z "${PAPERCLIP_AGENT_ID:-}" && -z "${PAPERCLIP_TASK_ID:-}" && -z "${PAPERCLIP_RUN_ID:-}" ]]; then
  echo '{}'
  exit 0
fi

# Resolve UltraThink root (follow symlinks).
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR_REAL="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR_REAL/../.." && pwd)"
ANALYZER_JS="$HOOK_DIR_REAL/dist/prompt-analyzer.js"
REGISTRY_JSON="$ULTRA_ROOT/.claude/skills/_registry.json"

# Cross-platform timeout wrapper.
# Prefers gtimeout / timeout (GNU coreutils). Falls back to a bash watchdog
# that captures stdout via tmpfile, then uses `pkill -P <watchdog>` to reap
# the orphaned `sleep` child cleanly. Without `pkill -P`, the orphan keeps the
# parent shell alive for the full timeout window even after the work succeeds.
_with_timeout() {
  local secs="$1"; shift
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
    return $?
  fi
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
    return $?
  fi
  local tmpf
  tmpf=$(mktemp)
  "$@" >"$tmpf" 2>/dev/null &
  local pid=$!
  ( sleep "$secs" 2>/dev/null; kill -9 "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid" 2>/dev/null
  local rc=$?
  # Kill orphan sleep child of watchdog subshell, then watchdog itself.
  pkill -9 -P "$watchdog" 2>/dev/null || true
  kill  -9 "$watchdog" 2>/dev/null || true
  wait     "$watchdog" 2>/dev/null || true
  cat "$tmpf"
  rm -f "$tmpf"
  return $rc
}

# Hard prerequisites — silently no-op if missing rather than error.
if ! command -v node >/dev/null 2>&1 || [[ ! -f "$ANALYZER_JS" || ! -f "$REGISTRY_JSON" ]]; then
  hook_log "heartbeat-skill" "skipped" "missing-deps"
  echo '{}'
  exit 0
fi

# Role hint — derived from PAPERCLIP_AGENT_TITLE for prompt construction.
ROLE_HINT=""
if [[ -n "${PAPERCLIP_AGENT_TITLE:-}" ]]; then
  case "${PAPERCLIP_AGENT_TITLE,,}" in
    *memory-integrator*)     ROLE_HINT="Memory Integrator" ;;
    *code-intel-integrator*) ROLE_HINT="Code-Intel Integrator" ;;
    *quality-integrator*)    ROLE_HINT="Quality Integrator" ;;
    *director*)              ROLE_HINT="Director" ;;
    *code-integrator*|*mira*) ROLE_HINT="Code Integrator" ;;
    *ceo*|*steven*)          ROLE_HINT="CEO" ;;
    *)                       ROLE_HINT="${PAPERCLIP_AGENT_TITLE}" ;;
  esac
fi

# Build the analyzer prompt by synthesizing role + issue + recent activity.
prompt_parts=()
[[ -n "$ROLE_HINT" ]] && prompt_parts+=("Role: $ROLE_HINT.")
prompt_parts+=("Agent ${PAPERCLIP_AGENT_ID:-unknown} on heartbeat run ${PAPERCLIP_RUN_ID:-?}.")
[[ -n "${PAPERCLIP_WAKE_REASON:-}" ]] && prompt_parts+=("Wake reason: ${PAPERCLIP_WAKE_REASON}.")

if [[ -n "${PAPERCLIP_TASK_ID:-}" && -n "${PAPERCLIP_API_URL:-}" ]]; then
  api_hdr=()
  [[ -n "${PAPERCLIP_API_KEY:-}" ]] && api_hdr=(-H "Authorization: Bearer ${PAPERCLIP_API_KEY}")

  issue_json=$(_with_timeout 3 curl -sS --max-time 2 "${api_hdr[@]}" \
    "${PAPERCLIP_API_URL%/}/api/issues/${PAPERCLIP_TASK_ID}" 2>/dev/null || echo "")
  if [[ -n "$issue_json" ]]; then
    title=$(echo "$issue_json" | jq -r '.title // ""' 2>/dev/null || echo "")
    desc=$(echo "$issue_json" | jq -r '.description // ""' 2>/dev/null | head -c 400 || echo "")
    [[ -n "$title" ]] && prompt_parts+=("Issue: $title.")
    [[ -n "$desc"  ]] && prompt_parts+=("Description: $desc")
  fi

  comments_json=$(_with_timeout 3 curl -sS --max-time 2 "${api_hdr[@]}" \
    "${PAPERCLIP_API_URL%/}/api/issues/${PAPERCLIP_TASK_ID}/comments" 2>/dev/null || echo "")
  if [[ -n "$comments_json" ]]; then
    recent=$(echo "$comments_json" \
      | jq -r 'if type=="array" then . else (.comments // []) end | sort_by(.createdAt // "") | reverse | .[0:3] | map(.body // "") | join(" || ")' 2>/dev/null \
      | head -c 600 || echo "")
    [[ -n "$recent" ]] && prompt_parts+=("Recent comments: $recent")
  fi
fi

# Collapse to single-line prompt for analyzer (it expects argv[2]).
prompt_text=$(printf '%s ' "${prompt_parts[@]}" | tr '\n' ' ' | tr -s ' ')

# Run analyzer with 4s hard cap.
analyzer_out=$(_with_timeout 4 node "$ANALYZER_JS" "$prompt_text" 2>/dev/null || echo "")

if [[ -z "$analyzer_out" ]] || ! echo "$analyzer_out" | jq -e '(.skills // []) | length > 0' >/dev/null 2>&1; then
  hook_log "heartbeat-skill" "no-skills"
  echo '{}'
  exit 0
fi

# Build markdown block, joining analyzer skill names with registry descriptions.
skill_block=$(jq -nr \
  --argjson a "$analyzer_out" \
  --slurpfile reg "$REGISTRY_JSON" \
  '
  ($reg[0].skills // []) as $skills
  | ($skills | map({(.name): (.description // "")}) | add) as $desc
  | "## Top 3 skills for this heartbeat\n" +
    (($a.skills // [])[0:3] | map(
      "- **" + .name + "** — " +
      ((($desc[.name] // "") | gsub("[\n\r]"; " ") | .[0:140])) +
      " (score: " + ((.score // 0) | tostring) + ")"
    ) | join("\n")) +
    "\nUse these via the Skill tool when applicable to your role boundaries."
  ' 2>/dev/null || echo "")

if [[ -z "$skill_block" ]]; then
  hook_log "heartbeat-skill" "render-failed"
  echo '{}'
  exit 0
fi

picked=$(echo "$analyzer_out" | jq -r '[(.skills // [])[]?.name] | join(",")' 2>/dev/null || echo "?")
hook_log "heartbeat-skill" "injected" "skills=$picked"

# Emit Claude Code SessionStart hook output. Claude concatenates additionalContext
# from every SessionStart hook, so this stacks cleanly atop paperclip-env.sh +
# memory-session-start.sh.
jq -n --arg ctx "$skill_block" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
