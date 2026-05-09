// intent: pre-populate a demo project with realistic memories so the Memory tab
//         graph lights up on stage during a live pitch (no prior chat needed).
// status: done
// next: per-project pack templates (e.g. ecommerce / saas / mobile-app)
//
// Usage:
//   npx tsx packages/memory/scripts/seed-demo-project.ts <project-slug>
//
// Defaults to "acomo" (the canonical pitch demo). Idempotent — re-running
// upserts by title so duplicates don't accrete in the graph.

import { createMemory, createRelation, searchMemories } from "../src/memory.js";

interface SeedMemory {
  title: string;
  content: string;
  category:
    | "identity"
    | "preference"
    | "style-preference"
    | "tool-preference"
    | "workflow-pattern"
    | "decision"
    | "solution"
    | "architecture"
    | "pattern"
    | "insight"
    | "project-context"
    | "session-summary"
    | "correction-log"
    | "learning";
  importance: number;
  tags?: string[];
  /** Resolved at seed time → links to a target memory by title. */
  links?: Array<{
    relation: "supports" | "applies-to" | "learned-from" | "caused-by" | "supersedes" | "contradicts";
    targetTitle: string;
  }>;
}

function buildSeed(scope: string, displayName: string): SeedMemory[] {
  return [
    // ── project-context (knowledge/reference) ──
    {
      title: `${displayName} — project overview`,
      content: `${displayName} is an opinionated ecommerce storefront with a focus on perceived performance and design polish. Stack: Next.js 15 App Router, React 19, Tailwind v4, shadcn/ui. Backend: Postgres (Neon) with Drizzle ORM. Payments: Stripe. Search: Postgres pg_trgm + tsvector. Hosting: Vercel for the web tier; images via Cloudflare R2 + transforms.`,
      category: "project-context",
      importance: 9,
      tags: ["overview", "stack"],
    },
    {
      title: `${displayName} — primary goal`,
      content: `Ship a storefront that converts at >2.5% on cold traffic in under 6 weeks. Optimize for: time-to-first-byte under 200ms (regional edge), Lighthouse mobile >95, and a checkout that completes in 3 taps from product page.`,
      category: "project-context",
      importance: 9,
      tags: ["goals", "perf-target"],
    },
    {
      title: `${displayName} — scope cuts`,
      content: `Out of scope for v1: multi-currency, internationalization, B2B / wholesale flow, subscription billing, customer accounts (guest checkout only). Out of scope for v2: marketplace / multi-vendor, native mobile app. Revisit at 1k MAU.`,
      category: "project-context",
      importance: 7,
      tags: ["scope"],
    },

    // ── architecture decisions (knowledge/decisions) ──
    {
      title: `Decision: Next.js App Router (not Pages)`,
      content: `App Router with React Server Components. Reasons: streaming SSR for product pages (LCP <1.5s on cold cache), nested layouts for the cart drawer, and server-side data fetching without an API hop. Cost: requires Node 22+ on Vercel; React 19 not yet supported by some libraries.`,
      category: "decision",
      importance: 8,
      tags: ["nextjs", "stack"],
    },
    {
      title: `Decision: Drizzle over Prisma`,
      content: `Drizzle ORM picked over Prisma for the storefront. Reasons: zero-runtime migrations (Drizzle Kit emits SQL — no engine binary), edge-runtime compatible (Prisma ships a 30MB engine), and TS-first schema lets us share types between server and edge. Cost: smaller ecosystem, fewer convenience helpers (we re-implement upserts).`,
      category: "decision",
      importance: 8,
      tags: ["drizzle", "db", "edge"],
    },
    {
      title: `Decision: Stripe Checkout (hosted) for v1`,
      content: `Use Stripe-hosted Checkout instead of Elements for v1. Reasons: PCI scope reduction, faster integration (~2 days vs 2 weeks), localized payment methods auto-handled. Cost: one extra redirect, less brand control. Revisit when LTV > $200 and we want to A/B test the payment step.`,
      category: "decision",
      importance: 7,
      tags: ["stripe", "checkout"],
    },
    {
      title: `Decision: Cloudflare R2 + image transforms`,
      content: `Product images live in R2 (S3-compatible, no egress fees) and pass through Cloudflare Images for resize/crop. Costs ~10x less than Vercel's image optimization for >100k images/mo, and the cache is global. Tradeoff: separate URL space; we mirror SKU → R2 key in the catalog table.`,
      category: "decision",
      importance: 7,
      tags: ["images", "r2", "perf"],
    },

    // ── architecture (knowledge/patterns) ──
    {
      title: `Architecture: cart-as-server-state`,
      content: `Cart lives entirely on the server (Postgres row keyed by anonymous cookie). No client-side cart store. Mutations go through Server Actions; the cart drawer reads via React Server Component re-fetch. Result: cart never desyncs across tabs, and we get free SSR of the cart count in the header.`,
      category: "architecture",
      importance: 8,
      tags: ["cart", "rsc", "server-actions"],
    },
    {
      title: `Architecture: search via Postgres tsvector`,
      content: `Full-text search runs in Postgres using tsvector + pg_trgm for fuzzy matching. No Algolia / Meilisearch dependency. Why: <50k SKUs fit easily in Postgres FTS; we skip a separate hosted service + sync pipeline. Migration trigger if we hit >500ms p95 on search.`,
      category: "architecture",
      importance: 7,
      tags: ["search", "postgres"],
    },

    // ── patterns (knowledge/patterns) ──
    {
      title: `Pattern: cookie-based anonymous user id`,
      content: `Every visitor gets a UUID cookie on first request (httpOnly, 1-year). The cart, recently-viewed, and wishlist all key off this id. When they sign in, we merge the anonymous data into the account row. Result: zero-friction shopping; full attribution from first touch.`,
      category: "pattern",
      importance: 7,
      tags: ["session", "anon"],
      links: [{ relation: "applies-to", targetTitle: `Architecture: cart-as-server-state` }],
    },
    {
      title: `Pattern: Server Actions for all writes`,
      content: `Every mutation (add-to-cart, update qty, apply discount) is a Server Action — never a client fetch. Benefits: type-safe end-to-end, automatic CSRF handling, optimistic UI via useFormStatus, and the action body only ships server-side so we can hit Drizzle directly.`,
      category: "pattern",
      importance: 7,
      tags: ["server-actions", "rsc"],
      links: [{ relation: "supports", targetTitle: `Decision: Next.js App Router (not Pages)` }],
    },

    // ── insights (knowledge/insights) ──
    {
      title: `Insight: image weight is the perf killer`,
      content: `On cold mobile 4G, the homepage weight breakdown is: HTML 30KB, CSS 14KB, JS 80KB (gzipped), images 1.4MB. Lighthouse improvements from 78 → 95 came almost entirely from converting hero PNGs to AVIF + lazy-loading below-fold cards. JS bundle size barely moved the needle.`,
      category: "insight",
      importance: 8,
      tags: ["perf", "images"],
      links: [{ relation: "caused-by", targetTitle: `Decision: Cloudflare R2 + image transforms` }],
    },
    {
      title: `Insight: checkout abandonment cliff at "shipping address"`,
      content: `Funnel data from a similar storefront: 100 → cart 35% → checkout 22% → shipping-address 18% → payment 16% → complete 14%. Biggest single drop is cart → checkout. Smallest is payment → complete. Implication: optimize the cart drawer's checkout CTA, not the payment UI.`,
      category: "insight",
      importance: 8,
      tags: ["funnel", "conversion"],
    },

    // ── solutions (knowledge/reference) ──
    {
      title: `Solution: edge product pages with stale-while-revalidate`,
      content: `Product pages are rendered at the edge with \`revalidate: 60\` and \`unstable_cache\` keys including the SKU. Adds 80ms p99 fresh; 12ms p99 stale. Stripe webhook flushes specific SKU keys when inventory changes so we never show a sold-out item as in-stock for >60s.`,
      category: "solution",
      importance: 7,
      tags: ["edge", "swr", "cache"],
    },
    {
      title: `Solution: typed env via T3 env`,
      content: `Use t3-env for env var validation at boot. Catches missing STRIPE_SECRET / DATABASE_URL before the app runs vs. failing at first request. Schema mirrors the .env.example one-to-one. Adds ~3KB to the build, negligible.`,
      category: "solution",
      importance: 6,
      tags: ["env", "boot"],
    },

    // ── user/preferences ──
    {
      title: `Pref: prefer functional components + hooks`,
      content: `User prefers functional React components with hooks. No class components. Custom hooks for any logic that's reused across 2+ components. Avoid HOCs entirely — composition over inheritance.`,
      category: "style-preference",
      importance: 7,
      tags: ["react", "style"],
    },
    {
      title: `Pref: shadcn/ui as the component library`,
      content: `Use shadcn/ui for all primitives (Button, Dialog, Sheet, etc.). Copy components into the repo (not npm dep). Customize directly — no prop-drilling theme tokens. Tailwind variants over CSS-in-JS.`,
      category: "tool-preference",
      importance: 7,
      tags: ["ui", "shadcn"],
    },
    {
      title: `Pref: tests in Vitest, not Jest`,
      content: `Unit tests in Vitest. Integration in Playwright. No Jest. Reason: Vite-native, faster cold start (~3x), and shares the same TS config as the app. Snapshot tests only for layout components.`,
      category: "tool-preference",
      importance: 6,
      tags: ["testing", "vitest"],
    },

    // ── correction-log (knowledge/patterns) ──
    {
      title: `Correction: never use 'any' for Drizzle row types`,
      content: `User flagged 'any' in cart row mapping. Drizzle exposes \`InferSelectModel<typeof cartItems>\` — use that. If a join's shape isn't yet typed, use \`Awaited<ReturnType<typeof db.query.cartItems.findMany>>\`. Never \`any\`. Never repeat.`,
      category: "correction-log",
      importance: 8,
      tags: ["typescript", "drizzle"],
    },

    // ── workflow-pattern ──
    {
      title: `Workflow: PR-per-feature, conventional commits`,
      content: `One PR per feature, branched off main, conventional-commit messages (feat / fix / docs / chore / refactor / test). PR body must include: what + why + test plan. CI must pass: typecheck, lint, vitest, playwright smoke. Squash-merge.`,
      category: "workflow-pattern",
      importance: 7,
      tags: ["pr", "git"],
    },

    // ── identity ──
    {
      title: `User identity: Danny, builder + presenter`,
      content: `Danny — solo / small-team builder shipping ecommerce + AI-tooling products. Habits: ships fast, demos in public, prefers showing > telling. Communication style: terse, direct, async-friendly. Allergic to over-architecting. Will redirect mid-conversation if the agent goes too theoretical.`,
      category: "identity",
      importance: 9,
      tags: ["user", "danny"],
    },
  ];
}

