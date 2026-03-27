/**
 * prompt-analyzer.ts — Auto-trigger engine for UltraThink skill mesh.
 *
 * Analyzes user prompts and scores skills from _registry.json against them.
 * Returns top matching skills with confidence > threshold.
 *
 * Optimizations:
 * - Session-scoped registry cache (avoids re-parsing 84KB JSON every prompt)
 * - Session-scoped project stack cache (avoids 8+ fs.exists calls per prompt)
 * - Two-pass scoring: fast trigger scan first, full scoring only on candidates
 * - Intent detection: classifies prompt intent for category-level boosting
 * - Graph traversal: follows linksTo edges to surface related skills
 * - Pre-computed lowercased triggers (avoids re-lowercasing in inner loops)
 * - Cached compiled regex patterns for word-boundary matching
 * - Early termination: skips fuzzy-only candidates when enough high-confidence matches found
 * - Set-based intent category lookups for O(1) membership tests
 *
 * Called by: prompt-submit.sh (UserPromptSubmit hook)
 * Input: user prompt text via argv[2]
 * Output: JSON { skills: [...], context: string }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildDecisionContext } from "./decision-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Types ───────────────────────────────────────────────────────────

interface RegistrySkill {
  name: string;
  description: string;
  layer: string;
  category: string;
  triggers: string[];
  linksTo?: string[];
  linkedFrom?: string[];
  websearch?: boolean;
  path?: string | null;
}

interface ScoredSkill {
  name: string;
  score: number;
  matchedTriggers: string[];
  description: string;
  websearch?: boolean;
  layer: string;
  category: string;
}

interface RegistryCache {
  skills: RegistrySkill[];
  mtime: number;
}

// ─── Configuration ───────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 2.0;
const MAX_SKILLS = 5;
const MIN_PROMPT_LENGTH = 5;
const CACHE_DIR = "/tmp/ultrathink-status";
const GRAPH_HOP_BONUS = 1.5; // Score added to skills discovered via graph traversal
const PREFERENCE_BOOST = 1.0; // Score added when skill matches a user identity-graph preference

// ─── Superpowers: now in _registry.json ─────────────────────────────
// Migrated from hardcoded arrays to registry on 2026-03-24.
// See: test-driven-development, systematic-debugging, brainstorming,
// writing-plans, executing-plans, dispatching-parallel-agents, etc.

// (Superpowers + meta-workflow skills removed — now in _registry.json)

// Layer priority: orchestrators > hubs > utilities > domain
const LAYER_BOOST: Record<string, number> = {
  orchestrator: 0.1,
  hub: 0.05,
  utility: 0.02,
  domain: 0,
};

// Domain inference: prompt keywords → likely categories
const DOMAIN_SIGNALS: Record<string, string[]> = {
  frontend: [
    "button",
    "card",
    "modal",
    "navbar",
    "sidebar",
    "form",
    "input",
    "layout",
    "page",
    "component",
    "ui",
    "ux",
    "design",
    "style",
    "css",
    "tailwind",
    "responsive",
  ],
  backend: [
    "api",
    "endpoint",
    "route",
    "middleware",
    "database",
    "query",
    "migration",
    "schema",
    "auth",
    "jwt",
    "session",
  ],
  devops: ["deploy", "ci", "cd", "pipeline", "docker", "kubernetes", "terraform", "nginx", "ssl", "domain"],
  testing: [
    "test",
    "spec",
    "coverage",
    "mock",
    "fixture",
    "e2e",
    "unit test",
    "integration test",
    "playwright",
    "vitest",
    "cypress",
  ],
  design: [
    "figma",
    "color",
    "palette",
    "typography",
    "font",
    "spacing",
    "animation",
    "motion",
    "framer",
    "glassmorphism",
    "gradient",
    "shadow",
    "hover",
    "dark mode",
    "light mode",
  ],
  data: ["chart", "graph", "visualization", "dashboard", "analytics", "metrics", "monitoring"],
  realtime: ["websocket", "socket", "real-time", "realtime", "live", "presence", "collaboration", "sync"],
  state: ["state management", "zustand", "jotai", "redux", "store", "atom", "global state"],
  editor: ["rich text", "editor", "wysiwyg", "tiptap", "prosemirror", "markdown editor", "content editing"],
  mobile: ["mobile", "ios", "android", "react native", "expo", "app store", "responsive mobile", "native app"],
  desktop: ["electron", "desktop app", "system tray", "native desktop", "cross-platform desktop"],
  cms: ["cms", "content management", "headless cms", "payload", "sanity", "contentlayer", "strapi", "mdx"],
  monorepo: ["monorepo", "workspace", "turborepo", "nx", "pnpm workspace", "lerna"],
  ai: ["openai", "gpt", "llm", "embedding", "vector", "ai sdk", "langchain", "ai agent", "chatbot"],
  auth: ["auth", "login", "signup", "session", "jwt", "oauth", "sso", "password", "credentials", "next-auth"],
  "data-fetching": ["fetch", "api call", "query", "mutation", "tanstack query", "react query", "swr", "data loading"],
  a11y: ["accessibility", "a11y", "wcag", "aria", "screen reader", "keyboard nav", "focus trap", "alt text"],
  seo: [
    "seo",
    "meta tags",
    "opengraph",
    "sitemap",
    "robots.txt",
    "structured data",
    "schema.org",
    "core web vitals",
    "lighthouse",
  ],
  streaming: ["stream", "streaming", "sse", "server sent events", "readable stream", "chunked", "streaming ssr"],
  upload: ["upload", "file upload", "dropzone", "drag and drop", "multipart", "presigned url", "chunked upload"],
  scheduling: ["cron", "cron job", "scheduled", "scheduler", "periodic", "qstash", "recurring task"],
  routing: [
    "parallel route",
    "intercepting route",
    "slot",
    "modal route",
    "route group",
    "dynamic route",
    "catch-all route",
  ],
  "feature-management": [
    "feature flag",
    "feature toggle",
    "ab test",
    "experiment",
    "gradual rollout",
    "canary",
    "statsig",
    "launchdarkly",
  ],
  theming: ["dark mode", "light mode", "theme", "color scheme", "theme toggle", "system theme"],
  observability: [
    "opentelemetry",
    "otel",
    "tracing",
    "distributed tracing",
    "spans",
    "telemetry",
    "traces",
    "metrics export",
  ],
  search: [
    "search",
    "full-text search",
    "fuzzy search",
    "algolia",
    "meilisearch",
    "elasticsearch",
    "search bar",
    "autocomplete",
    "typeahead",
  ],
  pagination: [
    "pagination",
    "paginate",
    "infinite scroll",
    "cursor pagination",
    "load more",
    "next page",
    "offset pagination",
  ],
  pdf: ["pdf", "pdf generation", "generate pdf", "pdf export", "react-pdf", "pdfkit", "document generation"],
  oauth: [
    "oauth",
    "oauth2",
    "openid connect",
    "oidc",
    "authorization code",
    "PKCE",
    "social login",
    "identity provider",
  ],
  "web-components": ["web component", "custom element", "shadow dom", "html template", "slots"],
  cors: ["cors", "cross-origin", "access-control", "preflight", "cors error", "cors headers", "origin policy"],
  "web-workers": [
    "web worker",
    "worker thread",
    "shared worker",
    "comlink",
    "off main thread",
    "worker pool",
    "postmessage",
  ],
  "code-splitting": [
    "code splitting",
    "dynamic import",
    "react lazy",
    "lazy loading",
    "bundle size",
    "tree shaking",
    "bundle analyzer",
    "chunk",
  ],
  "event-sourcing": [
    "event sourcing",
    "cqrs",
    "event store",
    "event driven",
    "projections",
    "domain events",
    "command query",
  ],
  grpc: ["grpc", "protobuf", "protocol buffers", "grpc-web", "proto file", "grpc streaming", "rpc"],
  transactions: [
    "transaction",
    "isolation level",
    "deadlock",
    "optimistic locking",
    "saga pattern",
    "two phase commit",
    "database lock",
    "rollback",
  ],
  "error-tracking": [
    "sentry",
    "error tracking",
    "error monitoring",
    "breadcrumbs",
    "source maps sentry",
    "crash reporting",
  ],
  openapi: ["openapi", "swagger", "openapi spec", "api spec", "swagger ui", "api documentation", "openapi schema"],
  dns: ["dns", "dns record", "cname", "domain setup", "ssl certificate", "dns propagation", "nameserver", "mx record"],
  analytics: [
    "analytics",
    "event tracking",
    "plausible",
    "posthog",
    "google analytics",
    "ga4",
    "conversion tracking",
    "page views",
  ],
  "component-patterns": [
    "compound component",
    "render props",
    "headless component",
    "polymorphic",
    "hoc",
    "higher order component",
  ],
  "a11y-testing": [
    "axe-core",
    "pa11y",
    "a11y audit",
    "screen reader test",
    "keyboard testing",
    "lighthouse accessibility",
  ],
  "test-strategy": ["test pyramid", "testing trophy", "test strategy", "what to test", "test coverage goal"],
  "db-backup": ["database backup", "pg_dump", "wal archive", "point in time recovery", "db restore", "backup strategy"],
  "env-mgmt": ["staging environment", "preview deploy", "environment promotion", "multi environment", "config per env"],
  "cursor-config": ["cursor rules", "cursorrules", "cursor ide", "ai coding assistant", "cursor config"],
  flask: ["flask", "flask blueprint", "flask extension", "flask-restful", "jinja2", "werkzeug", "flask sqlalchemy"],
  nestjs: ["nestjs", "nest module", "nest guard", "nest interceptor", "nest pipe", "nest controller", "nest provider"],
  vite: ["vite", "vite config", "vite plugin", "vite build", "vite hmr", "rollup plugin", "vite ssr"],
  eslint: ["eslint", "eslint config", "eslint rule", "eslint plugin", "lint error", "flat config", "eslintrc"],
  prettier: ["prettier", "prettier config", "code formatting", "prettier plugin", "format code"],
  "github-actions": [
    "github actions",
    "github workflow",
    "gh action",
    "actions yaml",
    "workflow dispatch",
    "workflow_run",
  ],
  "api-gateway": ["api gateway", "gateway pattern", "service mesh", "api proxy", "kong", "envoy", "traefik"],
  "dependency-injection": [
    "dependency injection",
    "IoC",
    "inversion of control",
    "DI container",
    "service provider",
    "inject",
  ],
  cqrs: ["cqrs", "command query", "read model", "write model", "projection", "command handler", "query handler"],
  "contract-testing": [
    "contract test",
    "pact",
    "consumer driven",
    "api contract",
    "schema validation",
    "provider verification",
  ],
  "spring-boot": ["spring boot", "spring framework", "spring jpa", "spring security", "spring actuator", "spring bean"],
  laravel: ["laravel", "eloquent", "blade template", "artisan", "laravel sanctum", "laravel queue"],
  "ruby-rails": ["rails", "ruby on rails", "activerecord", "hotwire", "turbo rails", "stimulus", "erb template"],
  "graphql-codegen": [
    "graphql codegen",
    "codegen",
    "typed graphql",
    "fragment colocation",
    "gql.tada",
    "graphql-codegen",
  ],
  "database-replication": [
    "replication",
    "read replica",
    "failover",
    "streaming replication",
    "primary-replica",
    "pgbouncer",
  ],
  "load-testing": ["load test", "stress test", "k6", "artillery", "locust", "performance test", "benchmark"],
  "service-worker": ["service worker", "workbox", "offline first", "precache", "sw.js", "cache strategy"],
  "css-grid": ["css grid", "grid layout", "grid template", "subgrid", "grid area", "auto-fit", "auto-fill"],
  "http-client": ["http client", "fetch wrapper", "axios", "ky", "got", "request interceptor"],
  "state-machines": ["state machine", "xstate", "statechart", "finite state", "state transition", "fsm"],
  "ai-function-calling": [
    "function calling",
    "tool use",
    "tool_use",
    "function call",
    "tool definition",
    "tool schema",
    "function schema",
  ],
  "prompt-caching": [
    "prompt caching",
    "cache prompt",
    "cached prompt",
    "context caching",
    "prefix caching",
    "cache control",
  ],
  "database-migration-patterns": [
    "migration pattern",
    "schema evolution",
    "migration strategy",
    "migration rollback",
    "migration versioning",
    "flyway",
    "liquibase",
  ],
  "api-documentation": [
    "api docs",
    "api documentation",
    "swagger docs",
    "redoc",
    "api reference",
    "openapi docs",
    "api spec docs",
  ],
  "container-orchestration": [
    "container orchestration",
    "docker compose",
    "docker swarm",
    "ecs",
    "fargate",
    "container scheduling",
    "pod orchestration",
  ],
  "secrets-management": [
    "secrets management",
    "vault",
    "secret store",
    "secret rotation",
    "secrets manager",
    "credential management",
    "sealed secrets",
  ],
  "browser-extensions": [
    "browser extension",
    "chrome extension",
    "firefox addon",
    "manifest v3",
    "content script",
    "background script",
    "popup extension",
  ],
  "testing-fixtures": [
    "test fixture",
    "test factory",
    "factory bot",
    "test data",
    "seed data",
    "test setup",
    "fixture generation",
  ],
  "error-monitoring": [
    "error monitoring",
    "crash analytics",
    "error reporting",
    "error aggregation",
    "error alerting",
    "bug tracker",
    "exception tracking",
  ],
  "database-connection-pooling": [
    "connection pool",
    "connection pooling",
    "pgbouncer",
    "pool size",
    "connection limit",
    "pool exhaustion",
    "db pool",
  ],
  "circuit-breaker": [
    "circuit breaker",
    "fault tolerance",
    "resilience",
    "fallback pattern",
    "bulkhead",
    "retry circuit",
  ],
  idempotency: ["idempotent", "idempotency", "idempotency key", "deduplication", "exactly once", "at least once"],
  "cache-invalidation": [
    "cache invalidation",
    "cache busting",
    "stale while revalidate",
    "cache purge",
    "write through",
    "cache aside",
  ],
  "micro-frontends": ["micro frontend", "micro-frontend", "module federation", "single-spa", "federated modules"],
  "serverless-patterns": ["serverless", "lambda", "cloud function", "cold start", "step function", "fan out"],
  "database-sharding": ["sharding", "shard", "horizontal partition", "shard key", "consistent hashing"],
  "csrf-protection": ["csrf", "cross-site request forgery", "csrf token", "same-site cookie", "double submit"],
  "xss-prevention": ["xss", "cross-site scripting", "sanitize html", "dompurify", "script injection"],
  "blue-green-deploy": [
    "blue green",
    "blue-green",
    "canary deploy",
    "zero downtime",
    "rolling deploy",
    "traffic shifting",
  ],
  "full-stack-types": [
    "full stack types",
    "end to end types",
    "shared types",
    "type safe api",
    "full-stack typescript",
  ],
  "webhook-security": ["webhook security", "webhook signature", "webhook verification", "svix", "webhook replay"],
  "database-partitioning": [
    "table partitioning",
    "partition",
    "range partition",
    "partition pruning",
    "hash partition",
  ],
  "api-throttling": ["throttle", "throttling", "backpressure", "token bucket", "sliding window", "429"],
  "monolith-to-micro": ["monolith to microservices", "strangler fig", "service extraction", "modular monolith"],
  "code-generation": ["code generation", "codegen", "scaffold", "hygen", "plop", "template engine"],
  "git-bisect": ["git bisect", "git blame", "git reflog", "find bug commit", "commit archaeology"],
  "data-migration": ["data migration", "etl", "backfill", "dual write", "data pipeline", "data transfer"],
  "api-composition": ["bff", "backend for frontend", "api aggregation", "api composition", "response shaping"],
  "structured-logging": ["structured log", "json log", "correlation id", "request id", "pino", "winston structured"],
  "graceful-shutdown": ["graceful shutdown", "sigterm", "connection draining", "shutdown hook", "process signal"],
};

// Skill category → domain mapping
const CATEGORY_DOMAIN: Record<string, string> = {
  frontend: "frontend",
  backend: "backend",
  devops: "devops",
  testing: "testing",
  design: "design",
  "data-viz": "data",
  "ai-ml": "ai",
  security: "backend",
  database: "backend",
  realtime: "realtime",
  "state-management": "state",
  editor: "editor",
  forms: "frontend",
  mobile: "mobile",
  desktop: "desktop",
  cms: "cms",
  "build-tools": "monorepo",
  ai: "ai",
  internationalization: "frontend",
  utility: "frontend",
  runtime: "backend",
  content: "cms",
  authentication: "auth",
  "data-fetching": "data-fetching",
  "web-performance": "seo",
  "file-handling": "upload",
  scheduling: "scheduling",
  streaming: "streaming",
  observability: "observability",
  performance: "seo",
  search: "search",
  pdf: "pdf",
  documentation: "openapi",
  architecture: "backend",
  "quality-assurance": "testing",
};

// ─── Intent detection ───────────────────────────────────────────────

type Intent =
  | "build"
  | "debug"
  | "refactor"
  | "explore"
  | "code_discovery"
  | "deploy"
  | "test"
  | "design"
  | "plan"
  | "general";

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  build: [/\b(create|build|add|implement|make|write|scaffold|generate|new)\b/i],
  debug: [/\b(fix|bug|error|broken|crash|fail|issue|wrong|debug|trace|diagnose)\b/i],
  refactor: [/\b(refactor|clean|simplify|extract|rename|reorganize|restructure|optimize|improve)\b/i],
  explore: [/\b(explore|find|search|where|how does|explain|understand|what is|show me|audit|review)\b/i],
  code_discovery: [
    /\b(what.*(?:function|export|interface|class|type|method)s?|code structure|module api|function signature|api surface|explore.*code|understand.*module)\b/i,
  ],
  deploy: [/\b(deploy|ship|release|publish|push|ci|cd|pipeline|production|staging)\b/i],
  test: [/\b(test|spec|coverage|assert|mock|fixture|e2e|unit test|integration test)\b/i],
  design: [/\b(design|ui|ux|layout|style|theme|color|animation|responsive|figma)\b/i],
  plan: [/\b(plan|architect|strategy|approach|roadmap|phase|milestone)\b/i],
  general: [],
};

// Intent → skill categories that get a boost (pre-computed as Sets for O(1) lookup)
const INTENT_CATEGORY_BOOST: Record<Intent, Set<string>> = {
  build: new Set(["frontend", "backend", "database", "fullstack", "mobile", "desktop", "cms"]),
  debug: new Set(["debugging", "testing", "logging", "monitoring"]),
  refactor: new Set(["code-quality", "architecture", "patterns"]),
  explore: new Set(["documentation", "code-quality", "onboarding"]),
  code_discovery: new Set(["workflow", "code-quality", "documentation"]),
  deploy: new Set(["devops", "cicd", "infrastructure"]),
  test: new Set(["testing", "quality"]),
  design: new Set(["design", "frontend", "css", "animation"]),
  plan: new Set(["planning", "architecture"]),
  general: new Set(),
};

function detectIntent(promptLower: string): Intent {
  let bestIntent: Intent = "general";
  let bestScore = 0;

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [Intent, RegExp[]][]) {
    if (intent === "general") continue;
    let score = 0;
    for (const pattern of patterns) {
      const matches = promptLower.match(pattern);
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }
  return bestIntent;
}

// ─── GSD task complexity detection ──────────────────────────────────

/**
 * Detect if a prompt describes a non-trivial task that warrants full GSD.
 * Non-trivial = multi-file, multi-step, feature-level work.
 * Trivial = quick fix, single edit, question, config change.
 */
