#!/usr/bin/env bash
# intent: UltraThink OSS installer — open source tier only
# status: done
# confidence: high
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ULTRA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CLAUDE_DIR="$HOME/.claude"
readonly ULTRA_DATA="$HOME/.ultrathink"
readonly VERSION="3.0.0"
readonly TIER="oss"
readonly TIER_UPPER="OSS"

readonly RED='\033[0;31m'   GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m' BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'   BOLD='\033[1m'
readonly NC='\033[0m'

# ── Logging ──
log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()  { echo -e "\n${CYAN}${BOLD}[$1/$TOTAL_STEPS]${NC} $2"; }
log_dry()   { echo -e "${YELLOW}[DRY]${NC}  $*"; }

TOTAL_STEPS=8

# ── Dry-run helpers ──
run_cmd() {
  if $DRY_RUN; then log_dry "would run: $*"; else "$@"; fi
}
dry_ln() {
  if $DRY_RUN; then log_dry "ln -sfn $1 -> $2"; else ln -sfn "$1" "$2"; fi
}
dry_mkdir() {
  if $DRY_RUN; then log_dry "mkdir -p $*"; else mkdir -p "$@"; fi
}
dry_rm() {
  if $DRY_RUN; then log_dry "rm $*"; else rm "$@"; fi
}

# ── OSS tier guard ──
guard_oss_only() {
  # Block if someone tries to force core tier on the OSS repo
  if [[ -f "$ULTRA_ROOT/scripts/upgrade-to-builder.sh" ]]; then
    log_error "This is the Core repo — use the Core installer instead"
    exit 1
  fi
}

# ── Parse args ──
DB_URL=""
VAULT_PATH="$ULTRA_DATA/vault"
UNINSTALL=false
UPDATE=false
DRY_RUN=false
NO_IDENTITY=false
AUTO_YES=false
NO_PULL=false

for arg in "$@"; do
  case "$arg" in
    --tier=core)
      log_error "Core tier is not available in UltraThink OSS."
      log_info "Get Core at: https://github.com/InugamiDev/ultrathink-core"
      exit 1 ;;
    --tier=oss)      ;; # accepted, no-op (already OSS)
    --db=*)          DB_URL="${arg#*=}" ;;
    --vault=*)       VAULT_PATH="${arg#*=}" ;;
    --uninstall)     UNINSTALL=true ;;
    --update)        UPDATE=true ;;
    --dry-run)       DRY_RUN=true ;;
    --no-identity)   NO_IDENTITY=true ;;
    --no-pull)       NO_PULL=true ;;
    --yes|-y)        AUTO_YES=true ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --db=URL          Neon Postgres connection string"
      echo "  --vault=PATH      Obsidian vault location (default: ~/.ultrathink/vault)"
      echo "  --no-identity     Skip adding UltraThink section to ~/.claude/CLAUDE.md"
      echo "  --no-pull         Skip auto-pull even if git repo is behind"
      echo "  --yes, -y         Auto-approve all prompts"
      echo "  --dry-run         Print what would be changed without modifying anything"
      echo "  --update          Pull latest changes and re-install"
      echo "  --uninstall       Remove UltraThink from ~/.claude/ and ~/.ultrathink/"
      echo "  --help, -h        Show this help"
      echo ""
      echo "This is UltraThink OSS. For Core features (Tekiō, Code Intelligence,"
      echo "Agent Identity, Decision Engine), see: https://github.com/InugamiDev/ultrathink-core"
      exit 0 ;;
    *)
      log_warn "Unknown option: $arg (ignored)" ;;
  esac
done

if $DRY_RUN; then
  echo ""
  log_warn "DRY RUN — no files will be modified"
fi

