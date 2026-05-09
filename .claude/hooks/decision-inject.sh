#!/usr/bin/env bash
# intent: Inject active decisions as constraints at session start (Builder+Core)
# status: done
# confidence: high
# SessionStart hook

set -euo pipefail
umask 077

ULTRA_DATA="$HOME/.ultrathink"
CONFIG="$ULTRA_DATA/config.json"

# Only run for Builder+ tiers
if [[ ! -f "$CONFIG" ]]; then exit 0; fi
TIER=$(jq -r '.tier // "oss"' "$CONFIG" 2>/dev/null)
[[ "$TIER" == "oss" ]] && exit 0

# Resolve project path for scoped decisions
PROJECT_PATH="${CWD:-$(pwd)}"
HASH=$(echo -n "$PROJECT_PATH" | shasum -a 256 | cut -c1-8)

# Collect decisions
DECISIONS=""

# Global decisions
GLOBAL_FILE="$ULTRA_DATA/decisions/global.json"
if [[ -f "$GLOBAL_FILE" ]]; then
  GLOBAL_RULES=$(jq -r '.[] | select(.is_active != false) | "- **[\(if .priority >= 8 then "CRITICAL" elif .priority >= 5 then "IMPORTANT" else "note" end)]** \(.rule)"' "$GLOBAL_FILE" 2>/dev/null || true)
  [[ -n "$GLOBAL_RULES" ]] && DECISIONS="$GLOBAL_RULES"
fi

# Project-scoped decisions
PROJECT_FILE="$ULTRA_DATA/decisions/projects/${HASH}.json"
if [[ -f "$PROJECT_FILE" ]]; then
  PROJECT_RULES=$(jq -r '.[] | select(.is_active != false) | "- **[\(if .priority >= 8 then "CRITICAL" elif .priority >= 5 then "IMPORTANT" else "note" end)]** [project] \(.rule)"' "$PROJECT_FILE" 2>/dev/null || true)
  [[ -n "$PROJECT_RULES" ]] && DECISIONS="${DECISIONS}${DECISIONS:+\n}${PROJECT_RULES}"
fi

# Also load from DB if available
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_RULES=$(cd "$ULTRA_ROOT" && timeout 5 npx tsx -e "
    const { getDecisions, formatDecisionsForContext } = require('./packages/memory/src/decisions.js');
    getDecisions('$PROJECT_PATH').then(d => {
      if (d.length > 0) console.log(formatDecisionsForContext(d));
    }).catch(() => {});
  " 2>/dev/null || true)
  [[ -n "$DB_RULES" ]] && DECISIONS="${DECISIONS}${DECISIONS:+\n\n}${DB_RULES}"
fi

if [[ -n "$DECISIONS" ]]; then
  # Use temp file to avoid shell escaping issues
  tmpfile=$(mktemp)
  trap 'rm -f "$tmpfile"' EXIT
  printf '%s' "## Active Decisions (hard constraints)

$DECISIONS" > "$tmpfile"
  jq -n --rawfile ctx "$tmpfile" '{ additionalContext: $ctx }'
else
  echo '{}'
fi
