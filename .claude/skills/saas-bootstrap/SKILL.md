---
name: saas-bootstrap
description: Full SaaS project scaffolding. One prompt → Next.js 15 app with auth, billing, DB schema, UI components, API routes, email, and CI/CD. Chains bootstrap + better-auth + stripe + drizzle + nextjs + resend + cicd. Outputs a production-ready repo structure.
argument-hint: "[product name] [description] [stack preferences]"
layer: orchestrator
category: backend
triggers:
  - saas bootstrap
  - new saas
  - scaffold project
  - bootstrap saas
  - start saas
  - new project scaffold
  - full stack bootstrap
  - saas starter
linksTo:
  - bootstrap
  - better-auth
  - stripe
  - drizzle
  - nextjs
  - resend
  - cicd
  - tailwindcss
  - brandkit-gen
inputs: |
  Product name, description (what it does), audience (B2B/B2C/developer tool),
  billing model (subscription/one-time/usage-based/freemium), whether multi-tenant
  org/team support is needed, and any stack overrides (e.g. "use Supabase").
outputs: |
  Full Next.js 15 App Router project tree (28+ files) including:
  src/app/ route groups, src/lib/ (auth, db, stripe, email), src/components/,
  src/hooks/, src/types/, middleware.ts, .github/workflows/, .env.example,
  scripts/setup.sh (generated at runtime during scaffolding, not pre-existing)
preferredNextSkills:
  - brandkit-gen
  - ship
  - cicd
fallbackSkills:
  - bootstrap
  - nextjs
memoryReadPolicy: selective
memoryWritePolicy: always
sideEffects: |
  Scaffolds entire project directory. Creates .env.example (never .env.local),
  GitHub Actions workflow files, Drizzle migration files, and scripts/setup.sh.
  No secrets are written to disk.
---

# SaaS Bootstrap

> One prompt → production-ready Next.js SaaS scaffold.

## Default Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | RSC, Server Actions, edge-ready |
| Auth | Better Auth | Multi-provider, sessions, orgs |
| Database | Neon Postgres + Drizzle ORM | Serverless, type-safe queries |
| Payments | Stripe (subscriptions) | Industry standard |
| Email | Resend + React Email | Dev-friendly, deliverable |
| UI | Tailwind v4 + shadcn/ui | Composable, accessible |
| Deploy | Vercel | Zero-config, edge |
| CI/CD | GitHub Actions | Automated test + deploy |

Override any layer via `$ARGUMENTS`: e.g. "use Supabase instead of Neon"

---

## Phase 0 — Discovery

Parse `$ARGUMENTS` for:
- `productName` — app name
- `description` — what it does
- `audience` — B2B / B2C / developer tool
- `billing` — subscription / one-time / usage-based / freemium
- `multiTenant` — org/team support needed? (default: yes for B2B)
- `stackOverrides` — any tech swaps

---

## Phase 1 — Repo Structure

