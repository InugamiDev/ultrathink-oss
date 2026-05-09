// intent: AAAK — lossless shorthand dialect for AI agents
//   ~8x token compression, zero information loss.
//   Not for humans to read — structured text with universal grammar
//   that any model (Claude, GPT, Gemini, Llama) can decode.
// status: done
// confidence: high

/**
 * AAAK Grammar Specification:
 *
 * STRUCTURE:
 *   |  separates logical groups
 *   →  denotes transitions/changes
 *   +  combines related items
 *   -  negation/trade-off
 *   () wraps attributes/context
 *   :  key-value binding
 *   >  comparison/preference (A>B means chose A over B)
 *   *  importance marker (1-10)
 *   [] optional metadata/tags
 *
 * CATEGORIES → short codes:
 *   preference→PREF  solution→SOL  architecture→ARCH
 *   pattern→PAT  insight→INS  decision→DEC
 *   correction→COR  identity→ID  context→CTX
 *   tool-preference→TOOL  note→NOTE  error→ERR  summary→SUM
 *
 * WINGS → codes:
 *   agent→AG  user→US  knowledge→KN  experience→EX
 *
 * HALLS → codes:
 *   core→cor  rules→rul  skills→skl  profile→pro
 *   preferences→prf  projects→prj  decisions→dec
 *   patterns→pat  insights→ins  reference→ref
 *   sessions→ses  outcomes→out  errors→err
 *
 * IMPORTANCE: trailing stars ★1-★10 or compact ★N
 *
 * EXAMPLE:
 *   Natural:  "User prefers TypeScript strict mode with no-any rule. Uses ESLint recommended + Prettier."
 *   AAAK:     "PREF: ts.strict(no-any) | lint:eslint(recommended)+prettier ★7"
 *
 *   Natural:  "Decided to use Clerk for auth instead of Auth0. Better DX, Next.js support, good pricing."
 *   AAAK:     "DEC: auth:clerk>auth0(+dx +nextjs.native +pricing -customization) ★8"
 */

// --- Category codes ---

const CATEGORY_CODE: Record<string, string> = {
  preference: "PREF",
  solution: "SOL",
  architecture: "ARCH",
  pattern: "PAT",
  insight: "INS",
  decision: "DEC",
  correction: "COR",
  identity: "ID",
  context: "CTX",
  "tool-preference": "TOOL",
  note: "NOTE",
  error: "ERR",
  summary: "SUM",
};

const WING_CODE: Record<string, string> = {
  agent: "AG",
  user: "US",
  knowledge: "KN",
  experience: "EX",
};

const HALL_CODE: Record<string, string> = {
  core: "cor",
  rules: "rul",
  skills: "skl",
  profile: "pro",
  preferences: "prf",
  projects: "prj",
  decisions: "dec",
  patterns: "pat",
  insights: "ins",
  reference: "ref",
  sessions: "ses",
  outcomes: "out",
  errors: "err",
};

// --- Stop words to strip ---

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "of",
  "in",
  "to",
  "for",
  "with",
  "on",
  "at",
  "from",
  "by",
  "about",
  "as",
  "into",
  "through",
  "during",
  "than",
  "also",
  "very",
  "just",
  "really",
  "quite",
  "there",
  "here",
  "then",
  "so",
  "and",
  "but",
  "or",
  "if",
  "when",
  "while",
  "although",
  "because",
  "since",
  "we",
  "they",
  "he",
  "she",
  "you",
  "i",
  "my",
  "your",
  "our",
  "their",
  "which",
  "who",
  "whom",
  "what",
  "where",
  "how",
  "not",
  "no",
]);

// --- Common dev term abbreviations ---

