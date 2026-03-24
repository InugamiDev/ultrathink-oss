#!/usr/bin/env bash
set -euo pipefail

# memory-auto-save.sh — PostToolUse hook for auto-memory creation.
# Fires after Edit/Write/Bash tool calls.
#
# NOISE REDUCTION: Only auto-captures meaningful events:
# - Bash errors (exit_status != 0) — save command + error output
# - Schema/config/migration changes — architectural changes only
# - New file creation (Write tool) — first edit to a new file
# For everything else, Claude writes memories intentionally via `save` command.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // "{}"')
TOOL_OUTPUT=$(echo "$INPUT" | jq -r '.tool_output // ""')

# Only process Edit, Write, Bash
case "$TOOL_NAME" in
  Edit|Write|Bash) ;;
  *) echo '{}'; exit 0 ;;
esac

MEMORIES_DIR="/tmp/ultrathink-memories"
mkdir -p "$MEMORIES_DIR"

PROJECT_SCOPE=$(pwd | rev | cut -d'/' -f1-2 | rev)
PROJECT_ROOT=$(pwd)

# Read session ID from session-scoped file
SESSION_ID=""
CC_SID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null | head -c 12)
if [[ -n "$CC_SID" && -f "/tmp/ultrathink-session-${CC_SID}" ]]; then
  SESSION_ID=$(cat "/tmp/ultrathink-session-${CC_SID}" 2>/dev/null || true)
elif [[ -f /tmp/ultrathink-session-id ]]; then
  SESSION_ID=$(cat /tmp/ultrathink-session-id 2>/dev/null || true)
fi

TIMESTAMP=$(date +%s)
TOOL_LOWER=$(echo "$TOOL_NAME" | tr '[:upper:]' '[:lower:]')

# Convert absolute path to project-relative
rel_path() {
  local abs="$1"
  echo "${abs#${PROJECT_ROOT}/}"
}

