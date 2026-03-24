import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const severity = searchParams.get("severity");
  const eventType = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 500);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT * FROM hook_events
      WHERE (${eventType}::text IS NULL OR event_type = ${eventType})
        AND (${severity}::text IS NULL OR severity = ${severity})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ events: rows });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