# ════════════════════════════════════════════════════════════════════════════
# ── UNINSTALL ──
# ════════════════════════════════════════════════════════════════════════════
if $UNINSTALL; then
  echo ""
  log_info "Uninstalling UltraThink OSS..."
  REMOVED=()

  # 1. Remove skill symlinks
  for link in "$CLAUDE_DIR/skills"/*/; do
    name="$(basename "$link")"
    if [[ -L "$CLAUDE_DIR/skills/$name" ]]; then
      dry_rm "$CLAUDE_DIR/skills/$name"
      REMOVED+=("skill: $name")
    fi
  done
  if [[ -L "$CLAUDE_DIR/skills/_registry.json" ]]; then
    dry_rm "$CLAUDE_DIR/skills/_registry.json"
    REMOVED+=("skills/_registry.json")
  fi

  # 2. Remove references + agents symlinks
  if [[ -L "$CLAUDE_DIR/references" ]]; then
    dry_rm "$CLAUDE_DIR/references"
    REMOVED+=("references/ symlink")
  fi
  if [[ -L "$CLAUDE_DIR/agents" ]]; then
    dry_rm "$CLAUDE_DIR/agents"
    REMOVED+=("agents/ symlink")
  fi

  # 3. Remove hook symlinks
  for hook in "$CLAUDE_DIR/hooks"/ultrathink-*; do
    if [[ -L "$hook" ]]; then
      dry_rm "$hook"
      REMOVED+=("hook: $(basename "$hook")")
    fi
  done

  # 4. Remove UltraThink section from CLAUDE.md
  CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
  if [[ -f "$CLAUDE_MD" ]] && grep -q "## UltraThink Integration" "$CLAUDE_MD" 2>/dev/null; then
    if $DRY_RUN; then
      log_dry "would remove UltraThink section from $CLAUDE_MD"
    else
      {
        in_ut_block=false
        found_separator=false
        separator_line=""
        while IFS= read -r line; do
          if [[ "$line" == "---" ]] && ! $in_ut_block; then
            separator_line="$line"
            found_separator=true
            continue
          fi
          if $found_separator; then
            if [[ -z "$line" ]]; then
              separator_line="${separator_line}"$'\n'"$line"
              continue
            elif [[ "$line" =~ ^"## UltraThink Integration" ]]; then
              in_ut_block=true
              found_separator=false
              separator_line=""
              continue
            else
              echo "$separator_line"
              echo "$line"
              found_separator=false
              separator_line=""
              continue
            fi
          fi
          if $in_ut_block; then
            if [[ "$line" =~ ^"## " ]] || [[ "$line" == "---" ]]; then
              in_ut_block=false
              echo "$line"
            fi
            continue
          fi
          echo "$line"
        done < "$CLAUDE_MD"
      } > "$CLAUDE_MD.clean"
      mv "$CLAUDE_MD.clean" "$CLAUDE_MD"
    fi
    REMOVED+=("UltraThink section from CLAUDE.md")
  fi

  # 5. Remove UltraThink hook entries from settings.json
  SETTINGS="$CLAUDE_DIR/settings.json"
  if [[ -f "$SETTINGS" ]] && grep -q "ultrathink-" "$SETTINGS" 2>/dev/null; then
    if $DRY_RUN; then
      log_dry "would remove UltraThink hooks from $SETTINGS"
    else
      cat > /tmp/ut-clean-hooks.js << 'CLEANJS'
const fs = require('fs');
const p = process.argv[2];
const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
if (s.hooks) {
  for (const event of Object.keys(s.hooks)) {
    s.hooks[event] = (s.hooks[event] || []).filter(entry => {
      if (entry.id && entry.id.startsWith('ut:')) return false;
      const cmds = (entry.hooks || []).map(h => h.command || '');
      return !cmds.some(c => c.includes('ultrathink-'));
    });
    if (s.hooks[event].length === 0) delete s.hooks[event];
  }
  if (Object.keys(s.hooks).length === 0) delete s.hooks;
}
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
CLEANJS
      node /tmp/ut-clean-hooks.js "$SETTINGS" 2>/dev/null && true
      rm -f /tmp/ut-clean-hooks.js
    fi
    REMOVED+=("UltraThink hooks from settings.json")
  fi

  # 6. Remove ~/.ultrathink/ (with confirmation)
  if [[ -d "$ULTRA_DATA" ]]; then
    if $DRY_RUN; then
      log_dry "would prompt to remove $ULTRA_DATA"
    elif $AUTO_YES; then
      rm -rf "$ULTRA_DATA"
      REMOVED+=("~/.ultrathink/ directory")
    else
      echo ""
      echo -en "  Remove ${BOLD}~/.ultrathink/${NC} (vault, config, decisions)? ${RED}This is irreversible.${NC} [y/N] "
      read -r confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        rm -rf "$ULTRA_DATA"
        REMOVED+=("~/.ultrathink/ directory")
      else
        log_info "Kept ~/.ultrathink/"
      fi
    fi
  fi

  echo ""
  if [[ ${#REMOVED[@]} -gt 0 ]]; then
    log_ok "Removed ${#REMOVED[@]} items:"
    for item in "${REMOVED[@]}"; do echo "    - $item"; done
  else
    log_info "Nothing to remove"
  fi
  echo ""
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# ── INSTALL / UPDATE ──
# ════════════════════════════════════════════════════════════════════════════

guard_oss_only

if $UPDATE; then
  echo ""
  log_info "Updating UltraThink OSS..."
fi

echo ""
log_info "Installing UltraThink ${BOLD}${TIER_UPPER}${NC}"
log_info "Source: $ULTRA_ROOT"

# ── Step 1: Auto-pull (if git repo) ──
log_step 1 "Checking for updates"

PULLED=false
if [[ -d "$ULTRA_ROOT/.git" ]] && command -v git &>/dev/null && ! $NO_PULL; then
  cd "$ULTRA_ROOT"
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

  if [[ -n "$CURRENT_BRANCH" ]]; then
    # Fetch latest without modifying working tree
    if $DRY_RUN; then
      log_dry "would run: git fetch origin $CURRENT_BRANCH"
    else
      git fetch origin "$CURRENT_BRANCH" 2>/dev/null || true
    fi

    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")
    REMOTE=$(git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || echo "")

    if [[ -n "$LOCAL" && -n "$REMOTE" && "$LOCAL" != "$REMOTE" ]]; then
      # Check if we're behind (remote has commits we don't)
      BEHIND=$(git rev-list --count HEAD.."origin/$CURRENT_BRANCH" 2>/dev/null || echo "0")
      if [[ "$BEHIND" -gt 0 ]]; then
        if $UPDATE || $AUTO_YES; then
          if $DRY_RUN; then
            log_dry "would run: git pull origin $CURRENT_BRANCH"
          else
            log_info "Pulling $BEHIND new commit(s)..."
            git pull origin "$CURRENT_BRANCH" --ff-only 2>/dev/null && PULLED=true || {
              log_warn "Fast-forward pull failed — you may have local changes"
              log_info "Run 'git pull' manually to resolve, then re-run installer"
            }
          fi
        else
          log_warn "$BEHIND update(s) available — run with --update to pull, or --no-pull to skip"
        fi
      else
        log_ok "Already up to date"
      fi
    else
      log_ok "Already up to date"
    fi
  else
    log_info "Not on a branch — skipping update check"
  fi
else
  if $NO_PULL; then
    log_info "Skipping update check (--no-pull)"
  elif [[ ! -d "$ULTRA_ROOT/.git" ]]; then
    log_info "Not a git repo — skipping update check"
  else
    log_info "git not available — skipping update check"
  fi
fi

if $PULLED; then
  log_ok "Updated to latest"
  # Re-read version if it changed
  if [[ -f "$ULTRA_ROOT/package.json" ]] && command -v node &>/dev/null; then
    NEW_VERSION=$(node -e "console.log(require('$ULTRA_ROOT/package.json').version || '3.0.0')" 2>/dev/null || echo "$VERSION")
    if [[ "$NEW_VERSION" != "$VERSION" ]]; then
      log_info "Version: $VERSION → $NEW_VERSION"
    fi
  fi
fi

# ── Step 2: Prerequisites ──
log_step 2 "Checking prerequisites"

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
  if [[ "$(uname)" == "Darwin" ]]; then
    log_error "jq required — brew install jq"
  else
    log_error "jq required — sudo apt install jq (Debian/Ubuntu) or sudo dnf install jq (Fedora)"
  fi
  exit 1
fi
log_ok "jq available"

# ── Step 3: Create directories ──
log_step 3 "Creating directory structure"

dry_mkdir "$CLAUDE_DIR/skills" "$CLAUDE_DIR/hooks"
dry_mkdir "$ULTRA_DATA/forge/projects" "$ULTRA_DATA/decisions/projects"
dry_mkdir "$VAULT_PATH/memories" "$VAULT_PATH/decisions" "$VAULT_PATH/_templates"

log_ok "~/.claude/ and ~/.ultrathink/ ready"

# ── Step 4: Symlink skills ──
log_step 4 "Linking skills"

skill_count=0
for skill_dir in "$ULTRA_ROOT/.claude/skills"/*/; do
  skill_name="$(basename "$skill_dir")"
  target="$CLAUDE_DIR/skills/$skill_name"
  if [[ -d "$target" && ! -L "$target" ]]; then
    log_warn "Skipping skill '$skill_name' — existing directory"
    continue
  fi
  dry_ln "$skill_dir" "$target"
  skill_count=$((skill_count+1))
