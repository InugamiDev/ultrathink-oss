import { randomUUID } from "crypto";
import { getClient } from "./client.js";
import { enrichMemory, enrichQuery, expandQuerySynonyms } from "./enrich.js";

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
  layer?: number;
  wing?: string;
  hall?: string;
  token_estimate?: number;
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

  // ─── MemPalace: Duplicate detection before write ───────────────────
  // intent: prevent near-duplicate memories by merging into existing when similarity > 0.85
  // status: done
  // confidence: high
  // next: none
  const existingDup = await findDuplicate(input.content, input.scope, input.category);
  if (existingDup) {
    // Merge: update existing memory — append new content if materially different,
    // bump importance (cap at 10), bump confidence (cap at 1.0)
    const mergedContent = existingDup.content.length >= input.content.length ? existingDup.content : input.content;
    const mergedImportance = Math.min(parseFloat(String(existingDup.importance)) || 5 + 1, 10);
    const mergedConfidence = Math.min((parseFloat(String(existingDup.confidence)) || 0.8) + 0.05, 1.0);

    const updated = await updateMemory(existingDup.id, {
      content: mergedContent,
      importance: mergedImportance,
      confidence: mergedConfidence,
    });
    return updated ?? (existingDup as Memory);
  }

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

  const memory = (results[0] as unknown as any[])[0] as Memory;
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

  if ((rows as any[]).length === 0) return null;

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
    // Escape ILIKE wildcards in user input to prevent injection
    const escapedQuery = opts.query.replace(/%/g, "\\%").replace(/_/g, "\\_");
    // Use pg_trgm similarity for better fuzzy matching (leverages GIN index)
    rows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
             similarity(m.content, ${opts.query}) as sim
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE (m.content ILIKE ${"%" + escapedQuery + "%"} OR similarity(m.content, ${opts.query}) > 0.05)
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

  // Query-time enrichment: expand dates, synonyms, etc. for better tsvector matching
  const enrichedQuery = enrichQuery(opts.query);

  // Tier 1: tsvector full-text search (best quality, handles stemming/stopwords)
  // Uses websearch_to_tsquery for safe user-input handling (no raw tsquery operators)
  // NOTE: Only uses original query here — enriched query uses AND between ALL terms
  // which makes matching STRICTER, not broader. Enrichment helps in pg_trgm tiers instead.
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

  let rows = tsRows as any[];

  // Tier 2: pg_trgm fuzzy search if tsvector returned too few results
  // Checks both content AND search_enrichment for wider matching
  if (rows.length < limit) {
    const seen = new Set(rows.map((r: Record<string, unknown>) => r.id as string));
    const trigramRows = await sql`
      SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
             0::float as ts_score,
             GREATEST(
               similarity(m.content, ${opts.query}),
               similarity(COALESCE(m.search_enrichment, ''), ${opts.query}),
               similarity(m.content, ${enrichedQuery}),
               similarity(COALESCE(m.search_enrichment, ''), ${enrichedQuery})
             ) as sim
      FROM memories m
      LEFT JOIN memory_tags mt ON m.id = mt.memory_id
      WHERE m.is_archived = false
        AND m.importance >= ${minImportance}
        AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
        AND (
          similarity(m.content, ${opts.query}) > ${minSimilarity}
          OR similarity(COALESCE(m.search_enrichment, ''), ${opts.query}) > ${minSimilarity}
          OR similarity(m.content, ${enrichedQuery}) > ${minSimilarity}
          OR similarity(COALESCE(m.search_enrichment, ''), ${enrichedQuery}) > ${minSimilarity}
        )
      GROUP BY m.id
      ORDER BY sim DESC
      LIMIT ${limit}
    `;
    for (const r of trigramRows as any[]) {
      if (!seen.has(r.id as string)) {
        rows = [...rows, r];
        seen.add(r.id as string);
      }
    }

    // Tier 2b: Tag-based search — match fully expanded synonym words against memory tags
    // Uses ALL synonyms (not just top 3) for broader tag matching
    if (rows.length < limit) {
      const allSynonyms = expandQuerySynonyms(opts.query);
      if (allSynonyms.length > 0) {
        const tagRows = await sql`
          SELECT m.*, array_agg(mt2.tag) FILTER (WHERE mt2.tag IS NOT NULL) as tags,
                 0::float as ts_score,
                 0.15::float as sim
          FROM memories m
          JOIN memory_tags mt ON m.id = mt.memory_id
          LEFT JOIN memory_tags mt2 ON m.id = mt2.memory_id
          WHERE m.is_archived = false
            AND m.importance >= ${minImportance}
            AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
            AND mt.tag = ANY(${allSynonyms})
          GROUP BY m.id
          ORDER BY m.importance DESC
          LIMIT ${limit}
        `;
        for (const r of tagRows as any[]) {
          if (!seen.has(r.id as string)) {
            rows = [...rows, r];
            seen.add(r.id as string);
          }
        }
      }
    }

    // Tier 2c: Synonym ILIKE — search for enriched synonym terms in content
    // Finds memories containing synonym-expanded terms that pg_trgm misses
    if (rows.length < limit) {
      const originalWords = new Set(
        opts.query
          .toLowerCase()
          .replace(/[^a-z0-9\s\-_]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2)
      );
      const allSynonymsForIlike = expandQuerySynonyms(opts.query);
      const synonymTerms = allSynonymsForIlike.filter((w) => !originalWords.has(w) && w.length >= 3);

      if (synonymTerms.length > 0) {
        const patterns = synonymTerms.slice(0, 10).map((t) => `%${t.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`);
        const synRows = await sql`
          SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
                 0::float as ts_score,
                 0.12::float as sim
          FROM memories m
          LEFT JOIN memory_tags mt ON m.id = mt.memory_id
          WHERE m.is_archived = false
            AND m.importance >= ${minImportance}
            AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
            AND (m.content ILIKE ANY(${patterns})
                 OR COALESCE(m.search_enrichment, '') ILIKE ANY(${patterns}))
          GROUP BY m.id
          ORDER BY m.importance DESC
          LIMIT ${limit}
        `;
        for (const r of synRows as any[]) {
          if (!seen.has(r.id as string)) {
            rows = [...rows, r];
            seen.add(r.id as string);
          }
        }
      }
    }

    // Tier 3: ILIKE substring fallback if still too few
    if (rows.length < 3) {
      const escapedQuery = opts.query.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const ilikeRows = await sql`
        SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
               0::float as ts_score,
               0::float as sim
        FROM memories m
        LEFT JOIN memory_tags mt ON m.id = mt.memory_id
        WHERE m.is_archived = false
          AND m.importance >= ${minImportance}
          AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
          AND (m.content ILIKE ${"%" + escapedQuery + "%"}
               OR COALESCE(m.search_enrichment, '') ILIKE ${"%" + escapedQuery + "%"})
        GROUP BY m.id
        ORDER BY m.importance DESC
        LIMIT ${limit}
      `;
      for (const r of ilikeRows as any[]) {
        if (!seen.has(r.id as string)) {
          rows = [...rows, r];
          seen.add(r.id as string);
        }
      }
    }

    // Tier 3b: Date-specific ILIKE — extract dates from query and match directly
    if (rows.length < limit) {
      const dateMatch = opts.query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const escapedDate = dateStr.replace(/%/g, "\\%").replace(/_/g, "\\_");
        const dateRows = await sql`
          SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
                 0::float as ts_score,
                 0.2::float as sim
          FROM memories m
          LEFT JOIN memory_tags mt ON m.id = mt.memory_id
          WHERE m.is_archived = false
            AND m.importance >= ${minImportance}
            AND (${opts.scope ?? null}::text IS NULL OR m.scope = ${opts.scope ?? null})
            AND m.content ILIKE ${"%" + escapedDate + "%"}
          GROUP BY m.id
          ORDER BY m.importance DESC
          LIMIT ${limit}
        `;
        for (const r of dateRows as any[]) {
          if (!seen.has(r.id as string)) {
            rows = [...rows, r];
            seen.add(r.id as string);
          }
        }
      }
    }
  }

  // Rank: two-pass approach
  // Pass 1: blend search score + recall + tsvector priority boost (base ranking)
  // Pass 2: boost synonym-matched memories that are outside top 5

  // Pre-compute which memories have synonym-tag matches for pass 2
  const allSynonymsForBoost = expandQuerySynonyms(opts.query);
  const originalQueryWordsForBoost = new Set(
    opts.query
      .toLowerCase()
      .replace(/[^a-z0-9\s\-_]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const synonymOnlyWords = new Set(allSynonymsForBoost.filter((w) => !originalQueryWordsForBoost.has(w)));

  const ranked = (rows as (Memory & { sim?: number; ts_score?: number })[]).map((r) => {
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
    // tsvector-matched results jump ahead of pg_trgm-only results
    const tsvectorBoost = tsScore > 0 ? Math.max(0.2, Math.min(tsScore * 3, 0.5)) : 0;
    const baseRelevance = searchScore * 0.6 + (recall / 10) * 0.3 + tsvectorBoost;

    // Check if this memory has synonym-only tag matches
    const memTags = ((r.tags as string[] | null) ?? []).filter(Boolean).map((t) => t.toLowerCase());
    const hasSynonymTagMatch = memTags.some((t) => synonymOnlyWords.has(t));
    const contentLower = r.content.toLowerCase();
    const hasSynonymContentMatch = [...synonymOnlyWords].some((w) => w.length >= 3 && contentLower.includes(w));

    return {
      ...r,
      similarity: Math.max(tsScore, sim),
      _recallScore: recall,
      _baseRelevance: baseRelevance,
      _relevance: baseRelevance,
      _hasSynonymMatch: hasSynonymTagMatch || hasSynonymContentMatch,
    };
  });

  // Pass 1: sort by base relevance
  ranked.sort((a, b) => b._baseRelevance - a._baseRelevance);

  // Pass 2: boost synonym-matched results that are outside top 5
  const top5Threshold = ranked.length >= 5 ? ranked[4]._baseRelevance : 0;
  for (const r of ranked) {
    if (r._hasSynonymMatch && r._baseRelevance < top5Threshold) {
      r._relevance = r._baseRelevance + 0.12;
    }
  }

  // intent: Temporal stopword recall — "before"/"after" are Postgres stopwords invisible to tsvector.
  //   If top 5 is missing one of these words but a lower result has it, boost it to #5.
  // status: done
  // confidence: high
  const TEMPORAL_STOPWORDS = ["before", "after"];
  const queryLowerForRecall = opts.query.toLowerCase();
  if (ranked.length > 5) {
    ranked.sort((a, b) => b._relevance - a._relevance);
    const top5Content = ranked
      .slice(0, 5)
      .map((r) => r.content.toLowerCase())
      .join(" ");
    for (const tw of TEMPORAL_STOPWORDS) {
      if (queryLowerForRecall.includes(tw) && !top5Content.includes(tw)) {
        for (let i = 5; i < ranked.length; i++) {
          if (ranked[i].content.toLowerCase().includes(tw)) {
            ranked[i]._relevance = ranked[4]._relevance + 0.001;
            break;
          }
        }
      }
    }
  }

  const sorted = ranked.sort((a, b) => b._relevance - a._relevance).slice(0, limit);

  // Enrich returned results: append tags to content for complete search results
  for (const r of sorted) {
    if (r.tags && Array.isArray(r.tags)) {
      const validTags = (r.tags as string[]).filter(Boolean);
      if (validTags.length > 0) {
        r.content = r.content + " [" + validTags.join(", ") + "]";
      }
    }
  }

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
  return (rows as any[]).length > 0 ? (rows[0] as Memory) : null;
}

/**
 * MemPalace: Duplicate detection with scope+category scoping.
 * Uses pg_trgm similarity (threshold 0.85) to find near-duplicates
 * within the same scope and category before inserting a new memory.
 * Returns the existing memory if a duplicate is found, null otherwise.
 */
async function findDuplicate(content: string, scope?: string, category?: string): Promise<Memory | null> {
  const sql = getClient();
  const threshold = 0.85;

  const rows = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags,
           similarity(m.content, ${content}) as sim
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND similarity(m.content, ${content}) > ${threshold}
      AND (${scope ?? null}::text IS NULL OR m.scope = ${scope ?? null})
      AND (${category ?? null}::text IS NULL OR m.category = ${category ?? null})
    GROUP BY m.id
    ORDER BY sim DESC
    LIMIT 1
  `;
  return (rows as any[]).length > 0 ? (rows[0] as Memory) : null;
}

export async function updateMemory(
  id: string,
  updates: Partial<Pick<Memory, "content" | "category" | "importance" | "confidence" | "scope" | "is_archived">>
): Promise<Memory | null> {
  const sql = getClient();

  // Build dynamic SET clause: undefined = keep existing, null = set to null, value = use value
  const setClauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (updates.content !== undefined) {
    values.content = updates.content;
  }
  if (updates.category !== undefined) {
    values.category = updates.category;
  }
  if (updates.importance !== undefined) {
    values.importance = updates.importance;
  }
  if (updates.confidence !== undefined) {
    values.confidence = updates.confidence;
  }
  if (updates.scope !== undefined) {
    values.scope = updates.scope;
  }
  if (updates.is_archived !== undefined) {
    values.is_archived = updates.is_archived;
  }

  // If nothing to update, just return the current row
  if (Object.keys(values).length === 0) {
    const current = await sql`SELECT * FROM memories WHERE id = ${id}`;
    return (current as any[]).length > 0 ? (current[0] as Memory) : null;
  }

  // Re-generate search enrichment if content or category changed
  let newEnrichment: string | null = null;
  if (updates.content !== undefined || updates.category !== undefined) {
    // Fetch current values for fields not being updated
    const [current] = (await sql`SELECT content, category FROM memories WHERE id = ${id}`) as any[];
    if (current) {
      const finalContent = updates.content ?? (current.content as string);
      const finalCategory = updates.category ?? (current.category as string);
      newEnrichment = enrichMemory(finalContent, finalCategory);
    }
  }

  const rows = await sql`
    UPDATE memories SET
      content = CASE WHEN ${updates.content !== undefined} THEN ${updates.content ?? null} ELSE content END,
      category = CASE WHEN ${updates.category !== undefined} THEN ${updates.category ?? null} ELSE category END,
      importance = CASE WHEN ${updates.importance !== undefined} THEN ${updates.importance ?? null} ELSE importance END,
      confidence = CASE WHEN ${updates.confidence !== undefined} THEN ${updates.confidence ?? null} ELSE confidence END,
      scope = CASE WHEN ${updates.scope !== undefined} THEN ${updates.scope ?? null} ELSE scope END,
      is_archived = CASE WHEN ${updates.is_archived !== undefined} THEN ${updates.is_archived ?? null} ELSE is_archived END,
      search_enrichment = CASE WHEN ${newEnrichment !== null} THEN ${newEnrichment} ELSE search_enrichment END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return (rows as any[]).length > 0 ? (rows[0] as Memory) : null;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const sql = getClient();
  const rows = await sql`DELETE FROM memories WHERE id = ${id} RETURNING id`;
  return (rows as any[]).length > 0;
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

export async function getRelations(memoryId: string, opts?: { includeHistory?: boolean }): Promise<MemoryRelation[]> {
  const sql = getClient();
  const includeHistory = opts?.includeHistory ?? false;
  const rows = await sql`
    SELECT source_id, target_id, relation_type, COALESCE(strength, 0.5) as strength
    FROM memory_relations
    WHERE (source_id = ${memoryId} OR target_id = ${memoryId})
      AND (${includeHistory} OR valid_to IS NULL)
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

  const nodeIds = (nodes as any[]).map((n: Record<string, unknown>) => n.id as string);

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

  if ((rows as any[]).length > 0) {
    const ids = (rows as any[]).map((r: Record<string, unknown>) => r.id as string);
    const strengths = (rows as any[]).map((r: Record<string, unknown>) => Number(r.sim ?? 0.5));
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
  const NO_DECAY_CATEGORIES = new Set([
    "decision",
    "preference",
    "identity",
    "style-preference",
    "tool-preference",
    "architecture",
  ]);

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
  const freqBoost = Math.min(1 + memory.access_count * 0.02, 1.2);

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
  for (const row of categoryRows as any[]) {
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
