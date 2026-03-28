# Install — Claude Code

Full integration: hooks, skills, memory, auto-trigger, statusline, dashboard.

## Prerequisites

- Node.js 18+
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- Neon Postgres account ([neon.tech](https://neon.tech), free tier works)

## macOS

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink

# Install deps, create .env, run migrations
./scripts/setup.sh

# Install into ~/.claude/ (hooks, skills, agents, references)
./scripts/init-global.sh
```

## Linux

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/init-global.sh
```

> Desktop notifications (`desktop-notify.sh`) use `notify-send`. Install: `sudo apt install libnotify-bin`

## Windows (WSL)

```bash
# Inside WSL2 (Ubuntu recommended)
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/init-global.sh
```

> Claude Code runs natively in WSL. The dashboard is accessible at `http://localhost:3333` from Windows browsers.

## Docker

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git
cd ultrathink-oss
docker build -t ultrathink .
docker run -p 3333:3333 -e DATABASE_URL="postgresql://..." ultrathink
```

## Verify

```bash
claude
# You should see the UltraThink statusline:
#   ultrathink · Opus 4.6 · session 0% · ...
#   ☸ 0 spins  0 memories

# Try: "explain how UltraThink hooks work"
```

## Start Dashboard

```bash
npm run dashboard:dev
# → http://localhost:3333
```

## Existing Project Integration

You don't need UltraThink inside your project. The global installer symlinks everything:

```bash
# Clone once to a permanent location
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink && ./scripts/setup.sh && ./scripts/init-global.sh

# Now run `claude` in ANY project — UltraThink is active globally
```

## Uninstall

```bash
cd ~/ultrathink && ./scripts/init-global.sh --uninstall
```
