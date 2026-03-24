# Self-Hosting

Three options for running UltraThink, depending on your needs.

## Option A: Local (recommended for development)

```bash
git clone https://github.com/InuVerse/ultrathink.git
cd ultrathink
./scripts/setup.sh

# Edit .env with your Neon DATABASE_URL
npm run migrate
npm run dashboard:dev
```

The dashboard runs at `http://localhost:3333`. All data stays on your machine -- only database queries go to Neon.

## Option B: Docker

```bash
docker build -t ultrathink .
docker run -p 3333:3333 \
  -e DATABASE_URL="postgresql://..." \
  ultrathink
```

The Dockerfile builds a production container with the dashboard and memory system.

## Option C: Existing project integration

You don't need to clone the full repo into every project. The global installer symlinks everything into `~/.claude/`:

```bash
# Clone once to a permanent location
git clone https://github.com/InuVerse/ultrathink.git ~/ultrathink

# Install globally
cd ~/ultrathink && ./scripts/setup.sh && ./scripts/init-global.sh

# Now every `claude` session has UltraThink capabilities
```

This approach:

- Keeps a single copy of UltraThink on your machine
- Symlinks hooks, skills, agents, and references into `~/.claude/`
- Works with any project directory -- just run `claude` as usual
- Updates by pulling the latest and re-running `init-global.sh`

## Database Requirements

UltraThink uses Neon Postgres with two extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram fuzzy search
```

Neon's free tier includes all three extensions and is sufficient for individual use.

## Uninstalling

```bash
# Remove global symlinks
./scripts/init-global.sh --uninstall

# Remove the project
rm -rf ~/ultrathink
```

Database tables remain on Neon until you delete the project there.
