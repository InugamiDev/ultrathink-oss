import { NextRequest, NextResponse } from "next/server";
import { getMemories, semanticSearchMemories } from "@/lib/memory";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const scope = searchParams.get("scope") ?? undefined;
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 500);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    let memories;
    if (query) {
      memories = await semanticSearchMemories({ query, limit });
    } else {
      memories = await getMemories({ category, scope, limit });
    }

    return NextResponse.json({ memories });
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
    const { content, category, importance, confidence, scope, tags } = body;

    if (!content || !category) {
      return NextResponse.json({ error: "content and category are required" }, { status: 400 });
    }

    const sql = getDb();

    // Generate search enrichment keywords for better recall
    const enrichParts = [content, category, ...(tags ?? [])].filter(Boolean);
    const searchEnrichment = enrichParts.length > 0 ? enrichParts.join(" ") : null;

    const memoryRows = (await sql`
      INSERT INTO memories (content, category, importance, confidence, scope, search_enrichment)
      VALUES (${content}, ${category}, ${importance ?? 5}, ${confidence ?? 0.8}, ${scope ?? null}, ${searchEnrichment})
      RETURNING *
    `) as Record<string, unknown>[];
    const memory = memoryRows[0];

    if (tags?.length) {
      const memoryId = memory.id as string;
      await sql`
        INSERT INTO memory_tags (memory_id, tag)
        SELECT ${memoryId}, unnest(${tags}::text[])
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({ memory }, { status: 201 });
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
    const { id, content, category, importance, confidence, scope } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const sql = getDb();
    const setClauses: string[] = [];
    const values: Record<string, unknown> = {};

    if (content !== undefined) values.content = content;
    if (category !== undefined) values.category = category;
    if (importance !== undefined) values.importance = importance;
    if (confidence !== undefined) values.confidence = confidence;
    if (scope !== undefined) values.scope = scope;

    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const rows = (await sql`
      UPDATE memories SET
        content = COALESCE(${content ?? null}, content),
        category = COALESCE(${category ?? null}, category),
        importance = COALESCE(${importance ?? null}, importance),
        confidence = COALESCE(${confidence ?? null}, confidence),
        scope = COALESCE(${scope ?? null}, scope),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({ memory: rows[0] });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const sql = getDb();

    // Delete relations first
    await sql`DELETE FROM memory_relations WHERE source_id = ${id} OR target_id = ${id}`;
    await sql`DELETE FROM memory_tags WHERE memory_id = ${id}`;
    const rows = (await sql`DELETE FROM memories WHERE id = ${id} RETURNING id`) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: id });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
