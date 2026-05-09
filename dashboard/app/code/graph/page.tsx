"use client";

// intent: Code dependency graph visualization — canvas force-directed layout with impact analysis
// status: done
// confidence: high

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type {
  CodeGraphNode,
  CodeGraphEdge,
  CodeGraphStats,
  ImpactEntry,
  SymbolKind,
  EdgeType,
} from "@/lib/types/code-graph";

interface SimNode extends CodeGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const KIND_COLORS: Record<string, string> = {
  function: "#22c55e",
  class: "#3b82f6",
  interface: "#a855f7",
  type: "#06b6d4",
  enum: "#f59e0b",
  variable: "#64748b",
  method: "#10b981",
  property: "#6366f1",
  module: "#f97316",
  namespace: "#ec4899",
};

const KIND_RADII: Record<string, number> = {
  class: 10,
  interface: 8,
  module: 8,
  namespace: 8,
  enum: 7,
  function: 6,
  method: 5,
  type: 5,
  variable: 4,
  property: 4,
};

const EDGE_STYLES: Record<string, { dash: number[]; width: number }> = {
  imports: { dash: [4, 3], width: 0.6 },
  calls: { dash: [], width: 0.8 },
  extends: { dash: [], width: 1.2 },
  implements: { dash: [], width: 1.0 },
  type_ref: { dash: [2, 2], width: 0.4 },
  re_exports: { dash: [6, 2], width: 0.5 },
};

const IMPACT_COLORS = ["#ef4444", "#f97316", "#eab308"];

const ALL_KINDS: SymbolKind[] = [
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "variable",
  "method",
  "property",
  "module",
  "namespace",
];
const ALL_EDGE_TYPES: EdgeType[] = ["imports", "calls", "extends", "implements", "type_ref", "re_exports"];

function lightenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (v: number) => Math.min(255, v + 80);
  return `rgb(${lighten(r)},${lighten(g)},${lighten(b)})`;
}

