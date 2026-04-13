/**
 * intent: Decision CRUD — lightweight constraint engine
 * status: done
 * confidence: high
 *
 * Decisions are rules that constrain Claude's behavior.
 * Manual creation via vault or CLI.
 */

import { randomUUID } from "crypto";
import { getClient } from "./client.js";

export interface Decision {
  id: string;
  rule: string;
  priority: number; // 1-10
  scope: string; // "global" | project path
  source: "user" | "claude";
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
  source?: "user" | "claude";
  context?: string;
  tags?: string[];
}

export async function createDecision(input: CreateDecisionInput): Promise<Decision> {
  const sql = getClient();
  const id = `dec_${randomUUID().slice(0, 8)}`;
  const tags = input.tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];

  const rows = await sql`
    INSERT INTO decisions (id, rule, priority, scope, source, context, tags)
    VALUES (
      ${id},
      ${input.rule},
      ${input.priority ?? 5},
      ${input.scope ?? "global"},
      ${input.source ?? "user"},
      ${input.context ?? null},
      ${tags}
    )
    RETURNING *
  `;
  return rows[0] as Decision;
}

export async function getDecisions(scope?: string): Promise<Decision[]> {
  const sql = getClient();

  if (scope) {
    const rows = await sql`
      SELECT * FROM decisions
      WHERE is_active = true AND (scope = 'global' OR scope = ${scope})
      ORDER BY priority DESC, created_at
    `;
    return rows as Decision[];
  }

  const rows = await sql`
    SELECT * FROM decisions
    WHERE is_active = true
    ORDER BY priority DESC, created_at
  `;
  return rows as Decision[];
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM decisions WHERE id = ${id}`;
  return (rows as any[]).length > 0 ? (rows[0] as Decision) : null;
}

export async function updateDecision(
  id: string,
  updates: Partial<Pick<Decision, "rule" | "priority" | "scope" | "is_active" | "tags">>
): Promise<Decision | null> {
  const sql = getClient();

  // Build dynamic update — only set fields that were provided
  const rows = await sql`
    UPDATE decisions SET
      rule = COALESCE(${updates.rule ?? null}, rule),
      priority = COALESCE(${updates.priority ?? null}, priority),
      scope = COALESCE(${updates.scope ?? null}, scope),
      is_active = COALESCE(${updates.is_active ?? null}, is_active),
      tags = COALESCE(${updates.tags ?? null}, tags),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows as any[]).length > 0 ? (rows[0] as Decision) : null;
}

export async function markApplied(id: string): Promise<void> {
  const sql = getClient();
  await sql`
    UPDATE decisions SET times_applied = times_applied + 1, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deactivateDecision(id: string): Promise<void> {
  const sql = getClient();
  await sql`UPDATE decisions SET is_active = false, updated_at = NOW() WHERE id = ${id}`;
}

export async function searchDecisions(query: string, scope?: string): Promise<Decision[]> {
  const sql = getClient();
  const pattern = `%${query}%`;

  if (scope) {
    return (await sql`
      SELECT * FROM decisions
      WHERE is_active = true
        AND (scope = 'global' OR scope = ${scope})
        AND (rule ILIKE ${pattern} OR context ILIKE ${pattern})
      ORDER BY priority DESC
      LIMIT 20
    `) as Decision[];
  }

  return (await sql`
    SELECT * FROM decisions
    WHERE is_active = true AND (rule ILIKE ${pattern} OR context ILIKE ${pattern})
    ORDER BY priority DESC
    LIMIT 20
  `) as Decision[];
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
