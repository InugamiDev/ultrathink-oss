#!/usr/bin/env bash
# UltraThink Privacy Hook
# PreToolUse hook that checks file paths against blocked patterns.
# Receives JSON on stdin from Claude Code with tool_name and tool_input.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }
hook_log "privacy" "started"

# Read JSON input from stdin
INPUT="$(cat)"

# Extract tool name and file path from stdin JSON
TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)"

# If no file path, allow
if [[ -z "$FILE_PATH" ]]; then
  hook_log "privacy" "allowed"
  exit 0
fi

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
CKIGNORE_FILE="$PROJECT_ROOT/.ckignore"
LOG_DIR="$PROJECT_ROOT/reports"

# Resolve to absolute path
if [[ "$FILE_PATH" != /* ]]; then
  FILE_PATH="$(pwd)/$FILE_PATH"
fi

# Log function
log_event() {
  local severity="$1"
  local action="$2"
  local description="$3"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  mkdir -p "$LOG_DIR" 2>/dev/null || true
  echo "{\"timestamp\":\"$timestamp\",\"severity\":\"$severity\",\"action\":\"$action\",\"tool\":\"$TOOL_NAME\",\"path\":\"$FILE_PATH\",\"description\":\"$description\"}" \
    >> "$LOG_DIR/hook-events.jsonl" 2>/dev/null || true
}

# Built-in blocked patterns (always enforced)
BUILTIN_PATTERNS=(
  ".env"
  ".env.*"
  "*.pem"
  "*.key"
  "*.p12"
  "*.pfx"
  "*/credentials*"
  "*/secrets*"
  "*/tokens*"
  "*/.auth*"
  "*.keystore"
)

# Allow patterns (override blocks)
ALLOW_PATTERNS=(
  ".env.example"
  ".env.template"
  "*.example.*"
)

# Check if path matches a glob pattern
# Uses bash extglob for reliable pattern matching
matches_pattern() {
  local path="$1"
  local pattern="$2"
  local basename
  basename="$(basename "$path")"

  # Use [[ ]] with == for proper glob matching (no quoting on pattern side)
  if [[ "$basename" == $pattern ]]; then
    return 0
  fi

  if [[ "$path" == *$pattern* ]]; then
    return 0
  fi

  return 1
}

# Parse .ckignore once: split into allow overrides and block patterns
CKIGNORE_BLOCKS=()
if [[ -f "$CKIGNORE_FILE" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^! ]]; then
      ALLOW_PATTERNS+=("${line:1}")
    else
      CKIGNORE_BLOCKS+=("$line")
    fi
  done < "$CKIGNORE_FILE"
fi

# Check allow overrides first (built-in + .ckignore ! overrides)
# SECURITY: Only match against basename to prevent path traversal bypasses
# (e.g., a dir named ".env.example" should not whitelist files inside it)
FILE_BASENAME="$(basename "$FILE_PATH")"
for pattern in "${ALLOW_PATTERNS[@]}"; do
  if [[ "$FILE_BASENAME" == $pattern ]]; then
    log_event "info" "allowed" "Allow override matched basename: $pattern"
    exit 0
  fi
done

# Helper: log security incident to DB (fire-and-forget)
log_security_incident() {
  local title="$1"
  local description="$2"
  PRIV_HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ULTRA_ROOT="$(cd "$PRIV_HOOK_DIR/../.." && pwd)"
  if [[ -f "$ULTRA_ROOT/.env" ]]; then
    set -a; source "$ULTRA_ROOT/.env" 2>/dev/null; set +a
  fi
  if [[ -n "${DATABASE_URL:-}" ]]; then
    (cd "$ULTRA_ROOT" && npx tsx memory/scripts/memory-runner.ts log-security "$title" "$description" >/dev/null 2>&1) &
  fi
}

# Check built-in blocked patterns
for pattern in "${BUILTIN_PATTERNS[@]}"; do
  if matches_pattern "$FILE_PATH" "$pattern"; then
    log_event "warning" "blocked" "Built-in pattern matched: $pattern"
    hook_log "privacy" "blocked" "$FILE_PATH"
    log_security_incident "Sensitive file access blocked" "$TOOL_NAME attempted access to $FILE_PATH (pattern: $pattern)"
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Access to " + $path + " denied by UltraThink privacy hook (pattern: " + $pattern + ")")
      }
    }' --arg path "$FILE_PATH" --arg pattern "$pattern"
    exit 0
  fi
done

# Check .ckignore block patterns
for line in ${CKIGNORE_BLOCKS[@]+"${CKIGNORE_BLOCKS[@]}"}; do
  if matches_pattern "$FILE_PATH" "$line"; then
    log_event "warning" "blocked" "ckignore pattern matched: $line"
    hook_log "privacy" "blocked" "$FILE_PATH"
    log_security_incident "ckignore file access blocked" "$TOOL_NAME attempted access to $FILE_PATH (ckignore: $line)"
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Access to " + $path + " denied by .ckignore (pattern: " + $pattern + ")")
      }
    }' --arg path "$FILE_PATH" --arg pattern "$line"
    exit 0
  fi
done

# Path is allowed — exit cleanly (no output = allow)
hook_log "privacy" "allowed"
exit 0