function detectNonTrivialTask(prompt: string, intent: Intent): boolean {
  const lower = prompt.toLowerCase();

  // Build/plan intents with substantial prompts are non-trivial
  if ((intent === "build" || intent === "plan") && prompt.length > 80) return true;

  // Multi-step signals
  const multiStepSignals = [
    /\b(full|complete|entire|whole)\s+(feature|system|implementation|module)\b/i,
    /\b(build|create|implement|add)\s+.{20,}/i, // long description after build verb
    /\b(with|including|plus|also|and then)\b.*\b(with|including|plus|also|and then)\b/i, // compound requirements
    /\b(api|route|endpoint|page|component|table|schema|migration)\b.*\b(api|route|endpoint|page|component|table|schema|migration)\b/i, // multiple artifact types
    /\b(phase|step|stage|first|then|after that|next)\b/i, // sequential work
    /\b(subscription|billing|auth|payment|notification|dashboard|admin|onboarding)\b/i, // feature-level scope
    /\bmulti[- ]?(file|step|page|component|phase)\b/i,
  ];

  let signalCount = 0;
  for (const pattern of multiStepSignals) {
    if (pattern.test(lower)) signalCount++;
  }

  // 2+ signals = non-trivial
  if (signalCount >= 2) return true;

  // Word count heuristic — long prompts describing work tend to be non-trivial
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount > 50 && (intent === "build" || intent === "plan")) return true;

  return false;
}

