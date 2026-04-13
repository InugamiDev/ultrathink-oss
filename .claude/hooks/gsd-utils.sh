#!/bin/bash
# GSD Utilities — Shared functions for GSD progress tracking and verification
# Usage: source gsd-utils.sh
#
# Progress bridge: writes to /tmp/ultrathink-progress-{session_id}
# so the statusline (L2) shows live GSD progress bars.
#
# Verification: checks SPEC.md → PLAN.md → VERIFICATION.md traceability.

umask 077  # UltraThink: restrict temp files to owner only

# --- Progress Bridge Functions ---

# Get the progress file path for the current session
gsd_progress_file() {
  local sid="${CC_SESSION_ID:-}"
  if [[ -z "$sid" ]]; then
    # Try to find session ID from cache files
    local latest
    latest=$(ls -t /tmp/ultrathink-session-* 2>/dev/null | head -1)
    if [[ -n "$latest" ]]; then
      sid=$(basename "$latest" | sed 's/ultrathink-session-//')
    fi
  fi
  # Truncate to 12 chars like statusline expects
  sid="${sid:0:12}"
  echo "/tmp/ultrathink-progress-${sid}"
}

# Initialize progress for a new GSD execution
# Usage: gsd_progress_init <phase> <total_waves>
gsd_progress_init() {
  local phase="${1:-1}"
  local total_waves="${2:-1}"
  local pfile
  pfile=$(gsd_progress_file)

  cat > "$pfile" << EOF
{"mode":"gsd","phase":${phase},"wave":1,"total_waves":${total_waves},"agents":[],"tasks":{"total":0,"completed":0}}
EOF
}

