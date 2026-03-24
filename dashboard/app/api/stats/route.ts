import { NextResponse } from "next/server";
import { getSkillRegistry } from "@/lib/skills";
import { getDb } from "@/lib/db";

export async function GET() {
  const registry = getSkillRegistry();
  const skillCount = registry.skills.length;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      skills: skillCount,
      memories: null,
      plans: null,
      hookEvents: null,
      dbConnected: false,
    });
  }

  try {
    const sql = getDb();

    const [memRows, planRows, hookRows] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = false`,
      sql`SELECT COUNT(*) as count FROM plans`,
      sql`SELECT COUNT(*) as count FROM hook_events`,
    ]) as Record<string, unknown>[][];
    const memRow = memRows[0];
    const planRow = planRows[0];
    const hookRow = hookRows[0];

    return NextResponse.json({
      skills: skillCount,
      memories: Number(memRow.count),
      plans: Number(planRow.count),
      hookEvents: Number(hookRow.count),
      dbConnected: true,
    });
  } catch {
    return NextResponse.json({
      skills: skillCount,
      memories: null,
      plans: null,
      hookEvents: null,
      dbConnected: false,
    });
  }
}