done
dry_ln "$ULTRA_ROOT/.claude/skills/_registry.json" "$CLAUDE_DIR/skills/_registry.json"
log_ok "Linked $skill_count skills"

# ── Step 5: Symlink references + agents ──
log_step 5 "Linking references and agents"

if [[ -d "$CLAUDE_DIR/references" && ! -L "$CLAUDE_DIR/references" ]]; then
  run_cmd mv "$CLAUDE_DIR/references" "$CLAUDE_DIR/references.bak.$(date +%s)"
fi
dry_ln "$ULTRA_ROOT/.claude/references" "$CLAUDE_DIR/references"
ref_count=$(find "$ULTRA_ROOT/.claude/references/" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
log_ok "Linked $ref_count references"

if [[ -d "$CLAUDE_DIR/agents" && ! -L "$CLAUDE_DIR/agents" ]]; then
  run_cmd mv "$CLAUDE_DIR/agents" "$CLAUDE_DIR/agents.bak.$(date +%s)"
fi
dry_ln "$ULTRA_ROOT/.claude/agents" "$CLAUDE_DIR/agents"
log_ok "Linked agents"

# ── Step 6: Symlink hooks (OSS only — no Core hooks) ──
log_step 6 "Linking hooks"

# OSS hooks only — no Tekiō, no code-intel, no decision engine
OSS_HOOKS="privacy-hook.sh format-check.sh notify.sh memory-auto-save.sh"
OSS_HOOKS+=" memory-session-start.sh memory-session-end.sh pre-compact.sh"
OSS_HOOKS+=" prompt-analyzer.ts prompt-submit.sh hook-log.sh statusline.sh"
OSS_HOOKS+=" suggest-compact.sh context-monitor.sh tool-observe.sh"
OSS_HOOKS+=" agent-tracker-pre.sh progress-display.sh subagent-verify.sh"
OSS_HOOKS+=" gsd-utils.sh post-edit-quality.sh registry-sync.sh"
OSS_HOOKS+=" search-cap.sh vfs-enforce.sh"
OSS_HOOKS+=" gateguard.sh config-protection.sh batch-quality.sh hook-flags.sh"

# Core-only hooks that must NEVER be installed from OSS
# (even if files somehow exist in the repo)
CORE_ONLY_HOOKS="tool-failure-log.sh codeintel-session-check.sh post-edit-codeintel.sh"
CORE_ONLY_HOOKS+=" decision-inject.sh forge-hydrate.sh decision-extract.sh"
CORE_ONLY_HOOKS+=" decision-engine.ts builder-gate.sh builder-session.sh tekio-prevent.sh"

hook_count=0
IFS=' ' read -ra HOOK_ARR <<< "$OSS_HOOKS"
for hook in "${HOOK_ARR[@]}"; do
  src="$ULTRA_ROOT/.claude/hooks/$hook"
  [[ -f "$src" ]] || continue
  dry_ln "$src" "$CLAUDE_DIR/hooks/ultrathink-$hook"
  hook_count=$((hook_count+1))
done

# Safety: remove any Core hooks that might have been installed previously
IFS=' ' read -ra BLOCKED_ARR <<< "$CORE_ONLY_HOOKS"
for hook in "${BLOCKED_ARR[@]}"; do
  target="$CLAUDE_DIR/hooks/ultrathink-$hook"
  if [[ -L "$target" || -f "$target" ]]; then
    dry_rm "$target"
    log_warn "Removed Core-only hook: ultrathink-$hook (not available in OSS)"
  fi
done

log_ok "Linked $hook_count hooks (OSS tier)"

# ── Step 7: Configure ──
log_step 7 "Writing configuration"

if $DRY_RUN; then
  log_dry "write file: $ULTRA_DATA/config.json"
else
  cat > "$ULTRA_DATA/config.json" << EOF
{
  "tier": "$TIER",
  "version": "$VERSION",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source_repo": "$ULTRA_ROOT",
  "vault_path": "$VAULT_PATH",
  "database_url": "${DB_URL:-}"
}
EOF
fi
log_ok "Wrote ~/.ultrathink/config.json (tier=$TIER)"

# Write DB URL to .env if provided
if [[ -n "$DB_URL" ]]; then
  if [[ ! -f "$ULTRA_ROOT/.env" ]]; then
    if $DRY_RUN; then
      log_dry "write DATABASE_URL to .env"
    else
      echo "DATABASE_URL=$DB_URL" > "$ULTRA_ROOT/.env"
    fi
    log_ok "Wrote DATABASE_URL to .env"
  fi
fi

# CLAUDE.md — OSS identity (opt-in)
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
SKIP_IDENTITY=false

if $NO_IDENTITY; then
  SKIP_IDENTITY=true
  log_info "Skipping CLAUDE.md identity section (--no-identity)"
elif grep -q "UltraThink" "$CLAUDE_MD" 2>/dev/null; then
  SKIP_IDENTITY=true
  log_info "CLAUDE.md already has UltraThink section — skipping"
elif ! $AUTO_YES && ! $DRY_RUN; then
  echo ""
  echo -en "  Add UltraThink identity to ${BOLD}~/.claude/CLAUDE.md${NC}? [y/N] "
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    SKIP_IDENTITY=true
    log_info "Skipped CLAUDE.md identity section"
  fi
fi

if ! $SKIP_IDENTITY; then
  if $DRY_RUN; then
    log_dry "would append UltraThink section to $CLAUDE_MD"
  else
    cat >> "$CLAUDE_MD" << EOF

---

## UltraThink Integration ($TIER_UPPER tier)

UltraThink is your active agent harness. Skills in \`~/.claude/skills/<name>/SKILL.md\`.
Registry: \`~/.claude/skills/_registry.json\` ($skill_count skills across 4 layers).
References in \`~/.claude/references/\` — read on demand, not auto-loaded.
Data directory: \`~/.ultrathink/\` (vault, forge state, decisions).
EOF
  fi
  log_ok "Appended UltraThink section to CLAUDE.md"
fi

# Merge hooks into settings.json (OSS hooks only — no Core hook IDs)
SETTINGS="$CLAUDE_DIR/settings.json"
if ! $DRY_RUN; then
  [[ -f "$SETTINGS" ]] || echo '{}' > "$SETTINGS"
fi

if $DRY_RUN; then
  log_dry "would add UltraThink hooks to $SETTINGS"
else
  cat > /tmp/ut-install-hooks.js << 'HOOKJS'
const fs = require('fs');
const settingsPath = process.argv[2];
const s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
s.hooks = s.hooks || {};

const add = (event, id, description, matcher, cmd, timeout) => {
  s.hooks[event] = s.hooks[event] || [];
  if (s.hooks[event].some(e => e.id === id)) return;
  const entry = { id, description, hooks: [{ type: 'command', command: cmd }] };
  if (matcher) entry.matcher = matcher;
  if (timeout) entry.hooks[0].timeout = timeout;
  s.hooks[event].push(entry);
};

// Remove any Core-only hooks that may exist from a prior Core install
const coreOnlyIds = [
  'ut:post:codeintel', 'ut:session:codeintel',
  'ut:post:tool-failure', 'ut:session:decisions'
];
for (const event of Object.keys(s.hooks)) {
  s.hooks[event] = (s.hooks[event] || []).filter(entry => {
    return !(entry.id && coreOnlyIds.includes(entry.id));
  });
  if (s.hooks[event].length === 0) delete s.hooks[event];
}

const H = process.env.HOME;

// OSS hooks only
add('SessionStart', 'ut:session:start', 'UltraThink: load memory on session start', null, H+'/.claude/hooks/ultrathink-memory-session-start.sh', 10000);
add('Stop', 'ut:stop:session-end', 'UltraThink: persist session memory on stop', null, H+'/.claude/hooks/ultrathink-memory-session-end.sh', 5000);
add('PreToolUse', 'ut:pre:privacy', 'UltraThink: enforce file-access privacy rules', 'Read|Edit|Write', H+'/.claude/hooks/ultrathink-privacy-hook.sh');
add('PostToolUse', 'ut:post:format-check', 'UltraThink: validate formatting after edits', 'Edit|Write', H+'/.claude/hooks/ultrathink-format-check.sh');
add('PostToolUse', 'ut:post:search-cap', 'UltraThink: cap search result output size', 'Bash|Grep|Glob', H+'/.claude/hooks/ultrathink-search-cap.sh');
add('PreToolUse', 'ut:pre:gateguard', 'UltraThink: enforce read-before-write (GateGuard)', 'Edit|Write|MultiEdit|Read', H+'/.claude/hooks/ultrathink-gateguard.sh');
add('PreToolUse', 'ut:pre:config-protect', 'UltraThink: block linter/formatter config modifications', 'Edit|Write|MultiEdit', H+'/.claude/hooks/ultrathink-config-protection.sh');
add('Stop', 'ut:stop:batch-quality', 'UltraThink: batch format + typecheck edited files', null, H+'/.claude/hooks/ultrathink-batch-quality.sh', 60000);
add('PostToolUse', 'ut:post:batch-accumulate', 'UltraThink: track edited files for batch quality check', 'Edit|Write|MultiEdit', H+'/.claude/hooks/ultrathink-batch-quality.sh');
add('PreCompact', 'ut:pre:compact', 'UltraThink: save context before compaction', null, H+'/.claude/hooks/ultrathink-pre-compact.sh', 10000);

fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
HOOKJS
  node /tmp/ut-install-hooks.js "$SETTINGS" 2>/dev/null && log_ok "Added hooks to settings.json" || log_warn "Could not merge hooks — add manually"
  rm -f /tmp/ut-install-hooks.js
fi

# Vault templates
if $DRY_RUN; then
  log_dry "write vault templates to $VAULT_PATH/_templates/"
else
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
fi

log_ok "Wrote vault templates"

# ── Step 8: Smoke test ──
log_step 8 "Running smoke test"

if $DRY_RUN; then
  log_dry "skipping smoke test in dry-run mode"
  echo ""
  log_warn "DRY RUN complete — no files were modified"
  echo ""
  exit 0
fi

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

# OSS-specific: verify no Core artifacts leaked
LEAKED=false
for core_hook in tool-failure-log.sh codeintel-session-check.sh post-edit-codeintel.sh decision-inject.sh; do
  if [[ -L "$CLAUDE_DIR/hooks/ultrathink-$core_hook" || -f "$CLAUDE_DIR/hooks/ultrathink-$core_hook" ]]; then
    log_warn "Core artifact found: ultrathink-$core_hook (should not exist in OSS)"
    LEAKED=true
  fi
done
if ! $LEAKED; then
  log_ok "OSS boundary: clean (no Core artifacts)"
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
echo "  Tier:       $TIER_UPPER"
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
echo "  To update:    $0 --update"
echo "  To uninstall: $0 --uninstall"
echo ""
