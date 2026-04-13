---
name: git-workflow
description: Git operations, branching strategies, conflict resolution, commit conventions, and repository maintenance
layer: utility
category: tooling
triggers:
  - "git workflow"
  - "branching strategy"
  - "merge conflict"
  - "rebase"
  - "commit message"
  - "git history"
  - "cherry pick"
  - "release branch"
inputs:
  - operation: branch | merge | rebase | cherry-pick | bisect | stash | tag | release
  - context: Current repository state and branch information
  - strategy: trunk-based | gitflow | github-flow
outputs:
  - commands: Git commands to execute in order
  - explanation: Why these commands and in this order
  - warnings: Potential risks or data loss scenarios
  - rollback: How to undo the operation if needed
linksTo:
  - error-handling
  - logging
linkedFrom:
  - orchestrator
  - planner
preferredNextSkills:
  - error-handling
  - logging
fallbackSkills:
  - sequential-thinking
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - git_state: Modifies git history, branches, and working tree
---

# Git Workflow

## Purpose

This skill provides expert guidance on Git operations from basic branching to complex history rewriting. It prioritizes safe, reversible operations and always includes rollback instructions. It covers branching strategies, commit conventions, conflict resolution, release management, and repository maintenance.

## Key Concepts

### Safety Principles

```
1. NEVER force push to shared branches (main, develop, release/*)
2. ALWAYS create a backup branch before destructive operations
3. PREFER merge over rebase for shared branches
4. PREFER rebase for local/feature branches before merging
5. ALWAYS verify with `git status` and `git log` before and after operations
6. NEVER skip pre-commit hooks (--no-verify) unless explicitly instructed
7. NEVER amend commits that have been pushed to shared branches
```

### Branching Strategies

#### Trunk-Based Development (Recommended for small teams)

```
main ─────────────────────────────────────────────
  │         │              │           │
  └─ feat/a ┘   └─ feat/b ┘   └─ fix/c ┘
     (short-lived, < 2 days)

RULES:
  - Feature branches live < 2 days
  - Merge to main via PR with CI checks
  - Release from main (tag-based)
  - Feature flags for incomplete work
  - No long-lived branches
```

#### GitHub Flow (Good for continuous deployment)

```
main ──────────────────────────────────────────
  │              │                    │
  └─ feature/auth ┘      └─ feature/orders ┘
     (PR-based merge)       (PR-based merge)

RULES:
  - main is always deployable
  - Branch from main, PR back to main
  - Deploy immediately after merge
  - No release branches
```

#### Git Flow (For versioned releases)

```
main ─────────────────────────────── v1.0 ─── v2.0
  │                                    │         │
develop ──────────────────────────────────────────
  │         │         │          │
  └─ feat/a ┘   └─ feat/b ┘   └─ release/1.0 ┘
                                       │
                                   └─ hotfix/1.0.1 ┘

RULES:
  - main: production releases only (tagged)
  - develop: integration branch
  - feature/*: branch from develop, merge to develop
  - release/*: branch from develop, merge to main + develop
  - hotfix/*: branch from main, merge to main + develop
```

### Commit Message Convention (Conventional Commits)

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types**:

| Type | Use When |
|------|----------|
| `feat` | New feature for the user |
| `fix` | Bug fix for the user |
| `docs` | Documentation only changes |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Build system or external dependencies |
| `ci` | CI configuration changes |
| `chore` | Other changes (tooling, configs) |
| `revert` | Reverts a previous commit |

**Examples**:

```
feat(auth): add OAuth2 login with Google provider

Implements Google OAuth2 flow using next-auth. Users can now
sign in with their Google account in addition to email/password.

Closes #142

---

fix(orders): prevent duplicate order creation on double-click

Added request deduplication using idempotency keys. The client
generates a UUID per order attempt, and the server rejects
duplicate keys within a 5-minute window.

Fixes #287

---

feat!: migrate from Pages Router to App Router

BREAKING CHANGE: All page components have been migrated to the
App Router convention. Custom _app.tsx and _document.tsx are
removed. See migration guide in docs/app-router-migration.md.
```

## Common Operations

### Feature Branch Workflow

```bash
# Start a new feature
git checkout main
git pull origin main
git checkout -b feature/user-profile

# Work on the feature (multiple commits are fine)
git add -p                          # Stage selectively
git commit -m "feat(profile): add profile page layout"
git commit -m "feat(profile): add avatar upload"
git commit -m "test(profile): add profile page tests"

# Before creating PR, clean up
git fetch origin main
git rebase origin/main              # Rebase onto latest main

# If rebase has conflicts:
# Fix conflicts in each file, then:
git add <resolved-files>
git rebase --continue
# If things go wrong:
git rebase --abort                  # Safely return to pre-rebase state

# Push and create PR
git push -u origin feature/user-profile
gh pr create --title "feat(profile): add user profile page" --body "..."
```

### Merge Conflict Resolution

