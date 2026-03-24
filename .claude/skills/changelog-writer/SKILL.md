---
name: changelog-writer
description: Generate structured changelogs from git commits, PRs, and tags following Keep a Changelog conventions
layer: utility
category: documentation
triggers:
  - "write changelog"
  - "generate changelog"
  - "what changed"
  - "release notes"
  - "update CHANGELOG"
inputs:
  - Git commit range or tag range (e.g., v1.2.0..HEAD)
  - Repository with git history
  - Changelog format preference (Keep a Changelog, Conventional Changelog, custom)
  - Audience (developers, end users, stakeholders)
outputs:
  - Formatted changelog entries
  - Categorized changes (Added, Changed, Fixed, Removed, etc.)
  - Version bump recommendation (major, minor, patch)
  - Updated CHANGELOG.md file
linksTo:
  - commit-crafter
  - pr-writer
  - git-workflow
linkedFrom:
  - ship
  - git-workflow
preferredNextSkills:
  - pr-writer
  - ship
fallbackSkills:
  - docs-writer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates or modifies CHANGELOG.md
---

# Changelog Writer Skill

## Purpose

Generate human-readable changelogs that communicate what changed, why it matters, and whether users need to take action. A good changelog bridges the gap between git history (for developers) and release notes (for users).

## Key Concepts

### Keep a Changelog Format (Recommended)

