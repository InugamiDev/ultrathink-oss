#!/usr/bin/env bash
# intent: one-command Ultrathink Studio installer for alpha users
# status: done — clones OSS, installs deps, builds Studio, symlinks .app
# next: pre-built .dmg from GitHub Releases when signing infrastructure is up
# confidence: medium — Studio is alpha; expect rough edges
#
# Usage (one-liner):
#   curl -fsSL https://raw.githubusercontent.com/InugamiDev/ultrathink-oss/main/scripts/install-studio.sh | bash
#
# Manual:
#   git clone https://github.com/InugamiDev/ultrathink-oss ~/ultrathink
#   cd ~/ultrathink && ./scripts/install-studio.sh
#
# What this does:
#   1. Validates prereqs (Node 22+, pnpm 9+, Rust 1.77+)
#   2. Clones or updates the OSS repo at $ULTRA_DIR (default ~/ultrathink)
#   3. pnpm install + builds the studio-engine + builds the Studio .app
#   4. Runs scripts/install.sh to symlink skills + hooks into ~/.claude
#   5. (macOS) symlinks the .app into /Applications/
#   6. Prints what to do next

set -uo pipefail

ULTRA_DIR="${ULTRA_DIR:-$HOME/ultrathink}"
OSS_REPO="${OSS_REPO:-https://github.com/InugamiDev/ultrathink-oss.git}"
SKIP_APP_BUILD="${SKIP_APP_BUILD:-0}"

# ── colour log helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log_step() { echo -e "\n${CYAN}${BOLD}▸${NC} ${BOLD}$*${NC}"; }
log_ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $*"; }
log_err()  { echo -e "  ${RED}✗${NC} $*" >&2; }

# ── prereqs ────────────────────────────────────────────────────────────────────
log_step "1/6 Checking prereqs"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_err "$1 not found. Install: $2"
    MISSING=1
  else
    log_ok "$1 $(command -v "$1")"
  fi
}

MISSING=0
need_cmd node    "https://nodejs.org/ (need v22+)"
need_cmd pnpm    "npm i -g pnpm  (or: corepack enable && corepack prepare pnpm@latest --activate)"
need_cmd git     "your OS package manager"

if [[ "$SKIP_APP_BUILD" = "0" ]]; then
  need_cmd cargo "https://rustup.rs  (rustup, then cargo; need Rust 1.77+)"
fi

# Node version check
NODE_MAJOR=$(node -v 2>/dev/null | sed -E 's/^v([0-9]+)\..*/\1/')
if [[ -n "${NODE_MAJOR:-}" && "$NODE_MAJOR" -lt 22 ]]; then
  log_warn "Node $NODE_MAJOR detected — Ultrathink wants 22+. Some packages may fail to install."
fi

if [[ "${MISSING:-0}" = "1" ]]; then
  log_err "Install the missing tools above, then re-run this script."
  exit 1
fi

# claude / codex CLI are optional — warn if both missing
if ! command -v claude >/dev/null 2>&1 && ! command -v codex >/dev/null 2>&1; then
  log_warn "Neither 'claude' nor 'codex' CLI found on PATH."
  log_warn "Studio will run via Anthropic API direct (you'll paste an sk-ant-… key in Settings)."
  log_warn "  Install claude:  curl -fsSL https://claude.ai/install.sh | bash"
  log_warn "  Install codex:   npm i -g @openai/codex"
fi

# ── clone or pull ──────────────────────────────────────────────────────────────
log_step "2/6 Source tree at $ULTRA_DIR"

if [[ -d "$ULTRA_DIR/.git" ]]; then
  log_ok "Repo already cloned — pulling latest"
  git -C "$ULTRA_DIR" pull --ff-only || log_warn "git pull failed; continuing with local tree"
else
  log_ok "Cloning $OSS_REPO"
  git clone "$OSS_REPO" "$ULTRA_DIR" || { log_err "clone failed"; exit 1; }
fi

cd "$ULTRA_DIR" || exit 1

