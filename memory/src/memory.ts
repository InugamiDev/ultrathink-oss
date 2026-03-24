import { randomUUID } from "crypto";
import { getClient } from "./client.js";
import { enrichMemory } from "./enrich.js";

export interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  confidence: number;
  scope?: string;
  source?: string;
  session_id?: string;
  plan_id?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  accessed_at: string;
  access_count: number;
  is_archived: boolean;
  is_compacted: boolean;
  tags?: string[];
}

export interface CreateMemoryInput {
  content: string;
  category: string;
  importance?: number;
  confidence?: number;
  scope?: string;
  source?: string;
  session_id?: string;
  plan_id?: string;
  file_path?: string;
  tags?: string[];
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const sql = getClient();

  // Wrap memory INSERT + tag INSERTs in a single Neon HTTP transaction
  // so they succeed or fail atomically (avoids orphaned memories without tags).
  // Normalize tags: lowercase, trimmed, deduplicated
  const tags = input.tags?.length
    ? [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))]
    : [];

  // Generate search enrichment (semantic keyword expansion)
  const enrichment = enrichMemory(input.content, input.category, tags.length > 0 ? tags : undefined);

  if (tags.length === 0) {
    // No tags — simple single-query path
    const rows = await sql`
      INSERT INTO memories (content, category, importance, confidence, scope, source, session_id, plan_id, file_path, search_enrichment)
      VALUES (
        ${input.content},
        ${input.category},
        ${input.importance ?? 5},
        ${input.confidence ?? 0.8},
        ${input.scope ?? null},
        ${input.source ?? null},
        ${input.session_id ?? null},
        ${input.plan_id ?? null},
        ${input.file_path ?? null},
        ${enrichment}
      )
      RETURNING *
    `;
    const memory = rows[0] as Memory;

    // Auto-link (non-critical)
    try {
      await autoLinkMemory(memory.id, input.content, input.scope);
    } catch {
      /* non-blocking */
    }
    return memory;
  }

  // With tags — use sql.transaction() for atomicity.
  // Generate UUID client-side so tag INSERTs can reference it in the same
  // non-interactive Neon HTTP transaction (no cross-query result access).
  const memoryId = randomUUID();
  const results = await sql.transaction((txn) => [
    txn`
      INSERT INTO memories (id, content, category, importance, confidence, scope, source, session_id, plan_id, file_path, search_enrichment)
      VALUES (
        ${memoryId},
        ${input.content},
        ${input.category},
        ${input.importance ?? 5},
        ${input.confidence ?? 0.8},
        ${input.scope ?? null},
        ${input.source ?? null},
        ${input.session_id ?? null},
        ${input.plan_id ?? null},
        ${input.file_path ?? null},
        ${enrichment}
      )
      RETURNING *
    `,
    ...tags.map(
      (tag) =>
        txn`INSERT INTO memory_tags (memory_id, tag)
          VALUES (${memoryId}, ${tag})
          ON CONFLICT DO NOTHING`
    ),
  ]);

  const memory = (results[0] as unknown as Record<string, unknown>[])[0] as Memory;
  memory.tags = tags;

  // Auto-link (non-critical, outside transaction)
  try {
    await autoLinkMemory(memory.id, input.content, input.scope);
  } catch {
    /* non-blocking */
  }
  return memory;
}

