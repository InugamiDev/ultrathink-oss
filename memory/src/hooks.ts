import { getClient } from "./client.js";

export interface HookEvent {
  id: string;
  event_type: string;
  severity: string;
  description?: string;
  path_accessed?: string;
  action_taken?: string;
  hook_name?: string;
  session_id?: string;
  created_at: string;
}

export async function logHookEvent(input: {
  event_type: string;
  severity?: string;
  description?: string;
  path_accessed?: string;
  action_taken?: string;
  hook_name?: string;
  session_id?: string;
}): Promise<HookEvent> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO hook_events (event_type, severity, description, path_accessed, action_taken, hook_name, session_id)
    VALUES (
      ${input.event_type},
      ${input.severity ?? "info"},
      ${input.description ?? null},
      ${input.path_accessed ?? null},
      ${input.action_taken ?? null},
      ${input.hook_name ?? null},
      ${input.session_id ?? null}
    )
    RETURNING *
  `;
  return rows[0] as HookEvent;
}

export async function listHookEvents(opts?: {
  event_type?: string;
  severity?: string;
  limit?: number;
}): Promise<HookEvent[]> {
  const sql = getClient();
  const limit = opts?.limit ?? 50;

  return (await sql`
    SELECT * FROM hook_events
    WHERE (${opts?.event_type ?? null}::text IS NULL OR event_type = ${opts?.event_type ?? null})
      AND (${opts?.severity ?? null}::text IS NULL OR severity = ${opts?.severity ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as HookEvent[];
}

export async function getHookEventStats(): Promise<{
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recentBlocked: number;
}> {
  const sql = getClient();

  const [totalResult, severityRows, typeRows, blockedResult] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM hook_events`,
    sql`SELECT severity, COUNT(*) as count FROM hook_events GROUP BY severity`,
    sql`SELECT event_type, COUNT(*) as count FROM hook_events GROUP BY event_type ORDER BY count DESC LIMIT 10`,
    sql`SELECT COUNT(*) as count FROM hook_events WHERE action_taken = 'blocked' AND created_at > NOW() - INTERVAL '24 hours'`,
  ]);

  const bySeverity: Record<string, number> = {};
  for (const row of severityRows) bySeverity[row.severity as string] = Number(row.count);

  const byType: Record<string, number> = {};
  for (const row of typeRows) byType[row.event_type as string] = Number(row.count);

  return {
    total: Number(totalResult[0].count),
    bySeverity,
    byType,
    recentBlocked: Number(blockedResult[0].count),
  };
}
