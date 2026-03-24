import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const sql = getDb();

    type Row = Record<string, unknown>;
    const r = await Promise.all([
      sql`SELECT id, task_context, started_at, ended_at, memories_created,
               EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 as duration_min,
               LEFT(summary, 120) as summary_preview
        FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL
        ORDER BY started_at DESC`,
      sql`SELECT DATE(started_at) as day, COUNT(*) as session_count,
               SUM(memories_created) as memories_created,
               ROUND(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)) as total_minutes
        FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL
        GROUP BY DATE(started_at) ORDER BY day DESC`,
      sql`SELECT COUNT(*) as count FROM sessions`,
      sql`SELECT COUNT(*) as count FROM sessions WHERE started_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as count FROM sessions WHERE started_at > NOW() - INTERVAL '1 day'`,
      sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = false`,
      sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true`,
      sql`SELECT COUNT(*) as c FROM memory_relations`,
      sql`SELECT ROUND(AVG(importance)::numeric, 1) as avg FROM memories WHERE is_archived = false`,
      sql`SELECT category, COUNT(*) as count FROM memories WHERE is_archived = false GROUP BY category ORDER BY count DESC`,
      sql`SELECT COUNT(*) as c FROM memories WHERE created_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as c FROM memories WHERE is_archived = true AND updated_at > NOW() - INTERVAL '7 days'`,
      sql`SELECT DATE(created_at) as day, COUNT(*) as created FROM memories WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day DESC`,
      sql`SELECT LEFT(content, 60) as preview, category, access_count, importance FROM memories WHERE is_archived = false AND accessed_at > NOW() - INTERVAL '7 days' ORDER BY access_count DESC LIMIT 5`,
      sql`SELECT task_context, started_at, ended_at, memories_created,
               EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60 as duration_min
        FROM sessions WHERE started_at > NOW() - INTERVAL '1 day' AND ended_at IS NOT NULL
        ORDER BY started_at DESC LIMIT 10`,
      sql`SELECT COUNT(*) as c FROM sessions
        WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NULL`,
      sql`SELECT task_context as project, COUNT(*) as sessions,
             SUM(memories_created) as memories,
             ROUND(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)) as minutes
      FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL
      GROUP BY task_context ORDER BY sessions DESC LIMIT 10`,
    ]) as Row[][];

    let i = 0;
    const row = (rows: Row[]) => rows[0] ?? {};
    const sessions = r[i++];
    const daily = r[i++];
    const allTime = row(r[i++]);
    const thisWeek = row(r[i++]);
    const today = row(r[i++]);
    const active = row(r[i++]);
    const archived = row(r[i++]);
    const relations = row(r[i++]);
    const avgImp = row(r[i++]);
    const categories = r[i++];
    const weekNew = row(r[i++]);
    const weekArchived = row(r[i++]);
    const dailyMemories = r[i++];
    const topAccessed = r[i++];
    const recentSessions = r[i++];
    const ghostCount = row(r[i++]);
    const projectBreakdown = r[i++];

    return NextResponse.json({
      sessions: {
        list: sessions,
        daily,
        totals: {
          allTime: Number(allTime.count),
          thisWeek: Number(thisWeek.count),
          today: Number(today.count),
          ghostSessions: Number(ghostCount.c),
        },
        recentSessions,
        projectBreakdown,
      },
      memory: {
        active: Number(active.c),
        archived: Number(archived.c),
        relations: Number(relations.c),
        avgImportance: Number(avgImp.avg) || 0,
        categories,
        weekNew: Number(weekNew.c),
        weekArchived: Number(weekArchived.c),
        dailyMemories,
        topAccessed,
      },
    });
  } catch (e) {
    console.error("Usage API error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
