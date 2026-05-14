// intent: project-scoped 3D knowledge-graph view of UltraThink memory
// status: done — uses MemoryGraph3D (three.js + react-force-graph-3d) with bloom
// next: graph search highlights matching nodes; per-node MOC summary panel
// confidence: high

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MemoryGraph3D, type GraphData } from "./MemoryGraph3D.js";
import { usePersistedState } from "../lib/persistedState.js";

interface MemoryDetail {
  id: string;
  title: string | null;
  content: string;
  category: string;
  wing: string | null;
  hall: string | null;
  room: string | null;
  importance: number | null;
  confidence: number | null;
  access_count: number | null;
  source: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
  accessed_at: string;
}

interface MemoryGraphPanelProps {
  /** Active project's friendly name (e.g. "acomo"). Used as a scope filter. */
  projectName?: string;
  /** Active project's absolute dir — only used as a fallback scope token. */
  projectDir?: string;
  onNewMemory?: () => void;
}

type ScopeMode = "project" | "all";
type WingFilter = "all" | "agent" | "user" | "knowledge" | "experience";
type GraphMode = "3d" | "2d";
type MemoryGraphNode = GraphData["nodes"][number];

export function MemoryGraphPanel({ projectName, projectDir, onNewMemory }: MemoryGraphPanelProps = {}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemoryDetail | null>(null);
  const [selectedId, setSelectedId] = usePersistedState<string | null>("studio:memory:selected-node-id", null);
  const [filter, setFilter] = useState<string>("");
  const [wingFilter, setWingFilter] = usePersistedState<WingFilter>("studio:memory:hovered-wing-filter", "all");
  const [graphMode, setGraphMode] = usePersistedState<GraphMode>("studio:memory:graph-mode", "3d");
  // Caps visible nodes — past ~120 even three.js gets cluttered for legibility.
  // The slider on the control bar lets the user crank to 500 if they want.
  const [maxNodes, setMaxNodes] = useState<number>(80);
  // "project" → only memories scoped to this project; "all" → entire graph.
  const [scopeMode, setScopeMode] = usePersistedState<ScopeMode>(
    "studio:memory:scope-mode",
    projectName ? "project" : "all"
  );
  const [seeding, setSeeding] = useState<boolean>(false);
  // Track wrap dimensions so the canvas resizes with the panel.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 500 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(200, Math.floor(width)), h: Math.max(200, Math.floor(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveScopeMode: ScopeMode = projectName ? scopeMode : "all";
  const scope =
    effectiveScopeMode === "project" ? (projectName ?? (projectDir ? projectDir.split("/").pop() : undefined)) : undefined;

  const graphQuery = useQuery({
    queryKey: ["memoryGraph", scope ?? "all"],
    queryFn: async () => {
      const result = await invoke<GraphData | null>("query_memory_graph", { limit: 500, scope });
      return result ?? { nodes: [], edges: [] };
    },
    placeholderData: (previous) => previous,
  });

  const data = graphQuery.data ?? { nodes: [], edges: [] };
  const loading = graphQuery.isLoading;
  const queryError = graphQuery.error ? String(graphQuery.error) : null;
  const displayError = error ?? queryError;

  const load = useCallback(async () => {
    setError(null);
    await graphQuery.refetch();
  }, [graphQuery]);

  useEffect(() => {
    const onCreated = () => {
      void queryClient.invalidateQueries({ queryKey: ["memoryGraph"] });
      void load();
    };
    window.addEventListener("studio:memory-created", onCreated);
    return () => window.removeEventListener("studio:memory-created", onCreated);
  }, [load, queryClient]);

  // Search-filter + cap-by-importance-and-recall ranking. The 3D view's
  // force layout handles physical positioning — we just decide who shows.
  const visible = useMemo<GraphData>(() => {
    const f = filter.toLowerCase();
    const wingNodes = wingFilter === "all" ? data.nodes : data.nodes.filter((n) => n.wing === wingFilter);
    const baseFiltered = f
      ? wingNodes.filter(
          (n) =>
            n.title.toLowerCase().includes(f) ||
            n.category.toLowerCase().includes(f) ||
            (n.wing ?? "").toLowerCase().includes(f) ||
            (n.hall ?? "").toLowerCase().includes(f)
        )
      : wingNodes;
    const ranked = [...baseFiltered].sort((a, b) => {
      const aS = (a.importance ?? 5) * 10 + (a.accessCount ?? 0);
      const bS = (b.importance ?? 5) * 10 + (b.accessCount ?? 0);
      return bS - aS;
    });
    const filteredNodes = ranked.slice(0, maxNodes);
    const idSet = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, filter, maxNodes, wingFilter]);

  const onSelectNode = useCallback((node: { id: string }) => {
    setSelectedId(node.id);
  }, [setSelectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    void (async () => {
    try {
        const detail = await invoke<MemoryDetail | null>("query_memory_node", { id: selectedId });
        if (!cancelled) setSelected(detail ?? null);
    } catch (err) {
        if (!cancelled) setError(String(err));
    }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const showProjectEmpty = !loading && !displayError && data.nodes.length === 0 && effectiveScopeMode === "project";

  return (
    <div style={containerStyle}>
      <div style={controlBarStyle}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em" }}>KNOWLEDGE GRAPH</span>
        <div style={scopeToggleStyle} role="tablist" aria-label="Graph view mode">
          <button
            role="tab"
            aria-selected={graphMode === "3d"}
            onClick={() => setGraphMode("3d")}
            style={{ ...scopePillStyle, ...(graphMode === "3d" ? scopePillActiveStyle : null) }}
            title="Spatial 3D memory graph"
          >
            3D
          </button>
          <button
            role="tab"
            aria-selected={graphMode === "2d"}
            onClick={() => setGraphMode("2d")}
            style={{ ...scopePillStyle, ...(graphMode === "2d" ? scopePillActiveStyle : null) }}
            title="Flat 2D memory graph"
          >
            2D
          </button>
        </div>
        {projectName && (
          <div style={scopeToggleStyle} role="tablist" aria-label="Memory scope">
            <button
              role="tab"
              aria-selected={effectiveScopeMode === "project"}
              onClick={() => setScopeMode("project")}
              style={{ ...scopePillStyle, ...(effectiveScopeMode === "project" ? scopePillActiveStyle : null) }}
              title={`Only show memories scoped to "${projectName}"`}
            >
              📁 {projectName}
            </button>
            <button
              role="tab"
              aria-selected={effectiveScopeMode === "all"}
              onClick={() => setScopeMode("all")}
              style={{ ...scopePillStyle, ...(effectiveScopeMode === "all" ? scopePillActiveStyle : null) }}
              title="Show every memory in the graph"
            >
              All
            </button>
          </div>
        )}
        <input
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={filterInputStyle}
        />
        <select
          value={wingFilter}
          onChange={(e) => setWingFilter(e.target.value as WingFilter)}
          style={{ ...filterInputStyle, width: "132px" }}
          title="Filter graph by memory wing"
        >
          {(["all", "agent", "user", "knowledge", "experience"] as WingFilter[]).map((wing) => (
            <option key={wing} value={wing}>
              {wing === "all" ? "all wings" : wing}
            </option>
          ))}
        </select>
        {data && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {visible.nodes.length}/{data.nodes.length} nodes · {visible.edges.length} edges
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <button type="button" onClick={onNewMemory} style={primaryButtonStyle}>
            + New memory
          </button>
          <label style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>show top</label>
          <input
            type="range"
            min={20}
            max={500}
            step={20}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Number(e.target.value))}
            style={{ width: "100px" }}
            title={`Max nodes rendered (${maxNodes})`}
          />
          <span
            style={{
              fontSize: "10.5px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              width: "32px",
            }}
          >
            {maxNodes}
          </span>
        </div>
        <button onClick={load} style={ghostButtonStyle}>
          ↻ Refresh
        </button>
      </div>

      <div ref={wrapRef} style={graphWrapStyle}>
        {loading && (
          <div style={overlayStyle}>
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Loading graph…</span>
          </div>
        )}
        {showProjectEmpty && (
          <div style={overlayStyle}>
            <div style={emptyHintStyle}>
              <div style={{ fontSize: "13px", color: "var(--text)", marginBottom: "6px" }}>
                No memories scoped to <code>{projectName}</code> yet.
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.5 }}>
                Have a chat in Build mode — claude saves project decisions, patterns, and context via{" "}
                <code>mcp__memory__memory_save</code> as it works.
                <br />
                <br />
                Or load the <strong>starter pack</strong> — 21 ecommerce-themed memories across architecture decisions,
                patterns, insights, and user preferences:
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
                <button
                  type="button"
                  disabled={seeding}
                  onClick={async () => {
                    if (!projectName) return;
                    setSeeding(true);
                    try {
                      const r = await invoke<{ created: number; skipped: number; linked: number }>(
                        "seed_demo_memories",
                        { scope: projectName }
                      );
                      await queryClient.invalidateQueries({ queryKey: ["memoryGraph"] });
                      await load();
                      // Brief toast in the error slot — yes, semantically wrong, but it's the
                      // existing dismissible banner and the demo flow benefits from feedback.
                      setError(
                        r.created > 0
                          ? `✓ Seeded ${r.created} memories (${r.linked} relations)`
                          : `✓ Already seeded — ${r.skipped} memories present`
                      );
                      setTimeout(() => setError(null), 4000);
                    } catch (e) {
                      setError(`Seed failed: ${e}`);
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  style={seedBtnStyle}
                >
                  {seeding && <span className="ut-spinner" />}
                  {seeding ? "Seeding…" : "✨ Load starter pack"}
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  style={ghostButtonStyle}
                  title="Show every memory in the graph"
                >
                  Or browse global graph →
                </button>
              </div>
            </div>
          </div>
        )}
        {displayError && <div style={overlayErrorStyle}>{displayError}</div>}
        {!loading && !displayError && !showProjectEmpty && data &&
          (graphMode === "3d" ? (
            <MemoryGraph3D
              data={visible}
              width={size.w}
              height={size.h}
              onNodeClick={onSelectNode}
              selectedNodeId={selectedId}
              cameraStateKey="studio:memory:camera"
            />
          ) : (
            <MemoryGraph2D
              data={visible}
              width={size.w}
              height={size.h}
              onNodeClick={onSelectNode}
              selectedNodeId={selectedId}
            />
          ))}
      </div>

      {selected && (
        <div style={detailPanelStyle}>
          <div style={detailHeaderStyle}>
            <span style={{ fontWeight: 600 }}>{selected.title ?? selected.content.slice(0, 80)}</span>
            <span style={categoryPillStyle}>{selected.category}</span>
            <button
              onClick={() => {
                setSelectedId(null);
                setSelected(null);
              }}
              style={detailCloseStyle}
            >
              ✕
            </button>
          </div>
          <div style={detailMetaStyle}>
            {selected.wing && <span>wing: {selected.wing}</span>}
            {selected.hall && <span>hall: {selected.hall}</span>}
            {selected.room && <span>room: {selected.room}</span>}
            {selected.importance != null && <span>importance: {selected.importance}</span>}
            {selected.access_count != null && <span>recalls: {selected.access_count}</span>}
            {selected.scope && <span>scope: {selected.scope}</span>}
          </div>
          <div style={detailContentStyle}>{selected.content}</div>
        </div>
      )}
    </div>
  );
}

const WING_COLORS_2D: Record<string, string> = {
  agent: "#a78bfa",
  user: "#22C55E",
  knowledge: "#60a5fa",
  experience: "#fb923c",
};

function MemoryGraph2D({
  data,
  width,
  height,
  onNodeClick,
  selectedNodeId,
}: {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick: (node: { id: string }) => void;
  selectedNodeId: string | null;
}) {
  const layout = useMemo(() => {
    const safeW = Math.max(width, 320);
    const safeH = Math.max(height, 260);
    const centers: Record<string, { x: number; y: number }> = {
      agent: { x: safeW * 0.28, y: safeH * 0.28 },
      user: { x: safeW * 0.72, y: safeH * 0.28 },
      knowledge: { x: safeW * 0.34, y: safeH * 0.7 },
      experience: { x: safeW * 0.72, y: safeH * 0.68 },
    };
    const grouped = data.nodes.reduce<Record<string, MemoryGraphNode[]>>((acc, node) => {
      const wing = node.wing ?? "knowledge";
      acc[wing] = [...(acc[wing] ?? []), node];
      return acc;
    }, {});
    const positions = new Map<string, { node: MemoryGraphNode; x: number; y: number; r: number; color: string }>();
    for (const [wing, nodes] of Object.entries(grouped)) {
      const center = centers[wing] ?? { x: safeW / 2, y: safeH / 2 };
      const radius = Math.min(safeW, safeH) * (nodes.length > 12 ? 0.22 : 0.16);
      nodes.forEach((node, index) => {
        const angle = nodes.length === 1 ? 0 : (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
        const importance = Math.max(1, Math.min(node.importance ?? 5, 10));
        positions.set(node.id, {
          node,
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
          r: 5 + importance * 0.9 + (node.id === selectedNodeId ? 4 : 0),
          color: WING_COLORS_2D[wing] ?? "var(--text-muted)",
        });
      });
    }
    return { positions, centers };
  }, [data.nodes, height, selectedNodeId, width]);

  return (
    <div style={graph2dWrapStyle}>
      <svg width={width} height={height} role="img" aria-label="2D memory graph" style={graph2dSvgStyle}>
        <defs>
          <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Object.entries(layout.centers).map(([wing, center]) => (
          <g key={wing}>
            <circle cx={center.x} cy={center.y} r={Math.min(width, height) * 0.21} fill="transparent" stroke="rgba(255,255,255,0.05)" />
            <text x={center.x} y={center.y} textAnchor="middle" fill="rgba(255,255,255,0.16)" fontSize="18" fontWeight="700">
              {wing}
            </text>
          </g>
        ))}
        {data.edges.map((edge, index) => {
          const rawSource = edge.source as unknown;
          const rawTarget = edge.target as unknown;
          const sourceId = typeof rawSource === "string" ? rawSource : (rawSource as { id?: string }).id;
          const targetId = typeof rawTarget === "string" ? rawTarget : (rawTarget as { id?: string }).id;
          const source = sourceId ? layout.positions.get(sourceId) : undefined;
          const target = targetId ? layout.positions.get(targetId) : undefined;
          if (!source || !target) return null;
          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="rgba(148,163,184,0.34)"
              strokeWidth={Math.max(1, edge.strength * 2)}
            />
          );
        })}
        {[...layout.positions.values()].map(({ node, x, y, r, color }) => (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={`Open memory ${node.title}`}
            onClick={() => onNodeClick(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNodeClick(node);
              }
            }}
            style={{ cursor: "pointer", outline: "none" }}
          >
            <circle cx={x} cy={y} r={r + 6} fill={color} opacity={node.id === selectedNodeId ? 0.2 : 0.08} filter="url(#nodeGlow)" />
            <circle cx={x} cy={y} r={r} fill={color} stroke={node.id === selectedNodeId ? "var(--text)" : "rgba(255,255,255,0.42)"} strokeWidth={node.id === selectedNodeId ? 2 : 1} />
            <text x={x} y={y + r + 13} textAnchor="middle" fill="rgba(226,232,240,0.9)" fontSize="10.5" fontFamily="var(--font-mono)">
              {node.title.length > 22 ? `${node.title.slice(0, 22)}...` : node.title}
            </text>
          </g>
        ))}
      </svg>
      <div style={graph2dHintStyle}>2D mode uses a stable wing layout; click any node to open the memory card.</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "var(--bg)",
  position: "relative",
};
const controlBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};
const filterInputStyle: React.CSSProperties = {
  fontSize: "11px",
  padding: "5px 10px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  width: "180px",
};
const ghostButtonStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "5px 10px",
};
const primaryButtonStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  border: "none",
  borderRadius: "6px",
  padding: "5px 10px",
  cursor: "pointer",
};
const seedBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 14px",
  cursor: "pointer",
};
const scopeToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "2px",
  gap: "2px",
};
const scopePillStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-muted)",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "4px 10px",
  cursor: "pointer",
};
const scopePillActiveStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--bg)",
};
const graphWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  background: "var(--bg)",
  overflow: "hidden",
};
const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 10,
};
const overlayErrorStyle: React.CSSProperties = {
  ...overlayStyle,
  color: "var(--red)",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
};
const emptyHintStyle: React.CSSProperties = {
  pointerEvents: "auto",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5) var(--space-6)",
  maxWidth: "420px",
  textAlign: "center",
  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
};
const detailPanelStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  bottom: "12px",
  width: "min(420px, 50%)",
  maxHeight: "55%",
  overflowY: "auto",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4) var(--space-5)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
  zIndex: 20,
};
const detailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "var(--space-2)",
  color: "var(--text)",
};
const categoryPillStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--accent)",
  background: "var(--accent-soft)",
  borderRadius: "var(--radius-sm)",
  padding: "2px 6px",
};
const detailCloseStyle: React.CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  width: "22px",
  height: "22px",
  cursor: "pointer",
};
const detailMetaStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  fontSize: "10.5px",
  color: "var(--text-dim)",
  marginBottom: "var(--space-3)",
};
const detailContentStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text)",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};
const graph2dWrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  background: "radial-gradient(circle at top, rgba(96,165,250,0.11), transparent 35%), var(--bg)",
};
const graph2dSvgStyle: React.CSSProperties = {
  display: "block",
};
const graph2dHintStyle: React.CSSProperties = {
  position: "absolute",
  left: "12px",
  bottom: "12px",
  color: "var(--text-dim)",
  background: "rgba(12,13,16,0.72)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "7px 10px",
  fontSize: "11px",
  pointerEvents: "none",
};