# Add an agent to the progress tracker
# Usage: gsd_progress_add_agent <plan_id> <tasks_total>
gsd_progress_add_agent() {
  local plan_id="$1"
  local tasks_total="${2:-0}"
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  local new_agent="{\"plan\":\"${plan_id}\",\"status\":\"queued\",\"tasks_total\":${tasks_total},\"tasks_done\":0,\"current_task\":\"\"}"

  jq --argjson agent "$new_agent" '
    .agents += [$agent] |
    .tasks.total += ($agent.tasks_total)
  ' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Start an agent (set to running)
# Usage: gsd_progress_start_agent <plan_id> [first_task_name]
gsd_progress_start_agent() {
  local plan_id="$1"
  local task_name="${2:-Task 1}"
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  jq --arg pid "$plan_id" --arg task "$task_name" '
    .agents |= map(if .plan == $pid then .status = "running" | .current_task = $task else . end)
  ' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Update agent task progress
# Usage: gsd_progress_task_done <plan_id> [next_task_name]
gsd_progress_task_done() {
  local plan_id="$1"
  local next_task="${2:-}"
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  jq --arg pid "$plan_id" --arg next "$next_task" '
    .agents |= map(
      if .plan == $pid then
        .tasks_done += 1 |
        .current_task = $next
      else . end
    ) |
    .tasks.completed += 1
  ' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Mark an agent as done
# Usage: gsd_progress_agent_done <plan_id>
gsd_progress_agent_done() {
  local plan_id="$1"
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  jq --arg pid "$plan_id" '
    .agents |= map(
      if .plan == $pid then
        .status = "done" |
        .tasks_done = .tasks_total |
        .current_task = ""
      else . end
    )
  ' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Mark an agent as failed
# Usage: gsd_progress_agent_failed <plan_id>
gsd_progress_agent_failed() {
  local plan_id="$1"
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  jq --arg pid "$plan_id" '
    .agents |= map(
      if .plan == $pid then .status = "failed" | .current_task = "FAILED"
      else . end
    )
  ' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Advance to next wave
# Usage: gsd_progress_next_wave
gsd_progress_next_wave() {
  local pfile
  pfile=$(gsd_progress_file)
  [[ ! -f "$pfile" ]] && return 1

  jq '.wave += 1' "$pfile" > "${pfile}.tmp" && mv "${pfile}.tmp" "$pfile"
}

# Clean up progress file (call when GSD completes)
# Usage: gsd_progress_cleanup
gsd_progress_cleanup() {
  local pfile
  pfile=$(gsd_progress_file)
  rm -f "$pfile" 2>/dev/null || true
}

# --- Verification Functions ---

# Extract acceptance criteria from SPEC.md
# Usage: gsd_extract_spec_criteria <planning_dir>
# Output: numbered list of criteria, one per line
gsd_extract_spec_criteria() {
  local planning_dir="$1"
  local spec="$planning_dir/SPEC.md"
  [[ ! -f "$spec" ]] && echo "" && return 1

  # Extract lines between "## Acceptance Criteria" and next "## " heading
  sed -n '/^## Acceptance Criteria/,/^## /{/^## Acceptance Criteria/d;/^## /d;p;}' "$spec" \
    | grep -E '^[[:space:]]*-[[:space:]]*\[' \
    | sed -E 's/^[[:space:]]*-[[:space:]]*\[.\][[:space:]]*//' \
    | awk '{printf "%d\t%s\n", NR, $0}'
}

# Extract must-haves from all PLAN.md files
# Usage: gsd_extract_plan_musthaves <planning_dir>
# Output: plan_id | must-have text
gsd_extract_plan_musthaves() {
  local planning_dir="$1"

  for plan in "$planning_dir"/*-PLAN.md; do
    [[ -f "$plan" ]] || continue
    local plan_id
    plan_id=$(basename "$plan" | sed 's/-PLAN\.md$//')

    sed -n '/^## Must-Haves/,/^## /{/^## Must-Haves/d;/^## /d;p;}' "$plan" \
      | grep -E '^[[:space:]]*-[[:space:]]*\[' \
      | sed -E 's/^[[:space:]]*-[[:space:]]*\[.\][[:space:]]*//' \
      | while IFS= read -r line; do
          echo "${plan_id} | ${line}"
        done
  done
}

# Check SPEC → PLAN traceability
# Usage: gsd_check_traceability <planning_dir>
# Output: PASS/FAIL per criterion
gsd_check_traceability() {
  local planning_dir="$1"
  local spec_criteria
  local plan_musthaves
  local all_pass=true

  spec_criteria=$(gsd_extract_spec_criteria "$planning_dir")
  plan_musthaves=$(gsd_extract_plan_musthaves "$planning_dir")

  if [[ -z "$spec_criteria" ]]; then
    echo "⚠ No acceptance criteria found in SPEC.md"
    return 1
  fi

  if [[ -z "$plan_musthaves" ]]; then
    echo "⚠ No must-haves found in any PLAN.md"
    return 1
  fi

  echo "## Traceability Check: SPEC.md → PLAN.md"
  echo ""

  while IFS=$'\t' read -r num criterion; do
    # Clean up the criterion text
    criterion=$(echo "$criterion" | sed 's/^\s*//')
    [[ -z "$criterion" ]] && continue

    # Check if any must-have references this criterion (fuzzy match on key words)
    # Extract significant words (>4 chars) from criterion
    local keywords
    keywords=$(echo "$criterion" | tr '[:upper:]' '[:lower:]' | grep -oE '\b[a-z]{4,}\b' | sort -u | head -5)

    local matched=false
    local match_plan=""
    while IFS= read -r kw; do
      [[ -z "$kw" ]] && continue
      local found
      found=$(echo "$plan_musthaves" | grep -i "$kw" | head -1)
      if [[ -n "$found" ]]; then
        matched=true
        match_plan=$(echo "$found" | cut -d'|' -f1 | tr -d ' ')
        break
      fi
    done <<< "$keywords"

    if [[ "$matched" == true ]]; then
      echo "✅ AC#${num}: ${criterion:0:80} → Plan ${match_plan}"
    else
      echo "❌ AC#${num}: ${criterion:0:80} → NO MATCHING MUST-HAVE"
      all_pass=false
    fi
  done <<< "$spec_criteria"

  echo ""
  if [[ "$all_pass" == true ]]; then
    echo "**Result: ALL acceptance criteria are traceable to plan must-haves.**"
    return 0
  else
    echo "**Result: GAPS DETECTED — some acceptance criteria have no corresponding must-have.**"
    return 1
  fi
}

# Check VERIFICATION.md completeness
# Usage: gsd_check_verification <planning_dir>
# Returns 0 if all must-haves passed, 1 if any failed/missing
gsd_check_verification() {
  local planning_dir="$1"
  local verification="$planning_dir/VERIFICATION.md"

  if [[ ! -f "$verification" ]]; then
    echo "⚠ No VERIFICATION.md found — run 'gsd verify' first"
    return 1
  fi

  local total_pass
  local total_fail
  local total_stub

  total_pass=$(grep -c '✅.*PASS' "$verification" 2>/dev/null || true)
  total_pass=${total_pass:-0}
  total_fail=$(grep -c '❌.*FAIL' "$verification" 2>/dev/null || true)
  total_fail=${total_fail:-0}
  total_stub=$(grep -c 'STUB' "$verification" 2>/dev/null || true)
  total_stub=${total_stub:-0}

  echo "## Verification Summary"
  echo ""
  echo "- ✅ PASS: $total_pass"
  echo "- ❌ FAIL: $total_fail"
  echo "- ⚠ STUB: $total_stub"
  echo ""

  if [[ "$total_fail" -gt 0 || "$total_stub" -gt 0 ]]; then
    echo "**BLOCKED: Cannot archive — $total_fail failures, $total_stub stubs remaining.**"
    return 1
  else
    echo "**CLEAR: All must-haves verified. Safe to archive.**"
    return 0
  fi
}

# Full pre-archive gate: traceability + verification
# Usage: gsd_pre_archive_gate <planning_dir>
gsd_pre_archive_gate() {
  local planning_dir="$1"
  local exit_code=0

  echo "═══════════════════════════════════════════"
  echo "  GSD Pre-Archive Verification Gate"
  echo "═══════════════════════════════════════════"
  echo ""

  # Check 1: SPEC → PLAN traceability
  gsd_check_traceability "$planning_dir" || exit_code=1
  echo ""

  # Check 2: VERIFICATION.md completeness
  gsd_check_verification "$planning_dir" || exit_code=1
  echo ""

  if [[ "$exit_code" -eq 0 ]]; then
    echo "🟢 **ALL GATES PASSED** — ready for archive."
  else
    echo "🔴 **GATES FAILED** — fix issues before archiving."
  fi

  return $exit_code
}
