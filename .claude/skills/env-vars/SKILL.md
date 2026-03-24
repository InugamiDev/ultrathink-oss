---
name: env-vars
description: Environment variables management with .env files, t3-env validation with Zod, secrets handling, runtime config, and Next.js env exposure rules (NEXT_PUBLIC_*)
layer: utility
category: devops
triggers:
  - "env vars"
  - "environment variables"
  - ".env"
  - "t3-env"
  - "NEXT_PUBLIC"
  - "secrets management"
  - "runtime config"
  - "env validation"
inputs: [variable names, runtime context, framework, secret/public classification]
outputs: [env schema, .env.example, validation setup, runtime config module]
linksTo: [docker, cicd, vercel]
linkedFrom: [bootstrap, ship, security-scanner]
preferredNextSkills: [cicd, vercel]
fallbackSkills: [docker, nextjs]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add @t3-oss/env-nextjs and zod dependencies
  - May create or modify .env files and .env.example
---

# Environment Variables Skill

## Purpose

Environment variables separate config from code. This skill ensures variables are validated at build time (not runtime surprises), secrets never leak to the client, and .env files are properly structured across environments.

## Key Concepts

### Next.js Env Exposure Rules

```
NEXT_PUBLIC_*  → Bundled into client JS, visible to anyone
All others     → Server-only, never sent to browser

Rule: If a variable contains a secret, it MUST NOT start with NEXT_PUBLIC_
```

### t3-env Validation (Recommended)

```typescript
// env.ts — single source of truth
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    REDIS_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  },
  // Fail build if server vars are accessed on client
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

### Usage After Validation

```typescript
// Always import from env.ts — never use process.env directly
import { env } from "@/env";

// Server code
const db = new Pool({ connectionString: env.DATABASE_URL });

// Client code
const appUrl = env.NEXT_PUBLIC_APP_URL;
```

### .env File Structure

```bash
# .env.local (git-ignored, local development)
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
JWT_SECRET="dev-secret-at-least-32-characters-long"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# .env.example (committed, documents required vars)
DATABASE_URL="postgresql://user:password@host:5432/database"
JWT_SECRET=""
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### .gitignore Rules

```gitignore
# Environment files
.env
.env.local
.env.*.local
!.env.example
```

### Runtime Config Without t3-env

```typescript
// config.ts — manual validation fallback
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT ?? "3000", 10),
} as const;
```

### Docker and CI Environments

```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.local
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://db:5432/app

# GitHub Actions
- name: Deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Best Practices

- **Validate at build time**: Use t3-env so missing vars fail the build, not production requests.
- **Never commit secrets**: Only `.env.example` (with empty values) goes into version control.
- **Type the config**: Export a typed config object. Never scatter `process.env.X` across the codebase.
- **Separate by environment**: Use `.env.local` for dev, platform secrets (Vercel, GitHub) for production.
- **Audit NEXT_PUBLIC_ vars**: Any `NEXT_PUBLIC_` value is public. Review quarterly for accidental exposure.
- **Rotate secrets**: Set calendar reminders. Update in provider first, then deploy.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `process.env.X` returns `undefined` silently | Use t3-env or `requireEnv()` helper |
| Secret leaked via `NEXT_PUBLIC_` prefix | Audit all `NEXT_PUBLIC_` vars, remove secrets |
| Different .env files across team members | Maintain `.env.example`, validate in CI |
| Hardcoded values in code instead of env | Extract to env var, add to schema |
| Missing vars in production only | Validate env at build time, not runtime |
