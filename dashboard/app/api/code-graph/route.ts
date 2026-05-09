import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { CodeGraphNode, CodeGraphEdge, CodeGraphStats } from "@/lib/types/code-graph";

export async function GET(req: Request) {
  try {
    const sql = getDb();
    const url = new URL(req.url);
    const project = url.searchParams.get("project");
    const kind = url.searchParams.get("kind");
    const edgeType = url.searchParams.get("edgeType");
    const exportedOnly = url.searchParams.get("exported") === "true";
    const filePrefix = url.searchParams.get("file");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 300, 1000);

    // Deduplicated project list — group sub-projects by root_path parent
    const allProjects = (await sql`
      SELECT id, name, root_path FROM ci_projects ORDER BY name
    `) as { id: string; name: string; root_path: string }[];

    // Group by top-level repo root (detect common parent paths)
    const projectMap = new Map<string, { id: string; name: string; rootPath: string }>();
    for (const p of allProjects) {
      // Use the project with the shortest root_path for each repo
      const existing = projectMap.get(p.name);
      if (!existing || p.root_path.length < existing.rootPath.length) {
        projectMap.set(p.name, { id: p.id, name: p.name, rootPath: p.root_path });
      }
    }

    // Deduplicate — only show projects with >5 symbols
    const projectCounts = (await sql`
      SELECT p.name, p.root_path, COUNT(DISTINCT s.id) as sym_count
      FROM ci_projects p
      JOIN ci_files f ON f.project_id = p.id
      JOIN ci_symbols s ON s.file_id = f.id
      GROUP BY p.id, p.name, p.root_path
      HAVING COUNT(DISTINCT s.id) > 5
      ORDER BY COUNT(DISTINCT s.id) DESC
    `) as { name: string; root_path: string; sym_count: string }[];

    // Deduplicate by root_path prefix — keep the shortest path per repo
    const seenRoots = new Map<string, { name: string; rootPath: string; count: number }>();
    for (const p of projectCounts) {
      let dominated = false;
      for (const [, existing] of seenRoots) {
        if (p.root_path.startsWith(existing.rootPath + "/")) {
          // This is a sub-path of an existing project, merge count
          existing.count += Number(p.sym_count);
          dominated = true;
          break;
        }
      }
      if (!dominated) {
        seenRoots.set(p.root_path, { name: p.name, rootPath: p.root_path, count: Number(p.sym_count) });
      }
    }

    const projects = [...seenRoots.values()]
      .sort((a, b) => b.count - a.count)
      .map((p) => ({ id: p.rootPath, name: `${p.name} (${p.count})` }));

    if (!project) {
      return NextResponse.json({
        projects,
        nodes: [],
        edges: [],
        stats: { totalNodes: 0, totalEdges: 0, avgConnections: 0, density: 0, kindCounts: {}, edgeTypeCounts: {} },
      });
    }

    // Find the root_path for the selected project
    // project param is the root_path (used as id)
    const projectRoot = project;

    // Fetch symbols across ALL sub-projects under this root
    const kindFilter = kind || null;
    const filePrefixFilter = filePrefix ? filePrefix + "%" : null;
    const rootPrefix = projectRoot + "%";

    const symbolRows = await sql`
      SELECT
        s.id, s.name, s.kind, s.signature, s.line_number AS "lineNumber",
        s.is_exported AS "isExported",
        f.relative_path AS "filePath"
      FROM ci_symbols s
      JOIN ci_files f ON s.file_id = f.id
      JOIN ci_projects p ON f.project_id = p.id
      WHERE p.root_path LIKE ${rootPrefix}
        AND (${kindFilter}::text IS NULL OR s.kind = ${kindFilter})
        AND (${!exportedOnly} OR s.is_exported = true)
        AND (${filePrefixFilter}::text IS NULL OR f.relative_path LIKE ${filePrefixFilter})
      ORDER BY s.is_exported DESC, s.name
      LIMIT ${limit}
    `;

    const rows = symbolRows as Record<string, unknown>[];
    const nodeIds = new Set(rows.map((r) => r.id as string));
    const nodes: CodeGraphNode[] = rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      kind: r.kind as CodeGraphNode["kind"],
      filePath: r.filePath as string,
      lineNumber: r.lineNumber as number,
      isExported: r.isExported as boolean,
      signature: (r.signature as string) || null,
    }));

    // Fetch edges between visible nodes
    const edgeTypeFilter = edgeType || null;
    let edges: CodeGraphEdge[] = [];

    if (nodeIds.size > 0) {
      const edgeRows = await sql`
        SELECT
          e.source_symbol_id AS source,
          e.target_symbol_id AS target,
          e.edge_type AS type
        FROM ci_edges e
        WHERE e.target_symbol_id IS NOT NULL
          AND (${edgeTypeFilter}::text IS NULL OR e.edge_type = ${edgeTypeFilter})
          AND e.source_symbol_id = ANY(${[...nodeIds]})
          AND e.target_symbol_id = ANY(${[...nodeIds]})
      `;

      edges = (edgeRows as Record<string, unknown>[]).map((r) => ({
        source: r.source as string,
        target: r.target as string,
        type: r.type as CodeGraphEdge["type"],
      }));
    }

    // Compute stats
    const kindCounts: Record<string, number> = {};
    const edgeTypeCounts: Record<string, number> = {};
    for (const n of nodes) {
      kindCounts[n.kind] = (kindCounts[n.kind] || 0) + 1;
    }
    for (const e of edges) {
      edgeTypeCounts[e.type] = (edgeTypeCounts[e.type] || 0) + 1;
    }

    const stats: CodeGraphStats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgConnections: nodes.length > 0 ? +((edges.length * 2) / nodes.length).toFixed(1) : 0,
      density: nodes.length > 1 ? +((edges.length / (nodes.length * (nodes.length - 1))) * 100).toFixed(2) : 0,
      kindCounts,
      edgeTypeCounts,
    };

    return NextResponse.json({
      projects,
      nodes,
      edges,
      stats,
    });
  } catch (err) {
    console.error("Code graph API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
