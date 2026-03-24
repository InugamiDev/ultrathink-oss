/**
 * Memory Search Enrichment — generates semantic keywords for better tsvector search.
 *
 * Instead of relying on an external embedding API, we expand memory content
 * with related terms, synonyms, and semantic context so Postgres tsvector
 * can find memories by meaning, not just exact words.
 *
 * This acts as "Claude Code as the embedding model" — the enrichment
 * happens at write time, making search-time fast and purely in Postgres.
 */

// Domain synonym map — common dev/project terms mapped to related concepts
const SYNONYM_MAP: Record<string, string[]> = {
  // Web tech
  react: ["component", "jsx", "hooks", "frontend", "ui", "virtual-dom", "state"],
  nextjs: ["next", "app-router", "server-components", "ssr", "ssg", "vercel"],
  tailwind: ["css", "utility", "styling", "design", "responsive", "classname"],
  typescript: ["ts", "types", "interfaces", "generics", "type-safety"],
  javascript: ["js", "ecmascript", "node", "browser", "runtime"],
  svelte: ["sveltekit", "runes", "stores", "reactive", "compiler"],
  vue: ["vuex", "pinia", "composition-api", "directive", "template"],
  astro: ["island", "static-site", "content-collections", "partial-hydration"],
  html: ["markup", "semantic", "dom", "element", "attribute"],
  // CSS & Styling
  css: ["stylesheet", "selector", "media-query", "flexbox", "grid", "animation"],
  animation: ["transition", "keyframe", "motion", "framer", "gsap", "animate"],
  responsive: ["mobile", "tablet", "desktop", "breakpoint", "adaptive", "viewport"],
  // Backend
  postgres: ["postgresql", "sql", "database", "query", "schema", "migration", "neon"],
  redis: ["cache", "session", "pub-sub", "key-value", "in-memory", "upstash"],
  api: ["endpoint", "rest", "graphql", "route", "handler", "request", "response"],
  auth: ["authentication", "authorization", "login", "session", "token", "oauth", "jwt"],
  docker: ["container", "image", "dockerfile", "compose", "orchestration"],
  serverless: ["lambda", "edge", "function", "cloud-function", "vercel-function"],
  webhook: ["callback-url", "event-notification", "payload", "signature"],
  // Data
  database: ["db", "storage", "persistence", "data-store", "table", "collection"],
  orm: ["drizzle", "prisma", "typeorm", "sequelize", "query-builder"],
  schema: ["model", "table", "column", "relation", "field", "entity"],
  query: ["select", "insert", "update", "delete", "join", "filter", "where"],
  cache: ["memoize", "store", "ttl", "invalidate", "stale", "revalidate"],
  // Patterns
  error: ["bug", "fix", "crash", "exception", "failure", "debug", "issue", "problem"],
  performance: ["speed", "optimize", "fast", "slow", "latency", "benchmark", "profiling"],
  security: ["vulnerability", "xss", "csrf", "injection", "owasp", "sanitize"],
  deploy: ["deployment", "release", "ship", "production", "ci-cd", "build"],
  test: ["testing", "unit", "integration", "e2e", "coverage", "assertion", "mock"],
  log: ["logging", "trace", "observability", "monitor", "stdout", "structured-log"],
  lint: ["eslint", "biome", "prettier", "format", "code-style", "rule"],
  // Architecture
  component: ["module", "widget", "element", "piece", "block", "part"],
  config: ["configuration", "settings", "environment", "env", "setup"],
  migration: ["schema-change", "database-update", "alter-table", "upgrade"],
  hook: ["middleware", "interceptor", "callback", "event-handler", "lifecycle"],
  pattern: ["design-pattern", "convention", "best-practice", "approach", "strategy"],
  monorepo: ["workspace", "turborepo", "nx", "pnpm-workspace", "multi-package"],
  microservice: ["service", "distributed", "event-driven", "domain-driven"],
  // State & Data flow
  state: ["store", "context", "reducer", "signal", "atom", "observable"],
  fetch: ["request", "http", "axios", "swr", "tanstack-query", "data-fetching"],
  stream: ["sse", "websocket", "real-time", "event-stream", "push"],
  // Actions
  install: ["add", "dependency", "package", "npm", "pnpm", "yarn"],
  remove: ["delete", "uninstall", "drop", "clean", "purge"],
  refactor: ["restructure", "reorganize", "clean-up", "simplify", "improve"],
  create: ["generate", "scaffold", "bootstrap", "init", "new"],
  build: ["compile", "bundle", "transpile", "output", "dist"],
  // DevOps
  ci: ["continuous-integration", "github-actions", "pipeline", "workflow", "automated"],
  monitor: ["alert", "dashboard", "metric", "uptime", "healthcheck"],
  ssl: ["tls", "certificate", "https", "encryption", "lets-encrypt"],
  dns: ["domain", "nameserver", "record", "cname", "cloudflare"],
  // User preferences
  prefer: ["like", "want", "choose", "favor", "style"],
  avoid: ["dislike", "skip", "never", "ban", "reject"],
  // AI & ML
  llm: ["language-model", "gpt", "claude", "openai", "anthropic", "prompt"],
  embedding: ["vector", "similarity", "semantic", "cosine", "search"],
  agent: ["autonomous", "tool-use", "chain", "orchestration", "workflow"],
  prompt: ["system-prompt", "instruction", "template", "chain-of-thought"],
  // File types & tools
  json: ["object", "parse", "stringify", "schema", "payload"],
  markdown: ["md", "documentation", "readme", "frontmatter"],
  git: ["commit", "branch", "merge", "rebase", "pull-request", "diff"],
  env: ["dotenv", "environment-variable", "secret", "config-file"],
};

