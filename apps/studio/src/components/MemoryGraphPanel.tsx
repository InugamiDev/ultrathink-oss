// intent: project-scoped 3D knowledge-graph view of UltraThink memory
// status: done — uses MemoryGraph3D (three.js + react-force-graph-3d) with bloom
// next: graph search highlights matching nodes; per-node MOC summary panel
// confidence: high

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MemoryGraph3D, type GraphData } from "./MemoryGraph3D.js";

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
}

export function MemoryGraphPanel({ projectName, projectDir }: MemoryGraphPanelProps = {}) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemoryDetail | null>(null);
  const [filter, setFilter] = useState<string>("");
  // Caps visible nodes — past ~120 even three.js gets cluttered for legibility.
  // The slider on the control bar lets the user crank to 500 if they want.
  const [maxNodes, setMaxNodes] = useState<number>(80);
  // "project" → only memories scoped to this project; "all" → entire graph.
  const [scopeMode, setScopeMode] = useState<"project" | "all">(projectName ? "project" : "all");
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scope =
        scopeMode === "project" ? (projectName ?? (projectDir ? projectDir.split("/").pop() : undefined)) : undefined;
      const result = await invoke<GraphData | null>("query_memory_graph", { limit: 500, scope });
      setData(result ?? { nodes: [], edges: [] });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [scopeMode, projectName, projectDir]);

  useEffect(() => {
    void load();
  }, [load]);

  // Search-filter + cap-by-importance-and-recall ranking. The 3D view's
  // force layout handles physical positioning — we just decide who shows.
  const visible = useMemo<GraphData>(() => {
    if (!data) return { nodes: [], edges: [] };
    const f = filter.toLowerCase();
    const baseFiltered = f
      ? data.nodes.filter(
          (n) =>
            n.title.toLowerCase().includes(f) ||
            n.category.toLowerCase().includes(f) ||
            (n.wing ?? "").toLowerCase().includes(f) ||
            (n.hall ?? "").toLowerCase().includes(f)
        )
      : data.nodes;
    const ranked = [...baseFiltered].sort((a, b) => {
      const aS = (a.importance ?? 5) * 10 + (a.accessCount ?? 0);
      const bS = (b.importance ?? 5) * 10 + (b.accessCount ?? 0);
      return bS - aS;
    });
    const filteredNodes = ranked.slice(0, maxNodes);
    const idSet = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, filter, maxNodes]);

  const onSelectNode = useCallback(async (node: { id: string }) => {
    try {
      const detail = await invoke<MemoryDetail | null>("query_memory_node", { id: node.id });
      setSelected(detail ?? null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const showProjectEmpty = !loading && !error && data && data.nodes.length === 0 && scopeMode === "project";

  return (
    <div style={containerStyle}>
      <div style={controlBarStyle}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em" }}>KNOWLEDGE GRAPH</span>
        {projectName && (
          <div style={scopeToggleStyle} role="tablist" aria-label="Memory scope">
            <button
              role="tab"
              aria-selected={scopeMode === "project"}
              onClick={() => setScopeMode("project")}
              style={{ ...scopePillStyle, ...(scopeMode === "project" ? scopePillActiveStyle : null) }}
              title={`Only show memories scoped to "${projectName}"`}
            >
              📁 {projectName}
            </button>
            <button
              role="tab"
              aria-selected={scopeMode === "all"}
              onClick={() => setScopeMode("all")}
              style={{ ...scopePillStyle, ...(scopeMode === "all" ? scopePillActiveStyle : null) }}
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
        {data && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {visible.nodes.length}/{data.nodes.length} nodes · {visible.edges.length} edges
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
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
        {error && <div style={overlayErrorStyle}>{error}</div>}
        {!loading && !error && !showProjectEmpty && data && (
          <MemoryGraph3D data={visible} width={size.w} height={size.h} onNodeClick={onSelectNode} />
        )}
      </div>

      {selected && (
        <div style={detailPanelStyle}>
          <div style={detailHeaderStyle}>
            <span style={{ fontWeight: 600 }}>{selected.title ?? selected.content.slice(0, 80)}</span>
            <span style={categoryPillStyle}>{selected.category}</span>
            <button onClick={() => setSelected(null)} style={detailCloseStyle}>
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

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "var(--bg)",
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
const seedBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#0c0d10",
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
  color: "#0c0d10",
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
