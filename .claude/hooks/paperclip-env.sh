#!/usr/bin/env bash
# UltraThink × Paperclip — Environment Bridge Hook
# Fires on SessionStart. If Paperclip-injected env vars are present, emits
# additionalContext describing the wake reason, issue, and approval state so
# UltraThink starts each heartbeat with full Paperclip context.
#
# When no PAPERCLIP_* vars are set, exits silently with empty {} — UltraThink
# solo mode unchanged.

set -euo pipefail
umask 077

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "paperclip-env" "started"

# If we're not running inside a Paperclip heartbeat, no-op.
if [[ -z "${PAPERCLIP_AGENT_ID:-}" && -z "${PAPERCLIP_TASK_ID:-}" && -z "${PAPERCLIP_RUN_ID:-}" ]]; then
  echo '{}'
  exit 0
fi

# Build a structured context block. Paperclip's own skill teaches the agent
# how to act on these vars; this hook just surfaces them as additionalContext
# so the agent doesn't have to spend tokens parsing env at runtime.
CONTEXT=$(cat <<EOF
## Paperclip Heartbeat Context

You are running inside a Paperclip heartbeat. The following env vars are set:

- **Agent ID**: ${PAPERCLIP_AGENT_ID:-<not set>}
- **Company ID**: ${PAPERCLIP_COMPANY_ID:-<not set>}
- **Run ID**: ${PAPERCLIP_RUN_ID:-<not set>}
- **API URL**: ${PAPERCLIP_API_URL:-<not set>}
- **Task / Issue ID**: ${PAPERCLIP_TASK_ID:-<none — pick from inbox>}
- **Wake Reason**: ${PAPERCLIP_WAKE_REASON:-<unspecified>}
- **Wake Comment ID**: ${PAPERCLIP_WAKE_COMMENT_ID:-<none>}
- **Approval ID**: ${PAPERCLIP_APPROVAL_ID:-<none>}
- **Approval Status**: ${PAPERCLIP_APPROVAL_STATUS:-<n/a>}
- **Linked Issues**: ${PAPERCLIP_LINKED_ISSUE_IDS:-<none>}

Follow the **paperclip** skill's Heartbeat Procedure. If \`PAPERCLIP_TASK_ID\` is set, skip the inbox lookup and go straight to Step 5 (Checkout). Always include \`-H 'X-Paperclip-Run-Id: \$PAPERCLIP_RUN_ID'\` on mutating API calls.

If \`PAPERCLIP_WAKE_PAYLOAD_JSON\` is set, inspect that payload first — it contains the inline comment batch and bypasses thread re-fetch.
EOF
)

# Detect wake-payload JSON and surface a hint without dumping full payload here
# (the payload can be large; agent reads it directly from env when needed).
if [[ -n "${PAPERCLIP_WAKE_PAYLOAD_JSON:-}" ]]; then
  PAYLOAD_BYTES=${#PAPERCLIP_WAKE_PAYLOAD_JSON}
  CONTEXT+=$'\n\n'"**Wake payload available**: ${PAYLOAD_BYTES} bytes in \$PAPERCLIP_WAKE_PAYLOAD_JSON. Parse before fetching thread."
fi

# UltraThink integrator-role detection: agents named *-integrator inherit a
# specific lane (memory / code-intel / quality). This is a soft hint — the
# real role is enforced by Paperclip agent config.
if [[ -n "${PAPERCLIP_AGENT_TITLE:-}" ]]; then
  case "${PAPERCLIP_AGENT_TITLE,,}" in
    *memory-integrator*) CONTEXT+=$'\n\n'"**Role**: Memory Integrator. Owns memory_* tools. Reviews worker memories for quality, approves canonical patterns. Use \`memory_team_recall\` to audit cross-agent context." ;;
    *code-intel-integrator*) CONTEXT+=$'\n\n'"**Role**: Code-Intel Integrator. Owns vfs + code-intel tools. Routes issues by file expertise, blocks PRs that violate dep graph." ;;
    *quality-integrator*) CONTEXT+=$'\n\n'"**Role**: Quality Integrator. Owns lint/typecheck/test gates as Paperclip execution policies. Blocks merge on red signals." ;;
    *director*) CONTEXT+=$'\n\n'"**Role**: Director. Owns design docs + spec. Approves architecture, doesn't review every PR. Delegate via subtasks; enforce design-doc gate before worker checkout." ;;
  esac
fi

hook_log "paperclip-env" "context-built" "agent=${PAPERCLIP_AGENT_ID:-?} task=${PAPERCLIP_TASK_ID:-?} reason=${PAPERCLIP_WAKE_REASON:-?}"

# Emit Claude Code SessionStart hook output format.
jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
