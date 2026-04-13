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
  logSkillUsage,
  logToolUse,
  computeDailyStats,
  logSecurityIncident,
  logDecision,
  listDecisions,
} from "../src/analytics.js";
import { enrichMemory } from "../src/enrich.js";
import { createJournal } from "../src/plans.js";
import { createDecision } from "../src/decisions.js";
import { recall } from "../src/recall.js";

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

  // Unified 4-layer recall — replaces 6-query parallel assembly
  const context = await recall(scope, {
    projectName,
    maxTokens: 900,
    compact: false,
  });

  await logHookEvent({
    event_type: "session_start",
    severity: "info",
    description: `Session ${projectName}: unified recall (4-layer)`,
    hook_name: "memory-session-start",
    session_id: sessionId,
  });

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
}

async function recallOnly() {
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // Unified 4-layer recall (no session creation)
  const context = await recall(scope, {
    maxTokens: 900,
    compact: false,
  });

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

    // intent: ALWAYS generate a session summary — even if no explicit memories were
    // created. The old code only summarized when stats.count > 0, which meant sessions
    // with auto-save disabled (the default) never persisted anything. This was the root
    // cause of the empty Second Brain.
    //
    // Summary sources (in priority order):
    // 1. Memories created this session (if any)
    // 2. Git activity during the session (files changed, commit messages)
    // 3. Session metadata (duration, task_context)

    let summary: string | null = null;
    const cwd = process.env.ULTRATHINK_CWD || process.cwd();
    const scope = cwd.split("/").slice(-2).join("/");
    const summaryParts: string[] = [];

    // Part 1: Memories created this session
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
      summaryParts.push(`Memories (${stats.count}):\n${sections}`);
    }

    // Part 2: Git activity (what files changed, recent commits)
    try {
      const { execFileSync } = await import("child_process");

      const [sessionRecord] = (await sql`
        SELECT started_at FROM sessions WHERE id = ${sessionId}
      `) as any[];

      if (sessionRecord) {
        const since = new Date(sessionRecord.started_at).toISOString();
        try {
          const commits = execFileSync("git", ["log", "--oneline", `--since=${since}`, "-10"], {
            encoding: "utf-8",
            cwd,
            timeout: 5000,
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
          if (commits) summaryParts.push(`Commits:\n${commits}`);
        } catch {
          /* not a git repo */
        }

        try {
          const diff = execFileSync("git", ["diff", "--stat", "HEAD"], {
            encoding: "utf-8",
            cwd,
            timeout: 5000,
            stdio: ["pipe", "pipe", "pipe"],
          }).trim();
          if (diff) {
            const lastLine = diff.split("\n").pop() || "";
            summaryParts.push(`Uncommitted: ${lastLine}`);
          }
        } catch {
          /* not a git repo */
        }
      }
    } catch {
      /* git not available */
    }

    // Part 3: Session metadata
    try {
      const [sessionMeta] = (await sql`
        SELECT task_context, started_at FROM sessions WHERE id = ${sessionId}
      `) as any[];
      if (sessionMeta) {
        const duration = Math.round((Date.now() - new Date(sessionMeta.started_at).getTime()) / 60000);
        if (duration > 0) summaryParts.push(`Duration: ${duration}min`);
        if (sessionMeta.task_context) summaryParts.push(`Project: ${sessionMeta.task_context}`);
      }
    } catch {
      /* non-critical */
    }

    // Build final summary
    if (summaryParts.length > 0) {
      summary = summaryParts.join("\n");

      // Save session summary as a memory
      try {
        await createMemory({
          content: summary.slice(0, 4000),
          category: "session-summary",
          importance: 5,
          confidence: 0.8,
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
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // Unified 4-layer recall in compact mode (3KB cap)
  const context = await recall(scope, {
    maxTokens: 750,
    compact: true,
  });

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
}

// intent: AAAK-compressed context — lossless shorthand dialect for AI agents
// status: done
// confidence: high
async function aaakContext() {
  const cwd = process.env.ULTRATHINK_CWD || process.cwd();
  const scope = cwd.split("/").slice(-2).join("/");

  // AAAK mode: same budget as compact, but uses shorthand encoding
  const context = await recall(scope, {
    maxTokens: 750,
    compact: true,
    aaak: true,
  });

  process.stdout.write(JSON.stringify({ additionalContext: context || undefined }));
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

    case "aaak-context":
      await aaakContext();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Usage: memory-runner.ts <session-start|session-end|recall-only|save|flush|flush-decisions|search|relate|graph|dedup|conflicts|resolve-conflict|log-skill|log-tool|daily-stats|log-security|decision|decisions|journal|enrich-all|context-recall|preferences|compact-context>"
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
