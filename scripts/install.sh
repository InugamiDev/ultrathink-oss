#!/usr/bin/env bash
# intent: UltraThink OSS installer — deploys to ~/.claude/ + ~/.ultrathink/
# status: done
# next: none
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

# ── Logging ──
log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()  { echo -e "\n${CYAN}${BOLD}[$1/$TOTAL_STEPS]${NC} $2"; }
log_dry()   { echo -e "${YELLOW}[DRY]${NC}  $*"; }

TOTAL_STEPS=7

# ── Dry-run helpers ──
# When DRY_RUN=true, commands that modify the filesystem are replaced with log output.
run_cmd() {
  if $DRY_RUN; then
    log_dry "would run: $*"
  else
    "$@"
  fi
}

dry_ln() {
  if $DRY_RUN; then
    log_dry "ln -sfn $1 -> $2"
  else
    # -n: if target is an existing symlink to a directory, replace it
    #     instead of following it and creating a nested link inside.
    ln -sfn "$1" "$2"
  fi
}

dry_mkdir() {
  if $DRY_RUN; then
    log_dry "mkdir -p $*"
  else
    mkdir -p "$@"
  fi
}

dry_rm() {
  if $DRY_RUN; then
    log_dry "rm $*"
  else
    rm "$@"
  fi
}

dry_write() {
  local dest="$1"
  if $DRY_RUN; then
    log_dry "write file: $dest"
  else
    cat > "$dest"
  fi
}

# ── Parse args ──
DB_URL=""
VAULT_PATH="$ULTRA_DATA/vault"
UNINSTALL=false
DRY_RUN=false
NO_IDENTITY=false
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    --uninstall)    UNINSTALL=true ;;
    --dry-run)      DRY_RUN=true ;;
    --no-identity)  NO_IDENTITY=true ;;
    --yes|-y)       AUTO_YES=true ;;
    --db=*)         DB_URL="${arg#*=}" ;;
    --vault=*)      VAULT_PATH="${arg#*=}" ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --db=URL          Neon Postgres connection string"
      echo "  --vault=PATH      Obsidian vault location (default: ~/.ultrathink/vault)"
      echo "  --no-identity     Skip adding UltraThink section to ~/.claude/CLAUDE.md"
      echo "  --yes, -y         Auto-approve all prompts"
      echo "  --dry-run         Print what would be changed without modifying anything"
      echo "  --uninstall       Remove UltraThink from ~/.claude/ and ~/.ultrathink/"
      echo "  --help, -h        Show this help"
      exit 0 ;;
  esac
done

if $DRY_RUN; then
  echo ""
  log_warn "DRY RUN — no files will be modified"
fi

