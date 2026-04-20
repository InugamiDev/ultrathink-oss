/**
 * identity.ts — Dynamic user identity graph for UltraThink memory system.
 *
 * Identity is NOT hardcoded — it builds itself from:
 *   1. Explicit preference statements extracted from prompts ("I prefer X")
 *   2. Behavioral inference from tool usage patterns (file edits, commands)
 *   3. Memory mining — scanning existing memories for preference signals
 *
 * All stored in existing `memories` + `memory_relations` tables. No new tables.
 *
 * Node types (category): identity, preference, style-preference, tool-preference,
 *                         project-context, workflow-pattern
 * Edge types (relation_type): prefers, uses, dislikes, works-on, style-of,
 *                              tool-for, paired-with
 */

import { getClient } from "../src/client.js";
import { execFileSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORY_IMPORTANCE: Record<string, number> = {
  identity: 10,
  preference: 8,
  "style-preference": 7,
  "tool-preference": 8,
  "project-context": 6,
  "workflow-pattern": 5,
};

const CATEGORY_RELATION: Record<string, string> = {
  preference: "prefers",
  "style-preference": "style-of",
  "tool-preference": "uses",
  "project-context": "works-on",
  "workflow-pattern": "prefers",
};

const PREFERENCE_CATEGORIES = [
  "preference",
  "style-preference",
  "tool-preference",
  "project-context",
  "workflow-pattern",
];

// ─── Tool & Style detection ──────────────────────────────────────────

const KNOWN_TOOLS = [
  "bun",
  "npm",
  "pnpm",
  "yarn",
  "deno",
  "node",
  "vim",
  "neovim",
  "nvim",
  "vscode",
  "emacs",
  "cursor",
  "zed",
  "react",
  "vue",
  "svelte",
  "angular",
  "next",
  "next.js",
  "nextjs",
  "nuxt",
  "remix",
  "astro",
  "tailwind",
  "tailwindcss",
  "css modules",
  "styled-components",
  "emotion",
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "zig",
  "postgres",
  "mysql",
  "sqlite",
  "mongodb",
  "redis",
  "neon",
  "docker",
  "kubernetes",
  "vercel",
  "netlify",
  "cloudflare",
  "aws",
  "git",
  "github",
  "gitlab",
  "bitbucket",
  "figma",
  "sketch",
  "vitest",
  "jest",
  "playwright",
  "cypress",
  "prisma",
  "drizzle",
  "knex",
  "trpc",
  "graphql",
  "rest",
  "zsh",
  "fish",
  "bash",
];

const STYLE_KEYWORDS = [
  "glassmorphism",
  "neomorphism",
  "neumorphism",
  "brutalism",
  "dark mode",
  "light mode",
  "dark theme",
  "light theme",
  "minimal",
  "minimalist",
  "minimalism",
  "flat design",
  "material design",
  "skeuomorphic",
  "elegant",
  "clean",
  "modern",
  "retro",
  "vintage",
  "rounded",
  "sharp corners",
  "soft shadows",
  "gradient",
  "monochrome",
  "pastel",
  "vibrant",
  "animation",
  "animated",
  "transitions",
];

// File extension → tool inference
const FILE_TOOL_MAP: Record<string, string> = {
  ".tsx": "React",
  ".jsx": "React",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".ts": "TypeScript",
  ".js": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".prisma": "Prisma",
  ".sql": "PostgreSQL",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sh": "Shell scripting",
};

// Config file → tool inference
const CONFIG_TOOL_MAP: Record<string, string> = {
  "tailwind.config": "Tailwind CSS",
  "next.config": "Next.js",
  "nuxt.config": "Nuxt",
  "vite.config": "Vite",
  "vitest.config": "Vitest",
  "jest.config": "Jest",
  tsconfig: "TypeScript",
  "drizzle.config": "Drizzle ORM",
  "prisma/schema": "Prisma",
  "docker-compose": "Docker",
  Dockerfile: "Docker",
  ".eslintrc": "ESLint",
  prettier: "Prettier",
  bunfig: "bun",
  "package.json": "Node.js ecosystem",
};

// Command → tool inference
const COMMAND_TOOL_MAP: Record<string, string> = {
  bun: "bun",
  npm: "npm",
  pnpm: "pnpm",
  yarn: "yarn",
  npx: "npm/npx",
  bunx: "bun",
  docker: "Docker",
  kubectl: "Kubernetes",
  git: "Git",
  gh: "GitHub CLI",
  python: "Python",
  pip: "Python",
  cargo: "Rust",
  "go ": "Go",
  vercel: "Vercel",
  wrangler: "Cloudflare",
};

// ─── Auto-detect user name ───────────────────────────────────────────

function detectUserName(): string {
  try {
    const gitName = execFileSync("git", ["config", "user.name"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (gitName) return gitName;
  } catch {
    /* ignore */
  }
  return process.env.USER || process.env.USERNAME || "User";
}

/**
 * Auto-detect project context from cwd.
 * Reads package.json, git remote, directory name.
 */
function detectProjectContext(): { name: string; description: string } | null {
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();

  // Try package.json
  const pkgPath = resolve(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name || pkg.description) {
        return {
          name: pkg.name || cwd.split("/").pop() || "unknown",
          description: pkg.description || "",
        };
      }
    } catch {
      /* ignore */
    }
  }

  // Try git remote for project name
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
    if (match) return { name: match[1], description: "" };
  } catch {
    /* ignore */
  }

  // Fallback to directory name
  const dirName = cwd.split("/").pop();
  return dirName ? { name: dirName, description: "" } : null;
}