// Pre-compiled reverse lookup: word -> synonym arrays (O(1) instead of O(n) iteration)
const SYNONYM_LOOKUP = new Map<string, string[]>();
for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
  // Map the key itself to its synonyms
  if (!SYNONYM_LOOKUP.has(key)) SYNONYM_LOOKUP.set(key, []);
  SYNONYM_LOOKUP.get(key)!.push(...synonyms);
}

// Category-to-topic mapping for additional context
const CATEGORY_ENRICHMENT: Record<string, string> = {
  solution: "fix resolved working approach workaround answer",
  pattern: "convention practice standard reusable template recurring",
  architecture: "structure design system infrastructure layout organization",
  preference: "style choice user-preference personal setting like dislike",
  insight: "learning discovery observation understanding realization",
  decision: "chose selected picked rationale tradeoff why",
  error: "bug crash failure broken exception stacktrace debug",
  "tool-preference": "tool editor ide workflow environment setup",
  "style-preference": "visual ui design aesthetic appearance theme",
  "project-context": "project codebase repository workspace scope domain",
  "session-summary": "session recap overview completed tasks accomplished",
  identity: "user profile role background expertise skill level",
  research: "investigation analysis finding source reference data",
  warning: "caution avoid danger pitfall gotcha caveat",
  config: "configuration setup environment variable option flag",
};

/**
 * Generate enrichment text for a memory.
 * Extracts key terms from content and expands with synonyms + category context.
 */
export function enrichMemory(content: string, category: string, tags?: string[]): string {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const enrichTerms = new Set<string>();

  // 1. Add synonym expansions for key terms (O(1) lookup via pre-compiled map)
  for (const word of words) {
    const stem = word.replace(/s$/, "").replace(/ing$/, "").replace(/ed$/, "").replace(/ly$/, "");
    // Direct lookup (covers exact match for word and stem)
    const wordSyns = SYNONYM_LOOKUP.get(word);
    if (wordSyns) for (const syn of wordSyns) enrichTerms.add(syn);
    if (stem !== word) {
      const stemSyns = SYNONYM_LOOKUP.get(stem);
      if (stemSyns) for (const syn of stemSyns) enrichTerms.add(syn);
    }
    // Substring match fallback (only for compound words like "nextjs" containing "next")
    if (!wordSyns && !SYNONYM_LOOKUP.has(stem)) {
      for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (word.includes(key) || key.includes(word)) {
          for (const syn of synonyms) enrichTerms.add(syn);
          break; // One match is enough for substring
        }
      }
    }
  }

  // 2. Add category enrichment
  const catEnrich = CATEGORY_ENRICHMENT[category];
  if (catEnrich) {
    for (const term of catEnrich.split(" ")) {
      enrichTerms.add(term);
    }
  }

  // 3. Add tag expansions (using pre-compiled lookup)
  if (tags) {
    for (const tag of tags) {
      const clean = tag.replace(/^#/, "").toLowerCase();
      enrichTerms.add(clean);
      const tagSyns = SYNONYM_LOOKUP.get(clean);
      if (tagSyns) {
        for (const syn of tagSyns.slice(0, 3)) enrichTerms.add(syn);
      }
    }
  }

  // 4. Extract file paths and expand them
  const pathMatch = content.match(/[\w\-./]+\.(ts|tsx|js|jsx|css|sql|md|json|yaml|sh)/g);
  if (pathMatch) {
    for (const p of pathMatch) {
      const parts = p.split(/[/.\-_]/).filter((s) => s.length > 2);
      for (const part of parts) {
        enrichTerms.add(part);
      }
    }
  }

  // 5. Extract quoted strings as important terms
  const quoted = content.match(/'([^']+)'/g) || [];
  for (const q of quoted) {
    const clean = q.replace(/'/g, "").toLowerCase();
    if (clean.length > 2 && clean.length < 50) {
      enrichTerms.add(clean);
    }
  }

  // Remove terms that are already in the content (tsvector weight A already covers them)
  const contentLower = content.toLowerCase();
  const filtered = [...enrichTerms].filter((t) => !contentLower.includes(t));

  return filtered.join(" ");
}

