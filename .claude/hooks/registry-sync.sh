#!/usr/bin/env bash
# registry-sync.sh — Detect skills on disk missing from _registry.json
# Usage: bash registry-sync.sh [--quiet]
# Exit codes: 0 = all synced, 1 = missing entries found, 2 = error

set -euo pipefail

SKILLS_DIR="$HOME/.claude/skills"
REGISTRY="$SKILLS_DIR/_registry.json"
QUIET="${1:-}"
MISSING=0

if [[ ! -f "$REGISTRY" ]]; then
  echo "ERROR: Registry not found at $REGISTRY" >&2
  exit 2
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed" >&2
  exit 2
fi

# Get all keys from registry
REGISTRY_KEYS=$(jq -r 'keys[]' "$REGISTRY" 2>/dev/null) || {
  echo "ERROR: Failed to parse registry JSON" >&2
  exit 2
}

# Scan all SKILL.md files on disk
for skill_md in "$SKILLS_DIR"/*/SKILL.md; do
  [[ -f "$skill_md" ]] || continue
  skill_name=$(basename "$(dirname "$skill_md")")

  # Check if skill name exists as a key in registry
  if ! echo "$REGISTRY_KEYS" | grep -qx "$skill_name"; then
    echo "MISSING: $skill_name (has SKILL.md at $skill_md)"
    ((MISSING++))
  fi
done

if [[ "$MISSING" -eq 0 ]]; then
  [[ "$QUIET" != "--quiet" ]] && echo "OK: All skills on disk are registered ($( echo "$REGISTRY_KEYS" | wc -l | tr -d ' ') entries)"
  exit 0
else
  echo "WARN: $MISSING skill(s) on disk missing from registry"
  exit 1
fi
