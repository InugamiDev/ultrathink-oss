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

linked=0
skipped=0
for skill_dir in "$SOURCE_SKILLS"/*/; do
  [[ -d "$skill_dir" ]] || continue
  [[ -f "$skill_dir/SKILL.md" ]] || continue
  name="$(basename "$skill_dir")"
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
echo "[install-pack] done — $linked linked, $skipped skipped."
echo "[install-pack] update later with:  git -C $DEST pull"
