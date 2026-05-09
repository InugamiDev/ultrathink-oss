#!/usr/bin/env bash
# intent: Inject forge state at session start so Claude knows where a /forge project left off
# status: done
# confidence: high
# SessionStart hook (Builder+Core, but also OSS for basic forge)

set -euo pipefail
umask 077

ULTRA_DATA="$HOME/.ultrathink"

# Compute project hash from working directory
PROJECT_PATH="${CWD:-$(pwd)}"
HASH=$(echo -n "$PROJECT_PATH" | shasum -a 256 | cut -c1-8)
STATE_FILE="$ULTRA_DATA/forge/projects/${HASH}.json"

# No forge state for this project? Exit silently.
[[ ! -f "$STATE_FILE" ]] && { echo '{}'; exit 0; }

# Read forge state
STAGE=$(jq -r '.stage // "unknown"' "$STATE_FILE" 2>/dev/null)
PROJECT_NAME=$(jq -r '.project // "unknown"' "$STATE_FILE" 2>/dev/null)
MODE=$(jq -r '.mode // "guided"' "$STATE_FILE" 2>/dev/null)
CURRENT_PHASE=$(jq -r '.current_phase // 0' "$STATE_FILE" 2>/dev/null)
CURRENT_FEATURE=$(jq -r '.current_feature // ""' "$STATE_FILE" 2>/dev/null)

# Count feature progress
TOTAL_FEATURES=$(jq '[.phases[]?.features[]?] | length' "$STATE_FILE" 2>/dev/null || echo 0)
PASSED_FEATURES=$(jq '[.phases[]?.features[]? | select(.passes == true)] | length' "$STATE_FILE" 2>/dev/null || echo 0)

# Skip if forge is complete
[[ "$STAGE" == "complete" ]] && { echo '{}'; exit 0; }

# Build context
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

cat > "$tmpfile" << EOF
## Active Forge Project

**Project**: $PROJECT_NAME
**Stage**: $STAGE
**Mode**: $MODE
**Progress**: $PASSED_FEATURES/$TOTAL_FEATURES features complete (phase $CURRENT_PHASE)
**Current feature**: $CURRENT_FEATURE
**State file**: $STATE_FILE

Resume with \`/forge\` to continue from the $STAGE phase, or \`/forge --restart\` to start over.
EOF

jq -n --rawfile ctx "$tmpfile" '{ additionalContext: $ctx }'
