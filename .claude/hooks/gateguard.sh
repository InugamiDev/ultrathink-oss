#!/usr/bin/env bash
# UltraThink GateGuard — Read-before-write enforcement
# PreToolUse hook for Edit|Write: blocks writes to files that haven't been read first.
# Forces investigation before modification — the act of reading creates awareness.
#
# State tracked per-session in /tmp/ultrathink-gateguard-<pid>/
# Session expires after 30 minutes of inactivity.

set -eo pipefail

HOOK_ID="ut:pre:gateguard"

# Resolve symlinks to find real hook directory (installed as ultrathink-*.sh symlinks)
SELF="${BASH_SOURCE[0]}"
[[ -L "$SELF" ]] && SELF="$(readlink "$SELF" 2>/dev/null || echo "$SELF")"
HOOK_DIR="$(cd "$(dirname "$SELF")" && pwd)"

source "$HOOK_DIR/hook-flags.sh" 2>/dev/null || true
source "$HOOK_DIR/hook-log.sh" 2>/dev/null || hook_log() { :; }

# GateGuard runs at standard+ profile
if type ut_should_run &>/dev/null; then
  ut_should_run "$HOOK_ID" "standard" || exit 0
fi

hook_log "gateguard" "started"

# Read JSON input from stdin
INPUT="$(cat)"

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

# Only gate Edit and Write
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  Read)
    # Track reads for later gate checks
    if [[ -n "$FILE_PATH" ]]; then
      STATE_DIR="/tmp/ultrathink-gateguard"
      mkdir -p "$STATE_DIR" 2>/dev/null || true
      # Sanitize path for filename (replace / with __)
      SAFE_PATH="$(echo "$FILE_PATH" | sed 's|/|__|g' | head -c 200)"
      touch "$STATE_DIR/$SAFE_PATH" 2>/dev/null || true
    fi
    hook_log "gateguard" "done" "tracked-read"
    exit 0
    ;;
  *)
    exit 0
    ;;
esac

# No file path = nothing to gate
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

STATE_DIR="/tmp/ultrathink-gateguard"
mkdir -p "$STATE_DIR" 2>/dev/null || true

# Clean expired entries (>30 min old) — run occasionally, not every invocation
CLEANUP_MARKER="$STATE_DIR/.last-cleanup"
NOW="$(date +%s)"
if [[ ! -f "$CLEANUP_MARKER" ]] || [[ $(( NOW - $(cat "$CLEANUP_MARKER" 2>/dev/null || echo 0) )) -gt 300 ]]; then
  find "$STATE_DIR" -type f -mmin +30 -delete 2>/dev/null || true
  echo "$NOW" > "$CLEANUP_MARKER" 2>/dev/null || true
fi

# Check if file was read this session
SAFE_PATH="$(echo "$FILE_PATH" | sed 's|/|__|g' | head -c 200)"

if [[ -f "$STATE_DIR/$SAFE_PATH" ]]; then
  # File was read — allow the write
  hook_log "gateguard" "done" "allowed"
  exit 0
fi

# New files don't need prior reading — check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
  hook_log "gateguard" "done" "new-file"
  exit 0
fi

# BLOCK: file exists but hasn't been read this session
hook_log "gateguard" "blocked" "$FILE_PATH"

# Output structured denial
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("GateGuard: Read " + $path + " before modifying it. Understanding existing code prevents regressions.")
  }
}' --arg path "$FILE_PATH"

exit 0
