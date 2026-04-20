#!/usr/bin/env bash
# UltraThink Code-Intel Incremental Indexer
# PostToolUse hook on Edit|Write — re-indexes changed file in background.

set -uo pipefail

INPUT="$(cat)"

FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || true)"
[[ -z "$FILE_PATH" ]] && exit 0

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

[[ ! -f "$FILE_PATH" ]] && exit 0

# Only index source files
EXT="${FILE_PATH##*.}"
case "$EXT" in
  ts|tsx|js|jsx|mjs|cjs|go|rs|py|rb|java|kt|c|cpp|h|hpp|cs|swift) ;;
  *) exit 0 ;;
esac

# Skip node_modules, dist, etc.
case "$FILE_PATH" in
  */node_modules/*|*/dist/*|*/.git/*|*/build/*|*/.next/*) exit 0 ;;
esac

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")"
CODEINTEL_DIR="$(dirname "${BASH_SOURCE[0]}")/.."

[[ -f "$CODEINTEL_DIR/dist/indexer.js" ]] || exit 0

# Run incremental index in background (don't block the edit)
(
  cd "$PROJECT_ROOT" 2>/dev/null || exit 0
  node "$CODEINTEL_DIR/dist/indexer.js" incremental "$PROJECT_ROOT" "$FILE_PATH" 2>/dev/null
) &

exit 0
