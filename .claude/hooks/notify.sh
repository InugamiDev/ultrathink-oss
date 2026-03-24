#!/usr/bin/env bash
# UltraThink Notification Hook
# Dispatches notifications to configured channels (Telegram, Discord, Slack)

set -euo pipefail

MESSAGE="${1:-}"
CHANNEL="${2:-all}"  # telegram, discord, slack, or all
PRIORITY="${3:-normal}"  # low, normal, high, critical

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
CONFIG_FILE="$PROJECT_ROOT/.claude/ck.json"
LOG_DIR="$PROJECT_ROOT/reports"

log_event() {
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$LOG_DIR"
  jq -n \
    --arg timestamp "$timestamp" \
    --arg channel "$CHANNEL" \
    --arg priority "$PRIORITY" \
    --arg message "${MESSAGE:0:100}" \
    '{"timestamp":$timestamp,"hook":"notify","channel":$channel,"priority":$priority,"message":$message}' \
    >> "$LOG_DIR/hook-events.jsonl"
}

if [[ -z "$MESSAGE" ]]; then
  echo "Usage: notify.sh <message> [channel] [priority]" >&2
  exit 1
fi

# Load config
if [[ ! -f "$CONFIG_FILE" ]]; then
  log_event "Config file not found, skipping notifications"
  exit 0
fi

# Format message with priority prefix
case "$PRIORITY" in
  critical) PREFIX="[CRITICAL]" ;;
  high)     PREFIX="[HIGH]" ;;
  normal)   PREFIX="" ;;
  low)      PREFIX="[low]" ;;
  *)        PREFIX="" ;;
esac

FORMATTED_MSG="$PREFIX UltraThink: $MESSAGE"

# Send to Telegram
send_telegram() {
  local token
  local chat_id
  token=$(jq -r '.notifications.telegram.token // empty' "$CONFIG_FILE" 2>/dev/null)
  chat_id=$(jq -r '.notifications.telegram.chatId // empty' "$CONFIG_FILE" 2>/dev/null)

  if [[ -n "$token" && -n "$chat_id" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${token}/sendMessage" \
      --data-urlencode "chat_id=${chat_id}" \
      --data-urlencode "text=${FORMATTED_MSG}" \
      --data-urlencode "parse_mode=Markdown" \
      >/dev/null 2>&1 || true
    log_event "Sent to Telegram"
  fi
}

# Send to Discord — rich embeds with color/title/fields/timestamp
send_discord() {
  local webhook_url
  webhook_url=$(jq -r '.notifications.discord // empty' "$CONFIG_FILE" 2>/dev/null)

  # Also check DISCORD_WEBHOOK_URL from environment / .env
  if [[ -z "$webhook_url" ]]; then
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
      webhook_url=$(grep -E '^DISCORD_WEBHOOK_URL=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
  fi

  if [[ -n "$webhook_url" ]]; then
    # Determine embed color based on priority
    local embed_color
    case "$PRIORITY" in
      critical) embed_color=15548997 ;;  # #ED4245 red
      high)     embed_color=16776960 ;;  # #FFFF00 yellow
      normal)   embed_color=16098851 ;;  # #F59E0B amber
      low)      embed_color=5793266 ;;   # #586AF2 blue
      *)        embed_color=16098851 ;;
    esac

    local timestamp
    timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    # Build embed JSON safely (jq --arg handles escaping quotes/newlines)
    local embed_json
    embed_json=$(jq -n \
      --arg title "UltraThink ${PREFIX}" \
      --arg description "$MESSAGE" \
      --argjson color "$embed_color" \
      --arg timestamp "$timestamp" \
      --arg priority "$PRIORITY" \
      --arg channel "$CHANNEL" \
      '{
        embeds: [{
          title: $title,
          description: $description,
          color: $color,
          timestamp: $timestamp,
          footer: { text: "UltraThink Memory Brain" },
          fields: [
            { name: "Priority", value: $priority, inline: true },
            { name: "Channel",  value: $channel,  inline: true }
          ]
        }]
      }')

    curl -s -X POST "$webhook_url" \
      -H "Content-Type: application/json" \
      -d "$embed_json" \
      >/dev/null 2>&1 || true
    log_event "Sent rich embed to Discord"
  fi
}

# Send to Slack
send_slack() {
  local webhook_url
  webhook_url=$(jq -r '.notifications.slack // empty' "$CONFIG_FILE" 2>/dev/null)

  if [[ -n "$webhook_url" ]]; then
    local slack_json
    slack_json=$(jq -n --arg text "$FORMATTED_MSG" '{"text": $text}')
    curl -s -X POST "$webhook_url" \
      -H "Content-Type: application/json" \
      -d "$slack_json" \
      >/dev/null 2>&1 || true
    log_event "Sent to Slack"
  fi
}

# Dispatch based on channel
case "$CHANNEL" in
  telegram) send_telegram ;;
  discord)  send_discord ;;
  slack)    send_slack ;;
  all)
    send_telegram
    send_discord
    send_slack
    ;;
  *)
    echo "Unknown channel: $CHANNEL" >&2
    exit 1
    ;;
esac

exit 0