export async function getMemory(id: string): Promise<Memory | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.id = ${id}
    GROUP BY m.id
  `;

  if (rows.length === 0) return null;

  await sql`
    UPDATE memories SET accessed_at = NOW(), access_count = access_count + 1
    WHERE id = ${id}
  `;

  return rows[0] as Memory;
}

export async function searchMemories(opts: {
  category?: string;
  scope?: string;
  tags?: string[];
  query?: string;
  limit?: number;
  minImportance?: number;
  includeArchived?: boolean;
}): Promise<Memory[]> {
  const sql = getClient();
  const limit = opts.limit ?? 20;
  const minImportance = opts.minImportance ?? 1;
  const includeArchived = opts.includeArchived ?? false;

  let rows;

  if (opts.query) {
    // Use pg_trgm similarity for better fuzzy matching (leverages GIN index)
    rows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
             similarity(m.content, ${opts.query}) as sim
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE (m.content ILIKE ${"%" + opts.query + "%"} OR similarity(m.content, ${opts.query}) > 0.05)
        AND m.importance >= ${minImportance}
        AND (${includeArchived} OR m.is_archived = false)
        AND (${opts.category ?? null}::text IS NULL OR m.category = ${opts.category ?? null})
        AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
      GROUP BY m.id
      ORDER BY sim DESC, m.importance DESC, m.created_at DESC
      LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.importance >= ${minImportance}
        AND (${includeArchived} OR m.is_archived = false)
        AND (${opts.category ?? null}::text IS NULL OR m.category = ${opts.category ?? null})
        AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
      GROUP BY m.id
      ORDER BY m.importance DESC, m.created_at DESC
      LIMIT ${limit}
    `;
  }

  // Apply decay scoring and re-sort for better relevance
  const typed = rows as Memory[];
  const sorted = typed
    .map((m) => ({
      ...m,
      _recallScore: calculateRecallScore({
        importance: m.importance,
        confidence: m.confidence,
        category: m.category,
        created_at: m.created_at,
        accessed_at: m.accessed_at,
        access_count: m.access_count,
      }),
    }))
    .sort((a, b) => b._recallScore - a._recallScore);

  // Touch recalled memories (non-blocking)
  touchMemories(sorted.map((m) => m.id)).catch((err) => console.warn("[memory.touchMemories]", err.message));

  return sorted;
}

/**
 * Hybrid 3-tier search: tsvector (best) → pg_trgm (fuzzy) → ILIKE (fallback).
 * No external API needed — runs entirely in Postgres.
 */
export async function semanticSearch(opts: {
  query: string;
  scope?: string;
  limit?: number;
  minImportance?: number;
  minSimilarity?: number;
}): Promise<(Memory & { similarity?: number })[]> {
  const sql = getClient();
  const limit = opts.limit ?? 15;
  const minImportance = opts.minImportance ?? 1;
  const minSimilarity = opts.minSimilarity ?? 0.05;

  // Tier 1: tsvector full-text search (best quality, handles stemming/stopwords)
  // Uses websearch_to_tsquery for safe user-input handling (no raw tsquery operators)
  const tsRows = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
           ts_rank(m.search_vector, websearch_to_tsquery('english', ${opts.query})) as ts_score,
           similarity(m.content, ${opts.query}) as sim
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND m.importance >= ${minImportance}
      AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
      AND m.search_vector @@ websearch_to_tsquery('english', ${opts.query})
    GROUP BY m.id
    ORDER BY ts_score DESC
    LIMIT ${limit}
  `;

  let rows = tsRows;

  // Tier 2: pg_trgm fuzzy search if tsvector returned too few results
  if (rows.length < limit) {
    const seen = new Set(rows.map((r: Record<string, unknown>) => r.id as string));
    const trigramRows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
             0::float as ts_score,
             similarity(m.content, ${opts.query}) as sim
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
        AND m.importance >= ${minImportance}
        AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
        AND similarity(m.content, ${opts.query}) > ${minSimilarity}
      GROUP BY m.id
      ORDER BY sim DESC
      LIMIT ${limit}
    `;
    for (const r of trigramRows) {
      if (!seen.has(r.id as string)) {
        rows = [...rows, r];
        seen.add(r.id as string);
      }
    }

    // Tier 3: ILIKE substring fallback if still too few
    if (rows.length < 3) {
      const ilikeRows = await sql`
        SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
               0::float as ts_score,
               0::float as sim
        FROM memories m
        LEFT JOIN memory_tags mt ON m.id = mt.memory_id
        WHERE m.is_archived = false
          AND m.importance >= ${minImportance}
          AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
          AND m.content ILIKE ${"%" + opts.query + "%"}
        GROUP BY m.id
        ORDER BY m.importance DESC
        LIMIT ${limit}
      `;
      for (const r of ilikeRows) {
        if (!seen.has(r.id as string)) {
          rows = [...rows, r];
          seen.add(r.id as string);
        }
      }
    }
  }

  // Rank: blend ts_rank * 0.7 + trigram similarity * 0.3, then factor in decay
  const sorted = (rows as (Memory & { sim?: number; ts_score?: number })[])
    .map((r) => {
      const tsScore = Number(r.ts_score ?? 0);
      const sim = Number(r.sim ?? 0);
      const searchScore = tsScore * 0.7 + sim * 0.3;
      const recall = calculateRecallScore({
        importance: r.importance,
        confidence: r.confidence,
        category: r.category,
        created_at: r.created_at,
        accessed_at: r.accessed_at,
        access_count: r.access_count,
      });
      return {
        ...r,
        similarity: Math.max(tsScore, sim),
        _recallScore: recall,
        _relevance: searchScore * 0.6 + (recall / 10) * 0.4,
      };
    })
    .sort((a, b) => b._relevance - a._relevance)
    .slice(0, limit);

  // Touch recalled memories (non-blocking)
  touchMemories(sorted.map((m) => m.id)).catch((err) => console.warn("[memory.touchMemories]", err.message));

  return sorted;
}