export default function CodeGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<CodeGraphEdge[]>([]);
  const [stats, setStats] = useState<CodeGraphStats | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [impactMap, setImpactMap] = useState<Map<string, number>>(new Map());
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set(ALL_KINDS));
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<Set<string>>(new Set(ALL_EDGE_TYPES));
  const [exportedOnly, setExportedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<CodeGraphEdge[]>([]);
  const tickRef = useRef(0);
  const particlesRef = useRef<{ edgeIdx: number; t: number; speed: number }[]>([]);
  const starsRef = useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  // Fetch projects on mount
  useEffect(() => {
    fetch("/api/code-graph")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects ?? []);
        if (data.projects?.length > 0) {
          setSelectedProject(data.projects[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch graph when project changes
  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    setSelectedNode(null);
    setImpactMap(new Map());
    particlesRef.current = [];

    fetch(`/api/code-graph?project=${encodeURIComponent(selectedProject)}&limit=300`)
      .then((r) => r.json())
      .then((data) => {
        const rawNodes: CodeGraphNode[] = data.nodes ?? [];
        const rawEdges: CodeGraphEdge[] = data.edges ?? [];

        // Group by file for initial layout
        const fileGroups: Record<string, CodeGraphNode[]> = {};
        for (const n of rawNodes) {
          const dir = n.filePath.split("/").slice(0, -1).join("/") || ".";
          if (!fileGroups[dir]) fileGroups[dir] = [];
          fileGroups[dir].push(n);
        }

        const dirs = Object.keys(fileGroups);
        const initialized: SimNode[] = [];
        let dirIdx = 0;

        for (const dir of dirs) {
          const group = fileGroups[dir];
          const angle = (2 * Math.PI * dirIdx) / dirs.length;
          const ringR = 100 + dirs.length * 8;

          for (let i = 0; i < group.length; i++) {
            const spread = 30 + group.length * 3;
            initialized.push({
              ...group[i],
              x: Math.cos(angle) * ringR + (Math.random() - 0.5) * spread,
              y: Math.sin(angle) * ringR + (Math.random() - 0.5) * spread,
              vx: 0,
              vy: 0,
            });
          }
          dirIdx++;
        }

        nodesRef.current = initialized;
        edgesRef.current = rawEdges;
        setNodes(initialized);
        setEdges(rawEdges);
        setStats(data.stats);
        setLoading(false);
        tickRef.current = 0;
      })
      .catch(() => setLoading(false));
  }, [selectedProject]);

  // Fetch impact when a node is selected
  useEffect(() => {
    if (!selectedNode) {
      setImpactMap(new Map());
      return;
    }
    fetch(`/api/code-graph/impact?symbolId=${selectedNode.id}&maxHops=3`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, number>();
        for (const entry of (data.impact ?? []) as ImpactEntry[]) {
          map.set(entry.symbolId, entry.hop);
        }
        setImpactMap(map);
      })
      .catch(() => setImpactMap(new Map()));
  }, [selectedNode]);

  // Force-directed simulation
  const simulate = useCallback(() => {
    const ns = nodesRef.current;
    const es = edgesRef.current;
    if (ns.length === 0) return;

    const nodeMap = new Map<string, number>();
    for (let i = 0; i < ns.length; i++) nodeMap.set(ns[i].id, i);

    const repulsion = 800;
    const attraction = 0.008;
    const damping = 0.92;
    const centerGravity = 0.001;

    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[j].x - ns[i].x;
        const dy = ns[j].y - ns[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        ns[i].vx -= fx;
        ns[i].vy -= fy;
        ns[j].vx += fx;
        ns[j].vy += fy;
      }
    }

    for (const e of es) {
      const si = nodeMap.get(e.source);
      const ti = nodeMap.get(e.target);
      if (si === undefined || ti === undefined) continue;
      const dx = ns[ti].x - ns[si].x;
      const dy = ns[ti].y - ns[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      ns[si].vx += fx;
      ns[si].vy += fy;
      ns[ti].vx -= fx;
      ns[ti].vy -= fy;
    }

    for (const n of ns) {
      n.vx -= n.x * centerGravity;
      n.vy -= n.y * centerGravity;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    }

    tickRef.current++;
  }, []);

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const ox = offsetRef.current.x + w / 2;
    const oy = offsetRef.current.y + h / 2;
    const z = zoomRef.current;

    ctx.fillStyle = "#07070f";
    ctx.fillRect(0, 0, w, h);

    // Stars
    if (starsRef.current.length === 0) {
      const count = Math.min(180, Math.floor((w * h) / 5000));
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 0.8 + 0.2,
        a: Math.random() * 0.5 + 0.1,
      }));
    }
    for (const s of starsRef.current) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const ns = nodesRef.current;
    const es = edgesRef.current;
    const nodeMap = new Map<string, SimNode>();
    for (const n of ns) nodeMap.set(n.id, n);

    // Visible set based on kind filter
    const visibleSet = new Set<string>();
    for (const n of ns) {
      if (kindFilter.has(n.kind) && (!exportedOnly || n.isExported)) {
        visibleSet.add(n.id);
      }
    }

    const activeId = selectedNode?.id ?? hoveredNode?.id ?? null;
    const connectedIds = activeId
      ? new Set(
          es
            .filter((e) => e.source === activeId || e.target === activeId)
            .map((e) => (e.source === activeId ? e.target : e.source))
        )
      : new Set<string>();

    // Draw edges
    for (const e of es) {
      if (!visibleSet.has(e.source) || !visibleSet.has(e.target)) continue;
      if (!edgeTypeFilter.has(e.type)) continue;
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      const isActive = activeId && (e.source === activeId || e.target === activeId);
      const style = EDGE_STYLES[e.type] ?? { dash: [], width: 0.5 };
      const color = isActive ? (KIND_COLORS[nodeMap.get(activeId!)?.kind ?? ""] ?? "#64748b") : "#334155";

      ctx.globalAlpha = isActive ? 0.6 : 0.15;
      ctx.strokeStyle = color;
      ctx.lineWidth = (isActive ? style.width * 2 : style.width) * z;
      ctx.setLineDash(style.dash.map((d) => d * z));

      if (isActive) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 4 * z;
      }

      ctx.beginPath();
      ctx.moveTo(s.x * z + ox, s.y * z + oy);
      ctx.lineTo(t.x * z + ox, t.y * z + oy);
      ctx.stroke();

      // Arrowhead
      if (z > 0.4) {
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const targetR = (KIND_RADII[t.kind] ?? 4) * z;
          const ratio = 1 - targetR / (len * z);
          const ax = (s.x + dx * ratio) * z + ox;
          const ay = (s.y + dy * ratio) * z + oy;
          const angle = Math.atan2(dy, dx);
          const arrowSize = 4 * z;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - arrowSize * Math.cos(angle - 0.4), ay - arrowSize * Math.sin(angle - 0.4));
          ctx.lineTo(ax - arrowSize * Math.cos(angle + 0.4), ay - arrowSize * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
    }

    // Particles
    if (particlesRef.current.length === 0 && es.length > 0) {
      const count = Math.min(40, es.length);
      particlesRef.current = Array.from({ length: count }, () => ({
        edgeIdx: Math.floor(Math.random() * es.length),
        t: Math.random(),
        speed: 0.002 + Math.random() * 0.004,
      }));
    }
    for (const p of particlesRef.current) {
      const e = es[p.edgeIdx];
      if (!e || !visibleSet.has(e.source) || !visibleSet.has(e.target)) continue;
      if (!edgeTypeFilter.has(e.type)) continue;
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      const px = (s.x + (t.x - s.x) * p.t) * z + ox;
      const py = (s.y + (t.y - s.y) * p.t) * z + oy;
      const color = KIND_COLORS[s.kind] ?? "#64748b";
      ctx.globalAlpha = 0.7 * (1 - Math.abs(p.t - 0.5) * 1.2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 * z, 0, Math.PI * 2);
      ctx.fill();
      p.t = (p.t + p.speed) % 1;
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Draw nodes
    for (const n of ns) {
      if (!visibleSet.has(n.id)) continue;
      const x = n.x * z + ox;
      const y = n.y * z + oy;
      const baseR = KIND_RADII[n.kind] ?? 4;
      const color = KIND_COLORS[n.kind] ?? "#94a3b8";

      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;
      const isConnected = connectedIds.has(n.id);
      const impactHop = impactMap.get(n.id);
      const isDimmed = activeId && !isSelected && !isHovered && !isConnected && impactHop === undefined;

      const r = (isSelected ? baseR * 1.6 : isHovered ? baseR * 1.35 : baseR) * z;
      ctx.globalAlpha = isDimmed ? 0.2 : 1;

      // Impact ring
      if (impactHop !== undefined && impactHop >= 1 && impactHop <= 3) {
        const ringColor = IMPACT_COLORS[impactHop - 1];
        const ringAlpha = 1 - (impactHop - 1) * 0.3;
        ctx.globalAlpha = ringAlpha;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2 * z;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 8 * z;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = isDimmed ? 0.2 : 1;
      }

      // Outer glow
      if (!isDimmed) {
        const glowR = r * (isSelected ? 2.4 : 1.8);
        const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
        grd.addColorStop(0, color + "28");
        grd.addColorStop(1, color + "00");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node fill
      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 18 * z : isHovered ? 12 * z : 6 * z;
      const nodeGrd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      nodeGrd.addColorStop(0, lightenHex(color));
      nodeGrd.addColorStop(1, color);
      ctx.fillStyle = nodeGrd;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.globalAlpha = isDimmed ? 0 : 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Exported marker — small ring
      if (n.isExported && !isDimmed) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r + 2 * z, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pulse ring for selected
      if (isSelected) {
        const pulse = (Math.sin(tickRef.current * 0.04) + 1) / 2;
        ctx.globalAlpha = 0.3 * (1 - pulse);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, r * (1.8 + pulse * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;

      // Labels
      if (z > 0.5 || isSelected || isHovered || isConnected) {
        ctx.globalAlpha = isDimmed ? 0.15 : isSelected || isHovered ? 1 : 0.65;
        ctx.fillStyle = isSelected || isHovered ? "#f0f0f8" : "#94a3b8";
        ctx.font = `${Math.max(9, 11 * z)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.name, x, y + r + 13 * z);
      }
    }

    ctx.globalAlpha = 1;
  }, [kindFilter, edgeTypeFilter, exportedOnly, selectedNode, hoveredNode, impactMap]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      if (tickRef.current < 400) simulate();
      tickRef.current++;
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate, render]);

  // Mouse interactions
  const getNodeAt = useCallback((clientX: number, clientY: number): SimNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const z = zoomRef.current;
    const ox = offsetRef.current.x + rect.width / 2;
    const oy = offsetRef.current.y + rect.height / 2;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    for (const n of nodesRef.current) {
      const x = n.x * z + ox;
      const y = n.y * z + oy;
      const r = (KIND_RADII[n.kind] ?? 4) * z + 4;
      if ((mx - x) ** 2 + (my - y) ** 2 < r ** 2) return n;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) {
        offsetRef.current.x = dragRef.current.startOffX + (e.clientX - dragRef.current.startX);
        offsetRef.current.y = dragRef.current.startOffY + (e.clientY - dragRef.current.startY);
        return;
      }
      const node = getNodeAt(e.clientX, e.clientY);
      setHoveredNode(node);
      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab";
    },
    [getNodeAt]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffX: offsetRef.current.x,
      startOffY: offsetRef.current.y,
    };
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        dragRef.current = null;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
          const node = getNodeAt(e.clientX, e.clientY);
          setSelectedNode(node);
        }
      }
    },
    [getNodeAt]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current = Math.max(0.1, Math.min(5, zoomRef.current * factor));
  }, []);

  const toggleKind = (k: string) => {
    setKindFilter((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleEdgeType = (t: string) => {
    setEdgeTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  // Connected nodes for detail panel
  const connectedNodes = selectedNode
    ? edges
        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e) => ({
          id: e.source === selectedNode.id ? e.target : e.source,
          type: e.type,
          direction: e.source === selectedNode.id ? "outgoing" : "incoming",
        }))
    : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      <div className="flex-1 relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        {/* Top bar: project selector + filter toggle */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center flex-wrap">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-[var(--color-surface)]/90 backdrop-blur border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${showFilters ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
          >
            Filters
          </button>

          <button
            onClick={() => setExportedOnly(!exportedOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${exportedOnly ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
          >
            Exported
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="absolute top-16 left-4 z-10 p-4 rounded-lg bg-[var(--color-surface)]/95 backdrop-blur border border-[var(--color-border)] space-y-3 max-w-xs">
            <div>
              <p className="text-xs text-[var(--color-text-dim)] uppercase mb-2">Symbol Kind</p>
              <div className="flex flex-wrap gap-1">
                {ALL_KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => toggleKind(k)}
                    className={`px-2 py-1 rounded text-xs transition-all duration-150 ${
                      kindFilter.has(k)
                        ? "text-black font-medium"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)]"
                    }`}
                    style={kindFilter.has(k) ? { backgroundColor: KIND_COLORS[k] } : undefined}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-dim)] uppercase mb-2">Edge Type</p>
              <div className="flex flex-wrap gap-1">
                {ALL_EDGE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleEdgeType(t)}
                    className={`px-2 py-1 rounded text-xs transition-all duration-150 ${
                      edgeTypeFilter.has(t)
                        ? "bg-[var(--color-accent)] text-black font-medium"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)]"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats overlay */}
        {stats && stats.totalNodes > 0 && (
          <div className="absolute top-4 right-4 z-10 flex gap-3">
            {[
              { label: "Symbols", value: stats.totalNodes, color: "var(--color-accent)" },
              { label: "Edges", value: stats.totalEdges, color: "var(--color-info)" },
              { label: "Avg", value: stats.avgConnections, color: "var(--color-success)" },
              { label: "Density", value: `${stats.density}%`, color: "#f59e0b" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-3 py-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] text-center"
              >
                <p className="text-xs text-[var(--color-text-dim)]">{s.label}</p>
                <p className="text-sm font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 flex gap-3 px-4 py-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] flex-wrap">
          {Object.entries(KIND_COLORS)
            .filter(([k]) => kindFilter.has(k))
            .slice(0, 6)
            .map(([kind, color]) => (
              <div key={kind} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-[var(--color-text-muted)]">{kind}</span>
              </div>
            ))}
        </div>

        {/* Back link */}
        <div className="absolute bottom-4 left-4 z-10">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)]
                       text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            &larr; Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--color-text-muted)]">Loading code graph...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-2">
            <p className="text-[var(--color-text-muted)]">No symbols indexed yet.</p>
            <p className="text-sm text-[var(--color-text-dim)]">Run the code-intel indexer first.</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div className="w-80 shrink-0 p-6 border border-l-0 border-[var(--color-border)] rounded-r-xl bg-[var(--color-surface)] overflow-y-auto space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-mono font-bold text-[var(--color-text)]">{selectedNode.name}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150 p-1"
            >
              &times;
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span
              className="px-2 py-1 text-xs rounded-full border font-medium"
              style={{
                backgroundColor: `${KIND_COLORS[selectedNode.kind]}20`,
                color: KIND_COLORS[selectedNode.kind],
                borderColor: `${KIND_COLORS[selectedNode.kind]}30`,
              }}
            >
              {selectedNode.kind}
            </span>
            {selectedNode.isExported && (
              <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                exported
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-muted)] break-all">
            <p className="text-[var(--color-text-dim)] mb-1">
              {selectedNode.filePath}:{selectedNode.lineNumber}
            </p>
            {selectedNode.signature && (
              <p className="mt-1 text-[var(--color-text)]">{selectedNode.signature.slice(0, 120)}</p>
            )}
          </div>

          {/* Impact radius */}
          {impactMap.size > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">
                Impact Radius ({impactMap.size} affected)
              </h4>
              <div className="flex gap-4 text-center">
                {[1, 2, 3].map((hop) => {
                  const count = [...impactMap.values()].filter((h) => h === hop).length;
                  return (
                    <div key={hop} className="flex-1 p-2 rounded bg-[var(--color-surface-2)]">
                      <p className="text-lg font-bold" style={{ color: IMPACT_COLORS[hop - 1] }}>
                        {count}
                      </p>
                      <p className="text-xs text-[var(--color-text-dim)]">hop {hop}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connected symbols */}
          {connectedNodes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">
                Connections ({connectedNodes.length})
              </h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {connectedNodes.map((conn) => {
                  const node = nodesRef.current.find((n) => n.id === conn.id);
                  return (
                    <button
                      key={`${conn.id}-${conn.type}-${conn.direction}`}
                      onClick={() => {
                        if (node) setSelectedNode(node);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: KIND_COLORS[node?.kind ?? ""] }}
                      />
                      <span className="text-[var(--color-text)] truncate">{node?.name ?? conn.id.slice(0, 8)}</span>
                      <span className="text-[var(--color-text-dim)] ml-auto shrink-0">
                        {conn.direction === "outgoing" ? "→" : "←"} {conn.type.replace("_", " ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
