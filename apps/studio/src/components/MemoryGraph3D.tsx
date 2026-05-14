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
  selectedNodeId?: string | null;
  cameraStateKey?: string;
}

// 4-wing palette (also feeds bloom intensity).
const WING_COLORS: Record<string, string> = {
  agent: "#a78bfa", // violet — identity / rules / skills
  user: "#22C55E", // emerald — preferences / projects
  knowledge: "#60a5fa", // sky — decisions / patterns / insights
  experience: "#fb923c", // amber — sessions / outcomes / errors
};
const WING_GLOW: Record<string, number> = {
  agent: 0.9,
  user: 0.8,
  knowledge: 0.7,
  experience: 0.7,
};
const RELATION_COLOR_TOKENS: Record<string, { token: string; fallback: string }> = {
  "learned-from": { token: "--cyan", fallback: "rgb(34, 211, 238)" },
  supports: { token: "--green", fallback: "rgb(34, 197, 94)" },
  "applies-to": { token: "--accent", fallback: "rgb(167, 139, 250)" },
  contradicts: { token: "--red", fallback: "rgb(239, 68, 68)" },
  "caused-by": { token: "--amber", fallback: "rgb(251, 191, 36)" },
  supersedes: { token: "--amber", fallback: "rgb(251, 191, 36)" },
};

function cssColor(token: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function relationColor(type: string): string {
  const color = RELATION_COLOR_TOKENS[type];
  return color ? cssColor(color.token, color.fallback) : cssColor("--border-strong", "rgb(100, 116, 139)");
}

interface InternalNode extends RawNode {
  __color: string;
  __radius: number;
  __selected: boolean;
}
interface InternalLink extends Omit<RawEdge, "source" | "target"> {
  source: string | InternalNode;
  target: string | InternalNode;
  __color: string;
}

interface StoredCameraState {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
}

function readCameraState(key?: string): StoredCameraState | null {
  if (!key) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as StoredCameraState | null;
    const vectors = [parsed?.position, parsed?.lookAt];
    if (
      parsed &&
      vectors.every(
        (v) =>
          v &&
          typeof v.x === "number" &&
          typeof v.y === "number" &&
          typeof v.z === "number" &&
          Number.isFinite(v.x) &&
          Number.isFinite(v.y) &&
          Number.isFinite(v.z)
      )
    ) {
      return parsed;
    }
  } catch {
    /* ignore malformed camera state */
  }
  return null;
}

function saveCameraState(
  key: string | undefined,
  fg: ForceGraphMethods<InternalNode, InternalLink> | undefined
): void {
  if (!key || !fg) return;
  try {
    const position = fg.camera().position;
    const controls = fg.controls() as { target?: THREE.Vector3 };
    const lookAt = controls.target ?? new THREE.Vector3(0, 0, 0);
    localStorage.setItem(
      key,
      JSON.stringify({
        position: { x: position.x, y: position.y, z: position.z },
        lookAt: { x: lookAt.x, y: lookAt.y, z: lookAt.z },
      })
    );
  } catch {
    /* ignore camera persistence failures */
  }
}

export function MemoryGraph3D({ data, width, height, onNodeClick, selectedNodeId, cameraStateKey }: Graph3DProps) {
  const fgRef = useRef<ForceGraphMethods<InternalNode, InternalLink> | undefined>(undefined);
  const [hovered, setHovered] = useState<RawNode | null>(null);
  const fallbackNodeColor = cssColor("--text-muted", "rgb(148, 163, 184)");
  const selectedRingColor = cssColor("--text", "rgb(248, 250, 252)");

  // Decorate nodes/links once — color + radius derived from intrinsic fields.
  const graph = useMemo<{ nodes: InternalNode[]; links: InternalLink[] }>(() => {
    const nodes: InternalNode[] = data.nodes.map((n) => ({
      ...n,
      __color: WING_COLORS[n.wing ?? "knowledge"] ?? fallbackNodeColor,
      __selected: n.id === selectedNodeId,
      __radius:
        1.6 +
        Math.min(n.importance, 10) * 0.55 +
        Math.min(Math.log1p(n.accessCount), 5) * 0.4 +
        (n.id === selectedNodeId ? 1.2 : 0),
    }));
    const links: InternalLink[] = data.edges.map((e) => ({
      ...e,
      __color: relationColor(e.type),
    }));
    return { nodes, links };
  }, [data, fallbackNodeColor, selectedNodeId]);

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
    const saved = readCameraState(cameraStateKey);
    // Pull camera back so the wider graph still fits when no persisted camera exists.
    if (saved) fg.cameraPosition(saved.position, saved.lookAt, 0);
    else fg.cameraPosition({ x: 0, y: 0, z: 540 });

    const id = window.setInterval(() => saveCameraState(cameraStateKey, fgRef.current), 1000);
    return () => window.clearInterval(id);
  }, [cameraStateKey]);

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
    if (node.__selected) {
      const ring = new THREE.Mesh(
        new THREE.SphereGeometry(node.__radius * 1.22, 24, 24),
        new THREE.MeshBasicMaterial({
          color: selectedRingColor,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
        })
      );
      group.add(ring);
    }
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
        {Object.keys(RELATION_COLOR_TOKENS).map((type) => {
          const color = relationColor(type);
          return (
            <div key={type} style={legendRowStyle}>
              <span style={{ width: "14px", height: "1.5px", background: color }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>{type}</span>
            </div>
          );
        })}
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
  background: "linear-gradient(135deg, var(--bg) 0%, var(--bg-elevated) 100%)",
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