/**
 * Check if a similar memory already exists (for dedup).
 * Uses tsvector for semantic matching + pg_trgm for fuzzy.
 */
export async function findSimilar(content: string, threshold: number = 0.6): Promise<Memory | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT m.*,
           GREATEST(
             similarity(m.content, ${content}),
             ts_rank(m.search_vector, plainto_tsquery('english', ${content}))
           ) as sim
    FROM memories m
    WHERE m.is_archived = false
      AND (
        similarity(m.content, ${content}) > ${threshold}
        OR (m.search_vector @@ plainto_tsquery('english', ${content})
            AND ts_rank(m.search_vector, plainto_tsquery('english', ${content})) > ${threshold})
      )
    ORDER BY sim DESC
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0] as Memory) : null;
}

export async function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, "content" | "category" | "importance" | "confidence" | "scope" | "is_archived">>
): Promise<Memory | null> {
  const sql = getClient();
  const rows = await sql`
    UPDATE memories SET
      content = COALESCE(${updates.content ?? null}, content),
      category = COALESCE(${updates.category ?? null}, category),
      importance = COALESCE(${updates.importance ?? null}, importance),
      confidence = COALESCE(${updates.confidence ?? null}, confidence),
      scope = COALESCE(${updates.scope ?? null}, scope),
      is_archived = COALESCE(${updates.is_archived ?? null}, is_archived),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return rows.length > 0 ? (rows[0] as Memory) : null;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const sql = getClient();
  const rows = await sql`DELETE FROM memories WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function addMemoryTags(memoryId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  const sql = getClient();
  await sql`
    INSERT INTO memory_tags (memory_id, tag)
    SELECT ${memoryId}, unnest(${tags}::text[])
    ON CONFLICT DO NOTHING
  `;
}

export async function removeMemoryTag(memoryId: string, tag: string): Promise<void> {
  const sql = getClient();
  await sql`DELETE FROM memory_tags WHERE memory_id = ${memoryId} AND tag = ${tag}`;
}

// ─── Memory Relations / Linking ─────────────────────────────────────────

export interface MemoryRelation {
  source_id: string;
  target_id: string;
  relation_type: string;
  strength: number;
}

export async function createRelation(
  sourceId: string,
  targetId: string,
  relationType: string = "related_to",
  strength: number = 0.5
): Promise<void> {
  const sql = getClient();
  await sql`
    INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
    VALUES (${sourceId}, ${targetId}, ${relationType}, ${strength})
    ON CONFLICT DO NOTHING
  `;
}

export async function getRelations(memoryId: string): Promise<MemoryRelation[]> {
  const sql = getClient();
  const rows = await sql`
    SELECT source_id, target_id, relation_type, COALESCE(strength, 0.5) as strength
    FROM memory_relations
    WHERE source_id = ${memoryId} OR target_id = ${memoryId}
  `;
  return rows as MemoryRelation[];
}

export async function getMemoryGraph(opts?: {
  scope?: string;
  limit?: number;
}): Promise<{ nodes: Memory[]; edges: MemoryRelation[] }> {
  const sql = getClient();
  const limit = opts?.limit ?? 50;

  const nodes = await sql`
    SELECT m.id, m.content, m.category, m.importance, m.confidence, m.scope,
           m.source, m.session_id, m.plan_id, m.file_path,
           m.created_at, m.updated_at, m.accessed_at, m.access_count,
           m.is_archived, m.is_compacted,
           array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND (${opts?.scope ?? null}::text IS NULL OR m.scope = ${opts?.scope ?? null})
    GROUP BY m.id
    ORDER BY m.importance DESC, m.created_at DESC
    LIMIT ${limit}
  `;

  const nodeIds = nodes.map((n: Record<string, unknown>) => n.id as string);

  let edges: MemoryRelation[] = [];
  if (nodeIds.length > 0) {
    edges = (await sql`
      SELECT source_id, target_id, relation_type, COALESCE(strength, 0.5) as strength
      FROM memory_relations
      WHERE source_id = ANY(${nodeIds}) OR target_id = ANY(${nodeIds})
    `) as MemoryRelation[];
  }

  return { nodes: nodes as Memory[], edges };
}

/**
 * Auto-link a new memory to similar existing memories using pg_trgm.
 */
async function autoLinkMemory(memoryId: string, content: string, scope?: string): Promise<void> {
  const sql = getClient();
  const rows = await sql`
    SELECT id, similarity(content, ${content}) as sim
    FROM memories
    WHERE id != ${memoryId}
      AND is_archived = false
      AND (${scope ?? null}::text IS NULL OR scope = ${scope ?? null})
      AND similarity(content, ${content}) > 0.15
    ORDER BY sim DESC
    LIMIT 5
  `;

  if (rows.length > 0) {
    const ids = rows.map((r: Record<string, unknown>) => r.id as string);
    const strengths = rows.map((r: Record<string, unknown>) => Number(r.sim ?? 0.5));
    await sql`
      INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
      SELECT ${memoryId}, unnest(${ids}::uuid[]), 'related_to', unnest(${strengths}::float8[])
      ON CONFLICT DO NOTHING
    `;
  }
}

// ─── Decay Scoring ──────────────────────────────────────────────────────

/**
 * Calculate a memory's effective recall score using time-decay.
 *
 * Formula: score = importance * confidence * decay * accessBoost
 * - decay = 1 / (1 + ageDays / halfLife)  — hyperbolic decay, never reaches 0
 * - halfLife scales with importance: high-importance memories decay slower
 * - accessBoost: recently accessed memories get a small bump
 *
 * Categories exempt from decay: "decision", "preference", "identity"
 */
export function calculateRecallScore(memory: {
  importance: number;
  confidence: number;
  category: string;
  created_at: string;
  accessed_at: string;
  access_count: number;
}): number {
  const NO_DECAY_CATEGORIES = new Set(["decision", "preference", "identity", "style-preference", "tool-preference"]);

  const importance = memory.importance;
  const confidence = memory.confidence;

  // No decay for critical categories
  if (NO_DECAY_CATEGORIES.has(memory.category)) {
    return importance * confidence;
  }

  const now = Date.now();
  const created = new Date(memory.created_at).getTime();
  const accessed = new Date(memory.accessed_at).getTime();
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);

  // Half-life scales with importance: importance 10 = 90 days, importance 1 = 9 days
  const halfLife = importance * 9;

  // Hyperbolic decay: 1/(1 + age/halfLife)
  const decay = 1 / (1 + ageDays / halfLife);

  // Access boost: recently accessed memories resist decay
  const daysSinceAccess = (now - accessed) / (1000 * 60 * 60 * 24);
  const accessBoost = daysSinceAccess < 7 ? 1.2 : daysSinceAccess < 30 ? 1.1 : 1.0;

  // Frequency boost: heavily accessed memories are proven useful
  const freqBoost = Math.min(1 + memory.access_count * 0.05, 1.5);

  return importance * confidence * decay * accessBoost * freqBoost;
}