# ── Uninstall ──
if $UNINSTALL; then
  echo ""
  log_info "Uninstalling UltraThink..."
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

  # 4. Remove UltraThink section from CLAUDE.md (between markers)
  CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
  if [[ -f "$CLAUDE_MD" ]] && grep -q "## UltraThink Integration" "$CLAUDE_MD" 2>/dev/null; then
    if $DRY_RUN; then
      log_dry "would remove UltraThink section from $CLAUDE_MD"
    else
      # Remove from "---\n\n## UltraThink Integration" to the next "---" or EOF
      # Use awk: skip lines between the UltraThink heading and the next major section
      awk '
        /^---$/ && saw_ut_heading { skip=0; next }
        /^## UltraThink Integration/ { saw_ut_heading=1; skip=1; next }
        skip && /^---$/ { skip=0; next }
        # Also skip the "---" line immediately before the heading
        !skip { buffer=$0 }
        !skip && !/^---$/ { if (NR>1 && prev_was_separator && next_is_ut) {} else print; prev_was_separator=0 }
      ' "$CLAUDE_MD" > "$CLAUDE_MD.tmp" 2>/dev/null || true

      # Simpler approach: use sed to remove the block
      # Pattern: "---\n\n## UltraThink Integration (OSS tier)\n...\nData directory:..."
      sed '/^---$/,/^---$/{
        /^## UltraThink Integration/,/^Data directory:.*/{d}
      }' "$CLAUDE_MD" > "$CLAUDE_MD.tmp2" 2>/dev/null || true

      # Most reliable: Python-style line-by-line removal
      # Remove everything from the "---" before "## UltraThink Integration" to the end of that block
      {
        in_ut_block=false
        found_separator=false
        separator_line=""
        while IFS= read -r line; do
          if [[ "$line" == "---" ]] && ! $in_ut_block; then
            # Peek: save separator, check if next non-empty line is UltraThink heading
            separator_line="$line"
            found_separator=true
            continue
          fi
          if $found_separator; then
            if [[ -z "$line" ]]; then
              # blank line after ---, keep buffering
              separator_line="${separator_line}"$'\n'"$line"
              continue
            elif [[ "$line" =~ ^"## UltraThink Integration" ]]; then
              # Entering UltraThink block — drop the separator and skip
              in_ut_block=true
              found_separator=false
              separator_line=""
              continue
            else
              # Not UltraThink — flush the buffered separator
              echo "$separator_line"
              echo "$line"
              found_separator=false
              separator_line=""
              continue
            fi
          fi
          if $in_ut_block; then
            # Skip until we hit an empty line followed by a new section, or EOF
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
      rm -f "$CLAUDE_MD.tmp" "$CLAUDE_MD.tmp2" 2>/dev/null || true
    fi
    REMOVED+=("UltraThink section from CLAUDE.md")
  fi

  # 5. Remove UltraThink hook entries from settings.json
  SETTINGS="$CLAUDE_DIR/settings.json"
  if [[ -f "$SETTINGS" ]] && grep -q "ultrathink-" "$SETTINGS" 2>/dev/null; then
    if $DRY_RUN; then
      log_dry "would remove UltraThink hooks from $SETTINGS"
    else
      CLEAN_JS="
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('$SETTINGS', 'utf-8'));
if (s.hooks) {
  for (const event of Object.keys(s.hooks)) {
    s.hooks[event] = (s.hooks[event] || []).filter(entry => {
      const cmds = (entry.hooks || []).map(h => h.command || '');
      return !cmds.some(c => c.includes('ultrathink-'));
    });
    if (s.hooks[event].length === 0) delete s.hooks[event];
  }
  if (Object.keys(s.hooks).length === 0) delete s.hooks;
}
fs.writeFileSync('$SETTINGS', JSON.stringify(s, null, 2) + '\n');
"
      node -e "$CLEAN_JS" 2>/dev/null && true
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

  # Print summary
  echo ""
  if [[ ${#REMOVED[@]} -gt 0 ]]; then
    log_ok "Removed ${#REMOVED[@]} items:"
    for item in "${REMOVED[@]}"; do
      echo "    - $item"
    done
  else
    log_info "Nothing to remove"
  fi
  echo ""
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# ── INSTALL ──
# ════════════════════════════════════════════════════════════════════════════

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
  if [[ "$(uname)" == "Darwin" ]]; then
    log_error "jq required — brew install jq"
  else
    log_error "jq required — sudo apt install jq (Debian/Ubuntu) or sudo dnf install jq (Fedora)"
  fi
  exit 1
fi
log_ok "jq available"

# ── Step 2: Create directories ──
log_step 2 "Creating directory structure"

dry_mkdir "$CLAUDE_DIR/skills" "$CLAUDE_DIR/hooks"
dry_mkdir "$ULTRA_DATA/forge/projects" "$ULTRA_DATA/decisions/projects"
dry_mkdir "$VAULT_PATH/memories" "$VAULT_PATH/decisions" "$VAULT_PATH/_templates"

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
  dry_ln "$skill_dir" "$target"
  skill_count=$((skill_count+1))
done
dry_ln "$ULTRA_ROOT/.claude/skills/_registry.json" "$CLAUDE_DIR/skills/_registry.json"
log_ok "Linked $skill_count skills"

# ── Step 4: Symlink references + agents ──
log_step 4 "Linking references and agents"

# References
if [[ -d "$CLAUDE_DIR/references" && ! -L "$CLAUDE_DIR/references" ]]; then
  run_cmd mv "$CLAUDE_DIR/references" "$CLAUDE_DIR/references.bak.$(date +%s)"
fi
dry_ln "$ULTRA_ROOT/.claude/references" "$CLAUDE_DIR/references"
ref_count=$(find "$ULTRA_ROOT/.claude/references/" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
log_ok "Linked $ref_count references"

# Agents
if [[ -d "$CLAUDE_DIR/agents" && ! -L "$CLAUDE_DIR/agents" ]]; then
  run_cmd mv "$CLAUDE_DIR/agents" "$CLAUDE_DIR/agents.bak.$(date +%s)"
fi
dry_ln "$ULTRA_ROOT/.claude/agents" "$CLAUDE_DIR/agents"
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
# shellcheck disable=SC2086
IFS=' ' read -ra HOOK_ARR <<< "$SHARED_HOOKS"
for hook in "${HOOK_ARR[@]}"; do
  src="$ULTRA_ROOT/.claude/hooks/$hook"
  [[ -f "$src" ]] || continue
  dry_ln "$src" "$CLAUDE_DIR/hooks/ultrathink-$hook"
  hook_count=$((hook_count+1))
done

log_ok "Linked $hook_count hooks"

# ── Step 6: Configure ──
log_step 6 "Writing configuration"

# UltraThink config
if $DRY_RUN; then
  log_dry "write file: $ULTRA_DATA/config.json"
else
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
fi
log_ok "Wrote ~/.ultrathink/config.json (tier=oss)"

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
  echo -en "  UltraThink wants to add its identity section to ${BOLD}~/.claude/CLAUDE.md${NC}"
  echo -en "\n  This affects all Claude Code sessions. Proceed? [y/N] "
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

## UltraThink Integration (OSS tier)

UltraThink is your active agent harness. Skills in \`~/.claude/skills/<name>/SKILL.md\`.
Registry: \`~/.claude/skills/_registry.json\` ($skill_count skills across 4 layers).
References in \`~/.claude/references/\` — read on demand, not auto-loaded.
Data directory: \`~/.ultrathink/\` (vault, forge state, decisions).
EOF
  fi
  log_ok "Appended UltraThink section to CLAUDE.md"
fi

# Merge hooks into settings.json
SETTINGS="$CLAUDE_DIR/settings.json"
if ! $DRY_RUN; then
  if [[ ! -f "$SETTINGS" ]]; then
    echo '{}' > "$SETTINGS"
  fi
fi

if ! grep -q "ultrathink-privacy-hook" "$SETTINGS" 2>/dev/null; then
  if $DRY_RUN; then
    log_dry "would add UltraThink hooks to $SETTINGS"
  else
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
  fi
else
  log_info "settings.json already has UltraThink hooks — skipping"
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

# ── Step 7: Smoke test ──
log_step 7 "Running smoke test"

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
