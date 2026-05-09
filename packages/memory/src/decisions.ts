/**
 * intent: Decision CRUD — thin wrapper over unified memories table
 * status: done
 * confidence: high
 *
 * Decisions are rules that constrain Claude's behavior.
 * Stored as memories with wing=project, hall=decision, layer=1.
 * Legacy decisions table is kept for backward compatibility during migration.
 */

import { getClient } from "./client.js";
import { createMemory, searchMemories, updateMemory, type Memory } from "./memory.js";

export interface Decision {
  id: string;
  rule: string;
  priority: number; // 1-10
  scope: string; // "global" | project path
  source: "user" | "claude" | "tekio";
  context?: string;
  is_active: boolean;
  times_applied: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateDecisionInput {
  rule: string;
  priority?: number;
  scope?: string;
  source?: "user" | "claude" | "tekio";
  context?: string;
  tags?: string[];
}

/** Convert a Memory row to Decision shape for backward compat */
function memoryToDecision(m: Memory): Decision {
  return {
    id: m.id,
    rule: m.content,
    priority: m.importance,
    scope: m.scope ?? "global",
    source: (m.source as "user" | "claude" | "tekio") ?? "user",
    context: undefined,
    is_active: !m.is_archived,
    times_applied: m.access_count,
    tags: m.tags ?? [],
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

export async function createDecision(input: CreateDecisionInput): Promise<Decision> {
  const tags = input.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];
  const memory = await createMemory({
    content: input.rule,
    category: "decision",
    importance: input.priority ?? 5,
    confidence: 0.9,
    scope: input.scope ?? "global",
    source: input.source ?? "user",
    wing: "project",
    hall: "decision",
    layer: 1,
    tags,
  });
  return memoryToDecision(memory);
}

export async function getDecisions(scope?: string): Promise<Decision[]> {
  const memories = await searchMemories({
    category: "decision",
    scope,
    limit: 30,
    minImportance: 1,
  });
  return memories.map(memoryToDecision);
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const sql = getClient();
  const rows = await sql`
    SELECT m.*, array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
    FROM memories m
    LEFT JOIN memory_tags mt ON m.id = mt.memory_id
    WHERE m.id = ${id} AND m.category = 'decision'
    GROUP BY m.id
  `;
  if ((rows as any[]).length === 0) return null;
  return memoryToDecision(rows[0] as Memory);
}

export async function updateDecision(
  id: string,
  updates: Partial<Pick<Decision, "rule" | "priority" | "scope" | "is_active" | "tags">>
): Promise<Decision | null> {
  const memory = await updateMemory(id, {
    content: updates.rule,
    importance: updates.priority,
    scope: updates.scope,
    is_archived: updates.is_active === undefined ? undefined : !updates.is_active,
  });
  if (!memory) return null;
  return memoryToDecision(memory);
}

export async function markApplied(id: string): Promise<void> {
  const sql = getClient();
  await sql`
    UPDATE memories SET access_count = access_count + 1, accessed_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deactivateDecision(id: string): Promise<void> {
  await updateMemory(id, { is_archived: true });
}

export async function searchDecisions(query: string, scope?: string): Promise<Decision[]> {
  const memories = await searchMemories({
    category: "decision",
    scope,
    query,
    limit: 20,
    minImportance: 1,
  });
  return memories.map(memoryToDecision);
}

/**
 * Format decisions for injection into Claude's context.
 * Returns a compact string suitable for additionalContext.
 */
export function formatDecisionsForContext(decisions: Decision[]): string {
  if (decisions.length === 0) return "";

  const lines = ["## Active Decisions (hard constraints)", ""];
  for (const d of decisions) {
    const scope = d.scope === "global" ? "" : ` [${d.scope}]`;
    const priority = d.priority >= 8 ? "CRITICAL" : d.priority >= 5 ? "IMPORTANT" : "note";
    lines.push(`- **[${priority}]${scope}** ${d.rule}`);
  }
  return lines.join("\n");
}