case "$TOOL_NAME" in
  Edit|Write)
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // ""')
    if [[ -z "$FILE_PATH" ]]; then
      echo '{}'; exit 0
    fi

    # Skip noise: lock files, build output, node_modules, .next, dist
    case "$FILE_PATH" in
      *node_modules/*|*.next/*|*dist/*|*build/*|*.lock|*lock.json|*.min.js|*.min.css)
        echo '{}'; exit 0 ;;
    esac

    # NOISE REDUCTION: Only save for architectural files
    # Skip regular component/page/style edits — those are just normal work
    SHOULD_SAVE=false
    CATEGORY="architecture"
    IMPORTANCE=5

    case "$FILE_PATH" in
      *migration*|*.sql)        SHOULD_SAVE=true; IMPORTANCE=7 ;;
      *schema*|*model*)         SHOULD_SAVE=true; IMPORTANCE=6 ;;
      *.env*)                   SHOULD_SAVE=true; IMPORTANCE=6 ;;
      *CLAUDE.md|*SKILL.md)     SHOULD_SAVE=true; IMPORTANCE=5 ;;
      *registry*)               SHOULD_SAVE=true; IMPORTANCE=5 ;;
      *hook*|*middleware*)       SHOULD_SAVE=true; IMPORTANCE=5 ;;
      *.config.*|*config/*.*)   SHOULD_SAVE=true; IMPORTANCE=5 ;;
      *docker*|*Dockerfile*)    SHOULD_SAVE=true; IMPORTANCE=5 ;;
      *route*|*api/*)           SHOULD_SAVE=true; IMPORTANCE=5; CATEGORY="pattern" ;;
    esac

    # Write tool creating a NEW file — always interesting
    if [[ "$TOOL_NAME" == "Write" && ! -f "$FILE_PATH" ]]; then
      SHOULD_SAVE=true
      IMPORTANCE=5
      CATEGORY="pattern"
    fi

    if [[ "$SHOULD_SAVE" != "true" ]]; then
      echo '{}'; exit 0
    fi

    REL_PATH=$(rel_path "$FILE_PATH")
    SLUG=$(basename "$FILE_PATH" | tr '.' '-' | tr '[:upper:]' '[:lower:]')

    # Extract change context from Edit tool
    CHANGE_CTX=""
    if [[ "$TOOL_NAME" == "Edit" ]]; then
      OLD_STR=$(echo "$TOOL_INPUT" | jq -r '.old_string // ""' 2>/dev/null | head -c 80)
      NEW_STR=$(echo "$TOOL_INPUT" | jq -r '.new_string // ""' 2>/dev/null | head -c 80)
      if [[ -n "$OLD_STR" && -n "$NEW_STR" ]]; then
        CHANGE_CTX=" — changed '${OLD_STR}' → '${NEW_STR}'"
      fi
    fi

    # Dedup: skip if a memory with the same slug was written in the last 60 seconds
    if find "$MEMORIES_DIR" -name "*-${SLUG}.json" -mmin -1 2>/dev/null | grep -q .; then
      echo '{}'; exit 0
    fi

    jq -n \
      --arg content "Modified ${REL_PATH}${CHANGE_CTX}" \
      --arg category "$CATEGORY" \
      --argjson importance "$IMPORTANCE" \
      --arg scope "$PROJECT_SCOPE" \
      --arg source "auto-memory-$TOOL_LOWER" \
      --arg session_id "$SESSION_ID" \
      --arg slug "$SLUG" \
      --arg tool "$TOOL_LOWER" \
      '{
        content: $content,
        category: $category,
        importance: $importance,
        confidence: 0.7,
        scope: $scope,
        source: $source,
        session_id: $session_id,
        tags: ["#auto", ("#" + $tool), ("#" + $slug)]
      }' > "$MEMORIES_DIR/${TIMESTAMP}-${SLUG}.json"
    ;;

  Bash)
    COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""')
    EXIT_STATUS=$(echo "$INPUT" | jq -r '.tool_result.exit_status // 0' 2>/dev/null || echo "0")

    # NOISE REDUCTION: Only save bash errors and high-impact commands
    SHOULD_SAVE=false
    BASH_CATEGORY="solution"
    BASH_IMPORTANCE=4

    # Always save errors (non-zero exit)
    if [[ "$EXIT_STATUS" != "0" && "$EXIT_STATUS" != "null" ]]; then
      SHOULD_SAVE=true
      BASH_IMPORTANCE=6
      BASH_CATEGORY="error"
    fi

    # Save high-impact commands
    case "$COMMAND" in
      *install*|*add*)                SHOULD_SAVE=true; BASH_IMPORTANCE=5; BASH_CATEGORY="architecture" ;;
      *deploy*|*push*|*publish*)      SHOULD_SAVE=true; BASH_IMPORTANCE=6; BASH_CATEGORY="architecture" ;;
      *migrate*|*seed*)               SHOULD_SAVE=true; BASH_IMPORTANCE=6; BASH_CATEGORY="architecture" ;;
      *docker*|*kubectl*)             SHOULD_SAVE=true; BASH_IMPORTANCE=5; BASH_CATEGORY="architecture" ;;
      *rm*-rf*|*drop*|*delete*table*) SHOULD_SAVE=true; BASH_IMPORTANCE=7; BASH_CATEGORY="architecture" ;;
    esac

    if [[ "$SHOULD_SAVE" != "true" ]]; then
      echo '{}'; exit 0
    fi

    CMD_TRUNC=$(echo "$COMMAND" | head -c 200)
    SLUG="bash-$(echo "$COMMAND" | head -c 30 | tr ' /:' '-' | tr -cd '[:alnum:]-')"

    # Include error output for failed commands
    ERROR_CTX=""
    if [[ "$EXIT_STATUS" != "0" && "$EXIT_STATUS" != "null" ]]; then
      ERROR_OUTPUT=$(echo "$TOOL_OUTPUT" | head -c 200)
      ERROR_CTX=" [exit=$EXIT_STATUS] ${ERROR_OUTPUT}"
    fi

    # Dedup: skip if a memory with the same slug was written in the last 60 seconds
    if find "$MEMORIES_DIR" -name "*-${SLUG}.json" -mmin -1 2>/dev/null | grep -q .; then
      echo '{}'; exit 0
    fi

    jq -n \
      --arg content "Ran command: ${CMD_TRUNC}${ERROR_CTX}" \
      --arg scope "$PROJECT_SCOPE" \
      --arg source "auto-memory-bash" \
      --arg session_id "$SESSION_ID" \
      --arg category "$BASH_CATEGORY" \
      --argjson importance "$BASH_IMPORTANCE" \
      '{
        content: $content,
        category: $category,
        importance: $importance,
        confidence: 0.6,
        scope: $scope,
        source: $source,
        session_id: $session_id,
        tags: ["#auto", "#bash"]
      }' > "$MEMORIES_DIR/${TIMESTAMP}-${SLUG}.json"
    ;;
esac

echo '{}'
