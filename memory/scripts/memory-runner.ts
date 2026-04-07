#!/usr/bin/env npx tsx
/**
 * memory-runner.ts — Thin CLI for UltraThink memory DB operations.
 * Called by shell hooks via `npx tsx memory-runner.ts <command> [args]`.
 *
 * Commands:
 *   session-start     — Create session, recall memories, output JSON
 *   session-end       — Close session, flush pending memories
 *   recall-only       — Recall memories without creating a session (for post-compact)
 *   save              — Insert a single memory from JSON arg
 *   flush             — Bulk insert from /tmp/ultrathink-memories/*.json
 *   flush-decisions   — Flush pending decisions from /tmp/ultrathink-pending-decisions/*.json to DB
 *   search            — Fuzzy search using pg_trgm with ILIKE fallback
 *   relate            — Create memory relation
 *   graph             — Fetch memory graph for scope
 *   dedup             — Check if content is duplicate
 *   identity          — Get user identity graph for a scope
 *   identity-set      — Set a user preference in the identity graph
 *   conflicts         — Detect contradictory preferences (Prefers X vs Avoids X)
 *   resolve-conflict  — Resolve a conflict by archiving one preference
 *   compact-context   — Compressed session-start context (MemPalace format, 3KB cap)
 */

import { readFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";
import { getClient } from "../src/client.js";
import {
  createMemory,
  searchMemories,
  semanticSearch,
  findSimilar,
  createRelation,
  getMemoryGraph,
  type CreateMemoryInput,
} from "../src/memory.js";
import { logHookEvent } from "../src/hooks.js";
import {
  ensureIdentityNode,
  linkToIdentity,
  setPreference,
  getIdentity,
  syncInferredIdentity,
  formatIdentityContext,
  detectConflicts,
  resolveConflict,
} from "./identity.js";
import {
  logSkillUsage,
  logToolUse,
  computeDailyStats,
  logSecurityIncident,
  logDecision,
  listDecisions,
} from "../src/analytics.js";
import { enrichMemory } from "../src/enrich.js";
import {
  wheelTurn,
  wheelLearn,
  getActiveAdaptations,
  formatAdaptations,
  adaptFromCorrection,
  getWheelStats,
  type FailureEvent,
} from "../src/adaptation.js";
import { createJournal } from "../src/plans.js";
import { createDecision } from "../src/decisions.js";

// Load .env from project root
const projectRoot = resolve(import.meta.dirname, "../..");
config({ path: join(projectRoot, ".env") });

const MEMORIES_DIR = "/tmp/ultrathink-memories";
const PENDING_DECISIONS_DIR = "/tmp/ultrathink-pending-decisions";

/** Return a session-scoped file path to avoid collisions between concurrent Claude sessions. */
function getSessionFile(): string {
  const ccSid = (process.env.CC_SESSION_ID || "").slice(0, 12);
  if (ccSid) return `/tmp/ultrathink-session-${ccSid}`;
  return "/tmp/ultrathink-session-id"; // fallback for direct CLI usage
}

const command = process.argv[2];
const args = process.argv.slice(3);

/** Shared recall logic used by both sessionStart and recallOnly */
async function buildMemoryContext(scope: string): Promise<{
  preferences: Awaited<ReturnType<typeof searchMemories>>;
  projectMemories: Awaited<ReturnType<typeof searchMemories>>;
  crossProject: Awaited<ReturnType<typeof searchMemories>>;
  allMemories: Awaited<ReturnType<typeof searchMemories>>;
}> {
  // Parallel fetch — all 6 queries run concurrently (~100ms instead of ~700ms sequential)
  const [preferences, projectSolutions, projectArchitecture, projectPatterns, projectInsights, crossProject] =
    await Promise.all([
      searchMemories({ category: "preference", limit: 8, minImportance: 1 }),
      searchMemories({ category: "solution", scope, limit: 10, minImportance: 1 }),
      searchMemories({ category: "architecture", scope, limit: 8, minImportance: 1 }),
      searchMemories({ category: "pattern", scope, limit: 8, minImportance: 1 }),
      searchMemories({ category: "insight", scope, limit: 5, minImportance: 1 }),
      searchMemories({ limit: 5, minImportance: 7 }),
    ]);
  const projectMemories = [...projectSolutions, ...projectArchitecture, ...projectPatterns, ...projectInsights];

  const seen = new Set<string>();
  const allMemories: typeof projectMemories = [];
  for (const list of [preferences, projectMemories, crossProject]) {
    for (const m of list) {
      if (!seen.has(m.id)) {
        allMemories.push(m);
        seen.add(m.id);
      }
    }
  }

  return { preferences, projectMemories, crossProject, allMemories };
}

async function sessionStart() {
  const sql = getClient();
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // Detect project name from directory
  let projectName = cwd.split("/").pop() || scope;
  try {
    const { execFileSync } = await import("child_process");
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (remote) {
      const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) projectName = match[1];
    }
  } catch {
    /* not a git repo or no remote — use dirname */
  }

  // Create session
  const [session] = (await sql`
    INSERT INTO sessions (task_context) VALUES (${scope}) RETURNING id, started_at
  `) as any[];
  const sessionId = session.id as string;

  const { writeFileSync } = await import("fs");
  writeFileSync(getSessionFile(), sessionId);
  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true });

  // Recall core memories (shared with recallOnly)
  const { preferences, projectMemories, allMemories: baseMemories } = await buildMemoryContext(scope);

  // Additional recalls — run in parallel (semanticSearch + decisions don't depend on each other)
  const [contextMemories, decisions] = await Promise.all([
    semanticSearch({ query: projectName, scope, limit: 10, minImportance: 2 }).catch(
      () => [] as Awaited<ReturnType<typeof semanticSearch>>
    ),
    searchMemories({ category: "decision", scope, limit: 8, minImportance: 1 }),
  ]);

  // Graph neighbors (1 hop from project memories)
  const projectIds = projectMemories.map((m) => m.id);
  let neighbors: typeof projectMemories = [];
  if (projectIds.length > 0) {
    const edges = await sql`
      SELECT DISTINCT CASE WHEN source_id = ANY(${projectIds}) THEN target_id ELSE source_id END as neighbor_id
      FROM memory_relations WHERE source_id = ANY(${projectIds}) OR target_id = ANY(${projectIds}) LIMIT 5
    `;
    const neighborIds = (edges as any[]).map((e: Record<string, unknown>) => e.neighbor_id as string);
    if (neighborIds.length > 0) {
      neighbors = (await sql`
        SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
        FROM memories m LEFT JOIN memory_tags mt ON m.id = mt.memory_id
        WHERE m.id = ANY(${neighborIds}) AND m.is_archived = false GROUP BY m.id
      `) as typeof projectMemories;
    }
  }

  // Dedup: merge additional results into base set
  const seen = new Set(baseMemories.map((m) => m.id));
  const allMemories = [...baseMemories];
  for (const list of [decisions, contextMemories, neighbors]) {
    for (const m of list) {
      if (!seen.has(m.id)) {
        allMemories.push(m);
        seen.add(m.id);
      }
    }
  }

  await logHookEvent({
    event_type: "session_start",
    severity: "info",
    description: `Session ${projectName}: ${allMemories.length} recalled (${preferences.length} prefs, ${decisions.length} decisions, ${neighbors.length} linked)`,
    hook_name: "memory-session-start",
    session_id: sessionId,
  });

  // Sync inferred identity from behavioral patterns (file edits, commands)
  // This mines auto-memory entries and creates tool-preference nodes
  try {
    await syncInferredIdentity(scope);
  } catch (err) {
    console.error("Identity sync warning:", (err as Error).message);
  }

  // Recall identity graph (now includes both explicit prefs AND inferred behavior)
  const identityData = await getIdentity(scope);
  const identityContext = formatIdentityContext(identityData);

  // Format with sections (max 2KB)
  let context = "";
  if (allMemories.length > 0 || identityContext) {
    const sections: string[] = [];

    if (preferences.length > 0) {
      sections.push("**Preferences:**\n" + preferences.map((m) => `- ${m.content}`).join("\n"));
    }
    const uniqueDecisions = decisions.filter((m) => !preferences.some((p) => p.id === m.id));
    if (uniqueDecisions.length > 0) {
      sections.push("**Decisions:**\n" + uniqueDecisions.map((m) => `- ${m.content}`).join("\n"));
    }
    const other = allMemories.filter(
      (m) => m.category !== "preference" && m.category !== "decision" && m.category !== "identity"
    );
    if (other.length > 0) {
      sections.push(
        "**Context:**\n" +
          other
            .map((m) => {
              const tags = m.tags?.filter(Boolean).join(", ") || "";
              return `- [${m.category}] ${m.content}${tags ? ` [${tags}]` : ""}`;
            })
            .join("\n")
      );
    }

    if (identityContext) {
      sections.unshift(identityContext);
    }

    // ☸ Tekiō — inject adaptations (hard rules from experience)
    let wheelSection = "";
    try {
      const adaptations = await getActiveAdaptations(sql, scope);
      wheelSection = formatAdaptations(adaptations);
    } catch {
      // Adaptation table may not exist yet — silently skip
    }

    // Dynamic budget: scale up to 8192 if content warrants it
    // Base 5120, expand if brain+wheel would both benefit from more space
    const brainRaw = `## Brain — ${projectName}\n\n` + sections.join("\n\n") + "\n";
    const TOTAL_BUDGET = Math.min(8192, Math.max(5120, brainRaw.length + wheelSection.length + 512));
    const BRAIN_TARGET = Math.round(TOTAL_BUDGET * 0.6);
    const WHEEL_TARGET = TOTAL_BUDGET - BRAIN_TARGET;
    const brainContent = `## Brain — ${projectName}\n\n` + sections.join("\n\n") + "\n";
    const brainOverflow = Math.max(0, brainContent.length - BRAIN_TARGET);
    const wheelOverflow = Math.max(0, wheelSection.length - WHEEL_TARGET);
    // Each section can borrow unused space from the other
    const maxWheel = WHEEL_TARGET + Math.max(0, BRAIN_TARGET - brainContent.length);
    const maxBrain = BRAIN_TARGET + Math.max(0, WHEEL_TARGET - wheelSection.length);
    const trimmedBrain = brainContent.length > maxBrain ? brainContent.slice(0, maxBrain) : brainContent;
    const trimmedWheel = wheelSection.length > maxWheel ? wheelSection.slice(0, maxWheel) : wheelSection;

    context = trimmedBrain + (trimmedWheel ? "\n" + trimmedWheel + "\n" : "");
  }

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
}

