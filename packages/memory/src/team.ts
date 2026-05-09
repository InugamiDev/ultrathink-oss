/**
 * Team memory primitives — Phase 2 cross-agent memory for bipartite agents.
 *
 * Goals
 *   - Memories stay first-class (live in `memories` table) but are tagged as
 *     team-visible via the `wing/hall` taxonomy so existing recall layers do
 *     not accidentally surface them.
 *   - All inserts auto-detect `agent_id` from `process.env.PAPERCLIP_AGENT_ID`
 *     (mirrors `analytics.logSkillUsage`).
 *   - Direct SQL — does not modify `createMemory()` signature so the existing
 *     6 memory tools keep their contract.
 *
 * Scope convention
 *   - `wing = 'knowledge'`, `hall = 'shared'`   → memory_share output
 *   - `wing = 'knowledge'`, `hall = 'handoff'`  → memory_handoff output
 *   Both halls are intentionally outside the L0–L2 recall budget, so they
 *   only appear via explicit team queries (`memory_team_recall`).
 *
 * Neon note: every table reference is schema-qualified (`public.<table>`)
 * because the Neon HTTP driver does not preserve `SET search_path` across
 * tagged-template invocations.
 */

import { randomUUID } from "crypto";
import { getClient } from "./client.js";
import { enrichMemory } from "./enrich.js";
import type { Memory } from "./memory.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ShareMemoryInput {
  title?: string;
  content: string;
  category?: string; // defaults to "insight"
  importance?: number; // 1-10
  confidence?: number; // 0-1
  tags?: string[];
  scope?: string;
  agentId?: string | null;
  paperclipRunId?: string | null;
}

export interface HandoffMemoryInput {
  fromAgentId?: string | null;
  toAgentId: string;
  context: string;
  issueId?: string | null;
  importance?: number;
  scope?: string;
  paperclipRunId?: string | null;
}

