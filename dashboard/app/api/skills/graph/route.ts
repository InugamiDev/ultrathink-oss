import { NextResponse } from "next/server";
import { getSkillRegistry } from "@/lib/skills";

interface GraphNode {
  id: string;
  label: string;
  layer: string;
  category: string;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

export async function GET() {
  try {
    const registry = getSkillRegistry();
    const skills = registry.skills ?? [];

    const nameSet = new Set(skills.map((s: { name: string }) => s.name));

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const skill of skills) {
      const linksTo = (skill.linksTo || []).filter((n: string) => nameSet.has(n));
      const linkedFrom = (skill.linkedFrom || []).filter((n: string) => nameSet.has(n));

      nodes.push({
        id: skill.name,
        label: skill.name,
        layer: skill.layer,
        category: skill.category,
        connections: linksTo.length + linkedFrom.length,
      });

      for (const target of linksTo) {
        edges.push({ source: skill.name, target });
      }
    }

    // Compute clusters by category
    const clusters: Record<string, string[]> = {};
    for (const skill of skills) {
      if (!clusters[skill.category]) clusters[skill.category] = [];
      clusters[skill.category].push(skill.name);
    }

    return NextResponse.json({
      nodes,
      edges,
      clusters,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        avgConnections: nodes.length > 0 ? +((edges.length * 2) / nodes.length).toFixed(1) : 0,
        density: nodes.length > 1 ? +((edges.length / (nodes.length * (nodes.length - 1))) * 100).toFixed(2) : 0,
        layers: registry.layers ?? {},
      },
    });
  } catch (err) {
    console.error("Graph API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