```bash
# STEP 1: Understand the conflict
git status                          # See which files conflict
git diff                            # See the conflict markers

# STEP 2: For each conflicted file
# Open the file, look for:
#   <<<<<<< HEAD (your changes)
#   =======
#   >>>>>>> branch-name (their changes)

# STEP 3: Resolve by editing the file
# Remove conflict markers, keep the correct code

# STEP 4: Mark as resolved
git add <resolved-file>

# STEP 5: Complete the merge/rebase
git merge --continue                # If merging
git rebase --continue               # If rebasing

# EMERGENCY: Abort everything
git merge --abort                   # Undo merge attempt
git rebase --abort                  # Undo rebase attempt
```

### Interactive History Cleanup (Local Only)

```bash
# IMPORTANT: Only for commits NOT yet pushed to shared branches

# Squash last 3 commits into one
git reset --soft HEAD~3
git commit -m "feat(auth): implement complete auth flow"

# Alternatively, use fixup commits
git commit --fixup=<commit-hash>
git rebase --autosquash origin/main
```

### Cherry-Pick

```bash
# Pick specific commits from another branch
git checkout main
git cherry-pick <commit-hash>

# Cherry-pick without committing (stage only)
git cherry-pick --no-commit <commit-hash>

# Cherry-pick a range
git cherry-pick <start-hash>^..<end-hash>

# If conflict during cherry-pick
git cherry-pick --abort              # Cancel
# OR resolve and:
git cherry-pick --continue
```

### Bisect (Find Bug-Introducing Commit)

```bash
# Start bisect
git bisect start

# Mark current (broken) as bad
git bisect bad

# Mark last known good commit
git bisect good v1.2.0

# Git checks out a middle commit — test it, then:
git bisect good                     # If this commit is fine
git bisect bad                      # If this commit has the bug

# Repeat until Git identifies the first bad commit

# Automated bisect with a test script
git bisect start HEAD v1.2.0
git bisect run npm test             # Automatically tests each commit

# Clean up
git bisect reset
```

### Stash Operations

```bash
# Save current work
git stash push -m "WIP: user profile styling"

# List stashes
git stash list

# Apply most recent stash (keep in stash list)
git stash apply

# Apply and remove from list
git stash pop

# Apply a specific stash
git stash apply stash@{2}

# Stash only unstaged changes
git stash push --keep-index -m "stash unstaged only"

# Stash including untracked files
git stash push --include-untracked -m "stash everything"

# Create a branch from a stash
git stash branch feature/from-stash stash@{0}
```

### Release Workflow

```bash
# Create release branch
git checkout develop
git checkout -b release/2.0.0

# Bump version
npm version 2.0.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump version to 2.0.0"

# After QA approval, merge to main
git checkout main
git merge --no-ff release/2.0.0
git tag -a v2.0.0 -m "Release 2.0.0"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge --no-ff release/2.0.0
git push origin develop

# Clean up
git branch -d release/2.0.0
git push origin --delete release/2.0.0
```

## Recovery Operations

### Undo Last Commit (Keep Changes)

```bash
git reset --soft HEAD~1             # Uncommit, keep staged
git reset HEAD~1                    # Uncommit, unstage, keep files
```

### Recover Deleted Branch

```bash
git reflog                          # Find the last commit on the branch
git checkout -b recovered-branch <commit-hash>
```

### Recover Lost Commits

```bash
git reflog                          # Find the commit
git cherry-pick <commit-hash>       # Apply it to current branch
```

### Undo a Pushed Merge

```bash
# Revert the merge commit (creates a new commit that undoes the merge)
git revert -m 1 <merge-commit-hash>
git push origin main

# NOTE: If you later need to re-merge the reverted branch,
# you must first revert the revert:
git revert <revert-commit-hash>
```

## Repository Maintenance

```bash
# Clean up local branches that no longer exist on remote
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d

# Find large files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | sort -rnk2 | head -20

# Garbage collection
git gc --aggressive --prune=now

# Verify repository integrity
git fsck --full
```

## Anti-Patterns

1. **Force pushing shared branches**: This rewrites history that others depend on. Use `--force-with-lease` at minimum, but prefer merge commits on shared branches.
2. **Giant commits**: Committing entire features in one commit makes review, bisect, and revert impossible. Commit logical units.
3. **Vague commit messages**: "fix stuff" or "update" provides zero value. Follow conventional commits format.
4. **Long-lived feature branches**: Branches that diverge for weeks accumulate massive merge conflicts. Keep branches short-lived.
5. **Committing generated files**: node_modules, dist, .env files should be in .gitignore, not in the repository.
6. **Skipping hooks**: Using --no-verify to bypass pre-commit hooks hides problems. Fix the hook failures instead.

## Integration Notes

- When operations fail, hand off to **error-handling** for systematic diagnosis.
- When investigating production issues via git history, use **sequential-thinking** for bisect analysis.
- Log significant git operations through **logging** for audit trails.
- Always verify the current git state before suggesting commands — use `git status` and `git log --oneline -10`.