1. **Invoke `bootstrap`** — Scaffold the full directory tree, generate `package.json` with all dependencies, and set up the Next.js 15 App Router route groups.

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # sidebar + header
│   │   ├── page.tsx            # home/overview
│   │   ├── settings/page.tsx
│   │   └── billing/page.tsx
│   ├── (marketing)/
│   │   ├── page.tsx            # landing page
│   │   └── pricing/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts   # Better Auth handler
│       └── stripe/webhook/route.ts
├── components/
│   ├── ui/                     # shadcn primitives
│   ├── auth/                   # login form, user menu
│   ├── billing/                # plan cards, usage meter
│   └── layout/                 # sidebar, header, breadcrumbs
├── lib/
│   ├── auth.ts                 # Better Auth config
│   ├── db/
│   │   ├── index.ts            # Drizzle client
│   │   └── schema.ts           # all tables
│   ├── stripe.ts               # Stripe client + helpers
│   └── email/
│       ├── client.ts           # Resend client
│       └── templates/          # React Email templates
├── hooks/                      # useSession, useBilling, etc.
├── types/                      # shared TypeScript types
└── middleware.ts               # auth route protection
```

---

## Phase 2 — Database Schema

2. **Invoke `drizzle`** — Generate `src/lib/db/schema.ts` with users, organizations (if multiTenant), and subscriptions tables. Run `drizzle-kit generate` to create the migration.

Generate `src/lib/db/schema.ts`:

```typescript
// Users (handled by Better Auth, extended)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan", { enum: ["free", "pro", "enterprise"] }).default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organizations (if multiTenant)
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").references(() => users.id),
  plan: text("plan").default("free"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", { ... });
```

Generate migration: `drizzle-kit generate`

---

## Phase 3 — Auth

3. **Invoke `better-auth`** — Generate `src/lib/auth.ts` with email/password + GitHub/Google OAuth, organization plugin, and all auth UI pages (login, register, password reset) plus middleware route protection.

Generate `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, stripe as stripePlugin } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! },
    google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  },
  plugins: [
    organization(),
    // stripePlugin({ stripeClient: stripe, ... }) // if billing integrated
  ],
});
```

Generate:
- Login page with email/password + OAuth buttons
- Registration with email verification
- Password reset flow
- `middleware.ts` protecting `/dashboard/*` routes
- `useSession()` hook

---

## Phase 4 — Billing

4. **Invoke `stripe`** — Generate `src/lib/stripe.ts`, the webhook handler, billing page UI, Checkout flow, and customer portal integration. Handle all four key subscription webhook events.

Generate Stripe integration:

**Products & prices** (in Stripe dashboard setup script):
```typescript
// Free: no Stripe product
// Pro: $29/month or $290/year
// Enterprise: custom / $299/month
```

Generate:
- `src/lib/stripe.ts` — Stripe client + webhook handler
- `/api/stripe/webhook/route.ts` — handle subscription events
- `/app/(dashboard)/billing/page.tsx` — plan management UI
- Checkout flow via Stripe Checkout (not custom form)
- Customer portal link for self-service management

**Webhook events to handle:**
- `customer.subscription.created` → set user plan
- `customer.subscription.updated` → update plan
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → send dunning email

---

## Phase 5 — Email

5. **Invoke `resend`** — Generate all 5 React Email transactional templates and wire the Resend client into `src/lib/email/client.ts`.

Generate React Email templates:

```
src/lib/email/templates/
├── WelcomeEmail.tsx        — on signup
├── VerifyEmail.tsx         — email verification
├── PasswordResetEmail.tsx  — password reset
├── PaymentFailedEmail.tsx  — dunning
└── TeamInviteEmail.tsx     — org invite
```

All templates: brand colors, responsive, plain-text fallback.

---

## Phase 6 — UI Foundation

6. **Invoke `tailwindcss`** — Generate `app/globals.css` with design tokens (color, radius, shadow) and Tailwind v4 config.
7. **Invoke `nextjs`** — Generate the dashboard layout (collapsible sidebar + header + main), shadcn/ui primitive components, loading skeletons, and error boundary.

Generate:
- `app/globals.css` — design tokens (color, radius, shadow)
- Dashboard layout: collapsible sidebar + header + main
- `components/ui/` — Button, Input, Card, Badge, Avatar, Dialog, Toast
- Loading skeletons for data-fetching routes
- Error boundary with retry button

---

## Phase 7 — CI/CD

8. **Invoke `cicd`** — Generate `.github/workflows/ci.yml` (lint, typecheck, test, build) and `deploy.yml` (CI + Vercel production deploy + smoke tests + Slack notification).

Generate `.github/workflows/`:

```yaml
# ci.yml — on every PR
- lint (biome)
- typecheck (tsc --noEmit)
- test (vitest)
- build check (next build)

# deploy.yml — on main merge
- run CI
- deploy to Vercel (production)
- run smoke tests
- notify Slack on failure
```

---

## Phase 8 — Environment Setup

Generate `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `scripts/setup.sh` at runtime (this file does not pre-exist — it is scaffolded during Phase 8) that:
1. Installs deps (`pnpm install`)
2. Creates `.env.local` from `.env.example`
3. Runs DB migrations (`drizzle-kit migrate`)
4. Seeds dev data (`pnpm db:seed`)
5. Opens browser to `http://localhost:3000`

---

## Output Summary

```
✓ Repo structure     28 files scaffolded
✓ Database schema    5 tables + migrations
✓ Auth               Email + GitHub + Google OAuth
✓ Billing            Stripe subscriptions (3 tiers)
✓ Email              5 transactional templates
✓ UI                 Dashboard layout + components
✓ CI/CD              GitHub Actions (lint/test/deploy)
✓ Setup script       scripts/setup.sh

Run:
  pnpm install && ./scripts/setup.sh
```

---

## Usage

```
/saas-bootstrap Plano — AI proxy with usage-based billing, B2B, team support
/saas-bootstrap InuAuth — Auth library portal, freemium, solo developers
/saas-bootstrap Meey — RE platform, subscription, B2B/B2C hybrid
```