/**
 * Auto-initialize .planning/ with skeleton files for a new GSD project.
 * Creates: SPEC.md (skeleton), STATE.md (initial), config.json
 */
function initializePlanning(planningDir: string, prompt: string): void {
  mkdirSync(planningDir, { recursive: true });
  mkdirSync(resolve(planningDir, "archive"), { recursive: true });
  mkdirSync(resolve(planningDir, "docs"), { recursive: true });

  const now = new Date().toISOString().split("T")[0];

  // Skeleton SPEC.md — Claude fills this in
  const specContent = `# Spec: [FILL IN — title of the feature/change]

## Problem Statement
[WHY this change is needed — describe the motivation, not the solution]

> Task context: ${prompt.slice(0, 300)}

## Acceptance Criteria
- [ ] [Specific, testable criterion — user-visible behavior]
- [ ] [Another criterion — measurable outcome]
- [ ] [Edge case handling]
- [ ] Build passes with no new errors
- [ ] Existing tests still pass

## Constraints
- [Technical or business constraints]

## Non-Goals (explicit scope fence)
- [What this change does NOT include]
- [Future work explicitly deferred]
`;

  const stateContent = `# State

## Current
Phase: 0, Status: planning
Started: ${now}

## Completed
- (none yet)

## Decisions
- (none yet)

## Blocked
- None

## Next
- Fill in SPEC.md with acceptance criteria
- Research codebase patterns
- Create PLAN.md files
`;

  const configContent = JSON.stringify(
    {
      mode: "interactive",
      granularity: "standard",
      created: now,
      autoVerify: true,
      autoArchive: true,
    },
    null,
    2
  );

  // Only write if files don't exist (don't overwrite)
  const specPath = resolve(planningDir, "SPEC.md");
  const statePath = resolve(planningDir, "STATE.md");
  const configPath = resolve(planningDir, "config.json");

  if (!existsSync(specPath)) writeFileSync(specPath, specContent);
  if (!existsSync(statePath)) writeFileSync(statePath, stateContent);
  if (!existsSync(configPath)) writeFileSync(configPath, configContent);
}

// ─── Session-scoped caching ─────────────────────────────────────────

function getSessionId(): string {
  return (process.env.CC_SESSION_ID || "").slice(0, 12) || "default";
}

// ─── Reference deduplication — inject each ref directive only once per session ───

function getInjectedRefs(sid: string): Set<string> {
  const filePath = join(CACHE_DIR, `refs-injected-${sid}.json`);
  try {
    if (existsSync(filePath)) {
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      return new Set(Array.isArray(data) ? data : []);
    }
  } catch {
    /* corrupted cache — treat as empty */
  }
  return new Set();
}

function markRefsInjected(sid: string, keys: string[]): void {
  if (keys.length === 0) return;
  const filePath = join(CACHE_DIR, `refs-injected-${sid}.json`);
  const existing = getInjectedRefs(sid);
  for (const k of keys) existing.add(k);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify([...existing].slice(0, 50)));
  } catch {
    /* non-critical */
  }
}

function pushRefOnce(refs: string[], injected: Set<string>, newKeys: string[], key: string, content: string): void {
  if (!injected.has(key)) {
    refs.push(content);
    newKeys.push(key);
  }
}

