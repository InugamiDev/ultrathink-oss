"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface GraphNode {
  id: string;
  label: string;
  layer: string;
  category: string;
  connections: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  avgConnections: number;
  density: number;
  layers: Record<string, number>;
}

const LAYER_COLORS: Record<string, string> = {
  orchestrator: "#f59e0b",
  hub: "#3b82f6",
  utility: "#22c55e",
  domain: "#94a3b8",
};

const LAYER_RADII: Record<string, number> = {
  orchestrator: 10,
  hub: 7,
  utility: 5,
  domain: 4,
};

function lightenHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (v: number) => Math.min(255, v + 80);
  return `rgb(${lighten(r)},${lighten(g)},${lighten(b)})`;
}

export default function SkillGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const offsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const tickRef = useRef(0);
  const particlesRef = useRef<{ edgeIdx: number; t: number; speed: number }[]>([]);
  const starsRef = useRef<{ x: number; y: number; r: number; a: number }[]>([]);

  useEffect(() => {
    fetch("/api/skills/graph")
      .then((r) => r.json())
      .then((data) => {
        const rawNodes = data.nodes ?? [];
        const rawEdges = data.edges ?? [];

        // Initialize positions in a circle layout by layer
        const layerGroups: Record<string, typeof rawNodes> = {};
        for (const n of rawNodes) {
          if (!layerGroups[n.layer]) layerGroups[n.layer] = [];
          layerGroups[n.layer].push(n);
        }

        const layerOrder = ["orchestrator", "hub", "utility", "domain"];
        const initialized: GraphNode[] = [];
        let ringRadius = 50;

        for (const layer of layerOrder) {
          const group = layerGroups[layer] || [];
          const count = group.length;
          for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            initialized.push({
              ...group[i],
              x: Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 20,
              y: Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 20,
              vx: 0,
              vy: 0,
            });
          }
          ringRadius += 120 + count * 2;
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
  }, []);

  // Force-directed simulation
  const simulate = useCallback(() => {
    const ns = nodesRef.current;
    const es = edgesRef.current;
    if (ns.length === 0) return;

    const nodeMap = new Map<string, number>();
    for (let i = 0; i < ns.length; i++) nodeMap.set(ns[i].id, i);

    // Apply forces
    const repulsion = 800;
    const attraction = 0.005;
    const damping = 0.92;
    const centerGravity = 0.001;

    // Repulsion between all pairs (Barnes-Hut would be better for 500+ nodes, but 167 is fine)
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

    // Attraction along edges
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

    // Center gravity
    for (const n of ns) {
      n.vx -= n.x * centerGravity;
      n.vy -= n.y * centerGravity;
    }

    // Apply velocity with damping
    for (const n of ns) {
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

    // Background
    ctx.fillStyle = "#07070f";
    ctx.fillRect(0, 0, w, h);

    // Lazy-init stars
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
    const nodeMap = new Map<string, GraphNode>();
    for (const n of ns) nodeMap.set(n.id, n);

    // Determine visible nodes based on filter
    const visibleSet = new Set<string>();
    for (const n of ns) {
      if (layerFilter === "all" || n.layer === layerFilter) visibleSet.add(n.id);
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
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      const isActive = activeId && (e.source === activeId || e.target === activeId);
      const color = isActive ? (LAYER_COLORS[nodeMap.get(activeId!)?.layer ?? ""] ?? "#64748b") : "#334155";

      ctx.globalAlpha = isActive ? 0.55 : 0.12;
      ctx.strokeStyle = color;
      ctx.lineWidth = isActive ? 1.2 * z : 0.5 * z;
      if (isActive) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 4 * z;
      }
      ctx.beginPath();
      ctx.moveTo(s.x * z + ox, s.y * z + oy);
      ctx.lineTo(t.x * z + ox, t.y * z + oy);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Animate particles along edges
    if (particlesRef.current.length === 0 && es.length > 0) {
      const count = Math.min(50, es.length);
      particlesRef.current = Array.from({ length: count }, () => ({
        edgeIdx: Math.floor(Math.random() * es.length),
        t: Math.random(),
        speed: 0.002 + Math.random() * 0.004,
      }));
    }
    for (const p of particlesRef.current) {
      const e = es[p.edgeIdx];
      if (!e || !visibleSet.has(e.source) || !visibleSet.has(e.target)) continue;
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      const px = (s.x + (t.x - s.x) * p.t) * z + ox;
      const py = (s.y + (t.y - s.y) * p.t) * z + oy;
      const color = LAYER_COLORS[s.layer] ?? "#64748b";
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
      const baseR = LAYER_RADII[n.layer] ?? 4;
      const color = LAYER_COLORS[n.layer] ?? "#94a3b8";

      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;
      const isConnected = connectedIds.has(n.id);
      const isDimmed = activeId && !isSelected && !isHovered && !isConnected;

      const r = (isSelected ? baseR * 1.6 : isHovered ? baseR * 1.35 : baseR) * z;

      ctx.globalAlpha = isDimmed ? 0.25 : 1;

      // Outer glow ring
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

      // Node fill with radial gradient
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
      if (z > 0.6 || isSelected || isHovered || isConnected) {
        ctx.globalAlpha = isDimmed ? 0.2 : isSelected || isHovered ? 1 : 0.7;
        ctx.fillStyle = isSelected || isHovered ? "#f0f0f8" : "#94a3b8";
        ctx.font = `${Math.max(9, 11 * z)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, x, y + r + 13 * z);
      }
    }

    ctx.globalAlpha = 1;
  }, [layerFilter, selectedNode, hoveredNode]);

  // Animation loop — simulate until settled, always render for particles + pulse
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
  const getNodeAt = useCallback((clientX: number, clientY: number): GraphNode | null => {
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
      const r = (LAYER_RADII[n.layer] ?? 4) * z + 4;
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
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
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
        // If minimal drag, treat as click
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

  // Find connected nodes for detail panel
  const connectedNodes = selectedNode
    ? edges
        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e) => (e.source === selectedNode.id ? e.target : e.source))
    : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      {/* Main canvas */}
      <div className="flex-1 relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        {/* Controls overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
          {["all", "orchestrator", "hub", "utility", "domain"].map((layer) => (
            <button
              key={layer}
              onClick={() => setLayerFilter(layer)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
                ${
                  layerFilter === layer
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
            >
              {layer}
            </button>
          ))}
        </div>

        {/* Stats overlay */}
        {stats && (
          <div className="absolute top-4 right-4 z-10 flex gap-3">
            {[
              { label: "Nodes", value: stats.totalNodes, color: "var(--color-accent)" },
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

        {/* Back to skills link */}
        <div className="absolute bottom-4 left-4 z-10">
          <Link
            href="/skills"
            className="px-4 py-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)]
                       text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            &larr; Skills List
          </Link>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 flex gap-4 px-4 py-2 rounded-lg bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)]">
          {Object.entries(LAYER_COLORS).map(([layer, color]) => (
            <div key={layer} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-[var(--color-text-muted)] capitalize">{layer}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--color-text-muted)]">Loading skill graph...</p>
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
            <h3 className="text-lg font-mono font-bold text-[var(--color-text)]">{selectedNode.label}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              aria-label="Close detail panel"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150 p-1"
            >
              &times;
            </button>
          </div>

          <div className="flex gap-2">
            <span
              className="px-2 py-1 text-xs rounded-full border font-medium"
              style={{
                backgroundColor: `${LAYER_COLORS[selectedNode.layer]}20`,
                color: LAYER_COLORS[selectedNode.layer],
                borderColor: `${LAYER_COLORS[selectedNode.layer]}30`,
              }}
            >
              {selectedNode.layer}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              {selectedNode.category}
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-dim)]">Connections</p>
            <p className="text-2xl font-bold mt-1" style={{ color: LAYER_COLORS[selectedNode.layer] }}>
              {selectedNode.connections}
            </p>
          </div>

          {connectedNodes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">
                Connected Skills ({connectedNodes.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {connectedNodes.map((name) => {
                  const node = nodesRef.current.find((n) => n.id === name);
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        if (node) setSelectedNode(node);
                      }}
                      className="px-2 py-1 text-xs rounded-full transition-colors duration-150"
                      style={{
                        backgroundColor: node ? `${LAYER_COLORS[node.layer]}15` : undefined,
                        color: node ? LAYER_COLORS[node.layer] : undefined,
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--color-border)] flex flex-col gap-2">
            <Link
              href={`/skills/${selectedNode.label}`}
              className="text-sm text-[var(--color-accent)] hover:underline
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              View Skill Detail &rarr;
            </Link>
            <Link
              href="/skills"
              className="text-sm text-[var(--color-text-muted)] hover:underline hover:text-[var(--color-text)]
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              All Skills
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
