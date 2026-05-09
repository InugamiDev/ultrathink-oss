import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const sql = getDb();
    const url = new URL(req.url);
    const symbolId = url.searchParams.get("symbolId");
    const maxHops = Math.min(Number(url.searchParams.get("maxHops")) || 3, 5);

    if (!symbolId) {
      return NextResponse.json({ error: "symbolId required" }, { status: 400 });
    }

    const rows = await sql`
      WITH RECURSIVE impact AS (
        SELECT
          e.source_symbol_id AS symbol_id,
          e.edge_type,
          1 AS hop
        FROM ci_edges e
        WHERE e.target_symbol_id = ${symbolId}

        UNION ALL

        SELECT
          e.source_symbol_id,
          e.edge_type,
          i.hop + 1
        FROM ci_edges e
        JOIN impact i ON e.target_symbol_id = i.symbol_id
        WHERE i.hop < ${maxHops}
      )
      SELECT DISTINCT ON (s.id)
        i.hop,
        s.id AS "symbolId",
        s.name AS "symbolName",
        s.kind,
        f.relative_path AS "filePath",
        i.edge_type AS "edgeType"
      FROM impact i
      JOIN ci_symbols s ON i.symbol_id = s.id
      JOIN ci_files f ON s.file_id = f.id
      ORDER BY s.id, i.hop
    `;

    return NextResponse.json({ impact: rows });
  } catch (err) {
    console.error("Impact API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
