import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const board = searchParams.get("board") ?? "main";
  const status = searchParams.get("status");

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const sql = getDb();

    const rows = status
      ? await sql`SELECT * FROM tasks WHERE board = ${board} AND status = ${status} ORDER BY position`
      : await sql`SELECT * FROM tasks WHERE board = ${board} ORDER BY status, position`;

    return NextResponse.json({ tasks: rows });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { title, description, priority, board, plan_id: planId } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const sql = getDb();

    const boardName = board ?? "main";
    const maxPosRows = (await sql`
      SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM tasks WHERE board = ${boardName}
    `) as Record<string, unknown>[];
    const nextPos = Number(maxPosRows[0]?.next_pos ?? 1);

    const taskRows = (await sql`
      INSERT INTO tasks (title, description, priority, board, position, plan_id)
      VALUES (${title}, ${description ?? null}, ${priority ?? 5}, ${boardName}, ${nextPos}, ${planId ?? null})
      RETURNING *
    `) as Record<string, unknown>[];
    const task = taskRows[0];

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, status, position } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const sql = getDb();

    const taskRows = (await sql`
      UPDATE tasks SET
        status = COALESCE(${status ?? null}, status),
        position = COALESCE(${position ?? null}, position),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as Record<string, unknown>[];
    const task = taskRows[0];

    return NextResponse.json({ task });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
