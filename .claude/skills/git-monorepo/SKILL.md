---
name: git-monorepo
description: Git strategies for monorepos — sparse checkout, shallow clones, git worktrees, large repo optimization
layer: domain
category: devops
triggers:
  - "git monorepo"
  - "sparse checkout"
  - "git worktree"
  - "shallow clone"
  - "large repo"
  - "git lfs"
inputs:
  - "Large repository performance issues"
  - "Monorepo git workflow requirements"
  - "Selective checkout needs"
  - "CI/CD optimization for large repos"
outputs:
  - "Sparse checkout configurations"
  - "Git worktree setups"
  - "LFS migration strategies"
  - "CI clone optimization"
linksTo:
  - git-workflow
  - monorepo
  - turborepo
  - nx
linkedFrom:
  - monorepo
preferredNextSkills:
  - git-workflow
  - monorepo
fallbackSkills:
  - turborepo
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Git Strategies for Monorepos

## Purpose

Provide expert guidance on optimizing Git workflows for large monorepos. Covers sparse checkout for selective working copies, shallow clones for faster CI, git worktrees for parallel branch work, Git LFS for large binary assets, and general performance tuning for repositories with deep history or many files.

## Key Patterns

### Sparse Checkout

Work with only a subset of the repository tree. Essential when a monorepo has many packages but you only need a few.

```bash
# Clone with sparse checkout (cone mode -- recommended)
git clone --sparse --filter=blob:none https://github.com/org/monorepo.git
cd monorepo

# Add specific directories to your working copy
git sparse-checkout add packages/web packages/shared libs/utils

# View current sparse-checkout configuration
git sparse-checkout list

# Reset to full checkout if needed
git sparse-checkout disable
```

**Cone mode vs non-cone mode:**

```bash
# Cone mode (default, recommended) -- directory-level granularity
git sparse-checkout set packages/web packages/api

# Non-cone mode -- file-level patterns (slower, rarely needed)
git sparse-checkout set --no-cone
# Then edit .git/info/sparse-checkout with glob patterns:
# /packages/web/**
# /libs/shared/*.ts
# !/packages/web/tests/**
```

**Sparse checkout in CI (GitHub Actions):**

```yaml
jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            packages/web
            packages/shared
            libs/utils
            package.json
            pnpm-lock.yaml
            turbo.json
          sparse-checkout-cone-mode: true
          fetch-depth: 1  # Combine with shallow clone
```

### Shallow Clones

Reduce clone time by limiting history depth. Critical for CI pipelines.

```bash
# Clone with limited history
git clone --depth=1 https://github.com/org/monorepo.git

# Shallow clone with specific branch
git clone --depth=1 --branch=main --single-branch https://github.com/org/monorepo.git

# Deepen later if needed (e.g., for blame or bisect)
git fetch --deepen=50

# Convert shallow clone to full clone
git fetch --unshallow
```

**Treeless clone (blobs on demand) -- best for large repos:**

```bash
# Fetch all commits and trees, but download file contents only when needed
git clone --filter=blob:none https://github.com/org/monorepo.git

# Combine with sparse checkout for maximum efficiency
git clone --filter=blob:none --sparse https://github.com/org/monorepo.git
```

**CI optimization comparison:**

| Strategy | Clone Time | Disk Use | Full History | Blame/Bisect |
|----------|-----------|----------|--------------|--------------|
| Full clone | Slow | High | Yes | Yes |
| `--depth=1` | Fast | Low | No | No |
| `--filter=blob:none` | Medium | Low initially | Yes | Yes (fetches on demand) |
| `--filter=blob:none --sparse` | Fast | Lowest | Yes (for sparse paths) | Yes |

### Git Worktrees

Work on multiple branches simultaneously without stashing or cloning multiple copies.

```bash
# Create a worktree for a feature branch
git worktree add ../monorepo-feature-x feature/new-auth

# Create a worktree for a hotfix (new branch from main)
git worktree add -b hotfix/urgent-fix ../monorepo-hotfix main

# List all worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../monorepo-feature-x

# Prune stale worktree references
git worktree prune
```

**Worktree workflow for parallel work:**