function loadRegistryWithCache(registryPath: string): RegistrySkill[] | null {
  const sid = getSessionId();
  const cachePath = join(CACHE_DIR, `registry-${sid}.json`);

  // Check registry file mtime
  let mtime: number;
  try {
    mtime = statSync(registryPath).mtimeMs;
  } catch {
    return null;
  }

  // Try loading from session cache
  if (existsSync(cachePath)) {
    try {
      const cached: RegistryCache = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (cached.mtime === mtime) {
        return cached.skills;
      }
    } catch {
      /* cache corrupted, re-read */
    }
  }

  // Parse fresh and cache
  try {
    const raw = JSON.parse(readFileSync(registryPath, "utf-8"));
    // Cache fields we need (keep linksTo for graph traversal, strip linkedFrom)
    const allSkills: RegistrySkill[] = Array.isArray(raw.skills) ? raw.skills : Object.values(raw);
    const slim = allSkills.map((s: RegistrySkill) => ({
      name: s.name,
      description: s.description,
      layer: s.layer,
      category: s.category,
      triggers: s.triggers,
      linksTo: s.linksTo || [],
      websearch: s.websearch || false,
      path: s.path || null,
    }));
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, JSON.stringify({ skills: slim, mtime }));
    return slim;
  } catch {
    return null;
  }
}

function loadProjectStackWithCache(): Set<string> {
  const sid = getSessionId();
  const cachePath = join(CACHE_DIR, `stack-${sid}.json`);

  // Use cached stack if available (valid for entire session)
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf-8"));
      return new Set(cached);
    } catch {
      /* re-detect */
    }
  }

  const stack = detectProjectStack();
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, JSON.stringify([...stack]));
  } catch {
    /* non-critical */
  }
  return stack;
}

// ─── Core scoring ────────────────────────────────────────────────────

/** Cache for compiled word-boundary regex patterns (avoids re-compiling on every prompt) */
const triggerRegexCache = new Map<string, RegExp>();