export interface TeamRecallOptions {
  query?: string;
  agentId?: string;
  limit?: number;
  scope?: string;
  hall?: "shared" | "handoff" | "all";
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function envAgentId(explicit?: string | null): string | null {
  return explicit ?? process.env.PAPERCLIP_AGENT_ID ?? null;
}

function envRunId(explicit?: string | null): string | null {
  return explicit ?? process.env.PAPERCLIP_RUN_ID ?? null;
}

function autoTitleShort(content: string, prefix: string): string {
  const firstLine = content.split("\n").find((l) => l.trim()) ?? content;
  const clean = firstLine.replace(/[.!?]+$/, "").trim();
  const max = 60 - prefix.length - 2;
  return `${prefix}: ${clean.length > max ? clean.slice(0, max - 1) + "…" : clean}`;
}

async function insertTeamMemory(opts: {
  title: string;
  content: string;
  category: string;
  importance: number;
  confidence: number;
  scope: string | null;
  hall: "shared" | "handoff";
  agentId: string | null;
  paperclipRunId: string | null;
  metadata?: Record<string, unknown>;
  tags: string[];
}): Promise<Memory> {
  const sql = getClient();
  const memoryId = randomUUID();
  const enrichment = enrichMemory(opts.content, opts.category, opts.tags.length ? opts.tags : undefined);
  const tokenEstimate = Math.min(Math.round(opts.content.length / 4), 32767);

  // Layer 3 — team memories live in experience-tier recall budget,
  // not auto-loaded at session start; retrieved on demand via memory_team_recall.
  const layer = 3;
  const wing = "knowledge";

  // Metadata rides as a hidden HTML comment in content (no schema change).
  const contentWithMeta = opts.metadata
    ? `${opts.content}\n\n<!--meta:${JSON.stringify(opts.metadata)}-->`
    : opts.content;

  if (opts.tags.length === 0) {
    const rows = await sql`
      INSERT INTO public.memories (
        id, title, content, category, importance, confidence,
        scope, source, search_enrichment,
        wing, hall, layer, token_estimate,
        agent_id, paperclip_run_id
      )
      VALUES (
        ${memoryId},
        ${opts.title},
        ${contentWithMeta},
        ${opts.category},
        ${opts.importance},
        ${opts.confidence},
        ${opts.scope},
        ${"team"},
        ${enrichment},
        ${wing},
        ${opts.hall},
        ${layer},
        ${tokenEstimate},
        ${opts.agentId},
        ${opts.paperclipRunId}
      )
      RETURNING *
    `;
    return (rows as Memory[])[0] as Memory;
  }

  // With tags — atomic transaction (memory + tag inserts).
  const results = await sql.transaction((txn) => [
    txn`
      INSERT INTO public.memories (
        id, title, content, category, importance, confidence,
        scope, source, search_enrichment,
        wing, hall, layer, token_estimate,
        agent_id, paperclip_run_id
      )
      VALUES (
        ${memoryId},
        ${opts.title},
        ${contentWithMeta},
        ${opts.category},
        ${opts.importance},
        ${opts.confidence},
        ${opts.scope},
        ${"team"},
        ${enrichment},
        ${wing},
        ${opts.hall},
        ${layer},
        ${tokenEstimate},
        ${opts.agentId},
        ${opts.paperclipRunId}
      )
      RETURNING *
    `,
    ...opts.tags.map(
      (tag) => txn`INSERT INTO public.memory_tags (memory_id, tag) VALUES (${memoryId}, ${tag}) ON CONFLICT DO NOTHING`
    ),
  ]);

  const memory = (results[0] as unknown as Memory[])[0] as Memory;
  memory.tags = opts.tags;
  return memory;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Save a memory tagged with agent_id and visible to the rest of the team.
 * Stored in `wing=knowledge`, `hall=shared`.
 */
export async function shareMemory(input: ShareMemoryInput): Promise<Memory> {
  const tags = ["team-shared", ...(input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)];
  const dedupTags = [...new Set(tags)];
  const title = input.title ?? autoTitleShort(input.content, "Shared");

  return insertTeamMemory({
    title,
    content: input.content,
    category: input.category ?? "insight",
    importance: input.importance ?? 6,
    confidence: input.confidence ?? 0.85,
    scope: input.scope ?? null,
    hall: "shared",
    agentId: envAgentId(input.agentId),
    paperclipRunId: envRunId(input.paperclipRunId),
    tags: dedupTags,
  });
}

/**
 * Structured handoff between agents. Stored in `wing=knowledge`, `hall=handoff`,
 * with `agent_id = toAgentId` so the target agent picks it up via agent-scoped
 * recall as well as team-recall.
 */
export async function handoffMemory(input: HandoffMemoryInput): Promise<Memory> {
  const fromId = envAgentId(input.fromAgentId);
  const meta = {
    handoff_from: fromId,
    handoff_at: new Date().toISOString(),
    issue_id: input.issueId ?? null,
  };
  const title = autoTitleShort(input.context, `Handoff → ${input.toAgentId}`);

  return insertTeamMemory({
    title,
    content: input.context,
    category: "decision",
    importance: input.importance ?? 7,
    confidence: 0.9,
    scope: input.scope ?? null,
    hall: "handoff",
    agentId: input.toAgentId, // target picks it up
    paperclipRunId: envRunId(input.paperclipRunId),
    metadata: meta,
    tags: ["handoff", `from:${fromId ?? "unknown"}`, `to:${input.toAgentId}`],
  });
}

/**
 * Recall team-visible memories across agents and sessions.
 * Differs from `recall()` (layered L0–L3 for the current session) —
 * this is cross-agent, cross-session, on demand.
 */
export async function teamRecall(opts: TeamRecallOptions = {}): Promise<Memory[]> {
  const sql = getClient();
  const limit = Math.min(Math.max(opts.limit ?? 15, 1), 50);
  const hallFilter = opts.hall && opts.hall !== "all" ? opts.hall : null;
  const agentFilter = opts.agentId ?? null;
  const scopeFilter = opts.scope ?? null;
  const q = opts.query?.trim() ?? null;

  if (q) {
    const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const rows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) AS tags,
             similarity(m.content, ${q}) AS sim
      FROM public.memories m
      LEFT JOIN public.memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
        AND m.wing = 'knowledge'
        AND m.hall IN ('shared', 'handoff')
        AND (${hallFilter}::text IS NULL OR m.hall = ${hallFilter})
        AND (${agentFilter}::text IS NULL OR m.agent_id = ${agentFilter})
        AND (${scopeFilter}::text IS NULL OR m.scope = ${scopeFilter})
        AND (
          m.content ILIKE ${"%" + escaped + "%"}
          OR similarity(m.content, ${q}) > 0.05
          OR similarity(COALESCE(m.search_enrichment, ''), ${q}) > 0.05
        )
      GROUP BY m.id
      ORDER BY sim DESC NULLS LAST, m.importance DESC, m.created_at DESC
      LIMIT ${limit}
    `;
    return (rows as Memory[]).filter((r) => r && r.id);
  }

  const rows = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) AS tags
    FROM public.memories m
    LEFT JOIN public.memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND m.wing = 'knowledge'
      AND m.hall IN ('shared', 'handoff')
      AND (${hallFilter}::text IS NULL OR m.hall = ${hallFilter})
      AND (${agentFilter}::text IS NULL OR m.agent_id = ${agentFilter})
      AND (${scopeFilter}::text IS NULL OR m.scope = ${scopeFilter})
    GROUP BY m.id
    ORDER BY m.importance DESC, m.created_at DESC
    LIMIT ${limit}
  `;
  return (rows as Memory[]).filter((r) => r && r.id);
}

// Tekiō team-stats live in `./team-tekio.ts` (kept here as a re-export
// so external imports of `team.js` still resolve).
export { tekioTeamStats } from "./team-tekio.js";
export type { TekioTeamStats } from "./team-tekio.js";
