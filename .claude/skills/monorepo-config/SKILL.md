---
name: monorepo-config
description: Monorepo configuration — shared configs, package publishing, internal packages, versioning strategies
layer: domain
category: build-tools
triggers:
  - "shared config"
  - "internal package"
  - "package publishing"
  - "monorepo config"
  - "workspace config"
  - "changesets"
inputs:
  - "Monorepo structure and workspace setup needs"
  - "Shared configuration requirements across packages"
  - "Package publishing and versioning workflows"
  - "Internal package dependency management"
outputs:
  - "Workspace configuration files"
  - "Shared config packages (ESLint, TypeScript, Tailwind)"
  - "Changesets versioning setup"
  - "Internal package build and linking strategies"
linksTo:
  - monorepo
  - turborepo
  - pnpm
  - nx
linkedFrom:
  - monorepo
preferredNextSkills:
  - turborepo
  - pnpm
fallbackSkills:
  - monorepo
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Monorepo Configuration

## Purpose

Provide expert guidance on configuring monorepo workspaces with shared configs, internal packages, package publishing pipelines, and versioning strategies. Covers pnpm workspaces, Turborepo integration, shared configuration packages, and Changesets for automated versioning and publishing.

## Key Patterns

### Workspace Structure

Standard monorepo layout with pnpm workspaces:

```
monorepo/
  package.json            # Root package.json
  pnpm-workspace.yaml     # Workspace definition
  turbo.json              # Turborepo pipeline config
  .changeset/             # Changesets config
    config.json
  packages/
    config-eslint/        # Shared ESLint config
    config-typescript/    # Shared TypeScript config
    config-tailwind/      # Shared Tailwind config
    ui/                   # Shared UI component library
    utils/                # Shared utilities
  apps/
    web/                  # Next.js web app
    api/                  # API server
    docs/                 # Documentation site
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Root package.json:**

```json
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build --filter='./packages/*' && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "prettier": "^3.2.0",
    "turbo": "^2.3.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### Shared ESLint Configuration

Create a shared ESLint config package that all apps and packages extend.

```json
// packages/config-eslint/package.json
{
  "name": "@repo/eslint-config",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./base": "./base.js",
    "./next": "./next.js",
    "./react": "./react.js",
    "./node": "./node.js"
  },
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.0"
  }
}
```

```javascript
// packages/config-eslint/base.js
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "import/no-duplicates": "error",
    },
  },
];
```

**Consuming in an app:**

```javascript
// apps/web/eslint.config.js
import baseConfig from "@repo/eslint-config/base";
import nextConfig from "@repo/eslint-config/next";

export default [...baseConfig, ...nextConfig];
```

### Shared TypeScript Configuration

```json
// packages/config-typescript/package.json
{
  "name": "@repo/typescript-config",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./base": "./base.json",
    "./next": "./next.json",
    "./react-library": "./react-library.json",
    "./node": "./node.json"
  }
}
```

```json
// packages/config-typescript/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

```json
// packages/config-typescript/next.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Consuming:**

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/next",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Internal Packages

Internal packages used within the monorepo but not published to npm.

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.1.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "react": "^19.0.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

**Key pattern: source-level imports (no build step for internal packages):**

```json
// turbo.json -- internal packages use "transit" (no build task)
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

For internal packages consumed via source, Next.js transpiles them automatically:

```javascript
// apps/web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils"],
};

export default nextConfig;
```

### Changesets for Versioning and Publishing

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@repo/ui", "@repo/utils"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@repo/eslint-config", "@repo/typescript-config"]
}
```

**Changeset workflow:**

```bash
# 1. Developer adds a changeset describing their change
pnpm changeset
# Interactive prompt: select packages, bump type, description

# 2. This creates a markdown file in .changeset/
# .changeset/funny-cats-dance.md
# ---
# "@repo/ui": minor
# "@repo/utils": patch
# ---
# Added new Button variant and updated color utility

# 3. CI or release manager versions packages
pnpm changeset version
# Updates package.json versions and CHANGELOG.md files

# 4. Publish to npm
pnpm changeset publish
```

**GitHub Actions for automated releases:**

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Shared Tailwind Configuration

```javascript
// packages/config-tailwind/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
  plugins: [],
};

export default config;
```

```typescript
// apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";
import sharedConfig from "@repo/config-tailwind/tailwind.config";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",  // Include shared UI
  ],
};

export default config;
```

## Best Practices

- **Use `workspace:*` protocol** for internal dependencies -- pnpm resolves them to the local package during development and replaces with actual versions on publish.
- **Prefer source-level imports** for internal packages -- skip the build step and let the consuming app's bundler handle transpilation.
- **Keep shared configs as separate packages** -- `@repo/eslint-config`, `@repo/typescript-config`, `@repo/config-tailwind`.
- **Use `linked` in Changesets** to version related packages together.
- **Mark internal-only packages as `private: true`** to prevent accidental publishing.
- **Include `transpilePackages`** in Next.js config for any workspace package imported from source.
- **Use Turborepo's `dependsOn: ["^build"]`** to ensure dependencies build before dependents.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Missing `workspace:*` protocol | pnpm fetches from npm registry instead of local | Use `"@repo/ui": "workspace:*"` in dependencies |
| Forgetting `transpilePackages` | Next.js fails to parse TypeScript from workspace packages | Add internal packages to `transpilePackages` array |
| Circular dependencies between packages | Build fails or infinite loops | Restructure -- extract shared types into a separate `@repo/types` package |
| Running `pnpm install` in a package subdirectory | Creates a separate lockfile | Always run `pnpm install` from the monorepo root |
| Publishing without Changesets | Version bumps are manual and error-prone | Use Changesets for automated, consistent versioning |
| Content paths missing shared UI | Tailwind misses classes from workspace packages | Add `../../packages/ui/src/**/*.{ts,tsx}` to content array |
