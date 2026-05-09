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
  typescript: ["ts", "types", "interfaces", "generics", "type-safety", "bun", "deno"],
  bun: ["runtime", "typescript", "package-manager", "bundler", "fast", "install"],
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
  postgres: [
    "postgresql",
    "sql",
    "database",
    "query",
    "schema",
    "migration",
    "neon",
    "pg_trgm",
    "pgbouncer",
    "connection-pool",
  ],
  redis: ["cache", "session", "pub-sub", "key-value", "in-memory", "upstash"],
  api: ["endpoint", "rest", "graphql", "route", "handler", "request", "response", "trpc"],
  trpc: ["api", "rpc", "typesafe", "router", "procedure", "endpoint"],
  auth: ["authentication", "authorization", "login", "token", "oauth", "jwt"],
  docker: ["container", "image", "dockerfile", "compose", "orchestration"],
  serverless: ["lambda", "edge", "function", "cloud-function", "vercel-function"],
  webhook: ["callback-url", "event-notification", "payload", "signature"],
  // Data
  database: [
    "db",
    "storage",
    "persistence",
    "data-store",
    "table",
    "collection",
    "pg_trgm",
    "pgbouncer",
    "connection-pool",
  ],
  orm: ["drizzle", "prisma", "typeorm", "sequelize", "query-builder"],
  schema: ["model", "table", "column", "relation", "field", "entity"],
  query: ["select", "insert", "update", "delete", "join", "filter", "where"],
  cache: ["memoize", "store", "ttl", "invalidate", "stale", "revalidate"],
  // Patterns
  error: ["bug", "fix", "crash", "exception", "failure", "debug", "issue", "problem"],
  performance: ["speed", "optimize", "fast", "slow", "latency", "benchmark", "profiling", "optimization"],
  optimization: ["performance", "speed", "fast", "tune", "improve", "optimize"],
  session: ["event", "happened", "recent", "latest", "timeline", "occurred"],
  recent: ["latest", "newest", "last", "most-recent", "current"],
  security: ["vulnerability", "xss", "csrf", "injection", "owasp", "sanitize"],
  deploy: ["deployment", "release", "ship", "production", "ci-cd", "build", "hosting"],
  hosting: ["deploy", "server", "infrastructure", "cloud", "provider", "host"],
  test: ["testing", "unit", "integration", "e2e", "coverage", "assertion", "mock"],
  log: ["logging", "trace", "observability", "monitor", "stdout", "structured-log"],
  lint: ["eslint", "biome", "prettier", "format", "code-style", "rule"],
  // Workflow
  workflow: ["tool", "runtime", "process", "pipeline", "automation", "preference", "dev"],
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
  // Temporal (these words are Postgres stopwords — synonyms make them visible to tsvector)
  before: ["prior", "preceding", "earlier"],
  after: ["following", "subsequent", "later"],
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

