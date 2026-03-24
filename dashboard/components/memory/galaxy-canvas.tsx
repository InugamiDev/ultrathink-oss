"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import type { GalaxyNode, GalaxyEdge, GalaxyViewport, GalaxyFilters } from "@/lib/types/memory";
import { ForceSimulation } from "@/lib/galaxy/force-simulation";
import { GalaxyRenderer } from "@/lib/galaxy/galaxy-renderer";

interface GalaxyCanvasProps {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filters: GalaxyFilters;
  viewportRef?: React.RefObject<GalaxyViewport>;
}

export function GalaxyCanvas({
  nodes,
  edges,
  selectedId,
  onSelectNode,
  filters,
  viewportRef: externalViewportRef,
}: GalaxyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ForceSimulation | null>(null);
  const rendererRef = useRef<GalaxyRenderer | null>(null);
  const internalViewportRef = useRef<GalaxyViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const viewportRef = externalViewportRef ?? internalViewportRef;
  const hoveredRef = useRef<string | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Memoize filtered data to prevent animation loop teardown on every render
  const filteredNodes = useMemo(
    () =>
      nodes.filter((n) => {
        if (filters.categories.size > 0 && !filters.categories.has(n.memory.category)) return false;
        if (n.memory.importance < filters.minImportance) return false;
        return true;
      }),
    [nodes, filters.categories, filters.minImportance]
  );

  // Hoist Set construction outside the filter callback to avoid O(edges × nodes)
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [filteredNodes, edges]);

  // Init simulation
  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new ForceSimulation();
    }
    simRef.current.setData(filteredNodes, filteredEdges);
  }, [filteredNodes, filteredEdges]);

  // Screen-to-world coordinate conversion
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const vp = viewportRef.current;
    const x = (screenX - rect.left - rect.width / 2 - vp.offsetX) / vp.zoom;
    const y = (screenY - rect.top - rect.height / 2 - vp.offsetY) / vp.zoom;
    return { x, y };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderer = new GalaxyRenderer(canvas.clientWidth, canvas.clientHeight);
    rendererRef.current = renderer;

    if (filteredEdges.length > 0) {
      renderer.initParticles(filteredEdges);
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      renderer.resize(rect.width, rect.height);
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
        renderer.render(ctx, sim.nodes, filteredEdges, viewportRef.current, selectedIdRef.current, hoveredRef.current);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      resizeObs.disconnect();
    };
  }, [filteredNodes, filteredEdges]);

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

  // Attach wheel listener with { passive: false } to allow preventDefault
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
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Memory Galaxy visualization — interactive force-directed graph of memories"
      className="w-full h-full block cursor-grab"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    />
  );
}
