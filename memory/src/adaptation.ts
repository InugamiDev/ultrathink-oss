// intent: OSS adaptive learning — learn from tool failures, generate behavioral rules
// status: done
// confidence: high

import { getClient } from "./client.js";
import type postgres from "postgres";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FailureEvent {
  tool: string;
  error: string;
  file?: string;
  context?: string;
  timestamp?: string;
}

export interface Adaptation {
  id: string;
  trigger_pattern: string;
  adaptation_rule: string;
  category: string;
  severity: number;
  times_applied: number;
  times_prevented: number;
  is_active: boolean;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Filters & pattern extraction
// ---------------------------------------------------------------------------

const NOISE_RE = /mcp error -\d+|ipc server was disposed|SIGTERM|SIGKILL|timeout.*exceeded/i;

/** Return true when the error is worth learning from. */
export function isWorthLearning(error: string): boolean {
  if (error.length < 15) return false;
  if (NOISE_RE.test(error)) return false;
  const firstLine = error.split("\n")[0];
  if (firstLine.length > 200) return false;
  return true;
}

/** Reduce a raw error string to a reusable trigger pattern. */
export function extractTriggerPattern(error: string): string {
  let pattern = error.split("\n")[0].slice(0, 80);
  pattern = pattern.replace(/\/(?:Users|home)\/[^\s)]+/g, "<path>");
  pattern = pattern.replace(/\b[0-9a-f]{8,}\b/gi, "<hash>");
  pattern = pattern.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>");
  return pattern.trim();
}

// ---------------------------------------------------------------------------
// Rule generation
// ---------------------------------------------------------------------------

/** Turn a trigger pattern into a human-readable behavioral rule. */
export function generateRule(tool: string, trigger: string): string {
  const t = trigger.toLowerCase();

  if (t.includes("not found") || t.includes("does not exist")) {
    return `[${tool}] Verify the target exists before this operation.`;
  }
  if (t.includes("permission denied")) {
    return `[${tool}] Check file permissions before accessing.`;
  }
  if (t.includes("timed out") || t.includes("timeout")) {
    return `[${tool}] Use a more specific path or reduce scope.`;
  }
  if (t.includes("eisdir") || t.includes("is a directory")) {
    return `[${tool}] Target is a directory, not a file. Use Glob or ls instead.`;
  }
  if (t.includes("syntax error") || t.includes("unexpected token")) {
    return `[${tool}] Fix syntax errors in the input before retrying.`;
  }

  return `[${tool}] Failed: "${trigger}". Fix the root cause before retrying.`;
}

// ---------------------------------------------------------------------------
// Core wheel operations
// ---------------------------------------------------------------------------

/**
 * Process a tool failure and create (or reinforce) an adaptation rule.
 * Returns whether a new rule was learned and the resulting adaptation.
 */
export async function wheelTurn(
  sql: postgres.Sql,
  event: FailureEvent
): Promise<{
  learned: boolean;
  adaptation?: Adaptation;
  reason?: string;
  isNew?: boolean;
  wheelSpin?: number;
}> {
  if (!isWorthLearning(event.error)) {
    return { learned: false, reason: "filtered" };
  }

  const trigger = extractTriggerPattern(event.error);

  // Check for an existing adaptation with a similar trigger
  const existing = await sql`
    SELECT * FROM adaptations
    WHERE is_active = true
      AND similarity(trigger_pattern, ${trigger}) > 0.6
    LIMIT 1
  `;

  if (existing.length > 0) {
    const match = existing[0] as unknown as Adaptation;
    await sql`
      UPDATE adaptations
      SET times_applied = times_applied + 1, updated_at = NOW()
      WHERE id = ${match.id}
    `;
    match.times_applied += 1;
    return { learned: false, adaptation: match, isNew: false, wheelSpin: match.times_applied };
  }

  // New pattern — generate a rule and store it
  const rule = generateRule(event.tool, trigger);
  const inserted = await sql`
    INSERT INTO adaptations (trigger_pattern, adaptation_rule, category, severity, source_tool, source_error)
    VALUES (${trigger}, ${rule}, 'defensive', 5, ${event.tool}, ${event.error.slice(0, 500)})
    RETURNING *
  `;

  const adaptation = inserted[0] as unknown as Adaptation;
  return { learned: true, adaptation, isNew: true, wheelSpin: 1 };
}

