#!/usr/bin/env bash
# UltraThink Hook Flags — Profile system + per-hook disabling
# Sourced by other hooks. Not registered as a standalone hook.
#
# Environment variables:
#   UT_HOOK_PROFILE     — minimal | standard (default) | strict
#   UT_DISABLED_HOOKS   — comma-separated hook IDs to skip (e.g., "ut:pre:gateguard,ut:post:format-check")

# intent: port ECC's hook profile + disable system for user control
# status: done
# confidence: high

# Returns the active profile (default: standard)
ut_hook_profile() {
  local profile="${UT_HOOK_PROFILE:-standard}"
  case "$profile" in
    minimal|standard|strict) echo "$profile" ;;
    *) echo "standard" ;;
  esac
}

# Check if a hook ID is explicitly disabled via UT_DISABLED_HOOKS
ut_hook_disabled() {
  local hook_id="$1"
  [[ -z "${UT_DISABLED_HOOKS:-}" ]] && return 1

  local IFS=','
  for disabled in $UT_DISABLED_HOOKS; do
    # Trim whitespace and compare case-insensitively
    disabled="$(echo "$disabled" | tr '[:upper:]' '[:lower:]' | xargs)"
    local lower_id="$(echo "$hook_id" | tr '[:upper:]' '[:lower:]')"
    [[ "$disabled" == "$lower_id" ]] && return 0
  done
  return 1
}

# Check if hook should run given its ID and required profile level
# Usage: ut_should_run "ut:pre:gateguard" "standard" || exit 0
# Second arg = minimum profile level (minimal < standard < strict)
ut_should_run() {
  local hook_id="$1"
  local min_profile="${2:-minimal}"
  local active
  active="$(ut_hook_profile)"

  # Check explicit disable first
  if ut_hook_disabled "$hook_id"; then
    return 1
  fi

  # Profile hierarchy: minimal=0, standard=1, strict=2
  local active_level=1 min_level=0
  case "$active" in
    minimal)  active_level=0 ;;
    standard) active_level=1 ;;
    strict)   active_level=2 ;;
  esac
  case "$min_profile" in
    minimal)  min_level=0 ;;
    standard) min_level=1 ;;
    strict)   min_level=2 ;;
  esac

  [[ $active_level -ge $min_level ]]
}
