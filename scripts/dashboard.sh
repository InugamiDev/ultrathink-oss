#!/usr/bin/env bash
# Start the UltraThink dashboard
# intent: launch the dashboard through the canonical pnpm workspace package
# status: done
# next: keep package name aligned with apps/dashboard/package.json
# blockers: none
# confidence: high
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Dashboard moved to apps/dashboard/ during the workspace reorg. Keep the old
# root-level path as a fallback for any branch still using the prior layout.
if [[ -d "$PROJECT_ROOT/apps/dashboard" ]]; then
  DASHBOARD_DIR="$PROJECT_ROOT/apps/dashboard"
else
  DASHBOARD_DIR="$PROJECT_ROOT/dashboard"
fi

# Load .env if exists and sync to dashboard/.env.local (Next.js reads from its own dir)
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  # Restrict the dest file BEFORE writing secrets so a multi-user box can't
  # read API keys / webhook URLs through the default umask window.
  DEST_ENV="$DASHBOARD_DIR/.env.local"
  ( umask 077 && : > "$DEST_ENV" ) 2>/dev/null || true
  chmod 600 "$DEST_ENV" 2>/dev/null || true
  # Sync key vars to dashboard/.env.local so Next.js finds them regardless of how it's started
  grep -E '^(DATABASE_URL|DISCORD_WEBHOOK_URL|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|SLACK_WEBHOOK_URL|GROQ_API_KEY|AGORA_APP_ID|AGORA_APP_CERTIFICATE|AGORA_CUSTOMER_ID|AGORA_CUSTOMER_SECRET|AGORA_AGENT_UID|AGORA_CONVO_AI_BASE_URL|AGORA_LLM_URL|AGORA_LLM_API_KEY|AGORA_LLM_MODEL|AGORA_TTS_VENDOR|AGORA_ELEVENLABS_API_KEY|AGORA_MICROSOFT_TTS_KEY|AGORA_MICROSOFT_TTS_REGION)=' \
    "$PROJECT_ROOT/.env" > "$DEST_ENV" 2>/dev/null || true
  chmod 600 "$DEST_ENV" 2>/dev/null || true
fi

PORT="${PORT:-3333}"

echo "Starting UltraThink Dashboard on port $PORT..."
echo ""

cd "$DASHBOARD_DIR"

# Check if dependencies are installed
if [[ ! -d "node_modules" ]]; then
  echo "Installing dashboard dependencies..."
  pnpm install --filter @ultrathink/dashboard...
fi

# Start dev server
cd "$PROJECT_ROOT"
exec pnpm --filter @ultrathink/dashboard dev
