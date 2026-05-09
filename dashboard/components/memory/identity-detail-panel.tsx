"use client";

import type { IdentityNode, IdentityEdge } from "./identity-graph-canvas";
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from "./identity-graph-canvas";

interface IdentityDetailPanelProps {
  nodes: IdentityNode[];
  edges: IdentityEdge[];
  selectedId: string | null;
  onClose: () => void;
}

export function IdentityDetailPanel({ nodes, edges, selectedId, onClose }: IdentityDetailPanelProps) {
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"
            />
          </svg>
        </div>
        <p className="text-base text-[var(--color-text-muted)] mb-2" role="heading" aria-level={3}>
          Select a node
        </p>
        <p className="text-sm text-[var(--color-text-dim)]">
          Click on any node in the identity graph to view its details.
        </p>
        <div className="mt-8 w-full space-y-3">
          <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-dim)]">Total Nodes</p>
            <p className="text-xl font-bold text-[var(--color-accent)]">{nodes.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-dim)]">Total Edges</p>
            <p className="text-xl font-bold text-[var(--color-info)]">{edges.length}</p>
          </div>
        </div>
      </div>
    );
  }

  const color = NODE_TYPE_COLORS[selectedNode.type] ?? "#64748b";
  const typeLabel = NODE_TYPE_LABELS[selectedNode.type] ?? selectedNode.type;

  // Find all connected nodes with edge labels
  const connections: Array<{ node: IdentityNode; edgeLabel: string; direction: "outgoing" | "incoming" }> = [];
  for (const edge of edges) {
    if (edge.source_id === selectedNode.id) {
      const target = nodes.find((n) => n.id === edge.target_id);
      if (target) connections.push({ node: target, edgeLabel: edge.label, direction: "outgoing" });
    }
    if (edge.target_id === selectedNode.id) {
      const source = nodes.find((n) => n.id === edge.source_id);
      if (source) connections.push({ node: source, edgeLabel: edge.label, direction: "incoming" });
    }
  }

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${color}20`, color }}>
          {typeLabel}
        </div>
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

      {/* Label */}
      <div>
        <h3 className="text-sm text-[var(--color-text-dim)] mb-2">Label</h3>
        <p className="text-base text-[var(--color-text)] leading-relaxed">{selectedNode.label}</p>
      </div>

      {/* Data (JSON) */}
      {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
        <div>
          <h3 className="text-sm text-[var(--color-text-dim)] mb-2">Data</h3>
          <pre className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg)] p-3 rounded-lg border border-[var(--color-border)] overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
            {JSON.stringify(selectedNode.data, (_k, v) => (v === null ? undefined : v), 2)}
          </pre>
        </div>
      )}

      {/* Connected Nodes */}
      {connections.length > 0 && (
        <div>
          <h3 className="text-sm text-[var(--color-text-dim)] mb-3">Connections ({connections.length})</h3>
          <div className="space-y-2">
            {connections.map((conn, i) => {
              const connColor = NODE_TYPE_COLORS[conn.node.type] ?? "#64748b";
              return (
                <div
                  key={`${conn.node.id}-${i}`}
                  className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: connColor }} />
                    <span className="text-sm text-[var(--color-text)] truncate flex-1">{conn.node.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg)] font-mono">
                      {conn.direction === "outgoing" ? "-->" : "<--"} {conn.edgeLabel}
                    </span>
                    <span style={{ color: connColor }}>{NODE_TYPE_LABELS[conn.node.type] ?? conn.node.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-[var(--color-text-dim)]">Created</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date(selectedNode.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-dim)]">Updated</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {new Date(selectedNode.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-dim)]">ID</p>
          <p className="text-sm text-[var(--color-text-dim)] font-mono truncate">{selectedNode.id}</p>
        </div>
      </div>
    </div>
  );
}
