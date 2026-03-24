---
name: turborepo
description: High-performance monorepo build system with intelligent caching and task orchestration
layer: domain
category: build-tools
triggers:
  - "turborepo"
  - "turbo.json"
  - "turbo run"
  - "monorepo build"
  - "remote caching"
  - "task pipeline"
inputs: [monorepo structure, workspace layout, build targets, caching requirements]
outputs: [turbo.json config, pipeline definitions, filtering strategies, caching setup]
linksTo: [monorepo, vercel, cicd, dev-workflow]
linkedFrom: [monorepo, vercel, cicd]
preferredNextSkills: [vercel, cicd, monorepo]
fallbackSkills: [dev-workflow]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [build execution, cache writes]
---

# Turborepo

## Purpose

Configure and optimize Turborepo for monorepo build orchestration — pipeline definitions, caching strategies, workspace filtering, and environment variable handling.

## Key Patterns

### Pipeline Configuration (turbo.json)

- Define tasks in `tasks` (v2) with `dependsOn` for topological ordering
- Use `"dependsOn": ["^build"]` to run dependencies' build first (caret = upstream)
- Set `"outputs": [".next/**", "dist/**"]` for correct cache artifacts
- Use `"cache": false` for tasks that must always run (e.g., deploy)
- `"persistent": true` for long-running dev servers

### Caching and Hashing

- Turbo hashes source files, env vars, and task config to determine cache hits
- `"globalEnv": ["CI", "NODE_ENV"]` — env vars that invalidate all task caches
- `"env": ["API_URL"]` on a task — env vars scoped to that task's hash
- `"globalPassThroughEnv"` / `"passThroughEnv"` — accessible but not part of hash
- Remote caching via `npx turbo login && npx turbo link` (Vercel) or self-hosted

### Filtering and Workspace Management

- `turbo run build --filter=web` — run only for the `web` workspace
- `turbo run build --filter=web...` — `web` and all its dependencies
- `turbo run build --filter=...web` — `web` and all its dependents
- `turbo run build --filter={./apps/*}` — glob-based workspace selection
- `turbo run build --filter=[HEAD^1]` — only workspaces changed since commit

### Internal Packages Pattern

- Shared packages with `"name": "@repo/ui"` consumed via workspace protocol
- Use `"main"` / `"exports"` pointing to source (no build step) for internal-only packages
- Or add a `build` task with `"dependsOn": ["^build"]` for packages needing compilation

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Missing `outputs` in cacheable tasks | Always declare output directories for cache restoration |
| Secrets in `globalEnv` | Use `passThroughEnv` — secrets shouldn't bust cache |
| No `--filter` in CI | Filter by changed packages to avoid rebuilding everything |
| Circular `dependsOn` | Map dependency graph carefully; turbo will error on cycles |
| Caching deploy/publish tasks | Set `"cache": false` on side-effectful tasks |
| Ignoring `--dry` for debugging | Use `turbo run build --dry=json` to inspect task graph and cache status |