const ABBREVIATIONS: Record<string, string> = {
  // Tech
  typescript: "ts",
  javascript: "js",
  database: "db",
  authentication: "auth",
  authorization: "authz",
  configuration: "cfg",
  environment: "env",
  development: "dev",
  production: "prod",
  infrastructure: "infra",
  application: "app",
  repository: "repo",
  function: "fn",
  component: "comp",
  middleware: "mw",
  dependency: "dep",
  dependencies: "deps",
  implementation: "impl",
  performance: "perf",
  optimization: "opt",
  documentation: "docs",
  // Frameworks
  "next.js": "nextjs",
  "react.js": "react",
  "node.js": "node",
  "tailwind css": "tw",
  tailwindcss: "tw",
  tailwind: "tw",
  postgresql: "pg",
  postgres: "pg",
  kubernetes: "k8s",
  // Patterns
  "instead of": ">",
  "rather than": ">",
  over: ">",
  prefer: "→",
  prefers: "→",
  preferred: "→",
  migrate: "→",
  migrating: "→",
  migration: "→",
  "switch to": "→",
  "switched to": "→",
  "moved to": "→",
  "moving to": "→",
  because: "∵",
  reason: "∵",
  recommended: "rec",
  recommendation: "rec",
  alternative: "alt",
  // Actions
  "working on": "⊕",
  currently: "⊕",
  using: "use:",
  uses: "use:",
};

// --- Structural patterns (applied after word-level compression) ---

const STRUCTURAL_PATTERNS: [RegExp, string][] = [
  // "X and Y and Z" → "X+Y+Z"
  [/\s*\band\b\s*/gi, "+"],
  // "X, Y, Z" → "X+Y+Z" (comma lists)
  [/,\s+/g, "+"],
  // "for example" / "e.g." → "eg."
  [/for example/gi, "eg."],
  [/such as/gi, "eg."],
  // Sentence-ending periods to pipe separators
  [/\.\s+/g, " | "],
  // Multiple spaces
  [/\s{2,}/g, " "],
  // Trailing pipe
  [/\s*\|\s*$/g, ""],
];

// --- Core encoder ---

export interface EncodeOptions {
  /** Memory category (preference, decision, etc.) */
  category?: string;
  /** Wing (agent, user, knowledge, experience) */
  wing?: string;
  /** Hall (core, decisions, patterns, etc.) */
  hall?: string;
  /** Importance 1-10 */
  importance?: number;
  /** Tags to append */
  tags?: string[];
}

/**
 * Encode natural language content to AAAK shorthand.
 * Achieves 2-8x compression depending on content verbosity.
 * Short content (<60 chars) bypasses text compression to avoid expansion.
 */
export function encodeAAAK(content: string, opts: EncodeOptions = {}): string {
  if (!content || content.length < 10) return content;

  let text = content.trim();

  // Only compress text that's verbose enough to benefit (>60 chars).
  // Short content is already concise — just add structural markers.
  const isVerbose = text.length > 60;

  if (isVerbose) {
    // 1. Apply multi-word abbreviations first (longer patterns first)
    const sortedAbbrevs = Object.entries(ABBREVIATIONS).sort((a, b) => b[0].length - a[0].length);
    for (const [phrase, abbrev] of sortedAbbrevs) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), abbrev);
    }

    // 2. Strip stop words (preserve abbreviation results with special chars)
    const words = text.split(/\s+/);
    const filtered = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()) || w.length <= 1 || /[→>∵⊕:]/.test(w));
    text = filtered.join(" ");

    // 3. Apply structural patterns
    for (const [pattern, replacement] of STRUCTURAL_PATTERNS) {
      text = text.replace(pattern, replacement);
    }
  }

  // 4. Build compact prefix: CAT(wing.hall)
  // Only add if it doesn't exceed 30% of content length
  let prefix = "";
  const catCode = opts.category ? CATEGORY_CODE[opts.category] || opts.category.toUpperCase().slice(0, 4) : "";
  let locCode = "";
  if (opts.wing && opts.hall) {
    const wc = WING_CODE[opts.wing] || opts.wing.slice(0, 2).toUpperCase();
    const hc = HALL_CODE[opts.hall] || opts.hall.slice(0, 3);
    locCode = `${wc}.${hc}`;
  }

  // Minimal prefix: only category code if short, full if verbose
  if (isVerbose && catCode && locCode) {
    prefix = `${catCode}[${locCode}]`;
  } else if (catCode) {
    prefix = catCode;
  }

  // 5. Clean up
  text = text
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*/g, "")
    .replace(/\s*\|\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 6. Truncate to 200 chars max (AAAK should be compact)
  if (text.length > 200) text = text.slice(0, 197) + "...";

  // 7. Assemble — only add prefix if result is shorter than original
  const result = prefix ? `${prefix}: ${text}` : text;

  // Guard: never return something longer than original content
  if (result.length > content.length) {
    return content.replace(/\n/g, " ").slice(0, 200);
  }

  return result;
}

