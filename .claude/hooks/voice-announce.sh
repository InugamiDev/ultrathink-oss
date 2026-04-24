#!/usr/bin/env bash
# UltraThink Voice Announcement Hook (macOS Native TTS)
# Fires on Stop — announces project dirname + completion via macOS `say`.
# Format: "ai-agents/ultrathink. Done. ultrathink standing by."

set -eo pipefail

# Silence toggle — /voice off creates this flag file
if [[ -f "$HOME/.ultrathink/voice-disabled" ]]; then
  exit 0
fi

# macOS only — skip if `say` not available
if ! command -v say &>/dev/null; then
  exit 0
fi

# Read stdin (Stop hook receives JSON with session_id, cwd, etc.)
INPUT=$(cat 2>/dev/null || echo "{}")

# --- Resolve project dirname ---
# Try cwd from hook input, fall back to environment
CWD=$(echo "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || echo "")
[[ -z "$CWD" ]] && CWD="${ULTRATHINK_CWD:-${PWD:-}}"

# Extract last 2 path segments: "ai-agents/ultrathink"
if [[ -n "$CWD" ]]; then
  DIRNAME=$(echo "$CWD" | awk -F/ '{print $(NF-1)"/"$NF}')
else
  DIRNAME="ultrathink"
fi

# --- Build message ---
COMPLETIONS=("Done" "All set" "Wrapped up" "Finished" "Complete")
IDX=$(( 10#$(date +%S) % ${#COMPLETIONS[@]} ))
OPENER="${COMPLETIONS[$IDX]}"

MSG="${DIRNAME}. ${OPENER}. ultrathink standing by."

# Speak in background so we don't block shutdown
# Voice: Samantha (default macOS female), rate 180 (slightly fast, professional)
say -v Samantha -r 180 "$MSG" &

exit 0
