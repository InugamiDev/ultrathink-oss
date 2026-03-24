"use client";

import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, type GalaxyFilters } from "@/lib/types/memory";

interface GalaxyControlsProps {
  filters: GalaxyFilters;
  onFiltersChange: (filters: GalaxyFilters) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  nodeCount: number;
  isListView: boolean;
  onToggleView: () => void;
}

export function GalaxyControls({
  filters,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  nodeCount,
  isListView,
  onToggleView,
}: GalaxyControlsProps) {
  const toggleCategory = (cat: string) => {
    const next = new Set(filters.categories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    onFiltersChange({ ...filters, categories: next });
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-3 z-10">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={onToggleView}
          className="px-4 py-3 rounded-lg text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)]
                     text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]
                     transition-all duration-200 motion-reduce:transition-none
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          {isListView ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="8" cy="10" r="2" />
                <circle cx="16" cy="14" r="2" />
                <line x1="9.5" y1="11" x2="14.5" y2="13" />
              </svg>
              Galaxy
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
              List
            </span>
          )}
        </button>
      </div>

      {/* Zoom controls — only in galaxy view */}
      {!isListView && (
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <button
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="px-3 py-2 rounded-md text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            +
          </button>
          <button
            onClick={onZoomReset}
            aria-label="Reset zoom"
            className="px-3 py-2 rounded-md text-xs text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            1:1
          </button>
          <button
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="px-3 py-2 rounded-md text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            -
          </button>
        </div>
      )}

      {/* Category filters */}
      <div className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-dim)] px-2 pb-1">Categories</span>
        {ALL_CATEGORIES.map((cat) => {
          const active = filters.categories.size === 0 || filters.categories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-200 motion-reduce:transition-none
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                         ${active ? "text-[var(--color-text)]" : "text-[var(--color-text-dim)] opacity-50"}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Importance slider */}
      <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <label className="text-xs text-[var(--color-text-dim)] block mb-2">
          Min Importance: {filters.minImportance}
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={filters.minImportance}
          onChange={(e) => onFiltersChange({ ...filters, minImportance: Number(e.target.value) })}
          className="w-full accent-[var(--color-accent)]"
        />
      </div>

      {/* Node count */}
      <div className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-dim)]">
        {nodeCount} memor{nodeCount === 1 ? "y" : "ies"}
      </div>
    </div>
  );
}