/**
 * Batch touch memories (update accessed_at + access_count) when recalled by search.
 * Non-blocking — failures don't affect search results.
 */
export async function touchMemories(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sql = getClient();
  await sql`
    UPDATE memories SET accessed_at = NOW(), access_count = access_count + 1
    WHERE id = ANY(${ids})
  `;
}

// ─── Stats ──────────────────────────────────────────────────────────────

export async function getMemoryStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  avgImportance: number;
  archived: number;
  relations: number;
}> {
  const sql = getClient();

  const [totalResult, archivedResult, avgResult, relResult, categoryRows] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = false`,
    sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = true`,
    sql`SELECT AVG(importance) as avg FROM memories WHERE is_archived = false`,
    sql`SELECT COUNT(*) as count FROM memory_relations`,
    sql`SELECT category, COUNT(*) as count FROM memories WHERE is_archived = false GROUP BY category`,
  ]);
  const totalRow = totalResult[0] as Record<string, unknown>;
  const archivedRow = archivedResult[0] as Record<string, unknown>;
  const avgRow = avgResult[0] as Record<string, unknown>;
  const relRow = relResult[0] as Record<string, unknown>;

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category as string] = Number(row.count);
  }

  return {
    total: Number(totalRow.count),
    byCategory,
    avgImportance: Number(avgRow.avg) || 0,
    archived: Number(archivedRow.count),
    relations: Number(relRow.count),
  };
}