# ── env scaffold ──────────────────────────────────────────────────────────────
log_step "3/6 Environment file"

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    log_ok "Created .env from .env.example"
  else
    touch .env
    log_warn "No .env.example found — created an empty .env"
  fi
  log_warn "Edit $ULTRA_DIR/.env and set:"
  log_warn "  DATABASE_URL=postgres://...neon.tech/...   ← required for memory graph"
  log_warn "  ANTHROPIC_API_KEY=sk-ant-...                ← only if no claude CLI"
else
  log_ok ".env already present"
fi

# ── install deps ──────────────────────────────────────────────────────────────
log_step "4/6 Installing pnpm workspace"
pnpm install --frozen-lockfile 2>&1 | tail -3 || {
  log_warn "frozen-lockfile failed — retrying without"
  pnpm install || { log_err "pnpm install failed"; exit 1; }
}
log_ok "Workspace installed"

# Build the studio-engine (Studio's Node sidecar)
pnpm --filter @inuverse/studio-engine build >/dev/null 2>&1 && log_ok "Built studio-engine"

# Run the project installer that symlinks skills + hooks into ~/.claude
if [[ -x scripts/install.sh ]]; then
  ./scripts/install.sh --yes >/dev/null 2>&1 \
    && log_ok "Linked skills + hooks into ~/.claude" \
    || log_warn "scripts/install.sh exited with errors — you may need to run it manually"
fi

# ── build Studio.app ──────────────────────────────────────────────────────────
log_step "5/6 Building Studio.app"

if [[ "$SKIP_APP_BUILD" = "1" ]]; then
  log_warn "SKIP_APP_BUILD=1 → skipping Tauri build. Run 'cd apps/studio && pnpm tauri:build' later."
else
  (
    cd apps/studio
    # Optional: load updater key if present (gitignored — not in fresh clones)
    if [[ -f .tauri-updater.key ]]; then
      export TAURI_SIGNING_PRIVATE_KEY="$(cat .tauri-updater.key)"
      export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
    fi
    pnpm tauri:build --bundles app 2>&1 | tail -3
  ) && log_ok "Studio.app built" || { log_err "Studio build failed — see output above"; exit 1; }
fi

# ── symlink .app into /Applications on macOS ──────────────────────────────────
APP_PATH="$ULTRA_DIR/apps/studio/src-tauri/target/release/bundle/macos/UltraThink Studio.app"

if [[ "$OSTYPE" == "darwin"* && -d "$APP_PATH" ]]; then
  log_step "6/6 Installing to /Applications"
  # Remove any stale link / .app at the destination, then symlink.
  if [[ -L "/Applications/UltraThink Studio.app" || -d "/Applications/UltraThink Studio.app" ]]; then
    rm -rf "/Applications/UltraThink Studio.app"
  fi
  ln -s "$APP_PATH" "/Applications/UltraThink Studio.app" \
    && log_ok "Symlinked to /Applications/UltraThink Studio.app" \
    || log_warn "Couldn't symlink (permission?) — open directly from $APP_PATH"
fi

# ── done ──────────────────────────────────────────────────────────────────────
echo
echo -e "${GREEN}${BOLD}✓ Ultrathink Studio installed${NC}"
echo
echo "  Source tree:  $ULTRA_DIR"
echo "  .app:         $APP_PATH"
echo
echo "Next steps:"
echo "  1. Edit $ULTRA_DIR/.env — set DATABASE_URL (and ANTHROPIC_API_KEY if no claude CLI)"
echo "  2. Open Studio:  open '$APP_PATH'"
echo "     macOS may say 'unidentified developer' — right-click → Open the first time."
echo "  3. Dashboard:    pnpm --filter dashboard dev  →  http://localhost:3333"
echo
echo "Update later:    cd $ULTRA_DIR && git pull && bash scripts/install-studio.sh"
echo "Uninstall:       rm -rf $ULTRA_DIR && rm -f '/Applications/UltraThink Studio.app'"
echo