/** Check if a trigger matches with word boundaries (avoids "form" matching "information") */
function isWordBoundaryMatch(prompt: string, trigger: string): boolean {
  // For single-word triggers, require word boundary
  if (!trigger.includes(" ")) {
    let re = triggerRegexCache.get(trigger);
    if (!re) {
      re = new RegExp(`\\b${trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      triggerRegexCache.set(trigger, re);
    }
    return re.test(prompt);
  }
  // Multi-word triggers: substring match (trigger already lowercased by caller)
  return prompt.includes(trigger);
}

/** Levenshtein distance — edit distance between two strings */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

/** Check if any word in prompt is within edit distance 1-2 of a trigger (fuzzy/typo match) */
function fuzzyTriggerMatch(promptWords: string[], triggerLower: string): boolean {
  // Only fuzzy-match single-word triggers >= 5 chars (avoid false positives like "form" ↔ "information")
  // Caller must pass already-lowercased trigger
  if (triggerLower.includes(" ") || triggerLower.length < 5) return false;
  // Stricter distance thresholds: ≤1 for 5-7 char words, ≤2 only for 8+ char words
  const maxDist = triggerLower.length >= 8 ? 2 : 1;
  for (const word of promptWords) {
    // Both the trigger and prompt word must be >= 5 chars to attempt fuzzy matching
    if (word.length < 5) continue;
    // Quick length check to skip obviously different words
    if (Math.abs(word.length - triggerLower.length) > maxDist) continue;
    if (levenshtein(word, triggerLower) <= maxDist) return true;
  }
  return false;
}

type MatchQuality = "exact" | "boundary" | "fuzzy";

/** Pre-computed lowercased triggers for each skill, built lazily once per registry load. */
let precomputedTriggers: string[][] | null = null;
let precomputedTriggersForSkills: RegistrySkill[] | null = null;

function getPrecomputedTriggers(skills: RegistrySkill[]): string[][] {
  // Rebuild if skills array reference changed (new registry load)
  if (precomputedTriggersForSkills !== skills) {
    precomputedTriggers = skills.map((s) => s.triggers.map((t) => t.toLowerCase()));
    precomputedTriggersForSkills = skills;
  }
  return precomputedTriggers!;
}

/** Pass 1: Fast trigger-only scan with word-boundary checking + fuzzy fallback + skill name matching. */
function quickTriggerScan(
  skills: RegistrySkill[],
  promptLower: string,
  promptWordsList: string[]
): Map<number, { triggers: string[]; qualities: MatchQuality[] }> {
  const candidates = new Map<number, { triggers: string[]; qualities: MatchQuality[] }>();
  const loweredTriggers = getPrecomputedTriggers(skills);

  for (let i = 0; i < skills.length; i++) {
    const triggers: string[] = [];
    const qualities: MatchQuality[] = [];
    const skillTriggers = skills[i].triggers;
    const skillTriggersLower = loweredTriggers[i];

    // Skill name matching: if prompt contains the skill name (or space-separated variant), treat as exact
    const skillName = skills[i].name.toLowerCase();
    if (isWordBoundaryMatch(promptLower, skillName)) {
      triggers.push(skills[i].name);
      qualities.push("exact");
    } else if (skillName.includes("-")) {
      // Also match "react hook form" for skill "react-hook-form"
      const spaced = skillName.replace(/-/g, " ");
      if (promptLower.includes(spaced)) {
        triggers.push(skills[i].name);
        qualities.push("exact");
      }
    }

    for (let t = 0; t < skillTriggers.length; t++) {
      const tLower = skillTriggersLower[t];
      // Check if the entire prompt IS the trigger (or very close)
      const isExact =
        promptLower === tLower || promptLower.startsWith(tLower + " ") || promptLower.endsWith(" " + tLower);
      if (isExact) {
        triggers.push(skillTriggers[t]);
        qualities.push("exact");
      } else if (isWordBoundaryMatch(promptLower, tLower)) {
        triggers.push(skillTriggers[t]);
        qualities.push("boundary");
      } else if (fuzzyTriggerMatch(promptWordsList, tLower)) {
        triggers.push(skillTriggers[t]);
        qualities.push("fuzzy");
      }
    }
    if (triggers.length > 0) {
      candidates.set(i, { triggers, qualities });
    }
  }
  return candidates;
}

/** Load user preferences from session-start identity graph export (if available). */
let cachedUserPreferences: string[] | null | undefined = undefined; // undefined = not yet loaded
function loadUserPreferences(): string[] | null {
  if (cachedUserPreferences !== undefined) return cachedUserPreferences;
  try {
    // Session-start populates this from the identity graph
    const sessionId = (process.env.CC_SESSION_ID || "").slice(0, 12) || "default";
    const prefPath = join(CACHE_DIR, `preferences-${sessionId}.json`);
    if (existsSync(prefPath)) {
      const data = JSON.parse(readFileSync(prefPath, "utf-8"));
      // Expect { preferences: ["tailwind", "drizzle", "react", ...] }
      cachedUserPreferences = Array.isArray(data.preferences) ? data.preferences : null;
    } else {
      cachedUserPreferences = null;
    }
  } catch {
    cachedUserPreferences = null;
  }
  return cachedUserPreferences ?? null;
}

/** Pass 2: Full scoring on candidates only. */
function fullScore(
  skill: RegistrySkill,
  promptLower: string,
  promptWords: Set<string>,
  domainScores: Record<string, number>,
  matchedTriggers: string[],
  matchQualities: MatchQuality[],
  intent: Intent
): ScoredSkill {
  let score = 0;

  // 1. Trigger scoring with quality weighting
  for (let i = 0; i < matchedTriggers.length; i++) {
    const trigger = matchedTriggers[i];
    const quality = matchQualities[i] || "boundary";
    const wordCount = trigger.split(/\s+/).length;
    // Base: multi-word triggers score higher (more specific)
    let triggerScore = wordCount >= 3 ? 4 : wordCount >= 2 ? 3 : 2;
    // Quality multiplier: exact > boundary > fuzzy
    if (quality === "exact") triggerScore *= 1.5;
    else if (quality === "fuzzy") triggerScore *= 0.4; // typo matches get heavily reduced score
    score += triggerScore;
  }

  // 2. Word overlap with skill name and description (with simple stemming)
  const skillWordsList = `${skill.name} ${skill.description}`
    .toLowerCase()
    .split(/[\s\-_,./]+/)
    .filter((w) => w.length > 2);
  const skillWords = new Set(skillWordsList);
  // Also add stems (strip common suffixes) for fuzzy overlap
  for (const w of skillWordsList) {
    if (w.endsWith("s") && w.length > 3) skillWords.add(w.slice(0, -1));
    if (w.endsWith("ing") && w.length > 5) skillWords.add(w.slice(0, -3));
    if (w.endsWith("ed") && w.length > 4) skillWords.add(w.slice(0, -2));
    if (w.endsWith("tion") && w.length > 6) skillWords.add(w.slice(0, -4));
  }
  let overlap = 0;
  for (const word of promptWords) {
    if (skillWords.has(word)) overlap++;
    // Also check prompt word stems
    else if (word.endsWith("s") && word.length > 3 && skillWords.has(word.slice(0, -1))) overlap++;
    else if (word.endsWith("ing") && word.length > 5 && skillWords.has(word.slice(0, -3))) overlap++;
  }
  if (overlap > 0) score += Math.min(overlap * 0.5, 2);

  // 3. Domain boost — if prompt domain matches skill category
  const skillDomain = CATEGORY_DOMAIN[skill.category] || skill.category;
  if (domainScores[skillDomain] && domainScores[skillDomain] > 0) {
    score += domainScores[skillDomain] * 0.3;
  }

  // 4. Layer boost
  score += LAYER_BOOST[skill.layer] || 0;

  // 5. Intent boost — skills whose category matches the detected intent get a bump
  const boostedCategories = INTENT_CATEGORY_BOOST[intent];
  if (boostedCategories && boostedCategories.has(skill.category)) {
    score += 0.5;
  }

  // 6. VFS boost — when code_discovery intent detected, strongly boost VFS and related skills
  if (
    intent === "code_discovery" &&
    (skill.name === "vfs" || skill.name === "scout" || skill.name === "code-explainer")
  ) {
    score += 1.5;
  }

  // 7. User preference boost — identity graph preferences boost matching skills
  const userPrefs = loadUserPreferences();
  if (userPrefs) {
    const skillNameLower = skill.name.toLowerCase();
    for (const pref of userPrefs) {
      const prefLower = pref.toLowerCase();
      if (skillNameLower.includes(prefLower) || prefLower.includes(skillNameLower)) {
        score += PREFERENCE_BOOST;
        break;
      }
    }
  }

  return {
    name: skill.name,
    score,
    matchedTriggers,
    description: skill.description.slice(0, 100),
    layer: skill.layer,
    category: skill.category,
    websearch: skill.websearch || false,
  };
}

function detectDomains(promptLower: string): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
    let count = 0;
    for (const signal of signals) {
      if (promptLower.includes(signal)) count++;
    }
    if (count > 0) scores[domain] = count;
  }
  return scores;
}

// ─── Main ────────────────────────────────────────────────────────────

function detectProjectStack(): Set<string> {
  const stack = new Set<string>();
  try {
    const pkgPath = resolve(process.cwd(), "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const dep of Object.keys(allDeps)) {
        if (dep.includes("react")) stack.add("frontend");
        if (dep.includes("next")) stack.add("frontend");
        if (dep.includes("vue")) stack.add("frontend");
        if (dep.includes("tailwind")) stack.add("frontend");
        if (dep.includes("express") || dep.includes("fastify") || dep.includes("hono")) stack.add("backend");
        if (dep.includes("prisma") || dep.includes("drizzle")) stack.add("database");
        if (dep.includes("stripe")) stack.add("billing");
        if (dep.includes("supabase")) stack.add("backend");
        if (dep.includes("playwright") || dep.includes("vitest") || dep.includes("jest") || dep.includes("cypress"))
          stack.add("testing");
        if (dep.includes("electron")) stack.add("desktop");
        if (dep.includes("expo") || dep.includes("react-native")) stack.add("mobile");
        if (dep.includes("openai") || dep.includes("ai")) stack.add("ai");
        if (dep.includes("payload") || dep.includes("sanity") || dep.includes("contentlayer")) stack.add("cms");
        if (dep.includes("turborepo") || dep.includes("nx")) stack.add("monorepo");
        if (dep.includes("upstash")) stack.add("backend");
        if (dep.includes("@testing-library")) stack.add("testing");
        if (dep.includes("htmx")) stack.add("frontend");
        if (dep.includes("uploadthing") || dep.includes("multer")) stack.add("upload");
        if (dep.includes("inngest") || dep.includes("bullmq")) stack.add("scheduling");
        if (dep.includes("@opentelemetry")) stack.add("observability");
        if (dep.includes("algolia") || dep.includes("meilisearch")) stack.add("search");
        if (dep.includes("react-email") || dep.includes("mjml")) stack.add("email");
        if (dep.includes("web-vitals")) stack.add("performance");
        if (dep.includes("better-sqlite3") || dep.includes("libsql")) stack.add("database");
        if (dep.includes("@sentry")) stack.add("error-tracking");
        if (dep.includes("@grpc") || dep.includes("protobufjs")) stack.add("grpc");
        if (dep.includes("plausible") || dep.includes("posthog")) stack.add("analytics");
        if (dep.includes("comlink")) stack.add("web-workers");
        if (dep.includes("swagger") || dep.includes("openapi")) stack.add("openapi");
        if (dep.includes("@biomejs")) stack.add("tooling");
        if (dep.includes("flask") || dep.includes("werkzeug")) stack.add("flask");
        if (dep.includes("@nestjs")) stack.add("nestjs");
        if (dep.includes("vite")) stack.add("vite");
        if (dep.includes("eslint")) stack.add("eslint");
        if (dep.includes("prettier")) stack.add("prettier");
        if (dep.includes("@pact-foundation")) stack.add("contract-testing");
        if (dep.includes("xstate")) stack.add("state-machines");
        if (dep.includes("@graphql-codegen")) stack.add("graphql-codegen");
        if (dep.includes("axios") || dep.includes("ky") || dep.includes("got")) stack.add("http-client");
        if (dep.includes("workbox")) stack.add("service-worker");
        if (dep.includes("k6") || dep.includes("artillery")) stack.add("load-testing");
        if (dep.includes("@anthropic-ai") || dep.includes("openai")) stack.add("ai-function-calling");
        if (dep.includes("flyway") || dep.includes("liquibase")) stack.add("database-migration-patterns");
        if (dep.includes("redoc") || dep.includes("swagger-ui")) stack.add("api-documentation");
        if (dep.includes("webextension-polyfill") || dep.includes("chrome-types")) stack.add("browser-extensions");
        if (dep.includes("fishery") || dep.includes("factory")) stack.add("testing-fixtures");
        if (dep.includes("@sentry") || dep.includes("bugsnag")) stack.add("error-monitoring");
        if (dep.includes("pg-pool") || dep.includes("pgbouncer") || dep.includes("generic-pool"))
          stack.add("database-connection-pooling");
      }
    }
  } catch {
    /* not a node project */
  }

  const configSignals: [string, string][] = [
    ["Dockerfile", "devops"],
    ["docker-compose.yml", "devops"],
    ["terraform", "devops"],
    [".github/workflows", "devops"],
    ["tailwind.config", "frontend"],
    ["tsconfig.json", "frontend"],
    ["requirements.txt", "backend"],
    ["Cargo.toml", "backend"],
    ["turbo.json", "monorepo"],
    ["nx.json", "monorepo"],
    ["pnpm-workspace.yaml", "monorepo"],
    ["app.json", "mobile"],
    ["expo-env.d.ts", "mobile"],
    ["electron-builder.yml", "desktop"],
    ["robots.txt", "seo"],
    ["sitemap.xml", "seo"],
    ["inngest.config.ts", "scheduling"],
    ["vercel.json", "frontend"],
    ["biome.json", "tooling"],
    ["biome.jsonc", "tooling"],
    [".sentryclirc", "error-tracking"],
    ["sentry.client.config.ts", "error-tracking"],
    ["openapi.yaml", "openapi"],
    ["swagger.json", "openapi"],
    ["vite.config.ts", "vite"],
    ["vite.config.js", "vite"],
    [".eslintrc.json", "eslint"],
    ["eslint.config.js", "eslint"],
    ["eslint.config.mjs", "eslint"],
    [".prettierrc", "prettier"],
    [".prettierrc.json", "prettier"],
    [".github/workflows", "github-actions"],
    ["requirements.txt", "flask"],
    ["nest-cli.json", "nestjs"],
    ["Gemfile", "ruby-rails"],
    ["composer.json", "laravel"],
    ["pom.xml", "spring-boot"],
    ["build.gradle", "spring-boot"],
    ["manifest.json", "browser-extensions"],
    ["docker-compose.yml", "container-orchestration"],
    ["docker-compose.yaml", "container-orchestration"],
    [".sentry.properties", "error-monitoring"],
    ["sentry.server.config.ts", "error-monitoring"],
  ];
  for (const [file, domain] of configSignals) {
    if (existsSync(resolve(process.cwd(), file))) stack.add(domain);
  }

  return stack;
}

/** Graph traversal: find skills linked from top-scored skills that weren't already scored. */
function discoverLinkedSkills(
  topSkills: ScoredSkill[],
  allSkills: RegistrySkill[],
  alreadyScored: Set<string>
): ScoredSkill[] {
  const discovered: ScoredSkill[] = [];
  const nameToIdx = new Map<string, number>();
  for (let i = 0; i < allSkills.length; i++) {
    nameToIdx.set(allSkills[i].name, i);
  }

  for (const top of topSkills) {
    const idx = nameToIdx.get(top.name);
    if (idx === undefined) continue;
    const skill = allSkills[idx];
    if (!skill.linksTo) continue;

    for (const linkedName of skill.linksTo) {
      if (alreadyScored.has(linkedName)) continue;
      const linkedIdx = nameToIdx.get(linkedName);
      if (linkedIdx === undefined) continue;

      const linked = allSkills[linkedIdx];
      discovered.push({
        name: linked.name,
        score: GRAPH_HOP_BONUS,
        matchedTriggers: [`via ${top.name}`],
        description: linked.description.slice(0, 60),
        layer: linked.layer,
        category: linked.category,
      });
      alreadyScored.add(linkedName);
    }
  }

  return discovered;
}

function main() {
  const prompt = process.argv[2];
  if (!prompt || prompt.length < MIN_PROMPT_LENGTH) {
    process.stdout.write(JSON.stringify({ skills: [], context: "" }));
    return;
  }

  // Load registry from session cache (avoids re-parsing 84KB JSON)
  const registryPath = resolve(__dirname, "../skills/_registry.json");
  const skills = loadRegistryWithCache(registryPath);
  if (!skills) {
    process.stdout.write(JSON.stringify({ skills: [], context: "", error: "Registry not found" }));
    return;
  }

  // Superpowers + meta-workflow skills are now in _registry.json (no more hardcoding)

  const promptLower = prompt.toLowerCase();
  const promptWordsList = promptLower.split(/[\s\-_,./!?'"()]+/).filter((w) => w.length > 2);
  const promptWords = new Set(promptWordsList);
  const domainScores = detectDomains(promptLower);
  const projectStack = loadProjectStackWithCache();
  const intent = detectIntent(promptLower);

  // Two-pass scoring: fast trigger scan (with fuzzy fallback) → full score only candidates
  const candidates = quickTriggerScan(skills, promptLower, promptWordsList);

  const scored: ScoredSkill[] = [];
  // Early termination: track how many high-confidence skills we've found
  const HIGH_CONFIDENCE_SCORE = CONFIDENCE_THRESHOLD * 3;
  let highConfidenceCount = 0;

  for (const [idx, { triggers: matchedTriggers, qualities }] of candidates) {
    // If we already have enough high-confidence skills, skip fuzzy-only candidates
    if (highConfidenceCount >= MAX_SKILLS) {
      const hasNonFuzzy = qualities.some((q) => q !== "fuzzy");
      if (!hasNonFuzzy) continue;
    }

    const s = fullScore(skills[idx], promptLower, promptWords, domainScores, matchedTriggers, qualities, intent);
    // Boost skills matching project stack
    const skillDomain = CATEGORY_DOMAIN[s.category] || s.category;
    if (projectStack.size > 0 && projectStack.has(skillDomain)) {
      s.score *= 1.2;
    }
    // Lower threshold for fuzzy matches that also have other signals (word overlap, domain)
    const hasFuzzy = qualities.some((q) => q === "fuzzy");
    const threshold = hasFuzzy ? CONFIDENCE_THRESHOLD * 0.75 : CONFIDENCE_THRESHOLD;
    if (s.score >= threshold) {
      scored.push(s);
      if (s.score >= HIGH_CONFIDENCE_SCORE) highConfidenceCount++;
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Take initial top skills, then discover linked skills via graph traversal
  const initialTop = scored.slice(0, 3);
  const scoredNames = new Set(scored.map((s) => s.name));

  // Graph traversal: follow linksTo edges from top skills to discover related skills
  const linkedSkills = discoverLinkedSkills(initialTop, skills, scoredNames);

  // Merge: direct matches first, then graph-discovered (capped at MAX_SKILLS total)
  const merged = [...scored, ...linkedSkills];
  merged.sort((a, b) => b.score - a.score);
  const top = merged.slice(0, MAX_SKILLS);

  // Build context: directive format for high-confidence, suggestion for lower
  let context = "";
  if (top.length > 0) {
    const directSkills = top.filter((s) => !s.matchedTriggers[0]?.startsWith("via "));
    const graphSkills = top.filter((s) => s.matchedTriggers[0]?.startsWith("via "));

    if (directSkills.length > 0) {
      const primary = directSkills[0];
      const rest = directSkills.slice(1);

      // Only reference SKILL.md if the skill has a file path (workflow-only skills don't)
      const skillRef = (s: ScoredSkill) => {
        const reg = skills.find((r) => r.name === s.name);
        return reg?.path ? `. Read .claude/skills/${s.name}/SKILL.md before proceeding` : "";
      };

      if (primary.score > 8.0) {
        // MANDATORY activation for very high confidence matches
        context = `**MANDATORY: ACTIVATE ${primary.name}** — ${primary.description || primary.name}${skillRef(primary)}.`;
      } else if (primary.score > 6.0) {
        // Strong directive for high confidence
        context = `**ACTIVATE ${primary.name}** — ${primary.description || primary.name}${skillRef(primary)}.`;
      } else {
        // Standard suggestion
        context = `Skills: ${directSkills.map((s) => s.name).join(", ")} — use Skill() to activate.`;
      }

      // Add remaining direct skills if primary was a directive
      if (primary.score > 6.0 && rest.length > 0) {
        const graphNames = graphSkills.length > 0 ? `, ${graphSkills.map((s) => s.name).join(", ")}` : "";
        context += `\nAlso relevant: ${rest.map((s) => s.name).join(", ")}${graphNames} — use Skill() to load.`;
      } else if (graphSkills.length > 0) {
        context += ` | related: ${graphSkills.map((s) => s.name).join(", ")}`;
      }

      // WebSearch enhancement — inject when top skill has websearch flag
      const wsSkills = directSkills.filter((s) => s.websearch === true);
      if (wsSkills.length > 0) {
        context += `\n🔍 **WebSearch-enhanced**: ${wsSkills.map((s) => s.name).join(", ")} — use WebSearch for current data, docs, and best practices. See .claude/references/websearch-enhanced.md for protocol.`;
      }
    }
  }

  // ─── Auto-inject references based on intent + keywords (no slash commands needed) ───
  const refs: string[] = [];
  const sid = getSessionId();
  const injected = getInjectedRefs(sid);
  const newKeys: string[] = [];

  // UI Standards — design intent
  if (intent === "design") {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "ui-standards",
      `📐 **UI Standards** — Read .claude/references/ui-standards.md before writing UI code.`
    );
  }

  // Quality rules — build, refactor, test intents
  if (intent === "build" || intent === "refactor" || intent === "test") {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "quality",
      `📋 **Quality rules** — Read .claude/references/quality.md for code standards (TS strict, React server-first, SQL parameterized).`
    );
  }

  // Core behavior — plan intent
  if (intent === "plan") {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "core",
      `📖 **Core workflow** — Read .claude/references/core.md for response patterns and skill selection rules.`
    );
  }

  // Teaching — explore intent or explain/teach/learn keywords
  const teachKeywords = /\b(explain|teach|learn|how does|what is|understand|tutorial|walk me through|step by step)\b/i;
  if (intent === "explore" || teachKeywords.test(prompt)) {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "teaching",
      `🎓 **Teaching mode** — Read .claude/references/teaching.md and adapt explanation depth to user's coding level.`
    );
  }

  // Memory — memory-related keywords
  const memKeywords = /\b(memory|remember|recall|forget|save memory|memories|memorize)\b/i;
  if (memKeywords.test(prompt)) {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "memory",
      `🧠 **Memory discipline** — Read .claude/references/memory.md for read/write policy and fields.`
    );
  }

  // Privacy — sensitive file/security keywords
  const privacyKeywords =
    /\b(\.env|secret|credential|api.?key|token|password|security|sensitive|private.?key|pem|ssh)\b/i;
  if (privacyKeywords.test(prompt)) {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "privacy",
      `🔒 **Privacy rules** — Read .claude/references/privacy.md for file access control and output sanitization.`
    );
  }

  // GSD — when GSD skills match, enforce spec-driven workflow
  const topNames = new Set(top.map((s) => s.name));
  const gsdSkills = ["gsd", "gsd-execute", "gsd-plan", "gsd-quick", "gsd-verify"];
  const gsdMatched = gsdSkills.filter((g) => topNames.has(g));
  if (gsdMatched.length > 0) {
    const cwd = process.env.ULTRATHINK_CWD || process.cwd();
    const planningDir = resolve(cwd, ".planning");
    const hasPlanning = existsSync(planningDir);

    // Determine if this is a non-trivial task that warrants full GSD
    const isNonTrivial = detectNonTrivialTask(prompt, intent);
    const isQuickOnly = gsdMatched.length === 1 && gsdMatched[0] === "gsd-quick";

    if (hasPlanning) {
      // Active GSD project — inject STATE.md + SPEC.md for continuity
      const statePath = resolve(planningDir, "STATE.md");
      const specPath = resolve(planningDir, "SPEC.md");
      let stateContent = "";
      let specSummary = "";
      if (existsSync(statePath)) {
        try {
          stateContent = readFileSync(statePath, "utf-8").slice(0, 2000);
        } catch {}
      }
      if (existsSync(specPath)) {
        try {
          const specFull = readFileSync(specPath, "utf-8");
          // Extract acceptance criteria section for quick reference
          const acMatch = specFull.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n## |\n---|\Z)/);
          specSummary = acMatch ? acMatch[1].trim().slice(0, 1000) : "";
        } catch {}
      }

      // Count existing plans
      let planCount = 0;
      try {
        const files = readdirSync(planningDir);
        planCount = files.filter((f: string) => f.match(/^\d+-\d+-PLAN\.md$/)).length;
      } catch {}

      refs.push(
        `⚡ **GSD ACTIVE — MANDATORY WORKFLOW**\n` +
          `\`.planning/\` exists with ${planCount} plan(s).\n\n` +
          (stateContent ? `**Current State:**\n\`\`\`\n${stateContent}\n\`\`\`\n\n` : "") +
          (specSummary ? `**Acceptance Criteria:**\n${specSummary}\n\n` : "") +
          `**RULES (non-negotiable):**\n` +
          `- Every PLAN.md must-have MUST trace to a SPEC.md acceptance criterion\n` +
          `- Verify after EVERY wave before advancing (goal-backward, not just build)\n` +
          `- Deviation rule 4 (architecture change) = STOP and report to user\n` +
          `- Update STATE.md after every phase/wave completion\n` +
          `- On completion: run gsd-verify, then archive via plan-archive\n` +
          `Read .claude/references/gsd.md for full workflow.`
      );
    } else if (isNonTrivial && !isQuickOnly) {
      // Non-trivial task, no .planning/ — suggest GSD but don't auto-create files
      // Auto-initialization removed: creating .planning/ without consent was disruptive.
      // User can explicitly run /gsd init to opt in.
      refs.push(
        `⚡ **GSD recommended** — This looks like a non-trivial task. ` +
          `Consider using the GSD workflow for spec-driven execution. ` +
          `Read ~/.claude/skills/gsd/SKILL.md and run \`/gsd init\` to start.`
      );
    } else {
      // Quick/trivial task — suggest GSD-lite without enforcement
      refs.push(
        `⚡ **GSD available** — This looks like a quick task. Use \`gsd-quick\` for lightweight spec-driven execution,\n` +
          `or invoke full GSD if the scope grows. Read ~/.claude/skills/gsd-quick/SKILL.md.`
      );
    }
  }

  // VFS reminder — only for code-related intents (avoid noise on memory/explain prompts)
  const codeIntents: Set<Intent> = new Set(["build", "refactor", "debug", "test", "explore", "code_discovery"]);
  if (codeIntents.has(intent)) {
    pushRefOnce(
      refs,
      injected,
      newKeys,
      "vfs",
      `🔬 **VFS active** — Use VFS MCP for AST-level code signatures before reading full files. \`vfs search\` for signatures, \`vfs stats\` for overview.`
    );
  }

  // Persist newly injected refs so they aren't repeated next prompt
  markRefsInjected(sid, newKeys);

  // Append all matched references
  if (refs.length > 0) {
    const refBlock = refs.join("\n");
    context = context ? `${context}\n\n${refBlock}` : refBlock;
  }

  // Decision framework injection (ThinkBetter-style)
  try {
    const decision = buildDecisionContext(prompt);
    if (decision?.context) {
      context = context ? `${context}\n\n${decision.context}` : decision.context;
    }
  } catch {
    // Non-fatal — skill context still fires
  }

  // Extract and save user preferences from prompt text
  extractAndSavePreferences(prompt);

  // ☸ Tekiō — always-on evaluation: corrections AND successes
  detectAndSaveCorrections(prompt);
  detectAndSaveSuccesses(
    prompt,
    intent,
    top.map((s) => s.name)
  );

  // ☸ Tekiō notification — if a wheel turn happened recently, inject notification
  try {
    const wheelNotif = "/tmp/ultrathink-wheel-turns/last-notification";
    if (existsSync(wheelNotif)) {
      const notifContent = readFileSync(wheelNotif, "utf-8").trim();
      if (notifContent) {
        context = context ? `${context}\n\n${notifContent}` : notifContent;
      }
      // Consume the notification (one-shot)
      unlinkSync(wheelNotif);
    }
  } catch {
    // non-critical
  }

  // Model routing hints removed — users choose their model deliberately.
  // Injecting "switch to Opus/Sonnet" on every prompt was ~400 tokens/session of noise.

  // Track skill suggestions for effectiveness analysis (#6)
  // Write suggested skills to a file so session-end can compare suggestions vs activations
  if (top.length > 0) {
    try {
      const suggestionsDir = "/tmp/ultrathink-skill-suggestions";
      if (!existsSync(suggestionsDir)) mkdirSync(suggestionsDir, { recursive: true });
      const ts = Date.now();
      const suggestion = { timestamp: ts, skills: top.map((s) => s.name), scores: top.map((s) => s.score) };
      writeFileSync(join(suggestionsDir, `${ts}.json`), JSON.stringify(suggestion));
    } catch {
      // non-critical
    }
  }

  process.stdout.write(
    JSON.stringify({
      skills: top.map((s) => ({ name: s.name, score: s.score, triggers: s.matchedTriggers })),
      context,
    })
  );
}