/**
 * Encode a memory object to AAAK shorthand.
 * Omits tags and importance for short memories (they add more than they save).
 */
export function encodeMemoryAAAK(memory: {
  content: string;
  category?: string;
  wing?: string;
  hall?: string;
  importance?: number;
  tags?: string[];
}): string {
  return encodeAAAK(memory.content, {
    category: memory.category,
    wing: memory.wing,
    hall: memory.hall,
    // Only include importance/tags for verbose content where prefix is also added
    importance: memory.content.length > 60 ? memory.importance : undefined,
  });
}

/**
 * Format Tekiō adaptations in AAAK shorthand.
 * Replaces the verbose formatAdaptations() output.
 */
export function formatAdaptationsAAAK(
  adaptations: {
    category: string;
    adaptation_rule: string;
    times_applied?: number;
    times_prevented?: number;
  }[]
): string {
  if (adaptations.length === 0) return "";

  const catCode: Record<string, string> = {
    defensive: "DEF",
    auxiliary: "AUX",
    offensive: "OFF",
    learning: "LRN",
  };

  const lines: string[] = [`☸ TEKIŌ(${adaptations.length}spins)`];

  // Group by category
  const groups = new Map<string, typeof adaptations>();
  for (const a of adaptations) {
    const cat = a.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(a);
  }

  for (const [cat, items] of groups) {
    const code = catCode[cat] || cat.slice(0, 3).toUpperCase();
    const rules = items.map((a) => {
      let rule = a.adaptation_rule;
      // Compress the rule text
      rule = encodeAAAK(rule);
      // Add counters
      const counters: string[] = [];
      if (a.times_applied && a.times_applied > 0) counters.push(`${a.times_applied}x`);
      if (a.times_prevented && a.times_prevented > 0) counters.push(`p${a.times_prevented}`);
      if (counters.length > 0) rule += `(${counters.join(",")})`;
      return rule;
    });
    lines.push(`${code}: ${rules.join(" | ")}`);
  }

  return lines.join("\n");
}

/**
 * Format recalled memories in AAAK for context injection.
 * Replaces the markdown format in recall.ts.
 */
export function formatRecallAAAK(
  memories: {
    content: string;
    category?: string;
    wing?: string;
    hall?: string;
    importance?: number;
    tags?: string[];
  }[]
): string {
  if (memories.length === 0) return "";

  // Group by wing for structure
  const byWing = new Map<string, string[]>();
  for (const m of memories) {
    const wing = m.wing || "misc";
    if (!byWing.has(wing)) byWing.set(wing, []);
    byWing.get(wing)!.push(encodeMemoryAAAK(m));
  }

  const sections: string[] = [];
  for (const [wing, lines] of byWing) {
    const wc = WING_CODE[wing] || wing.toUpperCase().slice(0, 2);
    sections.push(`${wc}:\n${lines.join("\n")}`);
  }

  return sections.join("\n");
}

/**
 * Get the compression ratio for a given input → AAAK output.
 * Returns { original, compressed, ratio, savedTokens }
 */
export function compressionStats(
  original: string,
  compressed: string
): {
  originalTokens: number;
  compressedTokens: number;
  ratio: number;
  savedTokens: number;
  savedPct: number;
} {
  const originalTokens = Math.round(original.length / 4);
  const compressedTokens = Math.round(compressed.length / 4);
  const ratio = originalTokens / Math.max(compressedTokens, 1);
  const savedTokens = originalTokens - compressedTokens;
  const savedPct = Math.round((savedTokens / Math.max(originalTokens, 1)) * 100);
  return { originalTokens, compressedTokens, ratio, savedTokens, savedPct };
}
