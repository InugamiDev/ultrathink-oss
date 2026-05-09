#!/usr/bin/env npx tsx
/**
 * UltraThink Usage Report — queries all stats for /usage command
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

// --- 1. Sessions (only closed sessions for time calculations) ---
const sessions = await sql`
  SELECT id, task_context, started_at, ended_at, memories_created,
         CASE WHEN ended_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
           ELSE NULL
         END as duration_min,
         LEFT(summary, 120) as summary_preview
  FROM sessions
  WHERE started_at > NOW() - INTERVAL '7 days'
  ORDER BY started_at DESC
`;

const daily = await sql`
  SELECT DATE(started_at) as day,
         COUNT(*) FILTER (WHERE ended_at IS NOT NULL) as session_count,
         SUM(memories_created) as memories_created,
         ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60) FILTER (WHERE ended_at IS NOT NULL), 0)) as total_minutes
  FROM sessions
  WHERE started_at > NOW() - INTERVAL '7 days'
  GROUP BY DATE(started_at)
  ORDER BY day DESC
`;

const [allTime] = (await sql`SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NOT NULL`) as any[];
const [thisWeek] =
  (await sql`SELECT COUNT(*) as count FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL`) as any[];
const [today] =
  (await sql`SELECT COUNT(*) as count FROM sessions WHERE started_at > NOW() - INTERVAL '1 day' AND ended_at IS NOT NULL`) as any[];
const [ghostCount] = (await sql`SELECT COUNT(*) as count FROM sessions WHERE ended_at IS NULL`) as any[];

// --- 2. Memory ---
const [active] = (await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`) as any[];
const [archived] = (await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true`) as any[];
const [relations] = (await sql`SELECT COUNT(*) as c FROM memory_relations`) as any[];
const [avgImp] =
  (await sql`SELECT ROUND(AVG(importance)::numeric, 1) as avg FROM memories WHERE is_archived = false`) as any[];

const categories = await sql`
  SELECT category, COUNT(*) as count
  FROM memories WHERE is_archived = false
  GROUP BY category ORDER BY count DESC
`;

const [weekNew] = (await sql`SELECT COUNT(*) as c FROM memories WHERE created_at > NOW() - INTERVAL '7 days'`) as any[];
const [weekArchived] =
  (await sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true AND updated_at > NOW() - INTERVAL '7 days'`) as any[];

const dailyMemories = await sql`
  SELECT DATE(created_at) as day, COUNT(*) as created
  FROM memories
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY day DESC
`;

const topAccessed = await sql`
  SELECT LEFT(content, 60) as preview, category, access_count, importance
  FROM memories
  WHERE is_archived = false AND accessed_at > NOW() - INTERVAL '7 days'
  ORDER BY access_count DESC
  LIMIT 5
`;

// --- 3. Skills + Tools ---
let skillUsage: any[] = [];
try {
  skillUsage = (await sql`
    SELECT skill_name, COUNT(*) as count, MAX(used_at) as last_used
    FROM skill_usage
    WHERE used_at > NOW() - INTERVAL '7 days'
    GROUP BY skill_name ORDER BY count DESC LIMIT 15
  `) as any[];
} catch {
  /* ignore */
}

let toolUsage: any[] = [];
try {
  toolUsage = (await sql`
    SELECT tool_name, COUNT(*) as count
    FROM command_usage
    WHERE used_at > NOW() - INTERVAL '7 days'
    GROUP BY tool_name ORDER BY count DESC LIMIT 10
  `) as any[];
} catch {
  /* ignore */
}

let dailyStats: any[] = [];
try {
  dailyStats = (await sql`
    SELECT date, total_prompts, total_tool_calls, skills_activated, memories_created
    FROM daily_stats
    WHERE date > NOW() - INTERVAL '7 days'
    ORDER BY date DESC
  `) as any[];
} catch {
  /* ignore */
}

// --- Output ---
console.log(
  JSON.stringify(
    {
      sessions: {
        list: sessions,
        daily,
        totals: { allTime: allTime.count, thisWeek: thisWeek.count, today: today.count, ghosts: ghostCount.count },
      },
      memory: {
        active: active.c,
        archived: archived.c,
        relations: relations.c,
        avgImportance: avgImp.avg,
        categories,
        weekNew: weekNew.c,
        weekArchived: weekArchived.c,
        dailyMemories,
        topAccessed,
      },
      skills: { skillUsage, toolUsage, dailyStats },
    },
    null,
    2
  )
);

process.exit(0);
