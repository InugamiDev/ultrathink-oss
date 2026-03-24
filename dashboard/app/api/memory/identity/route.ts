import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export interface IdentityNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IdentityEdge {
  source_id: string;
  target_id: string;
  label: string;
  weight: number;
  created_at: string;
}

const IDENTITY_CATEGORIES = [
  "identity",
  "preference",
  "style-preference",
  "tool-preference",
  "project-context",
  "workflow-pattern",
];

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  try {
    const sql = getDb();

    // Query identity-related nodes from the memories table
    const nodeRows = await sql`
      SELECT m.id, m.category as type, m.content as label,
             m.importance, m.confidence, m.scope, m.source,
             m.created_at, m.updated_at, m.access_count
      FROM memories m
      WHERE m.category = ANY(${IDENTITY_CATEGORIES})
        AND m.is_archived = false
      ORDER BY m.importance DESC, m.created_at ASC
    `;

    // Query edges between identity nodes
    const edgeRows = await sql`
      SELECT mr.source_id, mr.target_id, mr.relation_type as label,
             COALESCE(mr.strength, 0.5) as weight, mr.created_at
      FROM memory_relations mr
      JOIN memories ms ON ms.id = mr.source_id AND ms.is_archived = false
        AND ms.category = ANY(${IDENTITY_CATEGORIES})
      JOIN memories mt ON mt.id = mr.target_id AND mt.is_archived = false
        AND mt.category = ANY(${IDENTITY_CATEGORIES})
      ORDER BY mr.strength DESC
    `;

    const nodes: IdentityNode[] = (nodeRows as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      type: r.type as string,
      label: r.label as string,
      data: {
        importance: r.importance,
        confidence: r.confidence,
        scope: r.scope,
        source: r.source,
        access_count: r.access_count,
      },
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
    }));

    const edges: IdentityEdge[] = (edgeRows as Record<string, unknown>[]).map((r) => ({
      source_id: r.source_id as string,
      target_id: r.target_id as string,
      label: r.label as string,
      weight: parseFloat(String(r.weight)) || 0.5,
      created_at: r.created_at as string,
    }));

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.error("Identity API error:", err);
    return NextResponse.json({ nodes: [], edges: [] });
  }
}