// ─── Core functions ──────────────────────────────────────────────────

/**
 * Get agent identity from agent/core memory.
 */
async function getAgentIdentity(): Promise<{ content: string; id: string } | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT id, content FROM memories
    WHERE wing = 'agent' AND hall = 'core' AND is_archived = false
    ORDER BY importance DESC LIMIT 1
  `;
  if (rows.length === 0) return null;
  return { id: rows[0].id as string, content: rows[0].content as string };
}

/**
 * Get agent behavioral rules — combines agent/rules memories + defensive Tekiō adaptations.
 */
async function introspectRules(scope?: string): Promise<{
  rules: Array<{ id: string; content: string; importance: number }>;
  adaptations: Array<{ rule: string; category: string; severity: number }>;
}> {
  const sql = getClient();

  // Agent rules from agent/rules hall
  const ruleRows = await sql`
    SELECT id, content, importance FROM memories
    WHERE wing = 'agent' AND hall = 'rules' AND is_archived = false
    ORDER BY importance DESC
    LIMIT 20
  `;

  // Defensive Tekiō adaptations (hard behavioral constraints)
  const adaptRows = await sql`
    SELECT adaptation_rule, category, severity FROM adaptations
    WHERE is_active = true AND category = 'defensive'
      AND (${scope ?? null}::text IS NULL OR scope = ${scope ?? null} OR scope IS NULL)
    ORDER BY severity DESC, times_applied DESC
    LIMIT 15
  `;

  return {
    rules: (ruleRows as any[]).map((r) => ({
      id: r.id as string,
      content: r.content as string,
      importance: r.importance as number,
    })),
    adaptations: (adaptRows as any[]).map((a) => ({
      rule: a.adaptation_rule as string,
      category: a.category as string,
      severity: a.severity as number,
    })),
  };
}

/**
 * Get or create the root user identity node for a scope.
 * Auto-detects name from git config if not provided.
 */
async function ensureIdentityNode(scope: string, name?: string): Promise<string> {
  const sql = getClient();
  const displayName = name || detectUserName();

  // Use INSERT ... ON CONFLICT to prevent race conditions during concurrent session starts.
  // The unique constraint is on (category, scope) for identity nodes — we use a partial unique index.
  // First, try atomic upsert. If there's no unique index yet, fall back to SELECT.
  try {
    const rows = await sql`
      INSERT INTO memories (content, category, importance, confidence, scope, source, wing, hall, layer)
      VALUES (${displayName}, 'identity', 10, 1.0, ${scope}, 'identity-graph', 'user', 'profile', 0)
      ON CONFLICT (scope, category) WHERE category = 'identity' AND is_archived = false
      DO UPDATE SET
        content = CASE WHEN ${name ?? null}::text IS NOT NULL THEN ${displayName} ELSE memories.content END,
        updated_at = NOW()
      RETURNING id
    `;
    if (rows.length > 0) return rows[0].id as string;
  } catch {
    // If unique index doesn't exist, fall back to SELECT + INSERT
  }

  // Fallback: SELECT then INSERT (original logic, for schemas without the partial unique index)
  const existing = await sql`
    SELECT id, content FROM memories
    WHERE category = 'identity' AND scope = ${scope} AND is_archived = false
    ORDER BY importance DESC, created_at ASC LIMIT 1
  `;

  if (existing.length > 0) {
    if (name && existing[0].content !== name) {
      await sql`UPDATE memories SET content = ${name}, updated_at = NOW() WHERE id = ${existing[0].id}`;
    }
    return existing[0].id as string;
  }

  const rows = await sql`
    INSERT INTO memories (content, category, importance, confidence, scope, source)
    VALUES (${displayName}, 'identity', 10, 1.0, ${scope}, 'identity-graph', 'user', 'profile', 0)
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  if (rows.length === 0) {
    // Another concurrent call inserted it — fetch the existing one
    const concurrent = await sql`
      SELECT id FROM memories WHERE category = 'identity' AND scope = ${scope} AND is_archived = false LIMIT 1
    `;
    return concurrent[0]?.id as string;
  }
  return rows[0].id as string;
}

