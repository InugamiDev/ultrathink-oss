// intent: Four-lens query helpers for /orchestrator/activity.
// status: done (M7 scaffold — definitions only, no live runs yet).
// next: M7 dashboard page imports these; M4 starts populating activity_log.
// confidence: high

import { getDb } from "./db";

/** Mirrors a row in the `activity_log` table. */
export interface ActivityRow {
  id: string;
  occurred_at: string;
  actor_type: "agent" | "human" | "system";
  actor_id: string | null;
  actor_name: string;
  actor_title: string | null;
  trigger_type: "direct" | "human_mention" | "agent_handoff" | "scheduled" | "system";
  triggered_by_actor_type: "agent" | "human" | "system" | null;
  triggered_by_actor_id: string | null;
  triggered_by_actor_name: string | null;
  verb: string;
  object_type: string | null;
  object_id: string | null;
  object_label: string | null;
  paperclip_company_id: string | null;
  project_id: string | null;
  issue_id: string | null;
  paperclip_run_id: string | null;
  cost_usd: string | null;
  metadata: Record<string, unknown>;
}

/** Verbs that count as "work landed" for the Done lens. */
const DONE_VERBS = ["completed", "shipped", "approved"] as const;

/** Verbs that count as queued / about-to-happen work for the Next-Up lens. */
const NEXT_VERBS = ["created", "assigned", "wake"] as const;

/**
 * Lens 1: Done — what shipped / completed in the last 7 days, optionally scoped to a project.
 */
export async function getDoneThisWeek(opts: { projectId?: string } = {}): Promise<ActivityRow[]> {
  const sql = getDb();
  if (opts.projectId) {
    return (await sql`
      SELECT * FROM activity_log
      WHERE verb = ANY(${DONE_VERBS as unknown as string[]})
        AND occurred_at >= now() - interval '7 days'
        AND project_id = ${opts.projectId}::uuid
      ORDER BY occurred_at DESC
      LIMIT 200
    `) as ActivityRow[];
  }
  return (await sql`
    SELECT * FROM activity_log
    WHERE verb = ANY(${DONE_VERBS as unknown as string[]})
      AND occurred_at >= now() - interval '7 days'
    ORDER BY occurred_at DESC
    LIMIT 200
  `) as ActivityRow[];
}

/**
 * Lens 2: Next-Up — open work signals (created/assigned/wake) that haven't completed yet.
 * Uses a NOT EXISTS check against the same issue/run.
 */
export async function getNextUp(opts: { projectId?: string } = {}): Promise<ActivityRow[]> {
  const sql = getDb();
  if (opts.projectId) {
    return (await sql`
      SELECT a.* FROM activity_log a
      WHERE a.verb = ANY(${NEXT_VERBS as unknown as string[]})
        AND a.occurred_at >= now() - interval '14 days'
        AND a.project_id = ${opts.projectId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM activity_log b
          WHERE b.issue_id = a.issue_id
            AND b.verb IN ('completed','shipped','cancelled')
            AND b.occurred_at > a.occurred_at
        )
      ORDER BY a.occurred_at DESC
      LIMIT 200
    `) as ActivityRow[];
  }
  return (await sql`
    SELECT a.* FROM activity_log a
    WHERE a.verb = ANY(${NEXT_VERBS as unknown as string[]})
      AND a.occurred_at >= now() - interval '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM activity_log b
        WHERE b.issue_id = a.issue_id
          AND b.verb IN ('completed','shipped','cancelled')
          AND b.occurred_at > a.occurred_at
      )
    ORDER BY a.occurred_at DESC
    LIMIT 200
  `) as ActivityRow[];
}

/**
 * Lens 3: Agents-Did — every action whose actor is an agent.
 */
export async function getAgentsDid(opts: { sinceDays?: number; agentId?: string } = {}): Promise<ActivityRow[]> {
  const sql = getDb();
  const days = opts.sinceDays ?? 7;
  const interval = `${days} days`;
  if (opts.agentId) {
    return (await sql`
      SELECT * FROM activity_log
      WHERE actor_type = 'agent'
        AND actor_id = ${opts.agentId}
        AND occurred_at >= now() - ${interval}::interval
      ORDER BY occurred_at DESC
      LIMIT 500
    `) as ActivityRow[];
  }
  return (await sql`
    SELECT * FROM activity_log
    WHERE actor_type = 'agent'
      AND occurred_at >= now() - ${interval}::interval
    ORDER BY occurred_at DESC
    LIMIT 500
  `) as ActivityRow[];
}

/**
 * Lens 4a: Human → Agent — agent actions triggered by a human mention/handoff.
 * Filtered by triggered_by_actor_type = 'human'.
 */
export async function getHumanToAgent(opts: { sinceDays?: number; humanId?: string } = {}): Promise<ActivityRow[]> {
  const sql = getDb();
  const days = opts.sinceDays ?? 7;
  const interval = `${days} days`;
  if (opts.humanId) {
    return (await sql`
      SELECT * FROM activity_log
      WHERE actor_type = 'agent'
        AND triggered_by_actor_type = 'human'
        AND triggered_by_actor_id = ${opts.humanId}
        AND occurred_at >= now() - ${interval}::interval
      ORDER BY occurred_at DESC
      LIMIT 500
    `) as ActivityRow[];
  }
  return (await sql`
    SELECT * FROM activity_log
    WHERE actor_type = 'agent'
      AND triggered_by_actor_type = 'human'
      AND occurred_at >= now() - ${interval}::interval
    ORDER BY occurred_at DESC
    LIMIT 500
  `) as ActivityRow[];
}

/**
 * Lens 4b: Humans-Direct — actions where the actor is a human (no agent intermediary).
 */
export async function getHumansDirect(opts: { sinceDays?: number; humanId?: string } = {}): Promise<ActivityRow[]> {
  const sql = getDb();
  const days = opts.sinceDays ?? 7;
  const interval = `${days} days`;
  if (opts.humanId) {
    return (await sql`
      SELECT * FROM activity_log
      WHERE actor_type = 'human'
        AND actor_id = ${opts.humanId}
        AND occurred_at >= now() - ${interval}::interval
      ORDER BY occurred_at DESC
      LIMIT 500
    `) as ActivityRow[];
  }
  return (await sql`
    SELECT * FROM activity_log
    WHERE actor_type = 'human'
      AND occurred_at >= now() - ${interval}::interval
    ORDER BY occurred_at DESC
    LIMIT 500
  `) as ActivityRow[];
}
