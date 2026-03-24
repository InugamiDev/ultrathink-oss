import { getClient } from "./client.js";

// ─── Skill Usage ─────────────────────────────────────────────────────────────

export async function logSkillUsage(skills: string[], sessionId: string | null, durationMs?: number): Promise<void> {
  if (!skills.length) return;
  const sql = getClient();
  // Batch insert all skills in one query
  await sql`
    INSERT INTO skill_usage (skill_id, session_id, duration_ms, success)
    SELECT * FROM UNNEST(
      ${skills}::text[],
      ${skills.map(() => sessionId)}::uuid[],
      ${skills.map(() => durationMs ?? null)}::int[],
      ${skills.map(() => true)}::boolean[]
    ) AS t(skill_id, session_id, duration_ms, success)
  `;
}

export async function getSkillUsageStats(
  limit = 20
): Promise<{ skill_id: string; invocations: number; last_used: string }[]> {
  const sql = getClient();
  return (await sql`
    SELECT skill_id,
           COUNT(*)::int as invocations,
           MAX(invoked_at)::text as last_used
    FROM skill_usage
    GROUP BY skill_id
    ORDER BY invocations DESC
    LIMIT ${limit}
  `) as { skill_id: string; invocations: number; last_used: string }[];
}

// ─── Command / Tool Usage ────────────────────────────────────────────────────

export async function logToolUse(toolName: string, sessionId: string | null): Promise<void> {
  const sql = getClient();
  await sql`
    INSERT INTO command_usage (command, session_id)
    VALUES (${toolName}, ${sessionId})
  `;
}

export async function getToolUsageStats(
  limit = 20
): Promise<{ command: string; invocations: number; last_used: string }[]> {
  const sql = getClient();
  return (await sql`
    SELECT command,
           COUNT(*)::int as invocations,
           MAX(invoked_at)::text as last_used
    FROM command_usage
    GROUP BY command
    ORDER BY invocations DESC
    LIMIT ${limit}
  `) as { command: string; invocations: number; last_used: string }[];
}

// ─── Daily Stats ─────────────────────────────────────────────────────────────

export async function computeDailyStats(date?: string): Promise<void> {
  const sql = getClient();
  const d = date ?? new Date().toISOString().slice(0, 10);

  // Single query with CTEs instead of 6 sequential round-trips
  const [stats] = await sql`
    WITH s AS (SELECT COUNT(*)::int as n FROM sessions WHERE DATE(started_at) = ${d}::date),
         m AS (SELECT COUNT(*)::int as n FROM memories WHERE DATE(created_at) = ${d}::date),
         sk AS (SELECT COUNT(*)::int as n FROM skill_usage WHERE DATE(invoked_at) = ${d}::date),
         h AS (SELECT COUNT(*)::int as n FROM hook_events WHERE DATE(created_at) = ${d}::date),
         t AS (SELECT COUNT(*)::int as n FROM tasks WHERE status = 'done' AND DATE(updated_at) = ${d}::date)
    SELECT s.n as sessions, m.n as memories, sk.n as skills, h.n as hooks, t.n as tasks
    FROM s, m, sk, h, t
  `;

  const topSkills = await sql`
    SELECT skill_id, COUNT(*)::int as n
    FROM skill_usage WHERE DATE(invoked_at) = ${d}::date
    GROUP BY skill_id ORDER BY n DESC LIMIT 10
  `;

  await sql`
    INSERT INTO daily_stats (date, total_sessions, total_memories_created, total_skills_invoked,
      total_hook_events, total_tasks_completed, top_skills)
    VALUES (
      ${d}::date,
      ${Number(stats.sessions)},
      ${Number(stats.memories)},
      ${Number(stats.skills)},
      ${Number(stats.hooks)},
      ${Number(stats.tasks)},
      ${JSON.stringify(topSkills)}::jsonb
    )
    ON CONFLICT (date) DO UPDATE SET
      total_sessions         = EXCLUDED.total_sessions,
      total_memories_created = EXCLUDED.total_memories_created,
      total_skills_invoked   = EXCLUDED.total_skills_invoked,
      total_hook_events      = EXCLUDED.total_hook_events,
      total_tasks_completed  = EXCLUDED.total_tasks_completed,
      top_skills             = EXCLUDED.top_skills
  `;
}

export async function getDailyStats(days = 30): Promise<object[]> {
  const sql = getClient();
  return (await sql`
    SELECT * FROM daily_stats
    ORDER BY date DESC LIMIT ${days}
  `) as object[];
}

// ─── Cost Tracking ──────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model?: string;
}

export interface CostSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  costByModel: Record<string, number>;
  sessionCount: number;
}

