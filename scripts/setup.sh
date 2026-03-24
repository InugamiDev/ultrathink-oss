#!/usr/bin/env bash
# UltraThink — One-command setup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=================================="
echo "  UltraThink Setup"
echo "  Claude Workflow OS v1.0.0"
echo "=================================="
echo ""

cd "$PROJECT_ROOT"

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  ERROR: Node.js is required. Install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
  echo "  ERROR: Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi
echo "  Node.js $(node -v) — OK"

if ! command -v npm &>/dev/null; then
  echo "  ERROR: npm is required"
  exit 1
fi
echo "  npm $(npm -v) — OK"

# Step 2: Environment file
echo ""
echo "Step 2: Environment configuration..."

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
    echo "  IMPORTANT: Edit .env and add your DATABASE_URL"
  else
    echo "  WARNING: No .env.example found"
  fi
else
  echo "  .env already exists — OK"
fi

# Step 3: Install dependencies
echo ""
echo "Step 3: Installing dependencies..."

npm install
echo "  Root dependencies — OK"

cd dashboard
npm install
echo "  Dashboard dependencies — OK"
cd ..

cd memory
npm install
echo "  Memory dependencies — OK"
cd ..

# Step 4: Make hooks executable
echo ""
echo "Step 4: Configuring hooks..."

chmod +x .claude/hooks/*.sh 2>/dev/null || true
echo "  Hook scripts — OK"

chmod +x scripts/*.sh 2>/dev/null || true
echo "  Setup scripts — OK"

# Step 5: Verify skill files
echo ""
echo "Step 5: Verifying skill files..."

SKILL_COUNT=$(find .claude/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $SKILL_COUNT skill files"

# Step 6: Verify agent files
AGENT_COUNT=$(find .claude/agents -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $AGENT_COUNT agent files"

# Step 7: Verify reference files (behavioral rules)
REF_COUNT=$(find .claude/references -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $REF_COUNT reference files"

# Step 8: Database migration (optional)
echo ""
echo "Step 6: Database..."

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "  DATABASE_URL detected. Running migrations..."
  cd memory && npx tsx scripts/migrate.ts && cd ..
  echo "  Migrations — OK"
else
  echo "  DATABASE_URL not set — skipping migrations"
  echo "  Run 'npm run migrate' after configuring .env"
fi

# Done
echo ""
echo "=================================="
echo "  Setup Complete!"
echo "=================================="
echo ""
echo "  Next steps:"
echo "  1. Edit .env with your Neon DATABASE_URL"
echo "  2. Run: npm run migrate"
echo "  3. Run: npm run dashboard:dev"
echo "  4. Open: http://localhost:3333"
echo ""
echo "  Recommended: Add to your shell profile (~/.zshrc or ~/.bashrc):"
echo "    export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=80"
echo ""
