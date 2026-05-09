import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const sql = getDb();

    const results = (await Promise.all([
      // Sessions
      sql`SELECT COUNT(*) as c FROM sessions`,
      sql`SELECT COUNT(*) as c FROM sessions WHERE started_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as c FROM sessions WHERE started_at > NOW() - INTERVAL '1 day'`,
      sql`SELECT COUNT(*) as c FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NULL`,
      sql`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::numeric, 1) as avg
          FROM sessions WHERE ended_at IS NOT NULL AND started_at > NOW() - INTERVAL '7 days'`,

      // Skills
      sql`SELECT COUNT(*) as c FROM skill_usage`,
      sql`SELECT COUNT(*) as c FROM skill_usage WHERE invoked_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT ROUND(
            (COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
          ) as rate FROM skill_usage WHERE invoked_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT skill_id, COUNT(*) as count,
            ROUND(AVG(duration_ms)::numeric) as avg_ms,
            COUNT(*) FILTER (WHERE success = true) as successes
          FROM skill_usage WHERE invoked_at > NOW() - INTERVAL '7 days'
          GROUP BY skill_id ORDER BY count DESC LIMIT 10`,
      sql`SELECT skill_id, error_message, invoked_at
          FROM skill_usage WHERE success = false AND invoked_at > NOW() - INTERVAL '7 days'
          ORDER BY invoked_at DESC LIMIT 5`,

      // Hooks
      sql`SELECT COUNT(*) as c FROM hook_events`,
      sql`SELECT COUNT(*) as c FROM hook_events WHERE created_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT severity, COUNT(*) as count FROM hook_events
          WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY severity ORDER BY count DESC`,
      sql`SELECT action_taken, COUNT(*) as count FROM hook_events
          WHERE created_at > NOW() - INTERVAL '7 days' AND action_taken IS NOT NULL
          GROUP BY action_taken ORDER BY count DESC`,
      sql`SELECT hook_name, description, path_accessed, created_at
          FROM hook_events WHERE action_taken = 'blocked' AND created_at > NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC LIMIT 5`,

      // Adaptations (Tekiō)
      sql`SELECT COUNT(*) as c FROM adaptations`,
      sql`SELECT COUNT(*) as c FROM adaptations WHERE is_active = true`,
      sql`SELECT category, COUNT(*) as count, SUM(times_applied) as applied, SUM(times_prevented) as prevented
          FROM adaptations WHERE is_active = true GROUP BY category`,
      sql`SELECT LEFT(trigger_pattern, 80) as trigger, LEFT(adaptation_rule, 80) as rule,
            category, times_applied, times_prevented, severity
          FROM adaptations WHERE is_active = true ORDER BY times_applied DESC LIMIT 5`,
      sql`SELECT LEFT(trigger_pattern, 60) as trigger, category, severity, created_at
          FROM adaptations ORDER BY created_at DESC LIMIT 5`,

      // Memory health
      sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`,
      sql`SELECT COUNT(*) as c FROM memories WHERE created_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as c FROM memory_relations`,
      sql`SELECT ROUND(AVG(importance)::numeric, 1) as avg FROM memories WHERE is_archived = false`,

      // Daily trends
      sql`SELECT
            d.date::text as day,
            COALESCE(d.total_sessions, 0) as sessions,
            COALESCE(d.total_memories_created, 0) as memories,
            COALESCE(d.total_skills_invoked, 0) as skills,
            COALESCE(d.total_hook_events, 0) as hooks
          FROM daily_stats d
          WHERE d.date > NOW() - INTERVAL '7 days'
          ORDER BY d.date DESC`,

      // Today's sessions
      sql`SELECT task_context, started_at, ended_at, memories_created,
            EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60 as duration_min
          FROM sessions WHERE started_at > NOW() - INTERVAL '1 day'
          ORDER BY started_at DESC LIMIT 10`,

      // Skill performance (top by avg duration)
      sql`SELECT skill_id, ROUND(AVG(duration_ms)::numeric) as avg_ms, COUNT(*) as calls
          FROM skill_usage WHERE invoked_at > NOW() - INTERVAL '7 days' AND duration_ms IS NOT NULL
          GROUP BY skill_id HAVING COUNT(*) >= 2
          ORDER BY avg_ms DESC LIMIT 8`,
    ])) as Row[][];

    let i = 0;
    const row = (r: Row[]) => r[0] ?? {};
    // Session metrics
    const totalSessions = row(results[i++]);
    const weekSessions = row(results[i++]);
    const todaySessions = row(results[i++]);
    const ghostSessions = row(results[i++]);
    const avgSessionDuration = row(results[i++]);
    // Skill metrics
    const totalSkillInvocations = row(results[i++]);
    const weekSkillInvocations = row(results[i++]);
    const skillSuccessRate = row(results[i++]);
    const topSkills = results[i++];
    const recentFailedSkills = results[i++];
    // Hook metrics
    const totalHookEvents = row(results[i++]);
    const weekHookEvents = row(results[i++]);
    const hookSeverityBreakdown = results[i++];
    const hookActionBreakdown = results[i++];
    const recentBlockedHooks = results[i++];
    // Adaptation (Tekiō) metrics
    const totalAdaptations = row(results[i++]);
    const activeAdaptations = row(results[i++]);
    const adaptationsByCategory = results[i++];
    const topAppliedAdaptations = results[i++];
    const recentAdaptations = results[i++];
    // Memory health
    const activeMemories = row(results[i++]);
    const weekNewMemories = row(results[i++]);
    const totalRelations = row(results[i++]);
    const avgImportance = row(results[i++]);
    // Trends & lists
    const dailyTrends = results[i++];
    const todaySessionsList = results[i++];
    const skillPerformance = results[i++];

    return NextResponse.json({
      sessions: {
        total: Number(totalSessions.c),
        thisWeek: Number(weekSessions.c),
        today: Number(todaySessions.c),
        ghost: Number(ghostSessions.c),
        avgDurationMin: Number(avgSessionDuration.avg) || 0,
        todayList: todaySessionsList,
      },
      skills: {
        total: Number(totalSkillInvocations.c),
        thisWeek: Number(weekSkillInvocations.c),
        successRate: Number(skillSuccessRate.rate) || 100,
        topSkills,
        recentFailures: recentFailedSkills,
        performance: skillPerformance,
      },
      hooks: {
        total: Number(totalHookEvents.c),
        thisWeek: Number(weekHookEvents.c),
        severityBreakdown: hookSeverityBreakdown,
        actionBreakdown: hookActionBreakdown,
        recentBlocked: recentBlockedHooks,
      },
      tekio: {
        total: Number(totalAdaptations.c),
        active: Number(activeAdaptations.c),
        byCategory: adaptationsByCategory,
        topApplied: topAppliedAdaptations,
        recent: recentAdaptations,
      },
      memory: {
        active: Number(activeMemories.c),
        weekNew: Number(weekNewMemories.c),
        relations: Number(totalRelations.c),
        avgImportance: Number(avgImportance.avg) || 0,
      },
      dailyTrends,
    });
  } catch (e) {
    console.error("Ops API error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