export async function updateSessionCost(sessionId: string, usage: TokenUsage): Promise<void> {
  const sql = getClient();

  // Calculate cost from pricing table
  const model = usage.model ?? "claude-sonnet-4-6";
  const pricing = await sql`SELECT * FROM model_pricing WHERE model = ${model} LIMIT 1`;

  let costUsd = 0;
  if (pricing.length > 0) {
    const p = pricing[0];
    costUsd =
      (usage.inputTokens / 1_000_000) * Number(p.input_per_mtok) +
      (usage.outputTokens / 1_000_000) * Number(p.output_per_mtok) +
      ((usage.cacheReadTokens ?? 0) / 1_000_000) * Number(p.cache_read_per_mtok) +
      ((usage.cacheWriteTokens ?? 0) / 1_000_000) * Number(p.cache_write_per_mtok);
  }

  await sql`
    UPDATE sessions SET
      input_tokens = COALESCE(input_tokens, 0) + ${usage.inputTokens},
      output_tokens = COALESCE(output_tokens, 0) + ${usage.outputTokens},
      cache_read_tokens = COALESCE(cache_read_tokens, 0) + ${usage.cacheReadTokens ?? 0},
      cache_write_tokens = COALESCE(cache_write_tokens, 0) + ${usage.cacheWriteTokens ?? 0},
      model = COALESCE(model, ${model}),
      cost_usd = COALESCE(cost_usd, 0) + ${costUsd}
    WHERE id = ${sessionId}
  `;
}

export async function getCostSummary(days = 30): Promise<CostSummary> {
  const sql = getClient();
  const result = await sql`
    SELECT
      COALESCE(SUM(cost_usd), 0)::numeric as total_cost,
      COALESCE(SUM(input_tokens), 0)::bigint as total_input,
      COALESCE(SUM(output_tokens), 0)::bigint as total_output,
      COALESCE(SUM(cache_read_tokens), 0)::bigint as total_cache_read,
      COALESCE(SUM(cache_write_tokens), 0)::bigint as total_cache_write,
      COUNT(*)::int as session_count
    FROM sessions
    WHERE started_at >= NOW() - INTERVAL '1 day' * ${days}
      AND cost_usd > 0
  `;
  const row = result[0];

  // Cost by model
  const modelRows = await sql`
    SELECT model, COALESCE(SUM(cost_usd), 0)::numeric as cost
    FROM sessions
    WHERE started_at >= NOW() - INTERVAL '1 day' * ${days}
      AND model IS NOT NULL AND cost_usd > 0
    GROUP BY model
    ORDER BY cost DESC
  `;

  const costByModel: Record<string, number> = {};
  for (const r of modelRows) {
    costByModel[r.model as string] = Number(r.cost);
  }

  return {
    totalCostUsd: Number(row.total_cost),
    totalInputTokens: Number(row.total_input),
    totalOutputTokens: Number(row.total_output),
    totalCacheReadTokens: Number(row.total_cache_read),
    totalCacheWriteTokens: Number(row.total_cache_write),
    costByModel,
    sessionCount: Number(row.session_count),
  };
}

export async function getDailyCosts(
  days = 30
): Promise<{ date: string; cost: number; model: string; tokens: number }[]> {
  const sql = getClient();
  return (await sql`
    SELECT
      DATE(started_at)::text as date,
      COALESCE(model, 'unknown') as model,
      COALESCE(SUM(cost_usd), 0)::numeric as cost,
      COALESCE(SUM(input_tokens + output_tokens), 0)::bigint as tokens
    FROM sessions
    WHERE started_at >= NOW() - INTERVAL '1 day' * ${days}
      AND cost_usd > 0
    GROUP BY DATE(started_at), model
    ORDER BY date DESC, cost DESC
  `) as { date: string; cost: number; model: string; tokens: number }[];
}

export async function getModelPricing(): Promise<{ model: string; input_per_mtok: number; output_per_mtok: number }[]> {
  const sql = getClient();
  return (await sql`SELECT * FROM model_pricing ORDER BY input_per_mtok DESC`) as {
    model: string;
    input_per_mtok: number;
    output_per_mtok: number;
  }[];
}

// ─── Security Incidents ──────────────────────────────────────────────────────

export async function logSecurityIncident(input: {
  hookEventId?: string | null;
  title: string;
  description?: string;
}): Promise<void> {
  const sql = getClient();
  await sql`
    INSERT INTO security_incidents (hook_event_id, title, description, status)
    VALUES (
      ${input.hookEventId ?? null},
      ${input.title},
      ${input.description ?? null},
      'open'
    )
  `;
}

export async function getSecurityIncidents(limit = 50): Promise<object[]> {
  const sql = getClient();
  return (await sql`
    SELECT si.*, he.event_type, he.path_accessed, he.action_taken
    FROM security_incidents si
    LEFT JOIN hook_events he ON he.id = si.hook_event_id
    ORDER BY si.created_at DESC
    LIMIT ${limit}
  `) as object[];
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export async function logDecision(input: {
  title: string;
  decision: string;
  context?: string;
  consequences?: string;
  alternatives?: string;
  status?: string;
}): Promise<{ id: string }> {
  const sql = getClient();
  const [row] = await sql`
    INSERT INTO decisions (title, decision, context, consequences, alternatives, status)
    VALUES (
      ${input.title},
      ${input.decision},
      ${input.context ?? null},
      ${input.consequences ?? null},
      ${input.alternatives ?? null},
      ${input.status ?? "accepted"}
    )
    RETURNING id
  `;
  return row as { id: string };
}

export async function listDecisions(limit = 50): Promise<object[]> {
  const sql = getClient();
  return (await sql`
    SELECT * FROM decisions ORDER BY created_at DESC LIMIT ${limit}
  `) as object[];
}