// ─── Preference extraction ──────────────────────────────────────────

const MEMORIES_DIR = "/tmp/ultrathink-memories";

const PREFER_PATTERNS = [
  /\bi\s+(?:prefer|like|want|love|enjoy|favor|favour)\s+(.+?)(?:\s+and\s+|\.|,|$|\n)/gi,
  /\balways\s+use\s+(.+?)(?:\s+and\s+|\.|,|$|\n)/gi,
  /\buse\s+(\w+)\s+(?:instead\s+of|over|rather\s+than)\s+\w+/gi,
  /\bswitch(?:ed)?\s+to\s+(\w+)/gi,
  /\b(?:never|don'?t|do\s+not|avoid)\s+(?:use\s+)?(.+?)(?:\.|,|$|\n)/gi,
  /\bremember\s+(?:that\s+)?i\s+(.+?)(?:\.|$|\n)/gi,
];

const TOOLS = new Set([
  "bun",
  "npm",
  "pnpm",
  "yarn",
  "deno",
  "node",
  "vim",
  "neovim",
  "vscode",
  "cursor",
  "zed",
  "react",
  "vue",
  "svelte",
  "angular",
  "next",
  "nextjs",
  "nuxt",
  "remix",
  "astro",
  "tailwind",
  "typescript",
  "python",
  "rust",
  "go",
  "postgres",
  "mysql",
  "sqlite",
  "mongodb",
  "redis",
  "neon",
  "docker",
  "vercel",
  "netlify",
  "cloudflare",
  "aws",
  "figma",
  "vitest",
  "jest",
  "playwright",
  "prisma",
  "drizzle",
  "expo",
  "electron",
  "cypress",
  "storybook",
  "turborepo",
  "nx",
  "pnpm",
  "sanity",
  "payload",
  "openai",
  "supabase",
  "stripe",
  "hono",
  "convex",
  "clerk",
  "upstash",
  "htmx",
  "inngest",
  "bullmq",
  "uploadthing",
  "testing-library",
  "opentelemetry",
  "algolia",
  "meilisearch",
  "elasticsearch",
  "react-email",
  "mjml",
  "pdfkit",
  "wasm",
  "web-vitals",
  "sentry",
  "plausible",
  "posthog",
  "grpc",
  "protobuf",
  "comlink",
  "swagger",
  "biome",
  "flask",
  "nestjs",
  "vite",
  "eslint",
  "prettier",
  "pact",
  "kong",
  "envoy",
  "traefik",
  "spring",
  "laravel",
  "rails",
  "xstate",
  "k6",
  "artillery",
  "locust",
  "workbox",
  "axios",
  "ky",
  "vault",
  "hashicorp",
  "sentry",
  "datadog",
  "flyway",
  "liquibase",
  "redoc",
  "pgbouncer",
]);

const STYLES = new Set([
  "glassmorphism",
  "neomorphism",
  "brutalism",
  "dark mode",
  "light mode",
  "minimal",
  "minimalist",
  "elegant",
  "modern",
  "retro",
  "gradient",
  "monochrome",
]);

function extractAndSavePreferences(text: string): void {
  // Quick check: does the text contain preference language?
  if (!/\b(prefer|like|always use|never|don'?t use|avoid|switch|remember that i)\b/i.test(text)) {
    return;
  }

  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true });

  const scope = process.cwd().split("/").slice(-2).join("/");
  const seen = new Set<string>();

  for (const pattern of PREFER_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1]
        .trim()
        .replace(/[.!?,;*_`]+$/, "")
        .replace(/^\*+|\*+$/g, "")
        .trim();
      if (!raw || raw.length < 10 || raw.length > 80) continue;
      // Reject if it looks like a sentence fragment or stopword phrase
      const STOPWORDS = new Set([
        "this",
        "that",
        "it",
        "them",
        "there",
        "here",
        "these",
        "those",
        "know",
        "sent",
        "reads",
        "apply",
        "exist",
        "logged",
        "deleted",
        "expires",
        "confusion",
      ]);
      const words = raw.toLowerCase().split(/\s+/);
      if (words.length <= 2 && STOPWORDS.has(words[0])) continue;
      if (words.every((w) => STOPWORDS.has(w))) continue;

      const key = raw.toLowerCase().replace(/\s+/g, "-");
      if (seen.has(key)) continue;
      seen.add(key);

      // Determine category
      let category = "preference";
      const lower = raw.toLowerCase();
      for (const tool of TOOLS) {
        if (lower === tool || lower.includes(tool)) {
          category = "tool-preference";
          break;
        }
      }
      if (category === "preference") {
        for (const style of STYLES) {
          if (lower.includes(style)) {
            category = "style-preference";
            break;
          }
        }
      }

      const isAnti = /never|don'?t|avoid/i.test(match[0]);
      const content = isAnti ? `Avoids ${raw}` : `Prefers ${raw}`;

      const ts = Date.now();
      const memory = {
        content,
        category,
        importance: 8,
        confidence: 0.85,
        scope,
        source: "identity-extract",
        tags: ["#preference", "#identity", `#${key.slice(0, 30)}`],
      };

      writeFileSync(join(MEMORIES_DIR, `${ts}-pref-${key.slice(0, 20)}.json`), JSON.stringify(memory));
    }
  }
}

