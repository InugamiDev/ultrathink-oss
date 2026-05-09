// intent: Decisions API — CRUD for behavioral constraint rules
// status: done
// confidence: high

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope") ?? undefined;
  const active = searchParams.get("active"); // "true" | "false" | null (all)

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const sql = getDb();

    let rows;
    if (scope && active !== null) {
      const isActive = active === "true";
      rows = await sql`
        SELECT * FROM decisions
        WHERE (scope = 'global' OR scope = ${scope})
          AND is_active = ${isActive}
        ORDER BY priority DESC, created_at
      `;
    } else if (scope) {
      rows = await sql`
        SELECT * FROM decisions
        WHERE (scope = 'global' OR scope = ${scope})
        ORDER BY priority DESC, created_at
      `;
    } else if (active !== null) {
      const isActive = active === "true";
      rows = await sql`
        SELECT * FROM decisions
        WHERE is_active = ${isActive}
        ORDER BY priority DESC, created_at
      `;
    } else {
      rows = await sql`
        SELECT * FROM decisions
        ORDER BY priority DESC, created_at
      `;
    }

    return NextResponse.json({ decisions: rows });
  } catch (err) {
    console.error("Decisions API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { rule, scope, priority, source, tags } = body;

    if (!rule || !rule.trim()) {
      return NextResponse.json({ error: "rule is required" }, { status: 400 });
    }

    const sql = getDb();
    const id = `dec_${crypto.randomUUID().slice(0, 8)}`;
    const cleanTags = (tags ?? []).map((t: string) => t.trim().toLowerCase()).filter(Boolean);

    const rows = (await sql`
      INSERT INTO decisions (id, rule, priority, scope, source, tags)
      VALUES (
        ${id},
        ${rule.trim()},
        ${priority ?? 5},
        ${scope ?? "global"},
        ${source ?? "user"},
        ${cleanTags}
      )
      RETURNING *
    `) as Record<string, unknown>[];

    return NextResponse.json({ decision: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Decisions API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, rule, priority, scope, is_active, tags } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const sql = getDb();

    const rows = (await sql`
      UPDATE decisions SET
        rule = COALESCE(${rule ?? null}, rule),
        priority = COALESCE(${priority ?? null}, priority),
        scope = COALESCE(${scope ?? null}, scope),
        is_active = COALESCE(${is_active ?? null}, is_active),
        tags = COALESCE(${tags ?? null}, tags),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    return NextResponse.json({ decision: rows[0] });
  } catch (err) {
    console.error("Decisions API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const sql = getDb();

    // Soft deactivate — don't hard delete
    const rows = (await sql`
      UPDATE decisions SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    return NextResponse.json({ decision: rows[0] });
  } catch (err) {
    console.error("Decisions API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
