#!/usr/bin/env bash
# UltraThink Code-Intel Session Start Check
# Fires on SessionStart — queues full reindex if stale (>24h) in background.

set -uo pipefail

# Resolve UltraThink project root
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

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

CODEINTEL_DIR="$ULTRA_ROOT/code-intel"
INDEXER="$CODEINTEL_DIR/dist/indexer.js"

# Check if code-intel is built
[[ ! -f "$INDEXER" ]] && exit 0

# Check staleness — query last_indexed_at for projects in this repo
STALE_CHECK=$(node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`
  SELECT root_path, last_indexed_at,
    EXTRACT(EPOCH FROM NOW() - last_indexed_at) / 3600 AS hours_ago
  FROM ci_projects
  WHERE last_indexed_at IS NOT NULL
  ORDER BY last_indexed_at DESC
  LIMIT 5
\`;
const stale = rows.filter(r => r.hours_ago > 24);
if (stale.length > 0) {
  console.log(JSON.stringify(stale.map(r => r.root_path)));
} else {
  console.log('[]');
}
" 2>/dev/null) || STALE_CHECK='[]'

# If any projects are stale, reindex in background
if [[ "$STALE_CHECK" != "[]" ]]; then
  (
    # Parse stale paths and reindex each
    echo "$STALE_CHECK" | node --input-type=module -e "
      import { readFileSync } from 'fs';
      const paths = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));
      for (const p of paths) {
        console.log('reindex:' + p);
      }
    " 2>/dev/null | while IFS= read -r line; do
      path="${line#reindex:}"
      [[ -d "$path" ]] && node "$INDEXER" index "$path" 2>/dev/null || true
    done
  ) &
fi

# No additionalContext needed — just background work
echo '{}'
exit 0
