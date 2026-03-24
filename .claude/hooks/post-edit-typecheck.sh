#!/usr/bin/env bash
# UltraThink Post-Edit TypeScript Check
# PostToolUse hook on Edit|Write — runs tsc --noEmit filtered to the edited file.
# Adapted from everything-claude-code's post-edit-typecheck.js

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "typecheck" "started"

INPUT=$(cat)

# Extract the edited file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || true)

# Only check .ts/.tsx files
case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip declaration files and node_modules
case "$FILE_PATH" in
  *.d.ts|*/node_modules/*|*/.next/*) exit 0 ;;
esac

# Find nearest tsconfig.json by walking up
find_tsconfig() {
  local dir="$1"
  local depth=0
  while [[ "$dir" != "/" && $depth -lt 15 ]]; do
    if [[ -f "$dir/tsconfig.json" ]]; then
      echo "$dir/tsconfig.json"
      return 0
    fi
    dir="$(dirname "$dir")"
    depth=$((depth + 1))
  done
  return 1
}

FILE_DIR="$(dirname "$FILE_PATH")"
TSCONFIG=$(find_tsconfig "$FILE_DIR" 2>/dev/null) || {
  hook_log "typecheck" "done" "no-tsconfig"
  exit 0
}

PROJECT_DIR="$(dirname "$TSCONFIG")"

# Run tsc --noEmit and filter to just the edited file
# Use timeout to prevent hanging (5s max)
TSC_OUTPUT=$(cd "$PROJECT_DIR" && timeout 10 npx tsc --noEmit 2>&1 || true)

# Filter errors to only the edited file
BASENAME="$(basename "$FILE_PATH")"
# Match both relative and absolute paths in tsc output
FILTERED=$(echo "$TSC_OUTPUT" | grep -E "(^|/)${BASENAME}\\(" || true)

if [[ -n "$FILTERED" ]]; then
  ERROR_COUNT=$(echo "$FILTERED" | wc -l | tr -d ' ')
  hook_log "typecheck" "done" "errors=$ERROR_COUNT"
  # Output as notification to Claude
  echo "⚠️ TypeScript errors in ${BASENAME}:"
  echo "$FILTERED" | head -10
  if [[ "$ERROR_COUNT" -gt 10 ]]; then
    echo "... and $((ERROR_COUNT - 10)) more"
  fi
else
  hook_log "typecheck" "done" "clean"
fi

exit 0
