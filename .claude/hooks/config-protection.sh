#!/usr/bin/env bash
# UltraThink Config Protection — Block linter/formatter config modifications
# PreToolUse hook for Edit|Write: prevents AI from weakening code quality configs.
# Steers agent toward fixing source code instead of loosening rules.

set -euo pipefail

HOOK_ID="ut:pre:config-protect"

# Load flags system
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOK_DIR/hook-flags.sh" 2>/dev/null || true
source "$HOOK_DIR/hook-log.sh" 2>/dev/null || hook_log() { :; }

# Config protection runs at standard+ profile
ut_should_run "$HOOK_ID" "standard" 2>/dev/null || exit 0

# Read JSON input from stdin
INPUT="$(cat)"

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

# Only gate Edit and Write
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Extract basename for matching
BASENAME="$(basename "$FILE_PATH")"

# Protected config files — linters, formatters, type checkers
# Matching by basename only (not full path) to catch all locations
PROTECTED_CONFIGS=(
  # ESLint (legacy + flat)
  ".eslintrc" ".eslintrc.js" ".eslintrc.cjs" ".eslintrc.json"
  ".eslintrc.yml" ".eslintrc.yaml"
  "eslint.config.js" "eslint.config.mjs" "eslint.config.cjs"
  "eslint.config.ts" "eslint.config.mts" "eslint.config.cts"

  # Prettier
  ".prettierrc" ".prettierrc.js" ".prettierrc.cjs" ".prettierrc.json"
  ".prettierrc.yml" ".prettierrc.yaml"
  "prettier.config.js" "prettier.config.cjs" "prettier.config.mjs"

  # Biome
  "biome.json" "biome.jsonc"

  # TypeScript (strict mode should not be weakened)
  "tsconfig.json" "tsconfig.base.json"

  # Ruff (Python)
  ".ruff.toml" "ruff.toml"

  # Other linters
  ".stylelintrc" ".stylelintrc.json" ".stylelintrc.yml"
  ".markdownlint.json" ".markdownlint.yaml" ".markdownlintrc"
  ".shellcheckrc"
)

for config in "${PROTECTED_CONFIGS[@]}"; do
  if [[ "$BASENAME" == "$config" ]]; then
    hook_log "config-protection" "blocked" "$BASENAME"
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Config Protection: " + $file + " is a code quality config. Fix the source code instead of weakening linter/formatter rules. If you genuinely need to change this config, ask the user for explicit permission first.")
      }
    }' --arg file "$BASENAME"
    exit 0
  fi
done

exit 0
