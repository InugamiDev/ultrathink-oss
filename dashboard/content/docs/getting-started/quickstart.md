# Quickstart

Get UltraThink running in under 5 minutes.

## Prerequisites

- **Node.js 18+** and npm
- **Claude Code** CLI installed (`npm install -g @anthropic-ai/claude-code`)
- **Neon Postgres** account (free tier works) -- [neon.tech](https://neon.tech)

## Install

```bash
# Clone the repo
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink

# Run setup (installs deps, creates .env, runs migrations)
./scripts/setup.sh

# Install globally into ~/.claude/ (hooks, skills, agents)
./scripts/init-global.sh
```

## Quick integration into an existing project

```bash
# From any project directory:
/path/to/ultrathink/scripts/init-global.sh

# This symlinks skills, hooks, agents, and references into ~/.claude/
# Every Claude Code session now has UltraThink capabilities
```

## Verify installation

```bash
# Start Claude Code in any project
claude

# You should see the UltraThink statusline with memory count, skills, and usage
# Try: "explain how UltraThink hooks work" — teaching mode should auto-activate
```

## Start the dashboard

```bash
npm run dashboard:dev
# Open http://localhost:3333
```

## What happens next?

Once installed, UltraThink works automatically:

```
You --> Claude Code --> UltraThink hooks fire --> Skills matched, memories recalled
                                                --> Context injected into Claude
                                                --> Better, personalized responses
```

- **Every prompt** is scored against 125+ skills in under 30ms
- **Relevant memories** are recalled at session start
- **Privacy hooks** block access to `.env`, `.pem`, and credential files
- **Quality gates** auto-format on edit, validate JSON and shell syntax
