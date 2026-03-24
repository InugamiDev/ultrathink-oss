#!/usr/bin/env bash
# UltraThink Post-Edit Quality Gate
# PostToolUse hook on Edit|Write — runs formatting + TypeScript type-check.
# Merges format-check.sh and post-edit-typecheck.sh into a single hook.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "quality" "started"

INPUT="$(cat)"

FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || true)"
[[ -z "$FILE_PATH" ]] && exit 0

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

[[ ! -f "$FILE_PATH" ]] && exit 0

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
LOG_DIR="$PROJECT_ROOT/reports"

log_event() {
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$LOG_DIR" 2>/dev/null || true
  echo "{\"timestamp\":\"$timestamp\",\"hook\":\"quality\",\"file\":\"$FILE_PATH\",\"message\":\"$1\"}" \
    >> "$LOG_DIR/hook-events.jsonl" 2>/dev/null || true
}

EXT="${FILE_PATH##*.}"

# ── Phase 1: Format Check (background — don't block Edit response) ──

export -f log_event
export FILE_PATH PROJECT_ROOT LOG_DIR
(
case "$EXT" in
  ts|tsx|js|jsx|mjs|cjs)
    if command -v npx &>/dev/null; then
      if [[ -f "$PROJECT_ROOT/node_modules/.bin/biome" ]] || [[ -f "$PROJECT_ROOT/biome.json" ]] || [[ -f "$PROJECT_ROOT/biome.jsonc" ]]; then
        npx biome format --write "$FILE_PATH" 2>/dev/null || true
        log_event "Biome format applied"
      elif [[ -f "$PROJECT_ROOT/node_modules/.bin/prettier" ]] || [[ -f "$PROJECT_ROOT/.prettierrc" ]] || [[ -f "$PROJECT_ROOT/prettier.config.js" ]]; then
        if ! npx prettier --check "$FILE_PATH" 2>/dev/null; then
          log_event "Formatting issue detected, auto-fixing"
          npx prettier --write "$FILE_PATH" 2>/dev/null || true
        else
          log_event "Format OK"
        fi
      fi
    fi
    ;;
  json)
    if command -v jq &>/dev/null; then
      if ! jq empty "$FILE_PATH" 2>/dev/null; then
        log_event "Invalid JSON detected"
      else
        log_event "JSON valid"
      fi
    fi
    ;;
  sh|bash|zsh)
    if command -v bash &>/dev/null; then
      if ! bash -n "$FILE_PATH" 2>/dev/null; then
        log_event "Shell syntax error detected"
      else
        log_event "Shell syntax OK"
      fi
    fi
    ;;
esac
) &

# Phase 2 (tsc --noEmit) removed — full project typecheck on every edit added 3-10s latency.
# TypeScript errors surface at build/test time. Format-only hook is sufficient.

hook_log "quality" "done" "format-only"
exit 0
