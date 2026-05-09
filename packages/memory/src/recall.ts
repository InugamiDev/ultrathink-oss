// intent: Second Brain 4-layer recall — agent/user/knowledge/experience wings
// status: done
// confidence: high

import { getClient, type SqlClient } from "./client.js";
import { type Memory, calculateRecallScore, touchMemories } from "./memory.js";
import { getActiveAdaptations, formatAdaptations } from "./adaptation.js";
import { encodeMemoryAAAK, formatAdaptationsAAAK } from "./aaak.js";

export interface RecallOptions {
  scope?: string;
  projectName?: string;
  /** Max total tokens for L0+L1+L2 combined */
  maxTokens?: number;
  /** Include adaptations (Tekiō wheel) */
  includeAdaptations?: boolean;
  /** Compact mode — tighter budget, no headers */
  compact?: boolean;
  /** AAAK mode — lossless shorthand dialect (~3-8x token compression) */
  aaak?: boolean;
}

interface LayerBudget {
  layer: number;
  target: number;
  label: string;
}

/**
 * Unified recall: 4-layer memory loading with token budgets.
 *
 * | Layer | Budget    | What                                              |
 * |-------|-----------|---------------------------------------------------|
 * | L0    | ~100 tok  | Core (agent identity + user profile/preferences)  |
 * | L1    | ~300 tok  | Essential (decisions, patterns, agent rules)       |
 * | L2    | ~500 tok  | Context (insights, references, projects)           |
 * | L3    | On-demand | Deep search (sessions, outcomes, errors)           |
 *
 * Adaptations appended after brain section.
 */
export async function recall(scope?: string, options: RecallOptions = {}): Promise<string> {
  const sql = getClient();
  const maxTokens = options.maxTokens ?? 900;
  const includeAdaptations = options.includeAdaptations ?? true;
  const compact = options.compact ?? false;
  const aaak = options.aaak ?? false;
  const projectName = options.projectName ?? scope?.split("/").pop() ?? "project";

  // Budget allocation
  const budgets: LayerBudget[] = [
    { layer: 0, target: Math.round(maxTokens * 0.11), label: "Core" },
    { layer: 1, target: Math.round(maxTokens * 0.33), label: "Essential" },
    { layer: 2, target: Math.round(maxTokens * 0.56), label: "Context" },
  ];

  // Single query: fetch L0+L1+L2 memories in one pass, ordered by layer then importance
  const memories = (await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.is_archived = false
      AND m.layer <= 2
      AND (${scope ?? null}::text IS NULL OR m.scope = ${scope ?? null} OR m.scope IS NULL OR m.wing IN ('agent', 'user'))
    GROUP BY m.id
    ORDER BY m.layer ASC, m.importance DESC, m.accessed_at DESC NULLS LAST
    LIMIT 60
  `) as (Memory & { tags?: string[] })[];

  // Score and bucket by layer
  const layerBuckets: Map<number, (Memory & { _score: number })[]> = new Map();
  for (const m of memories) {
    const score = calculateRecallScore({
      importance: m.importance,
      confidence: m.confidence,
      category: m.category,
      created_at: m.created_at,
      accessed_at: m.accessed_at,
      access_count: m.access_count,
    });
    const layer = m.layer ?? 2;
    if (!layerBuckets.has(layer)) layerBuckets.set(layer, []);
    layerBuckets.get(layer)!.push({ ...m, _score: score });
  }

  // Sort each bucket by score descending
  for (const bucket of layerBuckets.values()) {
    bucket.sort((a, b) => b._score - a._score);
  }

  // Build output with budget tracking
  const sections: string[] = [];
  const touchIds: string[] = [];
  let totalTokens = 0;

  for (const budget of budgets) {
    const bucket = layerBuckets.get(budget.layer) ?? [];
    if (bucket.length === 0) continue;

    let layerTokens = 0;
    const lines: string[] = [];

    for (const m of bucket) {
      const est = m.token_estimate ?? Math.round(m.content.length / 4);
      if (layerTokens + est > budget.target && lines.length > 0) break;

      if (aaak) {
        // AAAK: lossless shorthand — ~3-8x compression
        lines.push(
          encodeMemoryAAAK({
            content: m.content,
            category: m.category,
            wing: m.wing,
            hall: m.hall,
            importance: m.importance,
            tags: m.tags?.filter(Boolean),
          })
        );
      } else if (compact) {
        const content = m.content.replace(/\n/g, " ").slice(0, 300);
        lines.push(`[${m.wing}/${m.hall}] ${content}`);
      } else {
        const content = m.content.replace(/\n/g, " ").slice(0, 300);
        const tags = m.tags?.filter(Boolean).join(", ") || "";
        lines.push(`- ${content}${tags ? ` [${tags}]` : ""}`);
      }
      layerTokens += est;
      touchIds.push(m.id);
    }

    if (lines.length > 0) {
      if (!compact) {
        sections.push(`**${budget.label}:**\n${lines.join("\n")}`);
      } else {
        sections.push(lines.join("\n"));
      }
      totalTokens += layerTokens;
    }
  }

  // Touch recalled memories (non-blocking)
  if (touchIds.length > 0) {
    touchMemories(touchIds).catch(() => {});
  }

  // Build brain section
  let brain = "";
  if (sections.length > 0) {
    if (aaak || compact) {
      brain = sections.join("\n");
    } else {
      brain = `## Brain — ${projectName}\n\n${sections.join("\n\n")}\n`;
    }
  }

  // Append adaptations
  let wheel = "";
  if (includeAdaptations) {
    try {
      const adaptations = await getActiveAdaptations(sql, scope);
      wheel = aaak ? formatAdaptationsAAAK(adaptations) : formatAdaptations(adaptations);
    } catch {
      // adaptations table may not exist
    }
  }

  // Dynamic total budget: base 5120, max 8192 bytes
  const raw = brain + (wheel ? "\n" + wheel : "");
  const MAX_BYTES = compact ? 3000 : 8192;
  if (raw.length > MAX_BYTES) {
    return raw.slice(0, MAX_BYTES);
  }

  return raw;
}
