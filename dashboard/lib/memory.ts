import { getDb } from "./db";

export interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  confidence: number;
  scope: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  access_count: number;
  is_archived: boolean;
  tags: string[] | null;
}

export async function getMemories(opts?: {
  category?: string;
  scope?: string;
  query?: string;
  limit?: number;
  includeArchived?: boolean;
}): Promise<Memory[]> {
  const sql = getDb();
  const limit = opts?.limit ?? 50;

  if (opts?.query) {
    return (await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.content ILIKE ${"%" + opts.query + "%"}
        AND (${opts.includeArchived ?? false} OR m.is_archived = false)
      GROUP BY m.id
      ORDER BY m.importance DESC, m.created_at DESC
      LIMIT ${limit}
    `) as Memory[];
  }

  return (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE (${opts?.category ?? null}::text IS NULL OR m.category = ${opts?.category ?? null})
      AND (${opts?.scope ?? null}::text IS NULL OR m.scope = ${opts?.scope ?? null})
      AND (${opts?.includeArchived ?? false} OR m.is_archived = false)
    GROUP BY m.id
    ORDER BY m.importance DESC, m.created_at DESC
    LIMIT ${limit}
  `) as Memory[];
}

/**
 * Hybrid 3-tier search: tsvector (best) → pg_trgm (fuzzy) → ILIKE (fallback).
 * Mirrors memory/src/memory.ts semanticSearch.
 */
export async function semanticSearchMemories(opts: {
  query: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<(Memory & { similarity?: number })[]> {
  const sql = getDb();
  const limit = opts.limit ?? 20;
  const minSim = opts.minSimilarity ?? 0.1;

  // Tier 1: tsvector full-text search (websearch_to_tsquery is safe for user input)
  const tsRows = (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
           ts_rank(m.search_vector, websearch_to_tsquery('english', ${opts.query})) as ts_score,
           similarity(m.content, ${opts.query}) as sim
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND m.search_vector @@ websearch_to_tsquery('english', ${opts.query})
    GROUP BY m.id
    ORDER BY ts_score DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];

  let rows = tsRows;

  // Tier 2: pg_trgm fuzzy if tsvector returned too few
  if (rows.length < limit) {
    const seen = new Set(rows.map((r) => r.id as string));
    const trigramRows = (await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
             0::float as ts_score,
             similarity(m.content, ${opts.query}) as sim
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
        AND similarity(m.content, ${opts.query}) > ${minSim}
      GROUP BY m.id
      ORDER BY sim DESC
      LIMIT ${limit}
    `) as Record<string, unknown>[];
    for (const r of trigramRows) {
      if (!seen.has(r.id as string)) {
        rows = [...rows, r];
        seen.add(r.id as string);
      }
    }

    // Tier 3: ILIKE fallback
    if (rows.length < 3) {
      const ilikeRows = (await sql`
        SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
               0::float as ts_score,
               0::float as sim
        FROM memories m
        LEFT JOIN memory_tags mt ON m.id = mt.memory_id
        WHERE m.is_archived = false
          AND m.content ILIKE ${"%" + opts.query + "%"}
        GROUP BY m.id
        ORDER BY m.importance DESC
        LIMIT ${limit}
      `) as Record<string, unknown>[];
      for (const r of ilikeRows) {
        if (!seen.has(r.id as string)) {
          rows = [...rows, r];
          seen.add(r.id as string);
        }
      }
    }
  }

  // Rank by blended score
  const ranked = rows
    .map((r) => {
      const tsScore = Number(r.ts_score ?? 0);
      const sim = Number(r.sim ?? 0);
      return { ...r, similarity: Math.max(tsScore, sim), _blend: tsScore * 0.7 + sim * 0.3 };
    })
    .sort((a, b) => b._blend - a._blend)
    .slice(0, limit);

  return ranked as unknown as (Memory & { similarity: number })[];
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.id = ${id}
    GROUP BY m.id
  `) as Memory[];
  return rows[0] ?? null;
}

export interface MemoryRelation {
  source_id: string;
  target_id: string;
  relation_type: string;
  strength: number;
}

export async function getMemoryRelations(): Promise<MemoryRelation[]> {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT r.source_id, r.target_id, r.relation_type, r.strength
      FROM memory_relations r
      JOIN memories ms ON ms.id = r.source_id AND ms.is_archived = false
      JOIN memories mt ON mt.id = r.target_id AND mt.is_archived = false
      ORDER BY r.strength DESC
    `;
    return rows as unknown as MemoryRelation[];
  } catch {
    return [];
  }
}

export async function getMemoryStats() {
  const sql = getDb();

  const [totalRows, archivedRows, relRows, categories] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = false`,
    sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = true`,
    sql`SELECT COUNT(*) as count FROM memory_relations`,
    sql`SELECT category, COUNT(*) as count FROM memories WHERE is_archived = false GROUP BY category ORDER BY count DESC`,
  ]) as Record<string, unknown>[][];

  return {
    total: Number(totalRows[0]?.count ?? 0),
    archived: Number(archivedRows[0]?.count ?? 0),
    relations: Number(relRows[0]?.count ?? 0),
    categories: categories as unknown as Array<{ category: string; count: number }>,
  };
}