// ─── ☸ Tekiō — Always-On Evaluation (Cycle of Nova) ─────────────────
// The wheel evaluates EVERY interaction:
//   New → turn (learn)    Known → skip    Failure → turn (counter)    Success → turn (reinforce)

const SUCCESS_PATTERNS = [
  /\b(?:perfect|exactly|that'?s?\s+(?:right|correct|it|great|what\s+i\s+wanted))\b/i,
  /\b(?:works?\s+(?:great|perfectly|well|now)|nailed\s+it|spot\s+on|nice|awesome)\b/i,
  /\b(?:yes[,!]?\s+(?:that|like\s+that|this)|good\s+(?:job|work)|love\s+(?:it|this))\b/i,
];

function detectAndSaveSuccesses(text: string, intent: Intent, skillNames: string[]): void {
  const isSuccess = SUCCESS_PATTERNS.some((p) => p.test(text));
  if (!isSuccess) return;
  if (skillNames.length === 0 && intent === "general") return; // Nothing specific to learn

  const wheelDir = "/tmp/ultrathink-wheel-turns";
  if (!existsSync(wheelDir)) mkdirSync(wheelDir, { recursive: true });

  const scope = process.cwd().split("/").slice(-2).join("/");
  const ts = Date.now();

  // Record what worked: the intent + skill combo
  const pattern =
    skillNames.length > 0 ? `${intent} task using skills: ${skillNames.join(", ")}` : `${intent} task approach`;
  const insight = `For ${intent} tasks, ${skillNames.length > 0 ? `use skills: ${skillNames.join(", ")}` : "current approach works well"}. User confirmed success.`;

  const wheelEvent = {
    type: "success-pattern",
    timestamp: new Date().toISOString(),
    pattern,
    insight,
    scope,
  };

  writeFileSync(join(wheelDir, `${ts}-success.json`), JSON.stringify(wheelEvent));
}

const CORRECTION_PATTERNS = [
  // "no, not that" / "no that's wrong" / "no, instead..."
  /\bno[,.]?\s+(?:not\s+that|that'?s?\s+(?:wrong|incorrect|not\s+(?:right|what|how)))/i,
  // "I said X" / "I told you" / "I asked for"
  /\bi\s+(?:said|told\s+you|asked\s+(?:for|you))\b/i,
  // "revert" / "undo" / "go back"
  /\b(?:revert|undo|go\s+back|roll\s*back|put\s+(?:it\s+)?back)\b/i,
  // "wrong" / "incorrect" / "that's not"
  /\b(?:wrong|incorrect|that'?s?\s+not\s+(?:what|how|right))\b/i,
  // "don't do that" / "stop doing" / "not like that"
  /\b(?:don'?t\s+do\s+that|stop\s+(?:doing|that)|not\s+like\s+that)\b/i,
  // "I meant" / "what I want is"
  /\bi\s+meant\b|what\s+i\s+(?:want|need|mean)\s+is\b/i,
  // "lets not" / "don't" (at start of sentence)
  /^(?:let'?s?\s+not|don'?t)\s+/im,
];

function detectAndSaveCorrections(text: string): void {
  const isCorrection = CORRECTION_PATTERNS.some((p) => p.test(text));
  if (!isCorrection) return;

  // Save correction event for the adaptation system to process
  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true });

  const scope = process.cwd().split("/").slice(-2).join("/");
  const ts = Date.now();

  // Extract the correction content (what the user wants instead)
  const correctionContent = text.slice(0, 300).trim();

  const memory = {
    content: `[CORRECTION] ${correctionContent}`,
    category: "preference",
    importance: 9,
    confidence: 0.9,
    scope,
    source: "correction-detect",
    tags: ["#correction", "#wheel", "#adaptation"],
  };

  writeFileSync(join(MEMORIES_DIR, `${ts}-correction.json`), JSON.stringify(memory));

  // Also write a wheel-turn trigger file for the session-end hook to process
  const wheelDir = "/tmp/ultrathink-wheel-turns";
  if (!existsSync(wheelDir)) mkdirSync(wheelDir, { recursive: true });

  const wheelEvent = {
    type: "user-correction",
    timestamp: new Date().toISOString(),
    correction: correctionContent,
    scope,
  };

  writeFileSync(join(wheelDir, `${ts}-correction.json`), JSON.stringify(wheelEvent));
}

main();