export async function seedDemoProject(
  scope = "acomo",
  displayName?: string
): Promise<{ created: number; skipped: number; linked: number }> {
  const name = displayName ?? scope.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const seed = buildSeed(scope, name);

  let created = 0;
  let skipped = 0;
  let linked = 0;
  const idByTitle = new Map<string, string>();

  for (const m of seed) {
    // Idempotency by title: search the scope for an exact title match.
    const existing = await searchMemories({ query: m.title, scope, limit: 5 }).catch(() => []);
    const match = existing.find((row) => row.title === m.title);
    if (match?.id) {
      idByTitle.set(m.title, match.id);
      skipped += 1;
      continue;
    }
    const created_mem = await createMemory({
      title: m.title,
      content: m.content,
      category: m.category,
      importance: m.importance,
      confidence: 1.0,
      scope,
      tags: m.tags,
      source: "seed-demo",
    });
    if (created_mem?.id) {
      idByTitle.set(m.title, created_mem.id);
      created += 1;
    }
  }

  // Resolve relations now that all nodes exist.
  for (const m of seed) {
    if (!m.links?.length) continue;
    const sourceId = idByTitle.get(m.title);
    if (!sourceId) continue;
    for (const link of m.links) {
      const targetId = idByTitle.get(link.targetTitle);
      if (!targetId) continue;
      try {
        await createRelation(sourceId, targetId, link.relation, 0.85);
        linked += 1;
      } catch {
        // Idempotency: relation may already exist; ignore.
      }
    }
  }

  return { created, skipped, linked };
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("seed-demo-project.ts")) {
  const scope = process.argv[2] ?? "acomo";
  seedDemoProject(scope)
    .then(({ created, skipped, linked }) => {
      console.log(JSON.stringify({ scope, created, skipped, linked }, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
