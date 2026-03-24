---
name: environment-management
description: Multi-environment management — staging, preview, production; environment promotion; config per environment
layer: domain
category: devops
triggers:
  - "staging environment"
  - "preview environment"
  - "environment promotion"
  - "multi environment"
  - "env management"
inputs:
  - "Environment architecture requirements"
  - "Deployment promotion workflows"
  - "Per-environment configuration needs"
  - "Preview/staging setup questions"
outputs:
  - "Environment architecture with promotion flow"
  - "Per-environment configuration strategies"
  - "Preview environment setup"
  - "Environment parity guidelines"
linksTo:
  - vercel
  - docker
  - cicd
  - env-vars
linkedFrom:
  - ship
  - cicd
  - ci-cd-patterns
preferredNextSkills:
  - cicd
  - vercel
fallbackSkills:
  - docker
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Multi-Environment Management

## Purpose

Provide expert guidance on designing, configuring, and managing multi-environment deployment pipelines. Covers environment architecture (development, staging, preview, production), promotion strategies, per-environment configuration, and environment parity to minimize "works on staging, breaks in prod" failures.

## Key Patterns

### Environment Architecture

A typical environment ladder for production applications:

```
local -> preview (per-PR) -> staging -> production
```

| Environment | Purpose | Data | Lifetime | Access |
|-------------|---------|------|----------|--------|
| Local | Developer workstation | Seed/mock data | Permanent | Developer only |
| Preview | Per-PR verification | Seed or staging snapshot | Ephemeral (PR lifecycle) | Team |
| Staging | Pre-production validation | Sanitized production copy | Permanent | Team + QA |
| Production | Live users | Real data | Permanent | Public |

### Per-Environment Configuration

**Use environment variables with validation at startup:**

```typescript
// env.ts — validated environment config
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url(),
  FEATURE_FLAGS_ENDPOINT: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().optional(),
  // Staging/prod only
  CDN_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

// Type-safe environment checks
export const isProd = env.NODE_ENV === "production";
export const isStaging = env.NODE_ENV === "staging";
export const isDev = env.NODE_ENV === "development";
```

**Environment-specific configuration files (Next.js example):**

```
.env                  # Shared defaults (committed, no secrets)
.env.local            # Local overrides (gitignored)
.env.staging          # Staging values (committed, no secrets)
.env.production       # Production values (committed, no secrets)
```

```bash
# .env (shared defaults)
NEXT_PUBLIC_APP_NAME="MyApp"
LOG_LEVEL="info"

# .env.staging
NEXT_PUBLIC_API_URL="https://api.staging.myapp.com"
NEXT_PUBLIC_APP_ENV="staging"

# .env.production
NEXT_PUBLIC_API_URL="https://api.myapp.com"
NEXT_PUBLIC_APP_ENV="production"
```

**Secrets management -- never commit secrets:**

```yaml
# Use platform-specific secret stores
# Vercel: vercel env pull
# AWS: AWS Secrets Manager / SSM Parameter Store
# GitHub Actions: repository secrets

# GitHub Actions example
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

### Vercel Environment Setup

```bash
# Set environment variables per environment
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull env vars for local development
vercel env pull .env.local

# Link to specific environments
vercel --prod          # Deploy to production
vercel                 # Deploy to preview
```

**Vercel `vercel.json` with environment-specific headers:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "noindex"
        }
      ],
      "has": [
        {
          "type": "host",
          "value": ".*staging.*"
        }
      ]
    }
  ]
}
```

### Environment Promotion Flow

**GitHub Actions promotion pipeline:**

```yaml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      staging_sha:
        description: "Staging commit SHA to promote"
        required: true

jobs:
  verify-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.staging_sha }}

      - name: Verify staging deployment health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.myapp.com/api/health)
          if [ "$STATUS" != "200" ]; then
            echo "Staging health check failed with status $STATUS"
            exit 1
          fi

      - name: Run smoke tests against staging
        run: npx playwright test --config=playwright.staging.config.ts

  promote:
    needs: verify-staging
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.staging_sha }}

      - name: Deploy to production
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Post-deploy smoke test
        run: |
          sleep 10
          curl -sf https://myapp.com/api/health || exit 1
```

### Preview Environments (Per-PR)

**Vercel automatic previews with database branching (Neon):**

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  setup-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Neon branch for PR
        id: neon
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Set preview DATABASE_URL
        run: |
          vercel env add DATABASE_URL preview \
            --token=${{ secrets.VERCEL_TOKEN }} \
            < <(echo "${{ steps.neon.outputs.db_url }}")

      - name: Deploy preview
        run: vercel --token=${{ secrets.VERCEL_TOKEN }}
```

### Docker Multi-Environment Setup

```dockerfile
# Multi-stage build with environment targets
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
ARG APP_ENV=production
ENV NEXT_PUBLIC_APP_ENV=$APP_ENV
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.staging.yml
services:
  app:
    build:
      context: .
      args:
        APP_ENV: staging
    env_file: .env.staging
    ports:
      - "3000:3000"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_staging
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - staging_db:/var/lib/postgresql/data

volumes:
  staging_db:
```

### Environment Parity

Keep environments as similar as possible to minimize surprises.

```typescript
// Feature flags for environment-specific behavior (NOT code branches)
const featureFlags = {
  development: {
    enableDebugToolbar: true,
    enableMockPayments: true,
    enableSeedData: true,
  },
  staging: {
    enableDebugToolbar: true,
    enableMockPayments: true,  // Stripe test mode
    enableSeedData: false,
  },
  production: {
    enableDebugToolbar: false,
    enableMockPayments: false,
    enableSeedData: false,
  },
} as const;

export const flags = featureFlags[env.NODE_ENV];
```

## Best Practices

- **Validate env vars at startup** -- fail fast with clear error messages rather than crashing at runtime when a var is missing.
- **Never commit secrets** -- use `.env.local` (gitignored) for local secrets, platform secret stores for deployments.
- **Use database branching** (Neon, PlanetScale) for preview environments to get isolated data without full database provisioning.
- **Require approval gates** for production promotions via GitHub Environments or similar.
- **Run smoke tests after every deployment** -- automated health checks catch configuration drift.
- **Tag deployments** with git SHA and environment for traceability: `APP_VERSION=abc123 APP_ENV=staging`.
- **Keep staging as close to production as possible** -- same infra, same data shape, same feature flags.
- **Clean up preview environments** when PRs close to avoid resource waste.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Hardcoded URLs in code | Different base URLs per environment break | Use environment variables for all external URLs |
| Secrets in `.env` committed to git | Credential exposure | Use `.env.local` (gitignored) + platform secret stores |
| Staging with tiny dataset | Queries fast on staging, slow in production | Use sanitized production data snapshots for staging |
| No health check endpoint | Cannot verify deployment success | Add `/api/health` that checks DB, Redis, external deps |
| Preview envs sharing database | Data corruption across PRs | Use database branching (Neon) or isolated test databases |
| Missing cleanup on PR close | Orphaned preview databases and deployments | Add `pull_request: closed` workflow to tear down resources |
