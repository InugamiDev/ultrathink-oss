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

# Resolve UltraThink project root (follow symlinks)
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
INDEXER="$ULTRA_ROOT/code-intel/dist/indexer.js"

[[ ! -f "$INDEXER" ]] && exit 0

# Load DATABASE_URL
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ULTRA_ROOT/.env" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" || "$line" =~ ^# ]] && continue
      key="${line%%=*}"
      value="${line#*=}"
      export "$key"="$value"
    done < "$ULTRA_ROOT/.env"
  fi
fi

[[ -z "${DATABASE_URL:-}" ]] && exit 0

# Find the git project root for the edited file
PROJECT_ROOT="$(cd "$(dirname "$FILE_PATH")" && git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")"

# Run incremental index in background (don't block the edit)
(
  node "$INDEXER" incremental "$PROJECT_ROOT" "$FILE_PATH" 2>/dev/null
) &

exit 0