/**
 * Link a preference-category memory to the identity node.
 * Called by flush() when it encounters preference memories.
 *
 * MemPalace: Temporal validity — when a new edge conflicts with an existing one
 * (same relation_type + similar content), the old edge gets valid_to = NOW()
 * instead of being deleted, preserving preference history.
 */
// intent: temporal edge management — invalidate conflicting edges before creating new ones
// status: done
// confidence: high
async function linkToIdentity(memoryId: string, category: string, scope: string): Promise<void> {
  const sql = getClient();
  const identityId = await ensureIdentityNode(scope);
  const relationType = CATEGORY_RELATION[category] ?? "prefers";

  // MemPalace: Invalidate conflicting edges before creating new one.
  // A "conflict" is an existing current edge of the same relation_type from the same
  // identity node, pointing to a memory with similar content (trigram > 0.3).
  // This handles e.g. "prefers Tailwind v3" being superseded by "prefers Tailwind v4".
  try {
    // Get the content of the new memory to compare
    const [newMem] = (await sql`SELECT content FROM memories WHERE id = ${memoryId}`) as any[];
    if (newMem) {
      await sql`
        UPDATE memory_relations mr
        SET valid_to = NOW()
        WHERE mr.source_id = ${identityId}
          AND mr.relation_type = ${relationType}
          AND mr.valid_to IS NULL
          AND mr.target_id != ${memoryId}
          AND EXISTS (
            SELECT 1 FROM memories m
            WHERE m.id = mr.target_id
              AND m.is_archived = false
              AND similarity(m.content, ${newMem.content as string}) > 0.3
          )
      `;
    }
  } catch {
    /* non-blocking — old schemas without valid_to column will throw, that's OK */
  }

  await sql`
    INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
    VALUES (${identityId}, ${memoryId}, ${relationType}, 0.8)
    ON CONFLICT DO NOTHING
  `;
}

/**
 * Set a user preference (upsert + auto-link).
 */
async function setPreference(
  scope: string,
  key: string,
  value: string,
  category: "preference" | "style-preference" | "tool-preference" | "project-context" | "workflow-pattern",
  strength: number = 0.8
): Promise<string> {
  const sql = getClient();
  const identityId = await ensureIdentityNode(scope);
  const importance = CATEGORY_IMPORTANCE[category] ?? 5;
  const relationType = CATEGORY_RELATION[category] ?? "prefers";

  // Dedup: check if similar preference already exists
  const similar = await sql`
    SELECT id, content, similarity(content, ${value}) as sim
    FROM memories
    WHERE category = ${category} AND scope = ${scope} AND is_archived = false
      AND similarity(content, ${value}) > 0.6
    ORDER BY sim DESC LIMIT 1
  `;

  let prefId: string;

  if (similar.length > 0) {
    prefId = similar[0].id as string;
    // Boost confidence on repeated mention
    await sql`
      UPDATE memories
      SET content = ${value}, updated_at = NOW(),
          confidence = LEAST(confidence + 0.05, 1.0),
          access_count = access_count + 1
      WHERE id = ${prefId}
    `;
  } else {
    const rows = await sql`
      INSERT INTO memories (content, category, importance, confidence, scope, source)
      VALUES (${value}, ${category}, ${importance}, ${strength}, ${scope}, 'identity-graph')
      RETURNING id
    `;
    prefId = rows[0].id as string;
  }

  // MemPalace: Invalidate old edges of the same relation_type pointing to similar content
  // before creating the new edge. Preserves history via valid_to instead of deletion.
  try {
    await sql`
      UPDATE memory_relations mr
      SET valid_to = NOW()
      WHERE mr.source_id = ${identityId}
        AND mr.relation_type = ${relationType}
        AND mr.valid_to IS NULL
        AND mr.target_id != ${prefId}
        AND EXISTS (
          SELECT 1 FROM memories m
          WHERE m.id = mr.target_id
            AND m.is_archived = false
            AND similarity(m.content, ${value}) > 0.3
        )
    `;
  } catch {
    /* non-blocking — old schemas without valid_to column */
  }

  // Auto-link to identity node
  await sql`
    INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
    VALUES (${identityId}, ${prefId}, ${relationType}, ${strength})
    ON CONFLICT DO NOTHING
  `;

  return prefId;
}

