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
 *   search            — Fuzzy search using pg_trgm with ILIKE fallback
 *   relate            — Create memory relation
 *   graph             — Fetch memory graph for scope
 *   dedup             — Check if content is duplicate
 *   conflicts         — Detect contradictory preferences (Prefers X vs Avoids X)
 *   resolve-conflict  — Resolve a conflict by archiving one preference
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
  logSkillUsage,
  logToolUse,
  computeDailyStats,
  logSecurityIncident,
  logDecision,
  listDecisions,
} from "../src/analytics.js";
import { enrichMemory } from "../src/enrich.js";
import { createJournal } from "../src/plans.js";

// Load .env from project root
const projectRoot = resolve(import.meta.dirname, "../..");
config({ path: join(projectRoot, ".env") });

const MEMORIES_DIR = "/tmp/ultrathink-memories";

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
  const [session] = await sql`
    INSERT INTO sessions (task_context) VALUES (${scope}) RETURNING id, started_at
  `;
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
    const neighborIds = edges.map((e: Record<string, unknown>) => e.neighbor_id as string);
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

  // Format with sections (max 5KB)
  let context = "";
  if (allMemories.length > 0) {
    const sections: string[] = [];

    if (preferences.length > 0) {
      sections.push("**Preferences:**\n" + preferences.map((m) => `- ${m.content}`).join("\n"));
    }
    const uniqueDecisions = decisions.filter((m) => !preferences.some((p) => p.id === m.id));
    if (uniqueDecisions.length > 0) {
      sections.push("**Decisions:**\n" + uniqueDecisions.map((m) => `- ${m.content}`).join("\n"));
    }
    const other = allMemories.filter((m) => m.category !== "preference" && m.category !== "decision");
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

    const brainContent = `## Brain — ${projectName}\n\n` + sections.join("\n\n") + "\n";
    context = brainContent.length > 5120 ? brainContent.slice(0, 5120) : brainContent;
  }

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
}

async function recallOnly() {
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // Reuse shared recall logic (no session creation, no decisions/neighbors)
  const { allMemories } = await buildMemoryContext(scope);

  let context = "";
  if (allMemories.length > 0) {
    const lines = allMemories.map((m) => {
      const tags = m.tags?.filter(Boolean).join(", ") || "";
      const tagStr = tags ? ` [${tags}]` : "";
      return `- [${m.category}] ${m.content}${tagStr} (importance: ${m.importance})`;
    });
    context = "## Recalled Memories\n\n" + lines.join("\n") + "\n";
    if (context.length > 5120) context = context.slice(0, 5120);
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
    const [stats] = await sql`
      SELECT COUNT(*) as count FROM memories WHERE session_id = ${sessionId}
    `;

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
      for (const m of sessionMemories) {
        const cat = m.category as string;
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(m.content as string);
      }

      const sections = Object.entries(byCategory)
        .map(([cat, items]) => `[${cat}]: ${items.join("; ")}`)
        .join("\n");
      summary = `Session summary (${stats.count} memories):\n${sections}`;

      // Save session summary as a memory
      try {
        const cwd = process.env.ULTRATHINK_CWD || process.cwd();
        const scope = cwd.split("/").slice(-2).join("/");
        await createMemory({
          content: summary.slice(0, 2000),
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
    (data as Record<string, unknown>).content.length > 0
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
    content: data.content,
    category: data.category || "insight",
    importance: data.importance ?? 5,
    confidence: data.confidence ?? 0.8,
    scope: data.scope,
    source: data.source || "auto-memory",
    session_id: sessionId || undefined,
    tags: data.tags,
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
        } catch {}
      }
    } catch {
      errors++;
      try {
        unlinkSync(filePath);
      } catch {}
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
      existingContents = rows.map((r: Record<string, unknown>) => r.content as string);
    } catch {
      // Fall back to per-item dedup if batch fetch fails
    }
  }

  // Simple in-memory similarity check (word overlap ratio)
  function isContentSimilar(a: string, b: string, threshold = 0.6): boolean {
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
      // In-memory dedup against batch-fetched existing memories
      const isDup = existingContents.some((existing) => isContentSimilar(data.content as string, existing));

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

        saved++;
      }
      // Only delete after successful save
      try {
        unlinkSync(filePath);
      } catch {}
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
      similarity: existing ? (existing as Record<string, unknown>).sim : null,
    })
  );
}

function getSessionId(): string | null {
  try {
    return readFileSync(getSessionFile(), "utf-8").trim();
  } catch {
    return null;
  }
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
    `;

    const keywords = new Set<string>();
    for (const r of rows) {
      const text = (r.content || r.label || "") as string;
      const matches = text.match(TOOL_PATTERNS);
      if (matches) matches.forEach((m) => keywords.add(m.toLowerCase()));
    }
    process.stdout.write(JSON.stringify([...keywords]));
  } catch {
    process.stdout.write("[]");
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
      process.stdout.write(JSON.stringify({ archived: result.length }));
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
      for (const m of batch) {
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
      console.log(`Enriched ${updates.length} / ${batch.length} memories`);
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

    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Usage: memory-runner.ts <session-start|session-end|recall-only|save|flush|search|relate|graph|dedup|log-skill|log-tool|daily-stats|log-security|decision|decisions|journal|cleanup-junk|enrich-all|context-recall|preferences>"
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