async function recallOnly() {
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // Reuse shared recall logic (no session creation, no decisions/neighbors)
  const { allMemories } = await buildMemoryContext(scope);

  // ☸ Tekiō — inject adaptations (same as sessionStart)
  let wheelSection = "";
  try {
    const sql = getClient();
    const adaptations = await getActiveAdaptations(sql, scope);
    wheelSection = formatAdaptations(adaptations);
  } catch {
    // Adaptation table may not exist yet — silently skip
  }

  let context = "";
  if (allMemories.length > 0 || wheelSection) {
    const filtered = allMemories.filter((m) => m.category !== "identity");
    const lines = filtered.map((m) => {
      const tags = m.tags?.filter(Boolean).join(", ") || "";
      const tagStr = tags ? ` [${tags}]` : "";
      return `- [${m.category}] ${m.content}${tagStr} (importance: ${m.importance})`;
    });
    const memoryContent = lines.length > 0 ? "## Recalled Memories\n\n" + lines.join("\n") + "\n" : "";
    // Dynamic budget — scale up to 8192 if content warrants it
    const totalBudget = Math.min(8192, Math.max(5120, memoryContent.length + wheelSection.length + 512));
    const maxMemory = totalBudget - wheelSection.length;
    const trimmedMemory = memoryContent.length > maxMemory ? memoryContent.slice(0, maxMemory) : memoryContent;
    context = trimmedMemory + (wheelSection ? "\n" + wheelSection + "\n" : "");
  }

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
}