/**
 * Get full identity graph — DYNAMIC.
 * Combines: linked preferences + unlinked preference-category memories + inferred patterns.
 *
 * MemPalace: By default only returns current edges (valid_to IS NULL).
 * Pass includeHistory: true to also return expired/superseded edges.
 */
async function getIdentity(
  scope?: string,
  opts?: { includeHistory?: boolean }
): Promise<{
  agent: { id: string; content: string } | null;
  identity: { id: string; name: string; scope: string } | null;
  preferences: Array<{ id: string; content: string; category: string; strength: number }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
    validFrom?: string;
    validTo?: string | null;
  }>;
}> {
  const sql = getClient();

  // Find identity node
  const identityRows = await sql`
    SELECT id, content, scope FROM memories
    WHERE category = 'identity' AND is_archived = false
      AND (${scope ?? null}::text IS NULL OR scope = ${scope ?? null})
    ORDER BY importance DESC, created_at ASC LIMIT 1
  `;

  // --- DYNAMIC: Even without identity node, discover preferences ---
  const effectiveScope = scope ?? (identityRows.length > 0 ? (identityRows[0].scope as string) : null);

  // 1. Get linked preferences (via edges from identity node)
  // MemPalace: Filter by valid_to IS NULL unless includeHistory is true
  const includeHistory = opts?.includeHistory ?? false;
  const linkedPrefs = new Map<string, { id: string; content: string; category: string; strength: number }>();
  const edges: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
    validFrom?: string;
    validTo?: string | null;
  }> = [];

  if (identityRows.length > 0) {
    const identityId = identityRows[0].id as string;
    // Single JOIN query instead of N+1 (edge fetch + separate node fetch)
    // MemPalace: temporal filter — only current edges by default
    const joined = await sql`
      SELECT m.id, m.content, m.category, m.confidence,
             mr.source_id, mr.target_id, mr.relation_type, COALESCE(mr.strength, 0.5) as strength,
             mr.valid_from, mr.valid_to
      FROM memory_relations mr
      JOIN memories m ON mr.target_id = m.id
      WHERE mr.source_id = ${identityId} AND m.is_archived = false
        AND (${includeHistory} OR mr.valid_to IS NULL)
    `;
    for (const row of joined) {
      const strength = parseFloat(String(row.strength)) || 0.5;
      edges.push({
        source: row.source_id as string,
        target: row.target_id as string,
        type: row.relation_type as string,
        strength,
        validFrom: row.valid_from ? String(row.valid_from) : undefined,
        validTo: row.valid_to ? String(row.valid_to) : null,
      });
      // Only add to linkedPrefs if current (not expired) — expired edges are history-only
      if (!row.valid_to) {
        linkedPrefs.set(row.id as string, {
          id: row.id as string,
          content: row.content as string,
          category: row.category as string,
          strength,
        });
      }
    }
  }

  // 2. DYNAMIC DISCOVERY: Find unlinked preference-category memories in this scope
  //    These come from auto-save hook, prompt extraction, etc.
  if (effectiveScope) {
    const unlinked = await sql`
      SELECT m.id, m.content, m.category, m.confidence
      FROM memories m
      WHERE m.scope = ${effectiveScope}
        AND m.category = ANY(${PREFERENCE_CATEGORIES})
        AND m.is_archived = false
        AND m.id NOT IN (
          SELECT target_id FROM memory_relations
          WHERE source_id = ANY(
            SELECT id FROM memories WHERE category = 'identity' AND scope = ${effectiveScope}
          )
        )
      ORDER BY m.importance DESC, m.confidence DESC
      LIMIT 20
    `;

    // Auto-link discovered preferences if identity node exists
    const identityId = identityRows.length > 0 ? (identityRows[0].id as string) : null;
    const toLink: { id: string; relationType: string; strength: number }[] = [];
    for (const u of unlinked) {
      if (!linkedPrefs.has(u.id as string)) {
        const strength = parseFloat(String(u.confidence)) || 0.5;
        const relationType = CATEGORY_RELATION[u.category as string] ?? "prefers";
        linkedPrefs.set(u.id as string, {
          id: u.id as string,
          content: u.content as string,
          category: u.category as string,
          strength,
        });
        if (identityId) {
          toLink.push({ id: u.id as string, relationType, strength });
          edges.push({ source: identityId, target: u.id as string, type: relationType, strength });
        }
      }
    }
    // Bulk INSERT instead of N individual INSERTs
    if (identityId && toLink.length > 0) {
      const ids = toLink.map((l) => l.id);
      const types = toLink.map((l) => l.relationType);
      const strengths = toLink.map((l) => l.strength);
      await sql`
        INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
        SELECT ${identityId}, unnest(${ids}::uuid[]), unnest(${types}::text[]), unnest(${strengths}::float8[])
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const identity =
    identityRows.length > 0
      ? {
          id: identityRows[0].id as string,
          name: identityRows[0].content as string,
          scope: identityRows[0].scope as string,
        }
      : null;

  // Fetch agent identity
  const agent = await getAgentIdentity();

  return { agent, identity, preferences: [...linkedPrefs.values()], edges };
}

/**
 * Infer preferences from behavioral patterns in recent memories.
 * Scans auto-memory entries (file edits, commands) to detect what tools/frameworks are actually used.
 */
async function inferFromBehavior(
  scope: string,
  limit: number = 100
): Promise<
  Array<{
    tool: string;
    category: string;
    frequency: number;
    source: string;
  }>
> {
  const sql = getClient();

  // Get recent auto-memory entries for this scope
  const recent = await sql`
    SELECT content, source, category FROM memories
    WHERE scope = ${scope} AND source LIKE 'auto-memory%' AND is_archived = false
    ORDER BY created_at DESC LIMIT ${limit}
  `;

  const toolCounts = new Map<string, { count: number; source: string }>();

  for (const mem of recent) {
    const content = (mem.content as string).toLowerCase();

    // Infer from file edits: "Modified navbar.tsx at ..."
    for (const [ext, tool] of Object.entries(FILE_TOOL_MAP)) {
      if (content.includes(ext)) {
        const existing = toolCounts.get(tool) || { count: 0, source: "file-edit" };
        existing.count++;
        toolCounts.set(tool, existing);
      }
    }

    // Infer from config files
    for (const [config, tool] of Object.entries(CONFIG_TOOL_MAP)) {
      if (content.includes(config.toLowerCase())) {
        const existing = toolCounts.get(tool) || { count: 0, source: "config-edit" };
        existing.count++;
        toolCounts.set(tool, existing);
      }
    }

    // Infer from bash commands
    if (content.startsWith("ran command:")) {
      for (const [cmd, tool] of Object.entries(COMMAND_TOOL_MAP)) {
        if (content.includes(cmd)) {
          const existing = toolCounts.get(tool) || { count: 0, source: "command" };
          existing.count++;
          toolCounts.set(tool, existing);
        }
      }
    }
  }

  // Only return tools used 2+ times (filter noise)
  return [...toolCounts.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([tool, v]) => ({
      tool,
      category: "tool-preference",
      frequency: v.count,
      source: v.source,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Sync inferred behaviors into the identity graph.
 * Called during session-start to keep identity fresh.
 */
async function syncInferredIdentity(scope: string): Promise<number> {
  const inferred = await inferFromBehavior(scope);
  let synced = 0;

  for (const inf of inferred) {
    // Only auto-create if used frequently enough (3+ times)
    if (inf.frequency >= 3) {
      await setPreference(
        scope,
        inf.tool.toLowerCase().replace(/\s+/g, "-"),
        `Uses ${inf.tool}`,
        "tool-preference",
        Math.min(0.5 + inf.frequency * 0.05, 0.95)
      );
      synced++;
    }
  }

  // Auto-detect and store project context
  const project = detectProjectContext();
  if (project) {
    const desc = project.description
      ? `Working on ${project.name}: ${project.description}`
      : `Working on ${project.name}`;
    await setPreference(scope, project.name.toLowerCase(), desc, "project-context", 0.9);
    synced++;
  }

  return synced;
}

/**
 * Format identity for injection into additionalContext.
 * Compact markdown, max ~500 bytes. Fully dynamic from DB.
 */
function formatIdentityContext(identity: Awaited<ReturnType<typeof getIdentity>>): string {
  if (!identity.identity && !identity.agent && identity.preferences.length === 0) return "";

  const lines: string[] = [];
  if (identity.agent) {
    // Truncate agent identity to first sentence for compact output
    const agentShort = identity.agent.content.split(". ")[0] + ".";
    lines.push(`**Agent:** ${agentShort}`);
  }
  if (identity.identity) {
    lines.push(`**User:** ${identity.identity.name}`);
  }

  // Group preferences by category, deduplicate content
  const grouped: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const pref of identity.preferences) {
    const cat = pref.category;
    if (cat === "identity") continue; // Skip identity nodes in preference list
    if (!grouped[cat]) grouped[cat] = [];

    const short = pref.content
      .replace(/^(Prefers?|Uses?|Likes?|Favou?rs?|Avoids?)\s+/i, "")
      .replace(/\s+for\s+all\s+projects?$/i, "")
      .trim();

    const shortLower = short.toLowerCase();
    const isDupe = seen.has(shortLower);
    if (!isDupe) {
      seen.add(shortLower);
      grouped[cat].push(short);
    }
  }

  if (grouped["preference"]?.length) lines.push(`**Prefers:** ${grouped["preference"].join(", ")}`);
  if (grouped["tool-preference"]?.length) lines.push(`**Uses:** ${grouped["tool-preference"].join(", ")}`);
  if (grouped["style-preference"]?.length) lines.push(`**Style:** ${grouped["style-preference"].join(", ")}`);
  if (grouped["project-context"]?.length) lines.push(`**Projects:** ${grouped["project-context"].join(", ")}`);
  if (grouped["workflow-pattern"]?.length) lines.push(`**Workflow:** ${grouped["workflow-pattern"].join(", ")}`);

  let result = lines.join("\n");
  if (Buffer.byteLength(result, "utf-8") > 500) {
    while (Buffer.byteLength(result, "utf-8") > 490) {
      const lastNewline = result.lastIndexOf("\n");
      if (lastNewline === -1) {
        result = result.slice(0, 490);
        break;
      }
      result = result.slice(0, lastNewline);
    }
    result += "\n...";
  }

  return result;
}

// ─── Preference extraction from natural language ──────────────────────

interface ExtractedPreference {
  key: string;
  value: string;
  category: "preference" | "style-preference" | "tool-preference";
}

function extractPreferences(text: string): ExtractedPreference[] {
  const results: ExtractedPreference[] = [];
  const seen = new Set<string>();

  const preferPatterns = [
    /\bi\s+(?:prefer|like|want|love|enjoy|favor|favour)\s+(.+?)(?:\s+and\s+|\.|,|$|\n)/gi,
    /\balways\s+use\s+(.+?)(?:\s+and\s+|\.|,|$|\n)/gi,
    /\buse\s+(\w+)\s+(?:instead\s+of|over|rather\s+than)\s+\w+/gi,
    /\bswitch(?:ed)?\s+to\s+(\w+)/gi,
    /\bi\s+(?:usually|typically|normally)\s+(?:use|go\s+with)\s+(.+?)(?:\.|,|$|\n)/gi,
  ];

  for (const pattern of preferPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1]
        .trim()
        .replace(/[.!?,;]+$/, "")
        .trim();
      if (!raw || raw.length < 2 || raw.length > 100) continue;
      const key = raw.toLowerCase().replace(/\s+/g, "-");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ key, value: raw, category: categorizePreference(raw) });
    }
  }

  // Direct tool mentions
  for (const tool of KNOWN_TOOLS) {
    const escaped = tool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(?:use|using|prefer|with|switch(?:ed)?\\s+to)\\s+${escaped}\\b`, "i").test(text)) {
      const key = tool.replace(/\s+/g, "-").replace(/\./g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ key, value: `Uses ${tool}`, category: "tool-preference" });
    }
  }

  // Style mentions
  for (const style of STYLE_KEYWORDS) {
    const escaped = style.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(?:prefer|like|love|want|use|favor|favour)\\s+${escaped}\\b`, "i").test(text)) {
      const key = style.replace(/\s+/g, "-");
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ key, value: `Prefers ${style}`, category: "style-preference" });
    }
  }

  // Anti-preferences — require first-person subject or imperative form
  const antiPatterns = [
    /\bi\s+(?:never|don'?t|do\s+not|avoid|hate|dislike)\s+(?:use\s+)?(.+?)(?:\.|,|$|\n)/gi,
    /\b(?:never|don'?t|do\s+not|avoid)\s+(?:use|do|add|create|write|make|include)\s+(.+?)(?:\.|,|$|\n)/gi,
  ];
  for (const pattern of antiPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1]
        .trim()
        .replace(/[.!?,;]+$/, "")
        .trim();
      if (!raw || raw.length < 2 || raw.length > 100) continue;
      const key = `anti-${raw.toLowerCase().replace(/\s+/g, "-")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ key, value: `Avoids ${raw}`, category: categorizePreference(raw) });
    }
  }

  return results;
}

