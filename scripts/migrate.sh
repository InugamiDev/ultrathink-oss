#!/usr/bin/env bash
# Run UltraThink database migrations
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Copy .env.example to .env and add your Neon connection string."
  exit 1
fi

echo "Running UltraThink migrations..."
echo ""

cd "$PROJECT_ROOT/memory"

# Check if tsx is available
if ! npx tsx --version &>/dev/null; then
  echo "Installing tsx..."
  npm install
fi

npx tsx scripts/migrate.ts

echo ""
echo "Migrations complete."
echo ""
echo "Optional: Run 'npm run seed' to add sample data."
