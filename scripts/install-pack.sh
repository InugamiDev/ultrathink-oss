#!/usr/bin/env bash
# intent: install any skill pack into your UltraThink workflow
# status: done — clone + symlink + registry merge
# next: signed manifest, version pinning per pack
# confidence: high
#
# Usage:
#   ./scripts/install-pack.sh <git-repo-url> [skill-name-prefix]
#
# What it does:
#   1. Clones <git-repo-url> into ~/.ultrathink/packs/<name>/
#   2. For each subdir of <name>/.claude/skills/ that has a SKILL.md,
#      symlinks it into ~/.claude/skills/<prefix><skill-name>/
#   3. Refuses to overwrite an existing skill (rename via the optional prefix).
#   4. Prints a one-liner so you can `git pull && re-run` to update.

set -euo pipefail

REPO="${1:-}"
PREFIX="${2:-}"
PACKS_DIR="$HOME/.ultrathink/packs"
SKILLS_DIR="$HOME/.claude/skills"

if [[ -z "$REPO" ]]; then
  cat <<EOF
Usage: install-pack.sh <git-repo-url> [skill-name-prefix]

Examples:
  install-pack.sh https://github.com/acme/awesome-skills
  install-pack.sh https://github.com/acme/awesome-skills acme-

The optional prefix prevents collisions when two packs ship a skill with the
same name (e.g. two "test" skills become "acme-test" and "vendor-test").
EOF
  exit 1
fi

# Derive a slug from the repo URL — last path segment, stripped of .git suffix.
NAME="$(basename "$REPO" .git)"
DEST="$PACKS_DIR/$NAME"

mkdir -p "$PACKS_DIR" "$SKILLS_DIR"

echo "[install-pack] $REPO → $DEST"
if [[ -d "$DEST/.git" ]]; then
  echo "[install-pack] pack already cloned, pulling latest…"
  git -C "$DEST" pull --ff-only
else
  git clone --depth 1 "$REPO" "$DEST"
fi

SOURCE_SKILLS="$DEST/.claude/skills"
if [[ ! -d "$SOURCE_SKILLS" ]]; then
  echo "[install-pack] no .claude/skills/ in this repo — nothing to install."
  exit 0
fi

# Audit 09 HIGH — a hostile pack can include a symlink whose target points
# outside the pack root. Symlinking that into ~/.claude/skills/ gives the
# UltraThink auto-trigger walker access to anywhere on disk the symlink can
# reach (e.g. ~/.ssh, ~/.aws/credentials, dotfiles). Refuse skill entries
# that aren't real directories whose canonical path stays under the pack.
canonical_source="$(cd "$SOURCE_SKILLS" && pwd -P)"
linked=0
skipped=0
rejected=0
for skill_dir in "$SOURCE_SKILLS"/*/; do
  [[ -d "$skill_dir" ]] || continue
  [[ -f "$skill_dir/SKILL.md" ]] || continue
  name="$(basename "$skill_dir")"
  # Reject names that try to escape the destination via a leading dot or path bits.
  if [[ "$name" == .* || "$name" == */* || "$name" == ..* ]]; then
    echo "  ! $name rejected (suspicious skill name)"
    rejected=$((rejected + 1))
    continue
  fi
  # Reject if the skill directory itself is a symlink — could resolve outside.
  if [[ -L "${skill_dir%/}" ]]; then
    echo "  ! $name rejected (top-level entry is a symlink — refusing to follow into pack)"
    rejected=$((rejected + 1))
    continue
  fi
  # Verify the canonical resolution of the skill dir stays under the pack root.
  resolved="$(cd "$skill_dir" 2>/dev/null && pwd -P || echo "")"
  if [[ -z "$resolved" || "$resolved" != "$canonical_source"/* ]]; then
    echo "  ! $name rejected (resolves outside pack: $resolved)"
    rejected=$((rejected + 1))
    continue
  fi
  # Verify SKILL.md is a regular file under the same canonical root.
  resolved_skill_md="$(cd "$(dirname "$skill_dir/SKILL.md")" 2>/dev/null && pwd -P)/SKILL.md"
  if [[ ! -f "$resolved_skill_md" || "$resolved_skill_md" != "$canonical_source"/* ]]; then
    echo "  ! $name rejected (SKILL.md resolves outside pack)"
    rejected=$((rejected + 1))
    continue
  fi
  target_name="${PREFIX}${name}"
  target="$SKILLS_DIR/$target_name"
  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "  - $target_name (already exists as a real dir, skipped — pass a prefix to coexist)"
    skipped=$((skipped + 1))
    continue
  fi
  ln -sfn "$skill_dir" "$target"
  echo "  + $target_name"
  linked=$((linked + 1))
done

echo ""
echo "[install-pack] done — $linked linked, $skipped skipped, $rejected rejected."
echo "[install-pack] update later with:  git -C $DEST pull"
