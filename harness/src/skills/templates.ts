// intent: curated template catalog surfaced in the intent picker. Each template
//         maps to an ORCHESTRATOR or HUB skill that actually drives multi-step work.
//         Domain skills (recharts, expo, api-toolkit) get matched automatically
//         by the intent keyword scorer — they don't need to be the anchor.
// status: done
// confidence: high

import { loadRegistry, type SkillEntry } from "./registry.js";

export type Template = {
  id: string;
  name: string;
  description: string;
  intent: string;
  skill?: SkillEntry;
};

// intent: skillHint must be an ORCHESTRATOR or HUB that can drive the work.
// Domain skills get picked up by selectSkillsForIntent() from intent keywords.
//
// Orchestrators: saas-bootstrap, landing-gen, forge, cook, bootstrap, ship, gsd
// Hubs: fix, refactor, test, code-review, debug, ui-polish
const BUILTIN: { id: string; name: string; fallbackDesc: string; skillHint: string; intent: string }[] = [
  {
    id: "saas",
    name: "SaaS Starter",
    fallbackDesc: "Full SaaS scaffolding — auth, billing, DB, CI/CD",
    skillHint: "saas-bootstrap",
    intent: "Bootstrap a SaaS app with Next.js 15, auth, Stripe billing, Postgres, and Tailwind v4",
  },
  {
    id: "landing",
    name: "Landing Page",
    fallbackDesc: "Full landing page — hero, features, pricing, SEO",
    skillHint: "landing-gen",
    intent: "Build a high-conversion landing page with hero, features, testimonials, pricing, and CTA",
  },
  {
    id: "dashboard",
    name: "Admin Dashboard",
    fallbackDesc: "Internal tool — tables, charts, filters, auth",
    // cook orchestrates end-to-end builds; recharts/shadcn get matched from intent keywords
    skillHint: "cook",
    intent: "Create an admin dashboard with sortable tables, filtering, recharts visualizations, and auth",
  },
  {
    id: "api",
    name: "Typed API",
    fallbackDesc: "REST/GraphQL — validation, auth, rate-limiting, docs",
    // cook drives the build; api-toolkit/zod/openapi matched from keywords
    skillHint: "cook",
    intent: "Build a typed API with zod validation, auth, rate-limiting, and OpenAPI docs",
  },
  {
    id: "mobile",
    name: "Mobile App",
    fallbackDesc: "Expo + React Native — routing, auth, navigation",
    // bootstrap scaffolds new projects; expo matched from keywords
    skillHint: "bootstrap",
    intent: "Bootstrap an Expo React Native app with auth, tab navigator, and Expo Router",
  },
  {
    id: "content",
    name: "Content Site",
    fallbackDesc: "Blog or docs — MDX, search, RSS, SEO",
    // bootstrap scaffolds; mdx/seo matched from keywords
    skillHint: "bootstrap",
    intent: "Bootstrap a content-driven site with Next.js, MDX, full-text search, RSS, and SEO",
  },
  {
    id: "feature",
    name: "Add Feature",
    fallbackDesc: "Extend the current project end-to-end",
    skillHint: "forge",
    intent: "Add a new feature to the current project — start with clarification",
  },
  {
    id: "bugfix",
    name: "Fix / Debug",
    fallbackDesc: "Diagnose and repair failures with minimal blast radius",
    skillHint: "fix",
    intent: "Diagnose a failure in the current project and produce a minimal, verified fix",
  },
  {
    id: "refactor",
    name: "Refactor",
    fallbackDesc: "Restructure code safely with verification checkpoints",
    skillHint: "refactor",
    intent: "Refactor the current codebase — improve structure, reduce duplication, clarify intent",
  },
  {
    id: "test",
    name: "Test Suite",
    fallbackDesc: "Plan and generate unit, integration, and e2e tests",
    skillHint: "test",
    intent: "Add comprehensive test coverage to the current project — unit, integration, and e2e",
  },
];

export function listTemplates(): Template[] {
  const reg = loadRegistry();
  const byName = new Map(reg.skills.map((s) => [s.name, s] as const));

  return BUILTIN.map((t) => {
    const skill = byName.get(t.skillHint);
    return {
      id: t.id,
      name: t.name,
      // Use the real skill description if available, otherwise fallback
      description: skill ? truncate(skill.description, 55) : t.fallbackDesc,
      intent: t.intent,
      skill,
    };
  });
}

export function getTemplate(id: string): Template | undefined {
  return listTemplates().find((t) => t.id === id);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
