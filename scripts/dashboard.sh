#!/usr/bin/env bash
# Start the UltraThink dashboard
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DASHBOARD_DIR="$PROJECT_ROOT/dashboard"

# Load .env if exists and sync to dashboard/.env.local (Next.js reads from its own dir)
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  # Sync key vars to dashboard/.env.local so Next.js finds them regardless of how it's started
  grep -E '^(DATABASE_URL|DISCORD_WEBHOOK_URL|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|SLACK_WEBHOOK_URL)=' \
    "$PROJECT_ROOT/.env" > "$DASHBOARD_DIR/.env.local" 2>/dev/null || true
fi

PORT="${PORT:-3333}"

echo "Starting UltraThink Dashboard on port $PORT..."
echo ""

cd "$DASHBOARD_DIR"

# Check if dependencies are installed
if [[ ! -d "node_modules" ]]; then
  echo "Installing dashboard dependencies..."
  npm install
fi

# Start dev server
exec npm run dev
