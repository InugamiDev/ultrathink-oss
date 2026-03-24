#!/usr/bin/env bash
# UltraThink Format Check Hook
# PostToolUse hook that checks formatting of modified files.
# Receives JSON on stdin from Claude Code with tool_name and tool_input.

set -euo pipefail

# Read JSON input from stdin
INPUT="$(cat)"

# Extract file path from stdin JSON
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
LOG_DIR="$PROJECT_ROOT/reports"

log_event() {
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$LOG_DIR" 2>/dev/null || true
  echo "{\"timestamp\":\"$timestamp\",\"hook\":\"format-check\",\"file\":\"$FILE_PATH\",\"message\":\"$1\"}" \
    >> "$LOG_DIR/hook-events.jsonl" 2>/dev/null || true
}

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path for file checks
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

# Skip if file doesn't exist
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Determine file type
EXT="${FILE_PATH##*.}"

case "$EXT" in
  ts|tsx|js|jsx|mjs|cjs)
    # Detect formatter: Biome > Prettier
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

  *)
    # No formatting check for other file types
    ;;
esac

exit 0
