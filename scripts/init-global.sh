#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# -------------------------------------------------------------------
# UltraThink Global Installer
# Symlinks UltraThink skills, rules, agents, and hooks into ~/.claude/
# so every Claude Code session has UltraThink capabilities.
#
# Usage: ./scripts/init-global.sh [--uninstall]
# -------------------------------------------------------------------

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ULTRA_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CLAUDE_DIR="$HOME/.claude"

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# --- Uninstall ---
if [[ "${1:-}" == "--uninstall" ]]; then
  log_info "Uninstalling UltraThink from ~/.claude/ ..."

  # Remove skill symlinks
  for skill_dir in "$CLAUDE_DIR/skills"/*/; do
    skill_name="$(basename "$skill_dir")"
    link="$CLAUDE_DIR/skills/$skill_name"
    if [[ -L "$link" ]] && [[ "$(readlink "$link")" == *"ultrathink"* ]]; then
      rm "$link"
      log_info "Removed skill symlink: $skill_name"
    fi
  done

  # Remove rules symlink (legacy)
  if [[ -L "$CLAUDE_DIR/rules" ]] && [[ "$(readlink "$CLAUDE_DIR/rules")" == *"ultrathink"* ]]; then
    rm "$CLAUDE_DIR/rules"
    log_ok "Removed rules symlink"
  fi

  # Remove references symlink
  if [[ -L "$CLAUDE_DIR/references" ]] && [[ "$(readlink "$CLAUDE_DIR/references")" == *"ultrathink"* ]]; then
    rm "$CLAUDE_DIR/references"
    log_ok "Removed references symlink"
  fi

  # Remove agents symlink
  if [[ -L "$CLAUDE_DIR/agents" ]] && [[ "$(readlink "$CLAUDE_DIR/agents")" == *"ultrathink"* ]]; then
    rm "$CLAUDE_DIR/agents"
    log_ok "Removed agents symlink"
  fi

  # Remove hook symlinks
  for hook in privacy-hook.sh format-check.sh notify.sh memory-session-start.sh memory-session-end.sh pre-compact.sh; do
    prefixed="ultrathink-$hook"
    if [[ -L "$CLAUDE_DIR/hooks/$prefixed" ]]; then
      rm "$CLAUDE_DIR/hooks/$prefixed"
      log_info "Removed hook symlink: $prefixed"
    fi
  done

  # Remove registry symlink
  if [[ -L "$CLAUDE_DIR/skills/_registry.json" ]]; then
    rm "$CLAUDE_DIR/skills/_registry.json"
    log_ok "Removed registry symlink"
  fi

  log_ok "UltraThink uninstalled from global config"
  log_warn "Note: CLAUDE.md and settings.json were NOT modified. Remove the UltraThink sections manually if desired."
  exit 0
fi

# --- Install ---
log_info "Installing UltraThink globally into ~/.claude/ ..."
log_info "Source: $ULTRA_ROOT"

# Ensure target directories exist
mkdir -p "$CLAUDE_DIR/skills"
mkdir -p "$CLAUDE_DIR/hooks"

# 1. Symlink each skill folder individually (preserves existing skills)
skill_count=0
for skill_dir in "$ULTRA_ROOT/.claude/skills"/*/; do
  skill_name="$(basename "$skill_dir")"
  target="$CLAUDE_DIR/skills/$skill_name"

  if [[ -L "$target" ]]; then
    # Already a symlink — update it
    rm "$target"
    ln -s "$skill_dir" "$target"
  elif [[ -d "$target" ]]; then
    log_warn "Skipping skill '$skill_name' — directory already exists (not a symlink)"
    continue
  else
    ln -s "$skill_dir" "$target"
  fi
  ((skill_count++))
done
log_ok "Linked $skill_count skills"

# Symlink the registry
if [[ -f "$ULTRA_ROOT/.claude/skills/_registry.json" ]]; then
  ln -sf "$ULTRA_ROOT/.claude/skills/_registry.json" "$CLAUDE_DIR/skills/_registry.json"
  log_ok "Linked _registry.json"
fi

# 2. Symlink references directory (behavioral rules — NOT auto-loaded, read on demand)
#    Rules were moved from .claude/rules/ to .claude/references/ to reduce auto-load context.
#    Do NOT symlink into ~/.claude/rules/ — that would re-add ~8KB to every session.
mkdir -p "$CLAUDE_DIR/references"
if [[ -L "$CLAUDE_DIR/references" ]]; then
  rm "$CLAUDE_DIR/references"
fi
if [[ -d "$CLAUDE_DIR/references" ]] && [[ ! -L "$CLAUDE_DIR/references" ]]; then
  log_warn "~/.claude/references/ is an existing directory — backing up to references.bak"
  mv "$CLAUDE_DIR/references" "$CLAUDE_DIR/references.bak"
fi
ln -sf "$ULTRA_ROOT/.claude/references" "$CLAUDE_DIR/references"
ref_count=$(ls "$ULTRA_ROOT/.claude/references/"*.md 2>/dev/null | wc -l | tr -d ' ')
log_ok "Linked references → $ref_count reference files (on-demand, not auto-loaded)"

