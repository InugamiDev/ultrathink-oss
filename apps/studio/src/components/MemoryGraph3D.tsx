// intent: 3D force-directed memory graph — replaces flat ReactFlow with three.js
// status: done — react-force-graph-3d + bloom + animated edge particles
// next: VR mode, edge bundling for dense clusters, on-node MOC summaries
// confidence: high

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

interface RawNode {
  id: string;
  title: string;
  category: string;
  wing: string | null;
  hall: string | null;
  importance: number;
  accessCount: number;
}
interface RawEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

export interface GraphData {
  nodes: RawNode[];
  edges: RawEdge[];
}

interface Graph3DProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: RawNode) => void;
}

// 4-wing palette (also feeds bloom intensity).
const WING_COLORS: Record<string, string> = {
  agent: "#a78bfa", // violet — identity / rules / skills
  user: "#34d399", // emerald — preferences / projects
  knowledge: "#60a5fa", // sky — decisions / patterns / insights
  experience: "#fb923c", // amber — sessions / outcomes / errors
};
const WING_GLOW: Record<string, number> = {
  agent: 0.9,
  user: 0.8,
  knowledge: 0.7,
  experience: 0.7,
};
const RELATION_COLORS: Record<string, string> = {
  "learned-from": "#22d3ee",
  supports: "#34d399",
  "applies-to": "#a78bfa",
  contradicts: "#f87171",
  "caused-by": "#fb923c",
  supersedes: "#fbbf24",
};

interface InternalNode extends RawNode {
  __color: string;
  __radius: number;
}
interface InternalLink extends Omit<RawEdge, "source" | "target"> {
  source: string | InternalNode;
  target: string | InternalNode;
  __color: string;
}

export function MemoryGraph3D({ data, width, height, onNodeClick }: Graph3DProps) {
  const fgRef = useRef<ForceGraphMethods<InternalNode, InternalLink> | undefined>(undefined);
  const [hovered, setHovered] = useState<RawNode | null>(null);

  // Decorate nodes/links once — color + radius derived from intrinsic fields.
  const graph = useMemo<{ nodes: InternalNode[]; links: InternalLink[] }>(() => {
    const nodes: InternalNode[] = data.nodes.map((n) => ({
      ...n,
      __color: WING_COLORS[n.wing ?? "knowledge"] ?? "#94a3b8",
      __radius: 1.6 + Math.min(n.importance, 10) * 0.55 + Math.min(Math.log1p(n.accessCount), 5) * 0.4,
    }));
    const links: InternalLink[] = data.edges.map((e) => ({
      ...e,
      __color: RELATION_COLORS[e.type] ?? "#64748b",
    }));
    return { nodes, links };
  }, [data]);

  // Wire the bloom postprocessing pass + tune the d3 force layout once on mount.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.6, 0.55, 0.05);
    fg.postProcessingComposer().addPass(bloom);
    // Push nodes farther apart — default charge (~-30) clusters orbs too close.
    // -260 + linkDistance 110 gives the graph room to breathe at our typical
    // 60-node density and reads nicely on a presentation screen.
    type ForceLike = { strength?: (s: number) => unknown; distance?: (d: number) => unknown };
    const fgWithForce = fg as unknown as { d3Force: (name: string) => ForceLike | undefined };
    const charge = fgWithForce.d3Force?.("charge");
    if (charge?.strength) charge.strength(-260);
    const link = fgWithForce.d3Force?.("link");
    if (link?.distance) link.distance(110);
    // Pull camera back so the wider graph still fits.
    fg.cameraPosition({ x: 0, y: 0, z: 540 });
  }, []);

  // Custom node geometry: emissive sphere with optional glow halo for the
  // most-important memories. Falls back to a sphere for cheap nodes.
  const nodeThreeObject = (raw: object): THREE.Object3D => {
    const node = raw as InternalNode;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: node.__color,
      transparent: true,
      opacity: 0.95,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(node.__radius, 24, 24), mat);
    group.add(sphere);
    // Halo for L0 / L1 memories (importance ≥ 8) — drives the "flashy" look.
    if (node.importance >= 8) {
      const haloMat = new THREE.MeshBasicMaterial({
        color: node.__color,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
      });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(node.__radius * 1.9, 24, 24), haloMat);
      group.add(halo);
    }
    return group;
  };

  return (
    <div style={wrapStyle}>
      <ForceGraph3D
        ref={fgRef as React.MutableRefObject<ForceGraphMethods<InternalNode, InternalLink>>}
        graphData={graph}
        width={width}
        height={height}
        backgroundColor="rgba(8, 10, 14, 1)"
        nodeAutoColorBy="wing"
        nodeRelSize={4}
        nodeOpacity={0.95}
        nodeResolution={20}
        nodeThreeObject={nodeThreeObject as never}
        nodeLabel=""
        linkColor={(l) => (l as InternalLink).__color}
        linkOpacity={0.45}
        linkWidth={(l) => 0.5 + ((l as InternalLink).strength ?? 0.5) * 1.2}
        linkDirectionalParticles={(l) => Math.max(1, Math.round(((l as InternalLink).strength ?? 0.5) * 5))}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleSpeed={0.0035}
        linkDirectionalParticleColor={(l) => (l as InternalLink).__color}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
        cooldownTicks={140}
        warmupTicks={20}
        enableNodeDrag={true}
        onNodeClick={(n) => onNodeClick?.(n as RawNode)}
        onNodeHover={(n) => setHovered((n as RawNode | null) ?? null)}
      />

      {/* Wing legend */}
      <div style={legendStyle}>
        <div style={legendTitleStyle}>WINGS</div>
        {Object.entries(WING_COLORS).map(([wing, color]) => (
          <div key={wing} style={legendRowStyle}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 ${8 * WING_GLOW[wing]}px ${color}`,
              }}
            />
            <span style={{ textTransform: "capitalize" }}>{wing}</span>
          </div>
        ))}
        <div style={{ ...legendTitleStyle, marginTop: "10px" }}>RELATIONS</div>
        {Object.entries(RELATION_COLORS).map(([type, color]) => (
          <div key={type} style={legendRowStyle}>
            <span style={{ width: "14px", height: "1.5px", background: color }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Hovered-node corner readout */}
      {hovered && (
        <div style={hoverInfoStyle}>
          <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--text)" }}>{hovered.title}</div>
          <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
            wing <strong>{hovered.wing ?? "—"}</strong> · hall <strong>{hovered.hall ?? "—"}</strong> ·{" "}
            <strong>{hovered.category}</strong>
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
            importance {hovered.importance} · recalled {hovered.accessCount}×
          </div>
        </div>
      )}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  background: "linear-gradient(135deg, #08090e 0%, #11141c 100%)",
};
const legendStyle: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  left: "12px",
  background: "rgba(12, 13, 16, 0.65)",
  backdropFilter: "blur(8px)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "11px",
  color: "var(--text-muted)",
  pointerEvents: "none",
  zIndex: 5,
};
const legendTitleStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--text-dim)",
  marginBottom: "6px",
};
const legendRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "2px 0",
};
const hoverInfoStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "80px",
  left: "12px",
  background: "rgba(12, 13, 16, 0.82)",
  backdropFilter: "blur(8px)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  maxWidth: "min(560px, 60%)",
  fontSize: "12px",
  color: "var(--text)",
  pointerEvents: "none",
  zIndex: 5,
  boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
};
