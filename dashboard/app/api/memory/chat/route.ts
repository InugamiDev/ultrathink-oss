import { NextRequest, NextResponse } from "next/server";
import { semanticSearchMemories } from "@/lib/memory";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      response: "Database not configured. Connect Neon to enable the memory brain.",
      memories: [],
    });
  }

  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const sql = getDb();
    const trimmed = message.trim();

    // Command: create a new memory
    if (trimmed.toLowerCase().startsWith("create:")) {
      const content = trimmed.slice(7).trim();
      if (!content) {
        return NextResponse.json({
          response: "Usage: create: <content> — provide memory content after the colon.",
          memories: [],
        });
      }

      const rows = await sql`
        INSERT INTO memories (content, category, importance, confidence, scope, search_enrichment)
        VALUES (${content}, 'insight', 5, 0.7, null, ${content})
        RETURNING *
      `;
      const memory = (rows as Record<string, unknown>[])[0];

      return NextResponse.json({
        response: `Created memory: "${content}" (id: ${memory.id})`,
        memories: [memory],
        created: true,
      });
    }

    // Command: tag a memory
    if (trimmed.toLowerCase().startsWith("tag ")) {
      const parts = trimmed.slice(4).trim().split(/\s+/);
      const id = parts[0];
      const tags = parts.slice(1).filter((t: string) => t.startsWith("#"));

      if (!id || tags.length === 0) {
        return NextResponse.json({
          response: "Usage: tag <id> #tag1 #tag2",
          memories: [],
        });
      }

      for (const tag of tags) {
        await sql`INSERT INTO memory_tags (memory_id, tag) VALUES (${id}, ${tag}) ON CONFLICT DO NOTHING`;
      }

      return NextResponse.json({
        response: `Tagged memory ${id} with: ${tags.join(", ")}`,
        memories: [],
      });
    }

    // Command: relate two memories
    if (trimmed.toLowerCase().startsWith("relate ")) {
      const match = trimmed.match(/relate\s+(\S+)\s*->\s*(\S+)/i);
      if (!match) {
        return NextResponse.json({
          response: "Usage: relate <id1> -> <id2>",
          memories: [],
        });
      }

      try {
        await sql`
          INSERT INTO memory_relations (source_id, target_id, relation_type, strength)
          VALUES (${match[1]}, ${match[2]}, 'related', 0.5)
          ON CONFLICT DO NOTHING
        `;
        return NextResponse.json({
          response: `Linked memories ${match[1]} -> ${match[2]}`,
          memories: [],
        });
      } catch {
        return NextResponse.json({
          response: "Could not create relation — memory_relations table may not exist yet.",
          memories: [],
        });
      }
    }

    // Default: semantic search using pg_trgm with ILIKE fallback
    const query = trimmed.toLowerCase().startsWith("search ") ? trimmed.slice(7).trim() : trimmed;

    const rows = await semanticSearchMemories({ query, limit: 10 });

    if (rows.length === 0) {
      return NextResponse.json({
        response: `No memories found matching "${query}". Try a different search or use create: to add a new memory.`,
        memories: [],
      });
    }

    return NextResponse.json({
      response: `Found ${rows.length} memor${rows.length === 1 ? "y" : "ies"} matching "${query}":`,
      memories: rows,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