async function sessionEnd() {
  // Flush any pending memories first
  await flush();

  // Close session record
  let sessionId: string | null = null;
  try {
    sessionId = readFileSync(getSessionFile(), "utf-8").trim();
  } catch {
    // No session file — nothing to close
  }

  if (sessionId) {
    const sql = getClient();

    // Count memories created in this session
    const [stats] = (await sql`
      SELECT COUNT(*) as count FROM memories WHERE session_id = ${sessionId}
    `) as any[];

    // Build session summary from memories created this session
    let summary: string | null = null;
    if (Number(stats.count) > 0) {
      const sessionMemories = await sql`
        SELECT content, category, importance FROM memories
        WHERE session_id = ${sessionId} AND is_archived = false
        ORDER BY importance DESC, created_at ASC
        LIMIT 30
      `;

      const byCategory: Record<string, string[]> = {};
      for (const m of sessionMemories as any[]) {
        const cat = m.category as string;
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(m.content as string);
      }

      // Prioritize: decisions > preferences > corrections > solutions > architecture > rest
      const CATEGORY_PRIORITY = [
        "decision",
        "preference",
        "correction-log",
        "solution",
        "architecture",
        "pattern",
        "insight",
      ];
      const sortedEntries = Object.entries(byCategory).sort(([a], [b]) => {
        const ai = CATEGORY_PRIORITY.indexOf(a);
        const bi = CATEGORY_PRIORITY.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

      const sections = sortedEntries.map(([cat, items]) => `[${cat}]: ${items.join("; ")}`).join("\n");
      summary = `Session summary (${stats.count} memories):\n${sections}`;

      // Save session summary as a memory
      try {
        const cwd = process.env.ULTRATHINK_CWD || process.cwd();
        const scope = cwd.split("/").slice(-2).join("/");
        await createMemory({
          content: summary.slice(0, 4000),
          category: "session-summary",
          importance: 6,
          confidence: 0.9,
          scope,
          source: "session-end",
          session_id: sessionId,
        });
      } catch {
        // Non-critical — don't fail session end
      }
    }

    // Close session in DB — only delete session file if this succeeds
    let dbUpdateSucceeded = false;
    try {
      await sql`
        UPDATE sessions SET
          ended_at = NOW(),
          memories_created = ${Number(stats.count)},
          summary = ${summary}
        WHERE id = ${sessionId}
      `;
      dbUpdateSucceeded = true;
    } catch (err) {
      console.error("Failed to update session in DB:", (err as Error).message);
      // DO NOT delete session file — leave for next attempt
    }

    await logHookEvent({
      event_type: "session_end",
      severity: "info",
      description: `Session ended. ${stats.count} memories created.`,
      hook_name: "memory-session-end",
      session_id: sessionId,
    });

    // #8: Memory importance auto-adjustment
    // Boost frequently accessed memories, decay never-accessed old ones
    try {
      // Boost: memories accessed 5+ times in last 30 days get +1 importance (cap 10)
      await sql`
        UPDATE memories SET importance = LEAST(importance + 1, 10), updated_at = NOW()
        WHERE is_archived = false
          AND access_count >= 5
          AND accessed_at > NOW() - INTERVAL '30 days'
          AND importance < 10
      `;

      // Decay: memories never accessed, older than 30 days, importance > 2 → archive
      await sql`
        UPDATE memories SET is_archived = true
        WHERE is_archived = false
          AND access_count = 0
          AND importance <= 2
          AND created_at < NOW() - INTERVAL '30 days'
          AND category NOT IN ('decision', 'preference', 'identity', 'prediction')
      `;

      // Skill suggestion effectiveness: compare suggestions vs actual Skill() activations
      try {
        const suggestionsDir = "/tmp/ultrathink-skill-suggestions";
        if (existsSync(suggestionsDir)) {
          const suggFiles = readdirSync(suggestionsDir).filter((f) => f.endsWith(".json"));
          // Clean up suggestion tracking files (older than this session)
          for (const f of suggFiles) {
            try {
              unlinkSync(join(suggestionsDir, f));
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // non-critical
      }
    } catch {
      // Non-critical — don't fail session end
    }

    // Deactivate stale adaptations (90+ days old, never applied, not user corrections)
    try {
      await sql`
        UPDATE adaptations SET is_active = false
        WHERE is_active = true
          AND last_applied_at IS NULL AND times_applied = 0
          AND created_at < NOW() - INTERVAL '90 days'
          AND (source_failure IS NULL OR (
            source_failure NOT LIKE 'User correction%'
            AND source_failure NOT LIKE 'Success pattern%'
          ))
      `;
    } catch {
      // Non-critical
    }

    // Only clean up session file if DB update succeeded
    if (dbUpdateSucceeded) {
      try {
        unlinkSync(getSessionFile());
      } catch {
        // ignore
      }
    }
  }
}

function validateMemoryInput(data: unknown): data is { content: string; [key: string]: unknown } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).content === "string" &&
    ((data as Record<string, unknown>).content as string).length > 0
  );
}

async function save() {
  const jsonArg = process.argv[3];
  if (!jsonArg) {
    console.error("Usage: memory-runner.ts save '<json>'");
    process.exit(1);
  }

  let data: unknown;
  try {
    data = JSON.parse(jsonArg);
  } catch {
    console.error("Invalid JSON");
    process.exit(1);
  }
  if (!validateMemoryInput(data)) {
    console.error("Missing required field: content");
    process.exit(1);
  }
  const sessionId = getSessionId();

  const input: CreateMemoryInput = {
    content: data.content as string,
    category: (data.category as string) || "insight",
    importance: (data.importance as number) ?? 5,
    confidence: (data.confidence as number) ?? 0.8,
    scope: data.scope as string,
    source: (data.source as string) || "auto-memory",
    session_id: sessionId || undefined,
    tags: data.tags as string[],
  };

  const memory = await createMemory(input);
  process.stdout.write(JSON.stringify({ id: memory.id, status: "saved" }));
}

async function flush() {
  if (!existsSync(MEMORIES_DIR)) return;

  const files = readdirSync(MEMORIES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return;

  const sessionId = getSessionId();
  let saved = 0;
  let errors = 0;

  // Pre-read all pending files and validate before hitting the DB
  const pending: { filePath: string; data: Record<string, unknown> }[] = [];
  for (const file of files) {
    const filePath = join(MEMORIES_DIR, file);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (validateMemoryInput(data)) {
        pending.push({ filePath, data });
      } else {
        errors++;
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
    } catch {
      errors++;
      try {
        unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }

  // Batch dedup: fetch all recent memories once, compare in-memory
  // Instead of N individual findSimilar queries (one per file)
  const sql = getClient();
  let existingContents: string[] = [];
  if (pending.length > 0) {
    try {
      const rows = await sql`
        SELECT content FROM memories WHERE is_archived = false
        ORDER BY created_at DESC LIMIT 200
      `;
      existingContents = (rows as any[]).map((r: Record<string, unknown>) => r.content as string);
    } catch {
      // Fall back to per-item dedup if batch fetch fails
    }
  }

  // Two-tier similarity check: exact match first, then word overlap
  const existingSet = new Set(existingContents.map((c) => c.toLowerCase().trim()));

  function isContentSimilar(a: string, b: string, threshold = 0.6): boolean {
    // Tier 1: exact match (catches "Exit code 1" duplicates)
    if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;
    // Tier 2: word overlap for near-duplicates
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    if (wordsA.size === 0 || wordsB.size === 0) return false;
    let overlap = 0;
    for (const w of wordsA) if (wordsB.has(w)) overlap++;
    const ratio = overlap / Math.max(wordsA.size, wordsB.size);
    return ratio >= threshold;
  }

  const prefCategories = ["preference", "style-preference", "tool-preference", "project-context", "workflow-pattern"];

  for (const { filePath, data } of pending) {
    try {
      // Fast exact-match check (O(1) via Set), then word-overlap for near-dupes
      const contentLower = (data.content as string).toLowerCase().trim();
      const isDup =
        existingSet.has(contentLower) ||
        existingContents.some((existing) => isContentSimilar(data.content as string, existing));

      if (!isDup) {
        const input: CreateMemoryInput = {
          content: data.content as string,
          category: (data.category as string) || "insight",
          importance: (data.importance as number) ?? 5,
          confidence: (data.confidence as number) ?? 0.8,
          scope: data.scope as string,
          source: (data.source as string) || "auto-memory",
          session_id: sessionId || undefined,
          tags: data.tags as string[],
        };

        const created = await createMemory(input);

        // Track newly created content for intra-batch dedup
        existingContents.push(input.content);
        existingSet.add(input.content.toLowerCase().trim());

        // Auto-link preference-category memories to identity graph
        if (prefCategories.includes(input.category) && input.scope) {
          await linkToIdentity(created.id, input.category, input.scope);
        }

        saved++;
      }
      // Only delete after successful save
      try {
        unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    } catch (err) {
      errors++;
      console.error(`Failed to flush ${filePath}:`, err);
      // DO NOT delete file — leave for next flush attempt
    }
  }

  if (saved > 0 || errors > 0) {
    await logHookEvent({
      event_type: "memory_flush",
      severity: errors > 0 ? "warning" : "info",
      description: `Flushed ${saved} memories, ${errors} errors`,
      hook_name: "memory-session-end",
      session_id: sessionId || undefined,
    });
  }
}

async function search() {
  const query = process.argv[3];
  if (!query) {
    console.error("Usage: memory-runner.ts search '<query>' [scope]");
    process.exit(1);
  }
  const scope = process.argv[4] || undefined;

  const results = await semanticSearch({
    query,
    scope,
    limit: 15,
    minImportance: 1,
  });

  process.stdout.write(JSON.stringify({ results, count: results.length }));
}

async function relate() {
  const sourceId = process.argv[3];
  const targetId = process.argv[4];
  const relationType = process.argv[5] || "related_to";
  if (!sourceId || !targetId) {
    console.error("Usage: memory-runner.ts relate <source_id> <target_id> [relation_type]");
    process.exit(1);
  }
  await createRelation(sourceId, targetId, relationType);
  process.stdout.write(JSON.stringify({ status: "linked", sourceId, targetId, relationType }));
}

async function graph() {
  const scope = process.argv[3] || undefined;
  const result = await getMemoryGraph({ scope, limit: 50 });
  process.stdout.write(
    JSON.stringify({
      nodes: result.nodes.length,
      edges: result.edges.length,
      graph: result,
    })
  );
}

async function dedup() {
  const content = process.argv[3];
  if (!content) {
    console.error("Usage: memory-runner.ts dedup '<content>'");
    process.exit(1);
  }
  const existing = await findSimilar(content, 0.4);
  process.stdout.write(
    JSON.stringify({
      isDuplicate: existing !== null,
      existingId: existing?.id ?? null,
      similarity: existing ? (existing as unknown as Record<string, unknown>).sim : null,
    })
  );
}

async function identityGet() {
  const scope = process.argv[3] || undefined;
  const identity = await getIdentity(scope);
  const formatted = formatIdentityContext(identity);
  process.stdout.write(JSON.stringify({ identity, formatted }));
}

async function identitySet() {
  const scope = process.argv[3];
  const key = process.argv[4];
  const value = process.argv[5];
  const category = (process.argv[6] || "preference") as
    | "preference"
    | "style-preference"
    | "tool-preference"
    | "project-context"
    | "workflow-pattern"
    | "identity";
  const strength = process.argv[7] ? parseFloat(process.argv[7]) : 0.8;

  if (!scope || !key || !value) {
    console.error("Usage: memory-runner.ts identity-set <scope> <key> <value> [category] [strength]");
    process.exit(1);
  }

  // Identity category updates the root node name directly
  if (category === "identity") {
    await ensureIdentityNode(scope, value);
    process.stdout.write(JSON.stringify({ status: "set", key, category: "identity" }));
    return;
  }

  await setPreference(scope, key, value, category, strength);
  process.stdout.write(JSON.stringify({ status: "set", key, category }));
}

function getSessionId(): string | null {
  try {
    return readFileSync(getSessionFile(), "utf-8").trim();
  } catch {
    return null;
  }
}

// intent: MemPalace-inspired compressed context for session-start injection
// status: done
// confidence: high
async function compactContext() {
  const sql = getClient();
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");
  const MAX_CHARS = 3000;
  const lines: string[] = [];

  // 1. Top 10 memories by importance
  try {
    const memories = (await sql`
      SELECT content, importance, scope, category
      FROM memories
      WHERE is_archived = false
      ORDER BY importance DESC, accessed_at DESC NULLS LAST
      LIMIT 10
    `) as { content: string; importance: number; scope: string; category: string }[];

    for (const m of memories) {
      const scopeLabel = m.scope || "global";
      const truncated = m.content.replace(/\n/g, " ").slice(0, 200);
      lines.push(`[MEM:${m.importance}] ${scopeLabel}/${m.category}: ${truncated}`);
    }
  } catch {
    // memories table may not exist
  }

  // 2. Active identity nodes (preferences, style, tools)
  try {
    const nodes = (await sql`
      SELECT type, label, category
      FROM identity_nodes
      WHERE is_active = true
        AND type IN ('preference', 'style', 'tool')
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 15
    `) as { type: string; label: string; category: string }[];

    for (const n of nodes) {
      const key = n.category || n.type;
      lines.push(`[ID:${n.type}] ${key}: ${n.label}`);
    }
  } catch {
    // identity_nodes table may not exist
  }

  // 3. Active adaptations
  try {
    const adaptations = await getActiveAdaptations(sql, scope);
    for (const a of adaptations) {
      const trigger = (a.trigger_pattern || "").replace(/\n/g, " ").slice(0, 80);
      const response = (a.adaptation_rule || "").replace(/\n/g, " ").slice(0, 80);
      lines.push(`[ADAPT:${a.severity}] ${trigger} → ${response}`);
    }
  } catch {
    // adaptations table may not exist
  }

  // 4. Cap total output at MAX_CHARS
  let output = "";
  for (const line of lines) {
    const candidate = output ? output + "\n" + line : line;
    if (candidate.length > MAX_CHARS) break;
    output = candidate;
  }

  process.stdout.write(JSON.stringify({ additionalContext: output || undefined }));
}

// Extract tool/framework preferences as keyword array for skill scoring
async function preferences() {
  const sql = getClient();
  const TOOL_PATTERNS =
    /\b(tailwind|drizzle|react|next\.?js|vue|svelte|postgres|supabase|neon|prisma|typescript|node|bun|deno|docker|vercel|aws|redis|graphql|trpc|zod|vite|vitest|jest|playwright|figma|linear|notion|shadcn|radix|framer|motion)\b/gi;

  try {
    const rows = await sql`
      SELECT DISTINCT content FROM memories
      WHERE (category = 'preference' OR tags @> ARRAY['#preference'])
      UNION
      SELECT DISTINCT label FROM identity_nodes
      WHERE type = 'preference' OR category = 'preference'
    `;

    const keywords = new Set<string>();
    for (const r of rows as any[]) {
      const text = (r.content || r.label || "") as string;
      const matches = text.match(TOOL_PATTERNS);
      if (matches) matches.forEach((m) => keywords.add(m.toLowerCase()));
    }
    process.stdout.write(JSON.stringify({ preferences: [...keywords] }));
  } catch {
    process.stdout.write(JSON.stringify({ preferences: [] }));
  }
}

// intent: flush pending decisions extracted by decision-extract.sh hook into the DB
// status: done
// confidence: high
// next: none
async function flushDecisions() {
  if (!existsSync(PENDING_DECISIONS_DIR)) return;

  const files = readdirSync(PENDING_DECISIONS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return;

  let flushed = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = join(PENDING_DECISIONS_DIR, file);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);

      // decision-extract.sh writes: { rule, scope, project_hash, extracted_at, confirmed }
      if (!data.rule || typeof data.rule !== "string") {
        errors++;
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
        continue;
      }

      await createDecision({
        rule: data.rule,
        scope: data.scope || "global",
        source: "claude",
        priority: 5,
        context: `Auto-extracted from user correction at ${data.extracted_at || "unknown"}`,
        tags: ["auto-extracted", "pending-review"],
      });

      // Delete file after successful DB write
      try {
        unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      flushed++;
    } catch (err) {
      errors++;
      console.error(`Failed to flush decision ${filePath}:`, (err as Error).message);
      // Leave file for next attempt
    }
  }

  if (flushed > 0 || errors > 0) {
    console.error(`Flushed ${flushed} pending decisions (${errors} errors)`);
  }
}

// --- Main ---
async function main() {
  switch (command) {
    case "session-start":
      await sessionStart();
      break;
    case "session-end":
      await sessionEnd();
      break;
    case "recall-only":
      await recallOnly();
      break;
    case "save":
      await save();
      break;
    case "flush":
      await flush();
      break;
    case "flush-decisions":
      await flushDecisions();
      break;
    case "search":
      await search();
      break;
    case "relate":
      await relate();
      break;
    case "graph":
      await graph();
      break;
    case "dedup":
      await dedup();
      break;
    case "identity":
      await identityGet();
      break;
    case "identity-set":
      await identitySet();
      break;
    case "conflicts": {
      const scope = args[0] || process.cwd().split("/").slice(-2).join("/");
      const conflicts = await detectConflicts(scope);
      if (conflicts.length === 0) {
        console.log("No preference conflicts found.");
      } else {
        console.log(`Found ${conflicts.length} conflict(s):\n`);
        for (const c of conflicts) {
          console.log(`  Subject: "${c.subject}"`);
          console.log(`    + ${c.prefer.content} (id: ${c.prefer.id})`);
          console.log(`    - ${c.avoid.content} (id: ${c.avoid.id})`);
          console.log();
        }
      }
      break;
    }
    case "resolve-conflict": {
      const keepId = args[0];
      const archiveId = args[1];
      if (!keepId || !archiveId) {
        console.error("Usage: memory-runner.ts resolve-conflict <keep_id> <archive_id>");
        process.exit(1);
      }
      await resolveConflict(keepId, archiveId);
      console.log(`Resolved: kept ${keepId}, archived ${archiveId}`);
      break;
    }

    // ── Analytics ──────────────────────────────────────────────────────────

    case "log-skill": {
      const skillCsv = args[0];
      const sid = args[1] || getSessionId() || null;
      if (!skillCsv) {
        console.error("Usage: log-skill <skills_csv> [session_id]");
        process.exit(1);
      }
      const skills = skillCsv
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      await logSkillUsage(skills, sid);
      process.stdout.write(JSON.stringify({ logged: skills.length, skills }));
      break;
    }

    case "log-tool": {
      const toolName = args[0];
      const sid = args[1] || getSessionId() || null;
      if (!toolName) {
        console.error("Usage: log-tool <tool_name> [session_id]");
        process.exit(1);
      }
      await logToolUse(toolName, sid);
      process.stdout.write(JSON.stringify({ logged: toolName }));
      break;
    }

    case "daily-stats": {
      const date = args[0] || undefined;
      await computeDailyStats(date);
      console.log(`Daily stats computed for ${date ?? "today"}`);
      break;
    }

    case "log-security": {
      const title = args[0];
      const description = args[1] || undefined;
      const hookEventId = args[2] || null;
      if (!title) {
        console.error("Usage: log-security <title> [description] [hook_event_id]");
        process.exit(1);
      }
      await logSecurityIncident({ title, description, hookEventId });
      process.stdout.write(JSON.stringify({ logged: true, title }));
      break;
    }

    case "decision": {
      const title = args[0];
      const decision = args[1];
      if (!title || !decision) {
        console.error("Usage: decision <title> <decision_text> [context] [consequences] [alternatives]");
        process.exit(1);
      }
      const row = await logDecision({
        title,
        decision,
        context: args[2] || undefined,
        consequences: args[3] || undefined,
        alternatives: args[4] || undefined,
      });
      console.log(`Decision recorded: ${row.id}`);
      break;
    }

    case "decisions": {
      const limit = args[0] ? Number(args[0]) : 20;
      const rows = await listDecisions(limit);
      console.log(JSON.stringify(rows, null, 2));
      break;
    }

    case "journal": {
      const planId = args[0];
      const contentRaw = args[1];
      if (!planId || !contentRaw) {
        console.error("Usage: journal <plan_id> <content_json>");
        process.exit(1);
      }
      const content = JSON.parse(contentRaw);
      await createJournal({ plan_id: planId, ...content });
      console.log(`Journal entry written for plan ${planId}`);
      break;
    }

    case "cleanup-junk": {
      const sql = getClient();
      const result = await sql`
        UPDATE memories
        SET is_archived = true
        WHERE source = 'identity-extract'
          AND (
            length(content) < 25
            OR content ~ '^(Avoids?|Prefers?)\s+\S{1,12}$'
          )
        RETURNING id
      `;
      process.stdout.write(JSON.stringify({ archived: (result as any[]).length }));
      break;
    }

    case "enrich-all": {
      // Batch-enrich existing memories that have empty search_enrichment
      const sql = getClient();
      const batch = await sql`
        SELECT id, content, category FROM memories
        WHERE search_enrichment IS NULL OR search_enrichment = ''
        ORDER BY importance DESC
        LIMIT 500
      `;
      // Batch enrich: compute enrichments in memory, then bulk update
      const updates: { id: string; enrichment: string }[] = [];
      for (const m of batch as any[]) {
        const enrichment = enrichMemory(m.content as string, m.category as string);
        if (enrichment) {
          updates.push({ id: m.id as string, enrichment });
        }
      }
      if (updates.length > 0) {
        const ids = updates.map((u) => u.id);
        const enrichments = updates.map((u) => u.enrichment);
        await sql`
          UPDATE memories SET search_enrichment = data.enrichment
          FROM (SELECT unnest(${ids}::uuid[]) as id, unnest(${enrichments}::text[]) as enrichment) as data
          WHERE memories.id = data.id
        `;
      }
      console.log(`Enriched ${updates.length} / ${(batch as any[]).length} memories`);
      break;
    }

    // ── ☸ Tekiō — Cycle of Nova — Adaptation Commands ─────────────

    case "wheel-turn": {
      // Process a failure and create/apply an adaptation
      // Usage: memory-runner.ts wheel-turn '<error>' '<context>' [tool] [scope]
      const errMsg = args[0];
      const errCtx = args[1] || "";
      const tool = args[2] || "unknown";
      const failScope = args[3] || undefined;
      if (!errMsg) {
        console.error("Usage: memory-runner.ts wheel-turn '<error>' '<context>' [tool] [scope]");
        process.exit(1);
      }
      const failure: FailureEvent = {
        error: errMsg,
        context: errCtx,
        tool,
        scope: failScope,
      };
      const sqlW = getClient();
      const result = await wheelTurn(sqlW, failure);
      if (!result) {
        // Filtered out — not worth learning
        console.error("☸ SKIP — noise filtered, not worth learning");
        break;
      }
      // Output notification for the hook to display
      const icon = result.isNew ? "☸ NOVA — wheel turns" : "☸ ADAPTED";
      const cat = result.adaptation.category.toUpperCase();
      console.error(`${icon} [${cat}] → ${result.adaptation.adaptation_rule.slice(0, 120)}`);
      console.error(`  Wheel position: ${result.wheelSpin} adaptations learned`);

      // intent: Bridge high-severity defensive adaptations into the decisions system.
      // Defensive adaptations are essentially "don't do X again" rules — they are
      // operational decisions that should persist in the decisions table too, so they
      // are surfaced by decision-aware queries and not just the Tekiō wheel context.
      // status: done
      // confidence: high
      if (result.isNew && result.adaptation.category === "defensive" && result.adaptation.severity >= 7) {
        try {
          await createDecision({
            rule: result.adaptation.adaptation_rule,
            scope: "global",
            source: "tekio",
            priority: result.adaptation.severity,
            context: `Auto-mirrored from Tekiō defensive adaptation (severity ${result.adaptation.severity}/10). Trigger: ${result.adaptation.trigger_pattern}`,
            tags: ["auto-tekio", "defensive"],
          });
          console.error(`  → Mirrored to decisions system (severity ${result.adaptation.severity})`);
        } catch (decErr) {
          console.error(`  → Failed to mirror to decisions: ${(decErr as Error).message}`);
        }
      }

      process.stdout.write(
        JSON.stringify({
          isNew: result.isNew,
          wheelSpin: result.wheelSpin,
          adaptation: result.adaptation,
        })
      );
      break;
    }

    case "wheel-stats": {
      const sqlS = getClient();
      const stats = await getWheelStats(sqlS);
      console.log(`☸ Tekiō — Cycle of Nova — ${stats.total} adaptations`);
      console.log(`  Defensive: ${stats.defensive} (immunity)`);
      console.log(`  Auxiliary:  ${stats.auxiliary} (perception)`);
      console.log(`  Offensive:  ${stats.offensive} (approach)`);
      console.log(`  Learning:   ${stats.learning} (absorbed)`);
      console.log(`  Applied: ${stats.totalApplied}x | Prevented: ${stats.totalPrevented}x`);
      break;
    }

    case "wheel-list": {
      const sqlL = getClient();
      const adaptations = await getActiveAdaptations(sqlL);
      for (const a of adaptations) {
        const applied = a.times_applied > 0 ? ` [${a.times_applied}x]` : "";
        console.log(`[${a.category.padEnd(10)}] ${a.trigger_pattern.slice(0, 60)}${applied}`);
        console.log(`           → ${a.adaptation_rule.slice(0, 100)}`);
      }
      break;
    }

    case "wheel-learn": {
      // Learn from a successful new pattern
      // Usage: memory-runner.ts wheel-learn '<pattern>' '<insight>' [scope]
      const learnPattern = args[0];
      const learnInsight = args[1];
      const learnScope = args[2] || undefined;
      if (!learnPattern || !learnInsight) {
        console.error("Usage: memory-runner.ts wheel-learn '<pattern>' '<insight>' [scope]");
        process.exit(1);
      }
      const sqlLearn = getClient();
      const learnResult = await wheelLearn(sqlLearn, {
        pattern: learnPattern,
        insight: learnInsight,
        scope: learnScope,
      });
      if (learnResult.isNew) {
        console.error(`☸ NOVA — wheel turns [LEARNING] — absorbed new pattern`);
        console.error(`  Pattern: ${learnPattern.slice(0, 80)}`);
        console.error(`  Insight: ${learnInsight.slice(0, 80)}`);
      } else {
        console.error(`☸ KNOWN — pattern already absorbed, reinforced`);
      }
      process.stdout.write(JSON.stringify(learnResult));
      break;
    }

    case "wheel-correct": {
      // Create adaptation from user correction
      // Usage: memory-runner.ts wheel-correct '<wrong_approach>' '<correct_approach>' [scope]
      const wrong = args[0];
      const correct = args[1];
      const corrScope = args[2] || undefined;
      if (!wrong || !correct) {
        console.error("Usage: memory-runner.ts wheel-correct '<wrong>' '<correct>' [scope]");
        process.exit(1);
      }
      const sqlC = getClient();
      const adaptation = await adaptFromCorrection(sqlC, wrong, correct, corrScope);
      console.error(`☸ NOVA — wheel turns [DEFENSIVE] — learned from correction`);
      console.error(`  Wrong: ${wrong.slice(0, 80)}`);
      console.error(`  Right: ${correct.slice(0, 80)}`);
      process.stdout.write(JSON.stringify(adaptation));
      break;
    }

    case "context-recall": {
      // Smart recall: search memories relevant to a specific context/task
      // Used by session-start to find memories based on what the user is working on
      const contextQuery = args[0];
      const scope = args[1] || undefined;
      if (!contextQuery) {
        console.error("Usage: memory-runner.ts context-recall '<what_user_is_doing>' [scope]");
        process.exit(1);
      }
      const results = await semanticSearch({
        query: contextQuery,
        scope,
        limit: 10,
        minImportance: 3,
      });
      // Return formatted context
      const lines = results.map((m) => `- [${m.category}] ${m.content} (imp:${m.importance})`);
      process.stdout.write(
        JSON.stringify({
          count: results.length,
          context: lines.join("\n"),
          results,
        })
      );
      break;
    }

    case "preferences":
      await preferences();
      break;

    case "compact-context":
      await compactContext();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Usage: memory-runner.ts <session-start|session-end|recall-only|save|flush|flush-decisions|search|relate|graph|dedup|identity|identity-set|conflicts|resolve-conflict|log-skill|log-tool|daily-stats|log-security|decision|decisions|journal|enrich-all|context-recall|preferences|compact-context>"
      );
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("memory-runner error:", err.message || err);
    process.exit(1);
  });