/**
 * Manually create an adaptation from a known good pattern.
 */
export async function wheelLearn(sql: postgres.Sql, pattern: string, rule: string): Promise<{ id: string } | null> {
  const rows = await sql`
    INSERT INTO adaptations (trigger_pattern, adaptation_rule, category, severity)
    VALUES (${pattern}, ${rule}, 'learning', 5)
    RETURNING id
  `;
  return rows.length > 0 ? { id: (rows[0] as any).id } : null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Return all active adaptations ordered by severity then frequency. */
export async function getActiveAdaptations(sql: postgres.Sql): Promise<Adaptation[]> {
  const rows = await sql`
    SELECT * FROM adaptations
    WHERE is_active = true
    ORDER BY severity DESC, times_applied DESC
  `;
  return rows as unknown as Adaptation[];
}

/** Format adaptations into a readable rules list for context injection. */
export function formatAdaptations(adaptations: Adaptation[]): string {
  if (adaptations.length === 0) return "No active adaptive learning rules.";

  const lines = adaptations.map((a) => `  [${a.category}] ${a.adaptation_rule} (applied ${a.times_applied}x)`);
  return `Active rules (${adaptations.length}):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

/**
 * Create or update an adaptation from a user correction.
 * `tool` is the wrong behavior, `trigger` is the pattern, `rule` is the correct behavior.
 */
export async function adaptFromCorrection(
  sql: postgres.Sql,
  tool: string,
  trigger: string,
  rule: string
): Promise<{ id: string } | null> {
  // Check for existing similar trigger
  const existing = await sql`
    SELECT * FROM adaptations
    WHERE is_active = true
      AND similarity(trigger_pattern, ${trigger}) > 0.6
    LIMIT 1
  `;

  if (existing.length > 0) {
    const match = existing[0] as any;
    await sql`
      UPDATE adaptations
      SET adaptation_rule = ${rule},
          times_applied = times_applied + 1,
          updated_at = NOW()
      WHERE id = ${match.id}
    `;
    return { id: match.id };
  }

  const rows = await sql`
    INSERT INTO adaptations (trigger_pattern, adaptation_rule, category, severity, source_tool, source_error)
    VALUES (${trigger}, ${rule}, 'defensive', 5, ${tool}, ${trigger})
    RETURNING id
  `;
  return rows.length > 0 ? { id: (rows[0] as any).id } : null;
}

// ---------------------------------------------------------------------------
// Stats & prevention
// ---------------------------------------------------------------------------

/** Aggregate statistics across all active adaptations. */
export async function getWheelStats(sql: postgres.Sql): Promise<Record<string, number>> {
  const rows = await sql`
    SELECT
      COUNT(*)::int                                              AS total,
      COUNT(*) FILTER (WHERE category = 'defensive')::int       AS defensive,
      COUNT(*) FILTER (WHERE category = 'auxiliary')::int        AS auxiliary,
      COUNT(*) FILTER (WHERE category = 'offensive')::int       AS offensive,
      COUNT(*) FILTER (WHERE category = 'learning')::int        AS learning,
      COALESCE(SUM(times_applied), 0)::int                      AS "totalApplied",
      COALESCE(SUM(times_prevented), 0)::int                    AS "totalPrevented"
    FROM adaptations
    WHERE is_active = true
  `;
  return (
    (rows[0] as any) ?? {
      total: 0,
      defensive: 0,
      auxiliary: 0,
      offensive: 0,
      learning: 0,
      totalApplied: 0,
      totalPrevented: 0,
    }
  );
}

/** Increment the prevention counter for an adaptation that blocked a repeat failure. */
export async function recordPrevention(sql: postgres.Sql, adaptationId: string): Promise<void> {
  await sql`
    UPDATE adaptations
    SET times_prevented = times_prevented + 1
    WHERE id = ${adaptationId}
  `;
}
