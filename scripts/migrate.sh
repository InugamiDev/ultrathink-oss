#!/usr/bin/env bash
# Run UltraThink database migrations
# intent: run memory migrations through the canonical pnpm workspace package
# status: done
# next: keep package name aligned with packages/memory/package.json
# blockers: none
# confidence: high
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

cd "$PROJECT_ROOT"

if [[ ! -d "node_modules" ]]; then
  echo "Installing memory workspace dependencies..."
  pnpm install --filter @ultrathink/memory...
fi

pnpm --filter @ultrathink/memory migrate

echo ""
echo "Migrations complete."
echo ""
echo "Optional: Run 'pnpm run seed' to add sample data."
