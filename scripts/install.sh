#!/usr/bin/env bash
# intent: UltraThink OSS installer — deploys to ~/.claude/ + ~/.ultrathink/
# status: done
# confidence: high
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ULTRA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CLAUDE_DIR="$HOME/.claude"
readonly ULTRA_DATA="$HOME/.ultrathink"

readonly RED='\033[0;31m'   GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m' BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'   BOLD='\033[1m'
readonly NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()  { echo -e "\n${CYAN}${BOLD}[$1/$TOTAL_STEPS]${NC} $2"; }

TOTAL_STEPS=7

# ── Parse args ──
DB_URL=""
VAULT_PATH="$ULTRA_DATA/vault"
UNINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --uninstall) UNINSTALL=true ;;
    --db=*) DB_URL="${arg#*=}" ;;
    --vault=*) VAULT_PATH="${arg#*=}" ;;
    --help|-h)
      echo "Usage: install.sh [--db=postgres://...] [--vault=path]"
      echo "       install.sh --uninstall"
      exit 0 ;;
  esac
done

# ── Uninstall ──
if $UNINSTALL; then
  log_info "Uninstalling UltraThink..."
  # Remove skill symlinks
  for link in "$CLAUDE_DIR/skills"/*/; do
    name="$(basename "$link")"
    [[ -L "$CLAUDE_DIR/skills/$name" ]] && rm "$CLAUDE_DIR/skills/$name"
  done
  [[ -L "$CLAUDE_DIR/skills/_registry.json" ]] && rm "$CLAUDE_DIR/skills/_registry.json"
  [[ -L "$CLAUDE_DIR/references" ]] && rm "$CLAUDE_DIR/references"
  [[ -L "$CLAUDE_DIR/agents" ]] && rm "$CLAUDE_DIR/agents"
  # Remove hook symlinks (both prefixed and direct)
  for hook in "$CLAUDE_DIR/hooks"/ultrathink-*; do
    [[ -L "$hook" ]] && rm "$hook"
  done
  log_ok "Removed symlinks from ~/.claude/"
  log_warn "~/.ultrathink/ data preserved. Remove manually if desired."
  log_warn "~/.claude/CLAUDE.md and settings.json not modified — edit manually."
  exit 0
fi

echo ""
log_info "Installing UltraThink ${BOLD}OSS${NC} tier"
log_info "Source: $ULTRA_ROOT"

# ── Step 1: Prerequisites ──
log_step 1 "Checking prerequisites"

if ! command -v claude &>/dev/null && ! command -v claude-code &>/dev/null; then
  log_warn "Claude Code CLI not found — install from https://claude.ai/download"
fi

NODE_V=$(node --version 2>/dev/null | sed 's/v//' || echo "0")
NODE_MAJOR=$(echo "$NODE_V" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  log_error "Node.js 18+ required (found: $NODE_V)"
  exit 1
fi
log_ok "Node.js $NODE_V"

if ! command -v jq &>/dev/null; then
  log_error "jq required — brew install jq"
  exit 1
fi
log_ok "jq available"

# ── Step 2: Create directories ──
log_step 2 "Creating directory structure"

mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/hooks"
mkdir -p "$ULTRA_DATA/forge/projects" "$ULTRA_DATA/decisions/projects"
mkdir -p "$VAULT_PATH/memories" "$VAULT_PATH/decisions" "$VAULT_PATH/_templates"

log_ok "~/.claude/ and ~/.ultrathink/ ready"

# ── Step 3: Symlink skills ──
log_step 3 "Linking skills"

skill_count=0
for skill_dir in "$ULTRA_ROOT/.claude/skills"/*/; do
  skill_name="$(basename "$skill_dir")"
  target="$CLAUDE_DIR/skills/$skill_name"
  if [[ -d "$target" && ! -L "$target" ]]; then
    log_warn "Skipping skill '$skill_name' — existing directory"
    continue
  fi
  ln -sf "$skill_dir" "$target"
  ((skill_count++))
done
ln -sf "$ULTRA_ROOT/.claude/skills/_registry.json" "$CLAUDE_DIR/skills/_registry.json"
log_ok "Linked $skill_count skills"

# ── Step 4: Symlink references + agents ──
log_step 4 "Linking references and agents"

# References
if [[ -d "$CLAUDE_DIR/references" && ! -L "$CLAUDE_DIR/references" ]]; then
  mv "$CLAUDE_DIR/references" "$CLAUDE_DIR/references.bak.$(date +%s)"