The standard format from [keepachangelog.com](https://keepachangelog.com):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

### Changed
- Existing feature modification

### Deprecated
- Feature that will be removed in future versions

### Removed
- Feature that was removed

### Fixed
- Bug fix description

### Security
- Vulnerability fix description

## [1.2.0] - 2025-06-15

### Added
- User export functionality (#123)
- Dark mode support for dashboard (#145)

### Fixed
- Login timeout on slow connections (#156)
- Incorrect date formatting in UTC-negative timezones (#160)

## [1.1.0] - 2025-05-01
...

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/repo/compare/v1.0.0...v1.1.0
```

### Change Categories

| Category | When to Use | Triggers Version Bump |
|----------|-------------|----------------------|
| **Added** | New features | Minor |
| **Changed** | Modifications to existing features | Minor (or Major if breaking) |
| **Deprecated** | Features that will be removed | Minor |
| **Removed** | Features that were removed | Major |
| **Fixed** | Bug fixes | Patch |
| **Security** | Vulnerability patches | Patch (or Minor/Major) |

### Semantic Versioning Mapping

```
MAJOR (X.0.0) — Breaking changes
  - Removed features
  - Changed API contracts
  - Renamed public interfaces
  - Changed default behavior

MINOR (0.X.0) — New features, non-breaking
  - Added features
  - Added endpoints/parameters
  - Deprecated features (still work)

PATCH (0.0.X) — Bug fixes, non-breaking
  - Fixed bugs
  - Security patches
  - Performance improvements (no API change)
```

## Workflow

### Step 1: Collect Raw Changes

```bash
# Get commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges

# Get commits between two tags
git log v1.1.0..v1.2.0 --oneline --no-merges

# Get commits with conventional commit parsing
git log v1.1.0..HEAD --format="%s|%h|%an" --no-merges

# Get merged PRs (GitHub)
gh pr list --state merged --base main --search "merged:>2025-05-01" --json number,title,labels,author
```

### Step 2: Categorize Changes

Map conventional commit types to changelog categories:

```
Commit Type → Changelog Category
  feat:     → Added
  fix:      → Fixed
  docs:     → (usually omit from changelog)
  style:    → (omit)
  refactor: → Changed (only if user-facing behavior changes)
  perf:     → Changed (or Fixed, depending on context)
  test:     → (omit)
  chore:    → (omit)
  ci:       → (omit)
  build:    → (omit)
  revert:   → Removed or Fixed (depending on what was reverted)

  BREAKING CHANGE: → always include, note prominently
  security:        → Security
  deprecate:       → Deprecated
```

### Step 3: Write Human-Readable Entries

**Transformation rules:**

```
Git commit (developer language):
  "fix(auth): handle race condition in token refresh when multiple tabs open simultaneously"

Changelog entry (user language):
  "Fixed login session being lost when using the app in multiple browser tabs"

---

Git commit:
  "feat(api): add GET /users/:id/export endpoint with CSV and JSON format support"

Changelog entry:
  "Added user data export in CSV and JSON formats via the API"

---

Git commit:
  "refactor(db): migrate from raw SQL to Prisma ORM"

Changelog entry:
  (omit — internal change, no user-facing impact)

---

Git commit:
  "feat(auth)!: require email verification for new accounts"

Changelog entry (Breaking):
  "**BREAKING**: New user accounts now require email verification before first login.
   Existing accounts are not affected."
```

### Step 4: Determine Version Bump

```
Analyze all changes since last release:

Has any commit:
  - Removed a public API/feature?        → MAJOR
  - Changed behavior in a breaking way?   → MAJOR
  - Has `BREAKING CHANGE:` footer?        → MAJOR
  - Has `!` after type (e.g., `feat!:`)?  → MAJOR

If no breaking changes, has any commit:
  - Added a new feature (`feat:`)?        → MINOR
  - Added new API endpoint/parameter?     → MINOR
  - Deprecated a feature?                 → MINOR

If only fixes:
  - Bug fixes (`fix:`)?                   → PATCH
  - Security patches?                     → PATCH
  - Performance improvements?             → PATCH
  - Documentation updates?                → PATCH (or no bump)
```

### Step 5: Format and Write

```bash
# Template for a release entry
cat <<'ENTRY'
## [1.3.0] - 2025-06-20

### Added
- User data export in CSV and JSON formats ([#178](link))
- Dark mode toggle in user preferences ([#182](link))
- Keyboard shortcuts for common actions ([#185](link))

### Changed
- Improved search performance for large datasets — results now load 3x faster ([#180](link))
- Updated password requirements to minimum 12 characters ([#183](link))

### Fixed
- Session loss when switching between browser tabs ([#176](link))
- Incorrect timezone display for users in UTC-negative zones ([#179](link))
- PDF export failing for reports with special characters in titles ([#181](link))

### Security
- Patched XSS vulnerability in comment rendering ([#184](link))
ENTRY
```

## Audience-Specific Formats

### Developer Changelog (Technical)

```markdown
## [1.3.0] - 2025-06-20

### Added
- `GET /api/users/:id/export` endpoint with `format` query param (csv|json) (#178)
- `prefers-color-scheme` media query support in theme system (#182)

### Changed
- **BREAKING**: `SearchService.query()` now returns `Promise<PaginatedResult>` instead of `Promise<Result[]>` (#180)
- Minimum password length increased from 8 to 12 in `PasswordValidator` (#183)

### Fixed
- Race condition in `TokenRefreshService` when multiple instances race (#176)
- `DateFormatter.toLocal()` returns wrong offset for negative UTC zones (#179)
```

### End-User Release Notes (Non-Technical)

```markdown
## What's New in Version 1.3

### New Features
- **Export your data** — Download your account data as a spreadsheet (CSV) or data file (JSON) from Settings > Privacy.
- **Dark mode** — Switch to dark mode in Settings > Appearance, or let it follow your system preference.
- **Keyboard shortcuts** — Press `?` anywhere to see available shortcuts.

### Improvements
- **Faster search** — Search results now load up to 3x faster for large workspaces.

### Bug Fixes
- Fixed an issue where you could be logged out when switching browser tabs.
- Fixed timezone display being incorrect for some regions.
- Fixed PDF exports failing when report titles contained special characters.

### Important
- Passwords now require at least 12 characters. Existing passwords are not affected until your next password change.
```

## Automation Integration

```bash
# Script to generate changelog from conventional commits
generate_changelog() {
  local from_tag="$1"
  local to_ref="${2:-HEAD}"

  echo "## Changes since ${from_tag}"
  echo ""

  # Added
  local added=$(git log "${from_tag}..${to_ref}" --oneline --no-merges --grep="^feat" --format="- %s (%h)")
  if [[ -n "$added" ]]; then
    echo "### Added"
    echo "$added" | sed 's/^- feat[^:]*: /- /'
    echo ""
  fi

  # Fixed
  local fixed=$(git log "${from_tag}..${to_ref}" --oneline --no-merges --grep="^fix" --format="- %s (%h)")
  if [[ -n "$fixed" ]]; then
    echo "### Fixed"
    echo "$fixed" | sed 's/^- fix[^:]*: /- /'
    echo ""
  fi

  # Breaking
  local breaking=$(git log "${from_tag}..${to_ref}" --oneline --no-merges --grep="BREAKING" --format="- %s (%h)")
  if [[ -n "$breaking" ]]; then
    echo "### BREAKING CHANGES"
    echo "$breaking"
    echo ""
  fi
}
```

## Quality Checklist

- [ ] Every user-facing change is documented
- [ ] Entries describe impact, not implementation
- [ ] Breaking changes are prominently marked
- [ ] PR/issue numbers are linked
- [ ] Date follows ISO 8601 (YYYY-MM-DD)
- [ ] Version follows semver
- [ ] Comparison links at bottom of file are updated
- [ ] Internal/developer-only changes are omitted (or in separate section)