// Month names for date enrichment
const MONTH_NAMES = [
  "",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_ABBR = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Extract dates from content and generate searchable temporal terms.
 * "2026-03-15" → "march mar 2026-03 march-2026 march-15 q1-2026"
 */
function extractDateTerms(content: string): string[] {
  const terms: string[] = [];
  // Match ISO dates: YYYY-MM-DD
  const datePattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  let match;
  while ((match = datePattern.exec(content)) !== null) {
    const [, year, monthStr, day] = match;
    const month = parseInt(monthStr, 10);
    if (month >= 1 && month <= 12) {
      const monthName = MONTH_NAMES[month];
      const monthAbbr = MONTH_ABBR[month];
      terms.push(monthName, monthAbbr);
      terms.push(`${monthName}-${year}`, `${monthName}-${day}`);
      terms.push(`${year}-${monthStr}`);
      // Quarter
      const quarter = Math.ceil(month / 3);
      terms.push(`q${quarter}-${year}`);
    }
  }
  // Match "March 2026" style
  const namedDatePattern =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/gi;
  while ((match = namedDatePattern.exec(content)) !== null) {
    terms.push(match[1].toLowerCase(), match[2]);
  }
  return terms;
}

// Category-to-topic mapping for additional context
const CATEGORY_ENRICHMENT: Record<string, string> = {
  solution: "fix resolved working approach workaround answer",
  pattern: "convention practice standard reusable template recurring",
  architecture: "structure design system infrastructure layout organization",
  preference: "style choice user-preference personal setting like dislike",
  insight: "learning discovery observation understanding realization",
  decision: "chose selected picked rationale tradeoff why",
  error: "bug crash failure broken exception stacktrace debug problem issue encountered",
  "tool-preference": "tool editor ide workflow environment setup",
  "style-preference": "visual ui design aesthetic appearance theme",
  "project-context": "project codebase repository workspace scope domain",
  "session-summary":
    "session happened occurred event timeline when date worked-on accomplished completed recent latest newest last previous change update issue problem fix resolved",
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
        if (key.length >= 3 && (word.includes(key) || key.includes(word))) {
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

  // 6. Extract dates and add temporal terms (month names, quarters, etc.)
  const dateTerms = extractDateTerms(content);
  for (const dt of dateTerms) {
    enrichTerms.add(dt);
  }

  // 7. Unicode normalization — add ASCII equivalents for non-ASCII chars
  // e.g., "Tekiō" → "tekio", "résumé" → "resume"
  const asciiContent = content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (asciiContent !== content.toLowerCase()) {
    // Add ASCII versions of words that differ
    const asciiWords = asciiContent.split(/\s+/).filter((w) => w.length > 2);
    const origWords = new Set(content.toLowerCase().split(/\s+/));
    for (const aw of asciiWords) {
      if (!origWords.has(aw)) enrichTerms.add(aw);
    }
  }

  // Remove terms that are already in the content (tsvector weight A already covers them)
  const contentLower = content.toLowerCase();
  const filtered = [...enrichTerms].filter((t) => !contentLower.includes(t));

  return filtered.join(" ");
}

/**
 * Enrich a search query with expanded terms for better matching.
 * Adds date expansions, synonym expansions, and key concept terms.
 * Returns the original query + expanded terms as a single string.
 */
export function enrichQuery(query: string): string {
  const terms = new Set<string>();
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // 1. Date expansion: "2026-03-15" → "march march-2026"
  const dateTerms = extractDateTerms(query);
  for (const dt of dateTerms) terms.add(dt);

  // 2. Month name in query → add numeric form for ILIKE matching
  // e.g., "March 2026" → "2026-03"
  const monthQuery = query.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i
  );
  if (monthQuery) {
    const monthIdx = MONTH_NAMES.indexOf(monthQuery[1].toLowerCase());
    if (monthIdx > 0) {
      terms.add(`${monthQuery[2]}-${String(monthIdx).padStart(2, "0")}`);
    }
  }

  // 3. Synonym expansion for key query terms (with stemming + substring fallback)
  for (const word of words) {
    const stem = word.replace(/s$/, "").replace(/ing$/, "").replace(/ed$/, "").replace(/ly$/, "");
    const wordSyns = SYNONYM_LOOKUP.get(word);
    if (wordSyns) {
      for (const s of wordSyns.slice(0, 3)) terms.add(s);
    }
    if (stem !== word) {
      const stemSyns = SYNONYM_LOOKUP.get(stem);
      if (stemSyns) {
        for (const s of stemSyns.slice(0, 3)) terms.add(s);
      }
    }
    // Substring fallback for compound/derived words
    if (!wordSyns && !SYNONYM_LOOKUP.has(stem)) {
      for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (key.length >= 3 && (word.includes(key) || key.includes(word))) {
          for (const s of synonyms.slice(0, 3)) terms.add(s);
          break;
        }
      }
    }
  }

  // Remove terms already in the query
  const queryLower = query.toLowerCase();
  const filtered = [...terms].filter((t) => !queryLower.includes(t));

  if (filtered.length === 0) return query;
  return `${query} ${filtered.join(" ")}`;
}

/**
 * Expand query words with ALL synonyms (no slicing).
 * Used for tag matching and ILIKE tiers where longer expansion helps
 * rather than hurting (unlike pg_trgm which penalizes long strings).
 */
export function expandQuerySynonyms(query: string): string[] {
  const terms = new Set<string>();
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const word of words) {
    terms.add(word);
    const stem = word.replace(/s$/, "").replace(/ing$/, "").replace(/ed$/, "").replace(/ly$/, "");
    const wordSyns = SYNONYM_LOOKUP.get(word);
    if (wordSyns) for (const s of wordSyns) terms.add(s);
    if (stem !== word) {
      const stemSyns = SYNONYM_LOOKUP.get(stem);
      if (stemSyns) for (const s of stemSyns) terms.add(s);
    }
    if (!wordSyns && !SYNONYM_LOOKUP.has(stem)) {
      for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (key.length >= 3 && (word.includes(key) || key.includes(word))) {
          for (const s of synonyms) terms.add(s);
          break;
        }
      }
    }
  }

  return [...terms];
}