function categorizePreference(value: string): "preference" | "style-preference" | "tool-preference" {
  const lower = value.toLowerCase();
  for (const tool of KNOWN_TOOLS) {
    if (lower === tool || lower.includes(tool)) return "tool-preference";
  }
  for (const style of STYLE_KEYWORDS) {
    if (lower.includes(style)) return "style-preference";
  }
  return "preference";
}

// ─── Preference conflict detection ────────────────────────────────────

interface PreferenceConflict {
  prefer: { id: string; content: string };
  avoid: { id: string; content: string };
  subject: string;
}

/**
 * Detect contradictory preferences in the identity graph.
 * Looks for "Prefers X" + "Avoids X" pairs on the same subject.
 */
async function detectConflicts(scope: string): Promise<PreferenceConflict[]> {
  const sql = getClient();
  const conflicts: PreferenceConflict[] = [];

  const prefs = await sql`
    SELECT id, content FROM memories
    WHERE scope = ${scope} AND is_archived = false
      AND category = ANY(${PREFERENCE_CATEGORIES})
    ORDER BY created_at DESC
    LIMIT 200
  `;

  // Extract subject from "Prefers X" / "Avoids X" / "Uses X"
  const positives = new Map<string, { id: string; content: string }>();
  const negatives = new Map<string, { id: string; content: string }>();

  for (const p of prefs) {
    const content = String(p.content);
    const avoidMatch = content.match(/^Avoids?\s+(.+)$/i);
    const preferMatch = content.match(/^(?:Prefers?|Uses?|Likes?)\s+(.+)$/i);

    if (avoidMatch) {
      const subject = avoidMatch[1].toLowerCase().trim();
      negatives.set(subject, { id: String(p.id), content });
    } else if (preferMatch) {
      const subject = preferMatch[1].toLowerCase().trim();
      positives.set(subject, { id: String(p.id), content });
    }
  }

  // Find overlaps
  for (const [subject, pref] of positives) {
    const avoid = negatives.get(subject);
    if (avoid) {
      conflicts.push({ prefer: pref, avoid, subject });
    }
  }

  return conflicts;
}

/**
 * Resolve a conflict by archiving the older preference.
 * Keeps the most recently created one as the "current" preference.
 */
async function resolveConflict(keepId: string, archiveId: string): Promise<void> {
  const sql = getClient();
  await sql`UPDATE memories SET is_archived = true, updated_at = NOW() WHERE id = ${archiveId}`;
}

// ─── Exports ──────────────────────────────────────────────────────────

export {
  ensureIdentityNode,
  linkToIdentity,
  setPreference,
  getIdentity,
  getAgentIdentity,
  introspectRules,
  inferFromBehavior,
  syncInferredIdentity,
  formatIdentityContext,
  extractPreferences,
  detectConflicts,
  resolveConflict,
};
