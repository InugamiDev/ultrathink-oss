#!/usr/bin/env bash
# intent: Trim verbose tool responses to reduce token consumption
# status: done
# confidence: high
#
# PostToolUse hook — intercepts large tool outputs and suggests compression.
# Targets: MCP tools, Bash, Read (large files), Grep (many matches).
# Does NOT modify output — injects additionalContext guidance.

set -eo pipefail
umask 077

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
[[ -z "$TOOL_NAME" ]] && exit 0

# Estimate output size from stdout or tool_output
STDOUT=$(echo "$INPUT" | jq -r '.tool_output.stdout // .tool_output.content // ""' 2>/dev/null || echo "")
[[ -z "$STDOUT" ]] && exit 0

CHAR_COUNT=${#STDOUT}
LINE_COUNT=$(echo "$STDOUT" | wc -l | tr -d ' ')

# ── Rule 1: Massive output (>10KB / >200 lines) ──
if [[ $CHAR_COUNT -gt 10000 || $LINE_COUNT -gt 200 ]]; then
  TOKENS_EST=$((CHAR_COUNT / 4))
  cat << EOF
{
  "additionalContext": "Tool output is ${TOKENS_EST} tokens (~${LINE_COUNT} lines). Extract only what you need and discard the rest. Do not reference or repeat the full output — summarize the relevant parts."
}
EOF
  exit 0
fi

# ── Rule 2: MCP tool JSON bloat (>3KB of raw JSON) ──
if [[ "$TOOL_NAME" == mcp__* && $CHAR_COUNT -gt 3000 ]]; then
  cat << EOF
{
  "additionalContext": "MCP response is large (${CHAR_COUNT} chars). Use only the fields you need. Do not echo the full response back to the user."
}
EOF
  exit 0
fi

# ── Rule 3: Read without offset on large file (>5KB) ──
if [[ "$TOOL_NAME" == "Read" && $CHAR_COUNT -gt 5000 ]]; then
  HAS_OFFSET=$(echo "$INPUT" | jq -r '.tool_input.offset // ""' 2>/dev/null || echo "")
  if [[ -z "$HAS_OFFSET" ]]; then
    cat << EOF
{
  "additionalContext": "Full file read (${LINE_COUNT} lines). Next time use VFS for signatures first, then Read with offset/limit for specific functions. This saves ~60-98% tokens."
}
EOF
    exit 0
  fi
fi

exit 0
