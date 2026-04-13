#!/usr/bin/env bash
# UltraThink Voice Announcement Hook (ElevenLabs TTS)
# Fires on Stop — announces session-specific task completion via ElevenLabs TTS.
# Context-aware: reads compact state to know what was worked on.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/hook-log.sh" 2>/dev/null || hook_log() { :; }

# Silence toggle — /voice off creates this flag file.
# Respected before any work, so disabling is instant and zero-overhead.
if [[ -f "$HOME/.ultrathink/voice-disabled" ]]; then
  hook_log "voice-announce" "skip" "disabled (/voice off)"
  exit 0
fi

# Read stdin (Stop hook receives JSON with session_id, etc.)
INPUT=$(cat 2>/dev/null || echo "{}")

# Resolve UltraThink project root
HOOK_SOURCE="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
HOOK_DIR="$(cd "$(dirname "$HOOK_SOURCE")" && pwd)"
ULTRA_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"

# Load .env
if [[ -f "$ULTRA_ROOT/.env" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    export "$key"="$value"
  done < "$ULTRA_ROOT/.env"
fi

# ElevenLabs API key — try multiple env var names
API_KEY="${ELEVENLABS_API_KEY:-${AGORA_ELEVENLABS_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  hook_log "voice-announce" "skip" "no API key"
  exit 0
fi

# Voice config (defaults to "Matilda" — warm, clear female voice)
VOICE_ID="${ELEVENLABS_VOICE_ID:-${AGORA_ELEVENLABS_VOICE_ID:-XrExE9yKIg1WjnnlVkGX}}"
MODEL_ID="${ELEVENLABS_MODEL_ID:-${AGORA_ELEVENLABS_MODEL_ID:-eleven_flash_v2_5}}"

# --- Session context ---
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")
CC_SID=$(echo "$SESSION_ID" | head -c 12)

# Try to read what was worked on from compact state
TASK_CONTEXT=""
STATE_DIR="/tmp/ultrathink-compact-state"
if [[ -n "$SESSION_ID" && -f "$STATE_DIR/$SESSION_ID.json" ]]; then
  TASK_CONTEXT=$(jq -r '.last_task // ""' "$STATE_DIR/$SESSION_ID.json" 2>/dev/null || echo "")
fi

# Truncate task context to keep TTS short (max ~80 chars)
if [[ ${#TASK_CONTEXT} -gt 80 ]]; then
  TASK_CONTEXT="${TASK_CONTEXT:0:77}..."
fi

# --- Build message ---
# Short, varied, session-specific. Always ends with "UltraThink standing by."
COMPLETIONS=(
  "Done."
  "All set."
  "Wrapped up."
  "Finished."
  "Complete."
)
# Pick one based on seconds (pseudo-random, no external deps)
IDX=$(( 10#$(date +%S) % ${#COMPLETIONS[@]} ))
OPENER="${COMPLETIONS[$IDX]}"

if [[ -n "$TASK_CONTEXT" ]]; then
  # Context-aware: "{task}. Done. UltraThink standing by."
  MSG="${TASK_CONTEXT}. ${OPENER} UltraThink standing by."
else
  # No context: "Done. UltraThink standing by."
  MSG="${OPENER} UltraThink standing by."
fi

# Generate and play TTS in background so we don't block shutdown
(
  AUDIO_FILE=$(mktemp /tmp/ultrathink-tts-XXXXXX.mp3)
  trap 'rm -f "$AUDIO_FILE"' EXIT

  # Call ElevenLabs TTS API
  HTTP_CODE=$(curl -s -w "%{http_code}" -o "$AUDIO_FILE" \
    -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
    -H "xi-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg text "$MSG" \
      --arg model_id "$MODEL_ID" \
      '{
        text: $text,
        model_id: $model_id,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      }')" \
    2>/dev/null)

  if [[ "$HTTP_CODE" == "200" && -s "$AUDIO_FILE" ]]; then
    if command -v afplay &>/dev/null; then
      afplay "$AUDIO_FILE" 2>/dev/null
    elif command -v ffplay &>/dev/null; then
      ffplay -nodisp -autoexit "$AUDIO_FILE" 2>/dev/null
    fi
    hook_log "voice-announce" "played" "chars=${#MSG}"
  else
    hook_log "voice-announce" "error" "http=$HTTP_CODE"
  fi
) &

exit 0