# Clean up old rules symlink if it points to ultrathink
if [[ -L "$CLAUDE_DIR/rules" ]] && [[ "$(readlink "$CLAUDE_DIR/rules")" == *"ultrathink"* ]]; then
  rm "$CLAUDE_DIR/rules"
  mkdir -p "$CLAUDE_DIR/rules"
  log_info "Removed old rules symlink (rules moved to references/)"
fi

# 3. Symlink agents directory
if [[ -L "$CLAUDE_DIR/agents" ]]; then
  rm "$CLAUDE_DIR/agents"
fi
if [[ -d "$CLAUDE_DIR/agents" ]]; then
  log_warn "~/.claude/agents/ is an existing directory — backing up to agents.bak"
  mv "$CLAUDE_DIR/agents" "$CLAUDE_DIR/agents.bak"
fi
ln -s "$ULTRA_ROOT/.claude/agents" "$CLAUDE_DIR/agents"
log_ok "Linked agents → $(ls "$ULTRA_ROOT/.claude/agents/"*.md | wc -l | tr -d ' ') agent definitions"

# 4. Symlink hook files with ultrathink- prefix (preserves existing hooks)
hook_count=0
for hook in privacy-hook.sh format-check.sh notify.sh memory-session-start.sh memory-session-end.sh pre-compact.sh; do
  src="$ULTRA_ROOT/.claude/hooks/$hook"
  if [[ -f "$src" ]]; then
    prefixed="ultrathink-$hook"
    ln -sf "$src" "$CLAUDE_DIR/hooks/$prefixed"
    ((hook_count++))
  fi
done
log_ok "Linked $hook_count hooks (prefixed with ultrathink-)"

# 5. Append UltraThink section to CLAUDE.md if not already present
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
if ! grep -q "UltraThink" "$CLAUDE_MD" 2>/dev/null; then
  cat >> "$CLAUDE_MD" << 'ULTRATHINK_SECTION'

---

## UltraThink Integration

UltraThink is active when inside an UltraThink project. Skills in `~/.claude/skills/<name>/SKILL.md`.
Registry: `~/.claude/skills/_registry.json` (110+ skills across 4 layers).
Reference files (behavioral rules) in `~/.claude/references/` — read on demand, not auto-loaded.
ULTRATHINK_SECTION
  log_ok "Appended UltraThink section to CLAUDE.md"
else
  log_info "CLAUDE.md already has UltraThink section — skipping"
fi

# 6. Merge hook matchers into global settings.json
SETTINGS="$CLAUDE_DIR/settings.json"
if [[ -f "$SETTINGS" ]]; then
  # Check if hooks are already configured
  if grep -q "ultrathink-privacy-hook" "$SETTINGS" 2>/dev/null; then
    log_info "settings.json already has UltraThink hooks — skipping"
  else
    # Use node to merge JSON safely (PascalCase event names, nested hooks array)
    node -e "
      const fs = require('fs');
      const settings = JSON.parse(fs.readFileSync('$SETTINGS', 'utf-8'));

      if (!settings.hooks) settings.hooks = {};

      // SessionStart: auto-recall memories
      if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
      settings.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: '$HOME/.claude/hooks/ultrathink-memory-session-start.sh', timeout: 10000 }]
      });

      // Stop: auto-flush memories
      if (!settings.hooks.Stop) settings.hooks.Stop = [];
      settings.hooks.Stop.push({
        hooks: [{ type: 'command', command: '$HOME/.claude/hooks/ultrathink-memory-session-end.sh', timeout: 5000 }]
      });

      // PreToolUse: privacy hook
      if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
      settings.hooks.PreToolUse.push({
        matcher: 'Read|Edit|Write',
        hooks: [{ type: 'command', command: '$HOME/.claude/hooks/ultrathink-privacy-hook.sh' }]
      });

      // PostToolUse: format check
      if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
      settings.hooks.PostToolUse.push({
        matcher: 'Edit|Write',
        hooks: [{ type: 'command', command: '$HOME/.claude/hooks/ultrathink-format-check.sh' }]
      });

      // PreCompact: save state before compaction
      if (!settings.hooks.PreCompact) settings.hooks.PreCompact = [];
      settings.hooks.PreCompact.push({
        hooks: [{ type: 'command', command: '$HOME/.claude/hooks/ultrathink-pre-compact.sh', timeout: 10000 }]
      });

      fs.writeFileSync('$SETTINGS', JSON.stringify(settings, null, 2) + '\n');
    " 2>/dev/null && log_ok "Added UltraThink hooks to settings.json" || log_warn "Could not merge hooks into settings.json — add manually"
  fi
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  UltraThink installed globally!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Skills:  $skill_count linked in ~/.claude/skills/"
echo "  Refs:    $ref_count reference files in ~/.claude/references/ (on-demand)"
echo "  Agents:  $(ls "$ULTRA_ROOT/.claude/agents/"*.md | wc -l | tr -d ' ') agents in ~/.claude/agents/"
echo "  Hooks:   $hook_count hooks in ~/.claude/hooks/"
echo ""
echo "  Every new 'claude' session now has UltraThink capabilities."
echo "  To uninstall: $0 --uninstall"
echo ""
