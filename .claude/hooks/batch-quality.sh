#!/usr/bin/env bash
# UltraThink Batch Quality — Accumulate edits, run format+typecheck once at Stop
# Two modes:
#   PostToolUse (Edit|Write) — accumulate edited file paths
#   Stop                     — batch format + typecheck all accumulated files
#
# This replaces per-file checking with a single batch at session end,
# matching ECC's accumulator pattern for O(1) formatter invocations.

set -euo pipefail

HOOK_ID="ut:post:batch-quality"

# Load flags system
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/hook-flags.sh" 2>/dev/null || true
source "$HOOK_DIR/hook-log.sh" 2>/dev/null || hook_log() { :; }

# Batch quality runs at standard+ profile
ut_should_run "$HOOK_ID" "standard" 2>/dev/null || exit 0

ACCUMULATOR="/tmp/ultrathink-edited-files"

# Read JSON input from stdin
INPUT="$(cat)"

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"
HOOK_EVENT="$(echo "$INPUT" | jq -r '.hook_event // empty' 2>/dev/null || true)"

# ─── Mode 1: PostToolUse — accumulate file paths ───
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "MultiEdit" ]]; then
  FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"
  if [[ -n "$FILE_PATH" ]]; then
    # Resolve to absolute
    if [[ "$FILE_PATH" != /* ]]; then
      FILE_PATH="$(pwd)/$FILE_PATH"
    fi
    echo "$FILE_PATH" >> "$ACCUMULATOR" 2>/dev/null || true
  fi
  exit 0
fi

# ─── Mode 2: Stop — batch process all accumulated files ───
if [[ "$HOOK_EVENT" != "Stop" && "$TOOL_NAME" != "stop" ]]; then
  exit 0
fi

# Nothing accumulated? Skip
if [[ ! -f "$ACCUMULATOR" ]]; then
  exit 0
fi

hook_log "batch-quality" "started"

# Read and deduplicate accumulated files
EDITED_FILES=()
while IFS= read -r line; do
  [[ -f "$line" ]] && EDITED_FILES+=("$line")
done < <(sort -u "$ACCUMULATOR" 2>/dev/null)

# Clear accumulator immediately
rm -f "$ACCUMULATOR" 2>/dev/null || true

if [[ ${#EDITED_FILES[@]} -eq 0 ]]; then
  hook_log "batch-quality" "done" "no-files"
  exit 0
fi

# Budget: 60 seconds total (Stop hooks get up to 300s, leave room for others)
BUDGET_SEC=60

ISSUES=()

# ─── Batch formatting ───
# Group by project root to run formatter once per project
declare -A PROJECT_FILES
for f in "${EDITED_FILES[@]}"; do
  DIR="$(dirname "$f")"
  # Walk up to find project root (package.json or .git)
  ROOT="$DIR"
  while [[ "$ROOT" != "/" ]]; do
    if [[ -f "$ROOT/package.json" ]] || [[ -d "$ROOT/.git" ]]; then
      break
    fi
    ROOT="$(dirname "$ROOT")"
  done
  [[ "$ROOT" == "/" ]] && ROOT="$DIR"
  PROJECT_FILES["$ROOT"]+="$f "
done

for root in "${!PROJECT_FILES[@]}"; do
  read -ra files <<< "${PROJECT_FILES[$root]}"

  # Filter to JS/TS files only for formatting
  FORMAT_FILES=()
  for f in "${files[@]}"; do
    case "${f##*.}" in
      ts|tsx|js|jsx|mjs|cjs) FORMAT_FILES+=("$f") ;;
    esac
  done

  [[ ${#FORMAT_FILES[@]} -eq 0 ]] && continue

  # Detect formatter
  if [[ -f "$root/biome.json" ]] || [[ -f "$root/biome.jsonc" ]]; then
    timeout "$BUDGET_SEC" npx --prefix "$root" biome format --write "${FORMAT_FILES[@]}" 2>/dev/null || true
  elif [[ -f "$root/.prettierrc" ]] || [[ -f "$root/prettier.config.js" ]] || [[ -f "$root/node_modules/.bin/prettier" ]]; then
    timeout "$BUDGET_SEC" npx --prefix "$root" prettier --write "${FORMAT_FILES[@]}" 2>/dev/null || true
  fi
done

# ─── Batch typecheck ───
# Group TS files by tsconfig location
TS_FILES=()
for f in "${EDITED_FILES[@]}"; do
  case "${f##*.}" in
    ts|tsx) TS_FILES+=("$f") ;;
  esac
done

if [[ ${#TS_FILES[@]} -gt 0 ]]; then
  # Find nearest tsconfig
  FIRST_DIR="$(dirname "${TS_FILES[0]}")"
  TSCONFIG_DIR="$FIRST_DIR"
  while [[ "$TSCONFIG_DIR" != "/" ]]; do
    if [[ -f "$TSCONFIG_DIR/tsconfig.json" ]]; then
      break
    fi
    TSCONFIG_DIR="$(dirname "$TSCONFIG_DIR")"
  done

  if [[ -f "$TSCONFIG_DIR/tsconfig.json" ]]; then
    TSC_OUTPUT="$(timeout "$BUDGET_SEC" npx --prefix "$TSCONFIG_DIR" tsc --noEmit 2>&1 || true)"
    # Filter to only show errors in edited files
    for f in "${TS_FILES[@]}"; do
      FILE_ERRORS="$(echo "$TSC_OUTPUT" | grep -F "$(basename "$f")" 2>/dev/null || true)"
      if [[ -n "$FILE_ERRORS" ]]; then
        ISSUES+=("TypeCheck: $f — $(echo "$FILE_ERRORS" | head -3)")
      fi
    done
  fi
fi

# ─── Console.log detection ───
for f in "${EDITED_FILES[@]}"; do
  case "${f##*.}" in
    ts|tsx|js|jsx)
      CONSOLE_LINES="$(grep -n 'console\.log\b' "$f" 2>/dev/null | head -3 || true)"
      if [[ -n "$CONSOLE_LINES" ]]; then
        ISSUES+=("console.log: $f — $(echo "$CONSOLE_LINES" | head -1)")
      fi
      ;;
  esac
done

# Report issues (non-blocking — just inform)
if [[ ${#ISSUES[@]} -gt 0 ]]; then
  hook_log "batch-quality" "done" "${#ISSUES[@]} issues"
  printf '{\n  "issues": [\n'
  for i in "${!ISSUES[@]}"; do
    printf '    "%s"' "$(echo "${ISSUES[$i]}" | sed 's/"/\\"/g' | head -c 200)"
    [[ $i -lt $(( ${#ISSUES[@]} - 1 )) ]] && printf ','
    printf '\n'
  done
  printf '  ]\n}\n'
else
  hook_log "batch-quality" "done" "clean"
fi

exit 0