```
~/projects/
  monorepo/              # Main worktree (main branch)
  monorepo-feature-a/    # Worktree for feature-a
  monorepo-feature-b/    # Worktree for feature-b
  monorepo-hotfix/       # Worktree for hotfix
```

```bash
# Each worktree shares the same .git object store -- no duplicate downloads
# You can run different dev servers in each worktree simultaneously

# In terminal 1:
cd ~/projects/monorepo && pnpm dev           # main branch

# In terminal 2:
cd ~/projects/monorepo-feature-a && pnpm dev  # feature branch on different port
```

### Git LFS

Track large binary files (images, videos, models) without bloating the repository.

```bash
# Install and initialize LFS
git lfs install

# Track file patterns
git lfs track "*.psd"
git lfs track "*.mp4"
git lfs track "assets/models/**"

# Verify tracking rules
cat .gitattributes

# View LFS objects
git lfs ls-files

# Migrate existing large files to LFS
git lfs migrate import --include="*.psd,*.mp4" --everything
```

**.gitattributes for common monorepo patterns:**

```
# Design assets
*.psd filter=lfs diff=lfs merge=lfs -text
*.sketch filter=lfs diff=lfs merge=lfs -text
*.fig filter=lfs diff=lfs merge=lfs -text

# Media
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.webm filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text

# ML models
*.onnx filter=lfs diff=lfs merge=lfs -text
*.pt filter=lfs diff=lfs merge=lfs -text

# Build artifacts that must be committed
*.wasm filter=lfs diff=lfs merge=lfs -text
```

### Performance Tuning for Large Repos

```bash
# Enable filesystem monitor for faster status/diff
git config core.fsmonitor true
git config core.untrackedCache true

# Enable commit graph for faster log/merge-base
git commit-graph write --reachable
# Automate with maintenance
git maintenance start

# Multi-pack index for repos with many packfiles
git multi-pack-index write

# Speed up fetch with protocol v2
git config protocol.version 2

# Parallel operations
git config fetch.parallel 4
git config submodule.fetchJobs 4
```

**Git maintenance schedule (recommended for large repos):**

```bash
# Enable background maintenance
git maintenance start

# This configures:
# - Hourly: prefetch from remotes
# - Daily: loose-objects cleanup, incremental-repack
# - Weekly: full pack consolidation, commit-graph update
```

### Monorepo-Specific .gitignore

```gitignore
# Package manager
node_modules/
.pnpm-store/

# Build outputs (per-package)
packages/*/dist/
packages/*/.next/
packages/*/build/
apps/*/dist/
apps/*/.next/

# Turbo cache
.turbo/

# Environment files with secrets
.env.local
.env.*.local

# IDE
.idea/
.vscode/settings.json

# OS
.DS_Store
Thumbs.db
```

## Best Practices

- **Use `--filter=blob:none --sparse` for CI** -- fastest clone with full history access when needed.
- **Enable `core.fsmonitor`** on developer machines for instant `git status` on large repos.
- **Run `git maintenance start`** to automate commit-graph, gc, and prefetch tasks.
- **Use worktrees instead of multiple clones** -- they share object storage and save disk space.
- **Track LFS files early** -- migrating existing history is expensive and rewrites SHAs.
- **Set `fetch.parallel`** to speed up multi-remote fetches in monorepos with submodules.
- **Use `sparse-checkout` in cone mode** -- it is significantly faster than non-cone pattern matching.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `--depth=1` then running `git blame` | Blame fails with incomplete history | Use `--filter=blob:none` instead for full history without blob download |
| Forgetting `pnpm-lock.yaml` in sparse checkout | Install fails without lockfile | Always include root config files in sparse-checkout patterns |
| LFS without sufficient storage quota | Push fails on large files | Check LFS storage limits; use Git LFS transfer agent for S3 |
| Worktree on same branch as another worktree | Git prevents this (branch already checked out) | Use `git worktree add -b new-branch` to create a new branch |
| Not running `git lfs install` in CI | LFS pointers checked out instead of actual files | Add `git lfs install` step or use `lfs: true` in checkout action |
| Shallow clone + rebase | Rebase needs history beyond shallow depth | Fetch depth covering merge-base: `--deepen=100` or `--unshallow` |
