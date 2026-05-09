"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import type { GalaxyViewport } from "@/lib/types/memory";
import { ForceSimulation } from "@/lib/galaxy/force-simulation";
import type { GalaxyNode, GalaxyEdge } from "@/lib/types/memory";

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Constants ──────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, string> = {
  identity: "#f59e0b",
  preference: "#a855f7",
  "style-preference": "#ec4899",
  "tool-preference": "#3b82f6",
  "project-context": "#22c55e",
  "workflow-pattern": "#06b6d4",
};

const NODE_TYPE_LABELS: Record<string, string> = {
  identity: "Identity",
  preference: "Preference",
  "style-preference": "Style",
  "tool-preference": "Tool",
  "project-context": "Project",
  "workflow-pattern": "Workflow",
};

const BG_COLOR = "#0a0a0f";
const LABEL_FONT = '11px ui-monospace, "SF Mono", Menlo, monospace';

// ─── Props ──────────────────────────────────────────────────────────

interface IdentityGraphCanvasProps {
  nodes: IdentityNode[];
  edges: IdentityEdge[];
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────

export function IdentityGraphCanvas({ nodes, edges, selectedId, onSelectNode }: IdentityGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ForceSimulation | null>(null);
  const viewportRef = useRef<GalaxyViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const hoveredRef = useRef<string | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const selectedIdRef = useRef(selectedId);
  const animFrameRef = useRef(0);
  selectedIdRef.current = selectedId;

  // Edge count per node for sizing
  const edgeCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of edges) {
      counts.set(e.source_id, (counts.get(e.source_id) ?? 0) + 1);
      counts.set(e.target_id, (counts.get(e.target_id) ?? 0) + 1);
    }
    return counts;
  }, [edges]);

  // Convert identity nodes to GalaxyNodes for the force simulation
  const galaxyNodes: GalaxyNode[] = useMemo(
    () =>
      nodes.map((n) => {
        const edgeCount = edgeCountMap.get(n.id) ?? 0;
        const baseRadius = n.type === "identity" ? 14 : 6;
        const radius = baseRadius + Math.min(edgeCount * 1.5, 12);
        const color = NODE_TYPE_COLORS[n.type] ?? "#64748b";
        return {
          id: n.id,
          memory: {
            id: n.id,
            content: n.label,
            category: n.type,
            importance: (n.data.importance as number) ?? 5,
            confidence: (n.data.confidence as number) ?? 0.5,
            scope: (n.data.scope as string) ?? null,
            source: (n.data.source as string) ?? null,
            created_at: n.created_at,
            updated_at: n.updated_at,
            access_count: (n.data.access_count as number) ?? 0,
            is_archived: false,
            tags: null,
          },
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 800,
          vx: 0,
          vy: 0,
          radius,
          color,
          glow: n.type === "identity" ? 18 : 8 + edgeCount * 2,
          hasRings: n.type === "identity",
        };
      }),
    [nodes, edgeCountMap]
  );

  // Convert identity edges to GalaxyEdges
  const galaxyEdges: GalaxyEdge[] = useMemo(
    () =>
      edges.map((e) => ({
        source: e.source_id,
        target: e.target_id,
        strength: e.weight,
      })),
    [edges]
  );

  // Keep a stable label-lookup map for edge hover rendering
  const edgeLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of edges) {
      m.set(`${e.source_id}::${e.target_id}`, e.label);
    }
    return m;
  }, [edges]);

  // Init simulation
  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new ForceSimulation();
    }
    simRef.current.setData(galaxyNodes, galaxyEdges);
  }, [galaxyNodes, galaxyEdges]);

  // Screen-to-world
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const vp = viewportRef.current;
    const x = (screenX - rect.left - rect.width / 2 - vp.offsetX) / vp.zoom;
    const y = (screenY - rect.top - rect.height / 2 - vp.offsetY) / vp.zoom;
    return { x, y };
  }, []);

  // ─── Render function ────────────────────────────────────────────

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, simNodes: GalaxyNode[]) => {
      animFrameRef.current++;
      const dpr = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const vp = viewportRef.current;

      ctx.save();

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w * dpr, h * dpr);

      // Subtle grid dots
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#ffffff";
      const gridSize = 40;
      const startX = ((-vp.offsetX / vp.zoom) % gridSize) * vp.zoom * dpr;
      const startY = ((-vp.offsetY / vp.zoom) % gridSize) * vp.zoom * dpr;
      for (let gx = startX; gx < w * dpr; gx += gridSize * vp.zoom * dpr) {
        for (let gy = startY; gy < h * dpr; gy += gridSize * vp.zoom * dpr) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Move to world coordinates
      ctx.translate((w / 2) * dpr + vp.offsetX * dpr, (h / 2) * dpr + vp.offsetY * dpr);
      ctx.scale(vp.zoom * dpr, vp.zoom * dpr);

      const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
      const hovered = hoveredRef.current;
      const selected = selectedIdRef.current;

      // Edges
      for (const edge of galaxyEdges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const isHighlight =
          source.id === hovered || target.id === hovered || source.id === selected || target.id === selected;
        const alpha = isHighlight ? 0.6 : 0.15;

        const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        gradient.addColorStop(0, hexToRgba(source.color, alpha));
        gradient.addColorStop(1, hexToRgba(target.color, alpha));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = isHighlight ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        // Edge label on hover
        if (isHighlight && (hovered === source.id || hovered === target.id)) {
          const label = edgeLabelMap.get(`${edge.source}::${edge.target}`);
          if (label) {
            const mx = (source.x + target.x) / 2;
            const my = (source.y + target.y) / 2;
            ctx.font = '9px ui-monospace, "SF Mono", Menlo, monospace';
            ctx.textAlign = "center";
            ctx.fillStyle = hexToRgba("#e2e8f0", 0.8);

            // Small background pill
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = hexToRgba("#1e1e2e", 0.9);
            ctx.beginPath();
            ctx.roundRect(mx - tw / 2 - 4, my - 7, tw + 8, 14, 4);
            ctx.fill();

            ctx.fillStyle = hexToRgba("#e2e8f0", 0.85);
            ctx.fillText(label, mx, my + 3);
          }
        }
      }

      // Nodes
      for (const node of simNodes) {
        const { x, y, radius, color, glow, hasRings } = node;
        const isSelected = node.id === selected;
        const isHovered = node.id === hovered;

        // Glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = glow + (isHovered ? 10 : 0);

        // Node body
        const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius);
        grad.addColorStop(0, lightenHex(color, 50));
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, darkenHex(color, 40));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Rings for identity nodes
        if (hasRings) {
          ctx.save();
          ctx.strokeStyle = hexToRgba(color, 0.4);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(x, y, radius * 1.8, radius * 0.45, Math.PI * 0.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Hover outline
        if (isHovered && !isSelected) {
          ctx.strokeStyle = hexToRgba("#ffffff", 0.5);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          const pulse = Math.sin(animFrameRef.current * 0.06) * 0.3 + 0.7;
          const ringRadius = radius + 6 + Math.sin(animFrameRef.current * 0.04) * 3;
          ctx.strokeStyle = hexToRgba(color, pulse * 0.6);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        if (vp.zoom > 0.4) {
          const label =
            node.memory.content.length > 28 ? node.memory.content.slice(0, 26) + "..." : node.memory.content;
          ctx.font = LABEL_FONT;
          ctx.textAlign = "center";
          ctx.fillStyle = hexToRgba(color, isSelected ? 1.0 : isHovered ? 0.85 : 0.65);
          ctx.fillText(label, x, y + radius + 14);

          // Type badge on hover/select
          if (isHovered || isSelected) {
            const typeLabel = NODE_TYPE_LABELS[node.memory.category] ?? node.memory.category;
            ctx.font = '500 9px "JetBrains Mono", monospace';
            ctx.fillStyle = hexToRgba(color, 0.5);
            ctx.fillText(`[${typeLabel}]`, x, y + radius + 26);
          }
        }
      }

      ctx.restore();
    },
    [galaxyEdges, edgeLabelMap]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    resizeCanvas();
    const resizeObs = new ResizeObserver(resizeCanvas);
    resizeObs.observe(canvas);

    let active = true;
    const animate = () => {
      if (!active) return;
      const sim = simRef.current;
      if (sim) {
        sim.tick();
        renderFrame(ctx, sim.nodes);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      resizeObs.disconnect();
    };
  }, [galaxyNodes, galaxyEdges, renderFrame]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        viewportRef.current.offsetX += dx;
        viewportRef.current.offsetY += dy;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);
      const sim = simRef.current;
      if (sim) {
        const node = sim.nodeAt(world.x, world.y);
        hoveredRef.current = node?.id ?? null;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = node ? "pointer" : "grab";
        }
      }
    },
    [screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      const sim = simRef.current;
      if (sim) {
        const node = sim.nodeAt(world.x, world.y);
        onSelectNode(node?.id ?? null);
      }
    },
    [screenToWorld, onSelectNode]
  );

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const vp = viewportRef.current;
      vp.zoom = Math.max(0.2, Math.min(4, vp.zoom * delta));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Identity Graph visualization - force-directed graph of identity nodes and preferences"
        className="w-full h-full block cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 p-3 rounded-lg bg-[var(--color-surface)]/90 backdrop-blur-sm border border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-dim)] mb-1">Node Types</span>
        {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_TYPE_COLORS[type] }} />
            <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { NODE_TYPE_COLORS, NODE_TYPE_LABELS };
