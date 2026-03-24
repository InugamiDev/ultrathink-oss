"use client";

import { useState, useCallback } from "react";
import type { GalaxyNode } from "@/lib/types/memory";
import { CATEGORY_COLORS, CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/types/memory";

interface MemoryDetailPanelProps {
  selectedNode: GalaxyNode | null;
  totalNodes: number;
  onClose: () => void;
  onMemoryUpdated?: () => void;
  onMemoryDeleted?: (id: string) => void;
}

export function MemoryDetailPanel({
  selectedNode,
  totalNodes,
  onClose,
  onMemoryUpdated,
  onMemoryDeleted,
}: MemoryDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImportance, setEditImportance] = useState(5);
  const [editConfidence, setEditConfidence] = useState(0.8);
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEditing = useCallback(() => {
    if (!selectedNode) return;
    const { memory } = selectedNode;
    setEditContent(memory.content);
    setEditImportance(memory.importance);
    setEditConfidence(memory.confidence);
    setEditCategory(memory.category);
    setIsEditing(true);
    setConfirmDelete(false);
  }, [selectedNode]);

  const handleSave = useCallback(async () => {
    if (!selectedNode) return;
    setSaving(true);
    try {
      const res = await fetch("/api/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedNode.memory.id,
          content: editContent,
          importance: editImportance,
          confidence: editConfidence,
          category: editCategory,
        }),
      });
      if (res.ok) {
        setIsEditing(false);
        onMemoryUpdated?.();
      }
    } finally {
      setSaving(false);
    }
  }, [selectedNode, editContent, editImportance, editConfidence, editCategory, onMemoryUpdated]);

  const handleDelete = useCallback(async () => {
    if (!selectedNode) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/memory?id=${selectedNode.memory.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(false);
        onMemoryDeleted?.(selectedNode.memory.id);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [selectedNode, onMemoryDeleted, onClose]);

  if (!selectedNode) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-[var(--color-text-dim)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="9" cy="10" r="1.5" />
            <circle cx="15" cy="14" r="1.5" />
            <line x1="10" y1="11" x2="14" y2="13" />
          </svg>
        </div>
        <p className="text-base text-[var(--color-text-muted)] mb-2" role="heading" aria-level={3}>
          Select a planet
        </p>
        <p className="text-sm text-[var(--color-text-dim)]">
          Click on any planet in the galaxy to view its memory details.
        </p>
        <div className="mt-8 w-full space-y-3">
          <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-dim)]">Total Memories</p>
            <p className="text-xl font-bold text-[var(--color-accent)]">{totalNodes}</p>
          </div>
        </div>
      </div>
    );
  }

  const { memory } = selectedNode;
  const color = CATEGORY_COLORS[memory.category] ?? CATEGORY_COLORS.insight;

  if (isEditing) {
    return (
      <div className="p-6 h-full overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text)]">Edit Memory</h3>
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          >
            Cancel
          </button>
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-dim)] block mb-1">Content</label>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--color-text-dim)] block mb-1">Category</label>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-dim)] block mb-1">Importance: {editImportance}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={editImportance}
              onChange={(e) => setEditImportance(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-dim)] block mb-1">
              Confidence: {(editConfidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={editConfidence * 100}
              onChange={(e) => setEditConfidence(Number(e.target.value) / 100)}
              className="w-full accent-[var(--color-success)]"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}20`, color }}>
          {CATEGORY_LABELS[memory.category] ?? memory.category}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={startEditing}
            aria-label="Edit memory"
            className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(!confirmDelete)}
            aria-label="Delete memory"
            className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
          <p className="text-sm text-red-400">Delete this memory permanently?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-1.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        <h3 className="text-sm text-[var(--color-text-dim)] mb-2">Content</h3>
        <p className="text-base text-[var(--color-text)] leading-relaxed">{memory.content}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Importance</p>
          <p className="text-lg font-bold text-[var(--color-info)]">{memory.importance}/10</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${memory.importance * 10}%`, backgroundColor: color }}
            />
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Confidence</p>
          <p className="text-lg font-bold text-[var(--color-success)]">{(memory.confidence * 100).toFixed(0)}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-success)] transition-all duration-300"
              style={{ width: `${memory.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-3">
        {memory.scope && (
          <div>
            <p className="text-xs text-[var(--color-text-dim)]">Scope</p>
            <p className="text-sm text-[var(--color-text-muted)] font-mono">{memory.scope}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-[var(--color-text-dim)]">Created</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date(memory.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-dim)]">ID</p>
          <p className="text-sm text-[var(--color-text-dim)] font-mono truncate">{memory.id}</p>
        </div>
      </div>

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-text-dim)] mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
