"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Memory } from "@/lib/memory";
import type { GalaxyNode, GalaxyEdge, GalaxyFilters, GalaxyViewport } from "@/lib/types/memory";
import { nodeFromMemory, CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/types/memory";
import { GalaxyCanvas } from "@/components/memory/galaxy-canvas";
import { GalaxyControls } from "@/components/memory/galaxy-controls";
import { MemoryDetailPanel } from "@/components/memory/memory-detail-panel";
import { BrainChat } from "@/components/memory/brain-chat";
type ViewMode = "galaxy" | "list";

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [edges, setEdges] = useState<GalaxyEdge[]>([]);
  const [nodes, setNodes] = useState<GalaxyNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("galaxy");
  const [isLive, setIsLive] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [filters, setFilters] = useState<GalaxyFilters>({
    categories: new Set(),
    minImportance: 1,
  });
  const viewportRef = useRef<GalaxyViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });

  // Fetch data
  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memory?limit=200");
      const data = await res.json();
      if (data.memories?.length) {
        setMemories(data.memories);
        setIsLive(true);
      } else {
        setIsLive(false);
      }
    } catch {
      setIsLive(false);
    }
  }, []);

  const fetchRelations = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/relations");
      const data = await res.json();
      if (data.relations?.length) {
        setEdges(
          data.relations.map((r: { source_id: string; target_id: string; strength: number }) => ({
            source: r.source_id,
            target: r.target_id,
            strength: r.strength,
          }))
        );
      }
    } catch {
      // keep edges empty
    }
  }, []);

  useEffect(() => {
    fetchMemories();
    fetchRelations();
  }, [fetchMemories, fetchRelations]);

  // Convert memories to nodes
  useEffect(() => {
    setNodes(memories.map(nodeFromMemory));
  }, [memories]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  // Filtered nodes for list view
  const filteredMemories = memories.filter((m) => {
    if (filters.categories.size > 0 && !filters.categories.has(m.category)) return false;
    if (m.importance < filters.minImportance) return false;
    return true;
  });

  // Zoom handlers
  const handleZoomIn = () => {
    viewportRef.current.zoom = Math.min(4, viewportRef.current.zoom * 1.2);
  };
  const handleZoomOut = () => {
    viewportRef.current.zoom = Math.max(0.2, viewportRef.current.zoom * 0.8);
  };
  const handleZoomReset = () => {
    viewportRef.current = { offsetX: 0, offsetY: 0, zoom: 1 };
  };

  const handleMemoryCreated = () => {
    fetchMemories();
    fetchRelations();
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-0">
      {/* Left: Galaxy or List view */}
      <div className="flex-1 min-h-0 relative overflow-hidden rounded-xl lg:rounded-r-none border border-[var(--color-border)] bg-[var(--color-bg)]">
        {!isLive && memories.length === 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-center p-8">
            <svg
              className="w-12 h-12 text-[var(--color-text-dim)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
              />
            </svg>
            <p className="text-base font-semibold text-[var(--color-text-muted)]">No memories yet</p>
            <p className="text-sm text-[var(--color-text-dim)] max-w-xs">
              Memories are created automatically as you work. Use the chat below to add one manually.
            </p>
          </div>
        )}

        {/* View toggle — top right */}
        <ViewToggle activeView={viewMode} onChange={handleViewChange} />

        {/* Galaxy-specific controls (zoom, filters) — top left */}
        {viewMode === "galaxy" && (
          <GalaxyControls
            filters={filters}
            onFiltersChange={setFilters}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            nodeCount={filteredMemories.length}
            isListView={false}
            onToggleView={() => handleViewChange("list")}
          />
        )}

        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto p-6 pt-20 space-y-3">
            {filteredMemories.map((mem) => {
              const color = CATEGORY_COLORS[mem.category] ?? CATEGORY_COLORS.insight;
              return (
                <button
                  key={mem.id}
                  onClick={() => setSelectedId(mem.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 motion-reduce:transition-none
                             focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                             ${
                               selectedId === mem.id
                                 ? "border-[var(--color-accent)] bg-[var(--color-surface-2)] shadow-sm"
                                 : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] shadow-sm"
                             }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[var(--color-text)] flex-1 leading-relaxed">{mem.content}</p>
                    <span
                      className="px-2 py-1 text-xs rounded-full shrink-0 font-medium"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {CATEGORY_LABELS[mem.category] ?? mem.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-mono text-[var(--color-text-dim)]">I:{mem.importance}</span>
                    <span className="text-xs font-mono text-[var(--color-text-dim)]">C:{mem.confidence}</span>
                    {mem.scope && <span className="text-xs text-[var(--color-text-dim)]">{mem.scope}</span>}
                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex gap-1">
                        {mem.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg)] text-[var(--color-text-dim)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredMemories.length === 0 && (
              <div className="text-center py-16 text-[var(--color-text-dim)]">
                No memories match the current filters.
              </div>
            )}
          </div>
        ) : (
          <GalaxyCanvas
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
            filters={filters}
            viewportRef={viewportRef}
          />
        )}
      </div>

      {/* Right: Detail Panel + Chat — hidden on mobile unless a node is selected */}
      <div
        className={`w-full lg:w-80 xl:w-96 min-h-0 flex flex-col border lg:border-l-0 border-[var(--color-border)] rounded-xl lg:rounded-l-none bg-[var(--color-surface)] overflow-hidden
                       ${selectedId ? "flex" : "hidden lg:flex"}`}
      >
        <div className="flex-1 overflow-hidden">
          <MemoryDetailPanel
            selectedNode={selectedNode}
            totalNodes={memories.length}
            onClose={() => setSelectedId(null)}
            onMemoryUpdated={handleMemoryCreated}
            onMemoryDeleted={(id) => {
              setMemories((prev) => prev.filter((m) => m.id !== id));
              setSelectedId(null);
            }}
          />
        </div>
        <BrainChat
          onMemoryCreated={handleMemoryCreated}
          isCollapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
        />
      </div>
    </div>
  );
}

// ─── View Toggle Component ────────────────────────────────────────

function ViewToggle({ activeView, onChange }: { activeView: ViewMode; onChange: (mode: ViewMode) => void }) {
  const views: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: "galaxy",
      label: "Galaxy",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="8" cy="10" r="2" />
          <circle cx="16" cy="14" r="2" />
          <line x1="9.5" y1="11" x2="14.5" y2="13" />
        </svg>
      ),
    },
    {
      mode: "list",
      label: "List",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-1 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
      {views.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 motion-reduce:transition-none
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                     ${
                       activeView === mode
                         ? "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-sm"
                         : "text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/50"
                     }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
