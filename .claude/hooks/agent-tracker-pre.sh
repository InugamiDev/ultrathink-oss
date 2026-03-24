#!/usr/bin/env bash
# UltraThink Agent Tracker — PreToolUse (Agent)
# 1. Records agent spawn in tracker file
# 2. Creates per-agent progress file
# 3. Outputs additionalContext instructing the agent to write step updates
# Paired with progress-display.sh (PostToolUse).

set -euo pipefail

INPUT=$(cat)

CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
[[ -z "$CC_SID" ]] && exit 0

TRACKER="/tmp/ultrathink-agents-${CC_SID}"
DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null || true)
BACKGROUND=$(echo "$INPUT" | jq -r '.tool_input.run_in_background // false' 2>/dev/null || true)

[[ -z "$DESCRIPTION" ]] && exit 0

# Create slug from description (lowercase, spaces→dashes, alphanum only)
SLUG=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | head -c 40)
PROGRESS_FILE="/tmp/ultrathink-agent-${CC_SID}-${SLUG}.json"

# Initialize tracker if missing
if [[ ! -f "$TRACKER" ]]; then
  echo '[]' > "$TRACKER"
fi

NOW=$(date +%s)

# Add agent entry with progress file path
jq --arg desc "$DESCRIPTION" --arg bg "$BACKGROUND" --argjson now "$NOW" --arg pf "$PROGRESS_FILE" --arg slug "$SLUG" \
  '. + [{"description": $desc, "slug": $slug, "status": "running", "background": ($bg == "true"), "started": $now, "progress_file": $pf}]' \
  "$TRACKER" > "${TRACKER}.tmp" 2>/dev/null && mv "${TRACKER}.tmp" "$TRACKER"

# Initialize empty progress file
echo '{"step":0,"total_steps":0,"current":"Starting...","steps":[]}' > "$PROGRESS_FILE"

# Progress tracking context injection removed — agents rarely follow these instructions.
# Tracker file + progress file still created for statusline display.
# Saves ~125 tokens per agent spawn (~2,500 tokens/session).

exit 0