fi
ln -sf "$ULTRA_ROOT/.claude/references" "$CLAUDE_DIR/references"
ref_count=$(find "$ULTRA_ROOT/.claude/references/" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
log_ok "Linked $ref_count references"

# Agents
if [[ -d "$CLAUDE_DIR/agents" && ! -L "$CLAUDE_DIR/agents" ]]; then
  mv "$CLAUDE_DIR/agents" "$CLAUDE_DIR/agents.bak.$(date +%s)"
fi
ln -sf "$ULTRA_ROOT/.claude/agents" "$CLAUDE_DIR/agents"
log_ok "Linked agents"

# ── Step 5: Symlink hooks ──
log_step 5 "Linking hooks"

# OSS hooks
SHARED_HOOKS="privacy-hook.sh format-check.sh notify.sh memory-auto-save.sh"
SHARED_HOOKS+=" memory-session-start.sh memory-session-end.sh pre-compact.sh"
SHARED_HOOKS+=" prompt-analyzer.ts prompt-submit.sh hook-log.sh statusline.sh"
SHARED_HOOKS+=" suggest-compact.sh context-monitor.sh tool-observe.sh"
SHARED_HOOKS+=" agent-tracker-pre.sh progress-display.sh subagent-verify.sh"
SHARED_HOOKS+=" gsd-utils.sh post-edit-quality.sh registry-sync.sh"
SHARED_HOOKS+=" search-cap.sh vfs-enforce.sh"

hook_count=0
for hook in $SHARED_HOOKS; do
  src="$ULTRA_ROOT/.claude/hooks/$hook"
  [[ -f "$src" ]] || continue
  ln -sf "$src" "$CLAUDE_DIR/hooks/ultrathink-$hook"
  ((hook_count++))
done

log_ok "Linked $hook_count hooks"

# ── Step 6: Configure ──
log_step 6 "Writing configuration"

# UltraThink config
cat > "$ULTRA_DATA/config.json" << EOF
{
  "tier": "oss",
  "version": "2.0.0",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source_repo": "$ULTRA_ROOT",
  "vault_path": "$VAULT_PATH",
  "database_url": "${DB_URL:-}",
  "evaluator": {
    "use_playwright": false,
    "test_command": "npm run test",
    "build_command": "npm run build",
    "criteria_weights": {
      "functionality": 0.4,
      "design": 0.2,
      "craft": 0.2,
      "originality": 0.2
    },
    "pass_threshold": 0.7
  }
}
EOF
log_ok "Wrote ~/.ultrathink/config.json (tier=oss)"

# Write DB URL to .env if provided
if [[ -n "$DB_URL" ]]; then
  if [[ ! -f "$ULTRA_ROOT/.env" ]]; then
    echo "DATABASE_URL=$DB_URL" > "$ULTRA_ROOT/.env"
    log_ok "Wrote DATABASE_URL to .env"
  fi
fi

# CLAUDE.md — OSS identity
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"

if ! grep -q "UltraThink" "$CLAUDE_MD" 2>/dev/null; then
  cat >> "$CLAUDE_MD" << EOF

---

## UltraThink Integration (OSS tier)

UltraThink is your active agent harness. Skills in \`~/.claude/skills/<name>/SKILL.md\`.
Registry: \`~/.claude/skills/_registry.json\` ($skill_count skills across 4 layers).
References in \`~/.claude/references/\` — read on demand, not auto-loaded.
Data directory: \`~/.ultrathink/\` (vault, forge state, decisions).
EOF
  log_ok "Appended UltraThink section to CLAUDE.md"
else
  log_info "CLAUDE.md already has UltraThink section — skipping"
fi

# Merge hooks into settings.json
SETTINGS="$CLAUDE_DIR/settings.json"
if [[ ! -f "$SETTINGS" ]]; then
  echo '{}' > "$SETTINGS"
fi

if ! grep -q "ultrathink-privacy-hook" "$SETTINGS" 2>/dev/null; then
  HOOKS_JS="
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('$SETTINGS', 'utf-8'));
if (!s.hooks) s.hooks = {};

const add = (event, matcher, cmd, timeout) => {
  if (!s.hooks[event]) s.hooks[event] = [];
  const entry = { hooks: [{ type: 'command', command: cmd }] };
  if (matcher) entry.matcher = matcher;
  if (timeout) entry.hooks[0].timeout = timeout;
  s.hooks[event].push(entry);
};

add('SessionStart', null, '$HOME/.claude/hooks/ultrathink-memory-session-start.sh', 10000);
add('Stop', null, '$HOME/.claude/hooks/ultrathink-memory-session-end.sh', 5000);
add('PreToolUse', 'Read|Edit|Write', '$HOME/.claude/hooks/ultrathink-privacy-hook.sh');
add('PostToolUse', 'Edit|Write', '$HOME/.claude/hooks/ultrathink-format-check.sh');
add('PostToolUse', 'Bash|Grep|Glob', '$HOME/.claude/hooks/ultrathink-search-cap.sh');
add('PreCompact', null, '$HOME/.claude/hooks/ultrathink-pre-compact.sh', 10000);

fs.writeFileSync('$SETTINGS', JSON.stringify(s, null, 2) + '\n');
"
  node -e "$HOOKS_JS" 2>/dev/null && log_ok "Added hooks to settings.json" || log_warn "Could not merge hooks — add manually"
else
  log_info "settings.json already has UltraThink hooks — skipping"
fi

# Vault templates
cat > "$VAULT_PATH/_templates/memory.md" << 'EOF'
---
id: mem_{{id}}
type: memory
confidence: 0.8
importance: 5
scope: global
source: user
created: {{date}}
tags: []
---

# {{title}}

{{content}}

## Related
- [[]]
EOF

cat > "$VAULT_PATH/_templates/decision.md" << 'EOF'
---
id: dec_{{id}}
type: decision
priority: 5
scope: global
source: user
created: {{date}}
tags: []
---

# {{title}}

{{rule}}

## Context
Why this decision was made.

## Related
- [[]]
EOF

log_ok "Wrote vault templates"

# ── Step 7: Smoke test ──
log_step 7 "Running smoke test"

ERRORS=0

# Check skills linked
linked_skills=$(find "$CLAUDE_DIR/skills" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')
if [[ "$linked_skills" -gt 0 ]]; then
  log_ok "Skills: $linked_skills linked"
else
  log_error "No skills linked"
  ((ERRORS++))
fi

# Check registry valid JSON
if jq empty "$CLAUDE_DIR/skills/_registry.json" 2>/dev/null; then
  log_ok "Registry: valid JSON"
else
  log_error "Registry: invalid JSON"
  ((ERRORS++))
fi

# Check hooks linked
linked_hooks=$(find "$CLAUDE_DIR/hooks" -name "ultrathink-*" -type l 2>/dev/null | wc -l | tr -d ' ')
if [[ "$linked_hooks" -gt 0 ]]; then
  log_ok "Hooks: $linked_hooks linked"
else
  log_error "No hooks linked"
  ((ERRORS++))
fi

# Check vault directory
if [[ -d "$VAULT_PATH/memories" ]]; then
  log_ok "Vault: ready at $VAULT_PATH"
else
  log_error "Vault directory not created"
  ((ERRORS++))
fi

# Check DB if configured
if [[ -n "$DB_URL" ]]; then
  if cd "$ULTRA_ROOT" && timeout 5 npx tsx -e "
    const { neon } = require('@neondatabase/serverless');
    const sql = neon('$DB_URL');
    sql\`SELECT 1\`.then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null; then
    log_ok "Database: connected"
  else
    log_warn "Database: connection failed (memory will work when DB is available)"
  fi
fi

# Check config
if [[ -f "$ULTRA_DATA/config.json" ]]; then
  config_tier=$(jq -r '.tier' "$ULTRA_DATA/config.json")
  log_ok "Config: tier=$config_tier"
else
  log_error "Config not written"
  ((ERRORS++))
fi

echo ""
if [[ "$ERRORS" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  UltraThink OSS installed successfully!${NC}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${YELLOW}${BOLD}  UltraThink installed with $ERRORS warning(s)${NC}"
fi

echo ""
echo "  Skills:     $skill_count in ~/.claude/skills/"
echo "  Hooks:      $hook_count in ~/.claude/hooks/"
echo "  References: $ref_count in ~/.claude/references/"
echo "  Vault:      $VAULT_PATH"
echo "  Config:     $ULTRA_DATA/config.json"
echo ""
echo "  Open any project directory and run 'claude' — UltraThink is active."
if [[ -d "$VAULT_PATH" ]]; then
  echo "  Open $VAULT_PATH in Obsidian to browse your memory graph."
fi
echo ""
echo "  To uninstall: $0 --uninstall"
echo ""
