# Installation

Detailed installation guide covering all setup methods and configuration.

## Prerequisites

- Node.js 18+ and npm 9+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- A Neon Postgres database (free tier: [neon.tech](https://neon.tech))

## Automated Setup

The recommended approach uses the setup script:

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink

# Full setup: installs deps, creates .env, runs migrations, builds dashboard
./scripts/setup.sh
```

The setup script performs these steps:

1. Runs `npm install` at the root, `dashboard/`, and `memory/` directories
2. Creates `.env` from `.env.example` if it doesn't exist
3. Runs database migrations via `npm run migrate`
4. Builds the dashboard for production

## Manual Setup (Step by Step)

If you prefer manual control:

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink

# Install dependencies
npm install
cd dashboard && npm install && cd ..
cd memory && npm install && cd ..

# Create environment file
cp .env.example .env
# Edit .env with your DATABASE_URL from Neon

# Run migrations
npm run migrate

# (Optional) Seed sample data
npm run seed
```

## Global Installation

The global installer symlinks UltraThink's hooks, skills, agents, and references into `~/.claude/` so every Claude Code session has UltraThink capabilities:

```bash
./scripts/init-global.sh
```

This creates symlinks for:

- `.claude/hooks/` -- All lifecycle hooks
- `.claude/skills/` -- 125+ skill definitions
- `.claude/agents/` -- 10 specialized agent roles
- `.claude/references/` -- Behavioral rules and guidelines

### Uninstalling

```bash
./scripts/init-global.sh --uninstall
```

This removes all symlinks from `~/.claude/` without affecting your project.

## Environment Variables

Create a `.env` file at the project root:

```bash
# Required
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require

# Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3333
PORT=3333

# Optional -- Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run migrate` | Run all pending database migrations |
| `npm run seed` | Populate sample data |
| `npm run dashboard:dev` | Start dashboard dev server (port 3333) |
| `npm run dashboard:build` | Production build of dashboard |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | TypeScript validation |
| `npm run test` | Vitest test suite |

## Verifying the Installation

```bash
# Start Claude Code in any project
claude

# You should see the UltraThink statusline
# Test a skill trigger: "explain how hooks work"
# Test memory: "what do you remember about this project?"
```
