# Monorepo

> Monorepo architecture with Turborepo, Nx, or pnpm/npm/bun workspaces.

## When to Use
- Setting up or managing multi-package repositories
- Configuring build pipelines across packages
- Managing shared dependencies and internal packages

## Patterns

### Turborepo
- `turbo.json` pipeline config with `dependsOn` for task ordering
- Remote caching with `--remote-cache` for CI/CD speedup
- `turbo prune --scope=<pkg>` for Docker-optimized builds
- Internal packages: `"name": "@repo/ui"` with `"main": "./src/index.ts"`

### Workspace Structure
```
apps/
  web/         # Next.js app
  api/         # Backend service
packages/
  ui/          # Shared component library
  config/      # Shared ESLint, TS configs
  db/          # Shared database client
turbo.json
package.json   # workspace root
```

### Key Conventions
- Root `package.json` with `"workspaces": ["apps/*", "packages/*"]`
- Shared `tsconfig.base.json` extended by each package
- Internal packages use `"exports"` field, not build step
- `--filter` flag to scope commands: `turbo build --filter=web...`
- Dependency hoisting: prefer `pnpm` for strict isolation

### Common Issues
- Version conflicts: use `pnpm.overrides` or `resolutions`
- TypeScript project references for cross-package type checking
- Docker: use multi-stage builds with `turbo prune` output
