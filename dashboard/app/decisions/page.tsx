"use client";

// intent: Decisions dashboard — list/create/edit/deactivate behavioral constraint rules
// status: done
// confidence: high

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Save,
  ChevronDown,
  ChevronRight,
  Zap,
  Tag,
  X,
  ArrowLeft,
  ShieldOff,
  ShieldCheck,
  Filter,
} from "lucide-react";

interface Decision {
  id: string;
  rule: string;
  priority: number;
  scope: string;
  source: "user" | "claude" | "tekio";
  context: string | null;
  is_active: boolean;
  times_applied: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const SOURCES = ["user", "claude", "tekio"] as const;

const SOURCE_COLORS: Record<string, string> = {
  user: "#3b82f6",
  claude: "#a855f7",
  tekio: "#f59e0b",
};

function priorityColor(p: number): string {
  if (p >= 8) return "#ef4444";
  if (p >= 5) return "#f59e0b";
  return "#64748b";
}

function priorityLabel(p: number): string {
  if (p >= 8) return "CRITICAL";
  if (p >= 5) return "IMPORTANT";
  return "note";
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("active"); // "all" | "active" | "inactive"
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, Partial<Decision>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deactivatingIds, setDeactivatingIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newDecision, setNewDecision] = useState({
    rule: "",
    scope: "global",
    priority: 5,
    source: "user" as Decision["source"],
    tags: "",
  });
  const [creating, setCreating] = useState(false);

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter === "active") params.set("active", "true");
      else if (activeFilter === "inactive") params.set("active", "false");

      const res = await fetch(`/api/decisions?${params}`);
      const data = await res.json();
      let items: Decision[] = data.decisions ?? [];

      // Client-side filters for scope and source (API handles active filter)
      if (scopeFilter !== "all") {
        items = items.filter((d) => d.scope === scopeFilter);
      }
      if (sourceFilter !== "all") {
        items = items.filter((d) => d.source === sourceFilter);
      }

      setDecisions(items);
    } catch {
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter, sourceFilter, activeFilter]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Expand a decision for editing
  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const dec = decisions.find((d) => d.id === id);
      if (dec) {
        setEditState((prev) => ({
          ...prev,
          [id]: {
            rule: dec.rule,
            priority: dec.priority,
            scope: dec.scope,
          },
        }));
      }
    }
  };

  // Update edit field
  const updateField = (id: string, field: string, value: unknown) => {
    setEditState((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  // Save decision
  const handleSave = async (id: string) => {
    const edits = editState[id];
    if (!edits) return;

    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...edits }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, ...data.decision } : d)));
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Deactivate decision (soft delete)
  const handleDeactivate = async (id: string) => {
    setDeactivatingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/decisions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, ...data.decision } : d)));
        if (expandedId === id) setExpandedId(null);
      }
    } finally {
      setDeactivatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Reactivate decision
  const handleReactivate = async (id: string) => {
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, ...data.decision } : d)));
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Create decision
  const handleCreate = async () => {
    if (!newDecision.rule.trim()) return;
    setCreating(true);
    try {
      const tags = newDecision.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule: newDecision.rule,
          scope: newDecision.scope || "global",
          priority: newDecision.priority,
          source: newDecision.source,
          tags: tags.length > 0 ? tags : [],
        }),
      });

      if (res.ok) {
        setNewDecision({
          rule: "",
          scope: "global",
          priority: 5,
          source: "user",
          tags: "",
        });
        setShowCreate(false);
        fetchDecisions();
      }
    } finally {
      setCreating(false);
    }
  };

  // Unique scopes from data
  const scopes = Array.from(new Set(decisions.map((d) => d.scope).filter(Boolean))).sort();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Decisions</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {decisions.length} decision{decisions.length !== 1 ? "s" : ""} loaded
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
            showCreate
              ? "bg-[var(--color-accent)] text-black"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          <Plus className="w-4 h-4" />
          New Decision
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Create Decision</h3>
          <textarea
            value={newDecision.rule}
            onChange={(e) => setNewDecision((p) => ({ ...p, rule: e.target.value }))}
            placeholder="Decision rule — e.g. 'Always use TypeScript strict mode'"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-dim)]">Scope</label>
              <input
                type="text"
                value={newDecision.scope}
                onChange={(e) => setNewDecision((p) => ({ ...p, scope: e.target.value }))}
                placeholder="global"
                className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-dim)]">Priority ({newDecision.priority})</label>
              <input
                type="range"
                min={1}
                max={10}
                value={newDecision.priority}
                onChange={(e) => setNewDecision((p) => ({ ...p, priority: Number(e.target.value) }))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-dim)]">Source</label>
              <select
                value={newDecision.source}
                onChange={(e) => setNewDecision((p) => ({ ...p, source: e.target.value as Decision["source"] }))}
                className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-dim)]">Tags (comma-sep)</label>
              <input
                type="text"
                value={newDecision.tags}
                onChange={(e) => setNewDecision((p) => ({ ...p, tags: e.target.value }))}
                placeholder="tag1, tag2"
                className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newDecision.rule.trim()}
              className="px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="w-4 h-4 text-[var(--color-text-dim)]" />

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          <option value="all">All scopes</option>
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        >
          <option value="all">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
          {(["active", "inactive", "all"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setActiveFilter(val)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                activeFilter === val
                  ? "bg-[var(--color-accent)] text-black font-medium"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">Loading decisions...</div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-[var(--color-text-muted)]">No decisions found.</p>
          <p className="text-sm text-[var(--color-text-dim)]">
            Create your first decision above to constrain behavior.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((dec) => {
            const isExpanded = expandedId === dec.id;
            const edit = editState[dec.id];
            const isSaving = savingIds.has(dec.id);
            const isDeactivating = deactivatingIds.has(dec.id);
            const pColor = priorityColor(dec.priority);
            const sColor = SOURCE_COLORS[dec.source] ?? "#64748b";

            return (
              <div
                key={dec.id}
                className={`rounded-xl border transition-all duration-200 ${
                  !dec.is_active
                    ? "opacity-60 bg-[var(--color-surface)] border-[var(--color-border)]"
                    : isExpanded
                      ? "bg-[var(--color-surface)] border-[var(--color-accent)]/30"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                {/* Row header */}
                <button
                  onClick={() => toggleExpand(dec.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-dim)] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] shrink-0" />
                  )}

                  {/* Status icon */}
                  <span className="shrink-0">
                    {dec.is_active ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldOff className="w-4 h-4 text-[var(--color-text-dim)]" />
                    )}
                  </span>

                  {/* Priority badge */}
                  <span
                    className="px-2 py-0.5 text-xs rounded-full shrink-0 font-bold tabular-nums"
                    style={{
                      backgroundColor: pColor + "20",
                      color: pColor,
                    }}
                  >
                    P{dec.priority}
                  </span>

                  {/* Scope badge */}
                  <span className="px-2 py-0.5 text-xs rounded-full shrink-0 bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    {dec.scope}
                  </span>

                  {/* Source badge */}
                  <span
                    className="px-2 py-0.5 text-xs rounded-full shrink-0 font-medium"
                    style={{
                      backgroundColor: sColor + "20",
                      color: sColor,
                    }}
                  >
                    {dec.source}
                  </span>

                  {/* Rule preview */}
                  <span className="text-sm text-[var(--color-text)] truncate flex-1">
                    {dec.rule.slice(0, 80)}
                    {dec.rule.length > 80 ? "..." : ""}
                  </span>

                  {/* Times applied */}
                  <span className="text-xs text-[var(--color-text-dim)] shrink-0 tabular-nums flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {dec.times_applied}
                  </span>

                  {/* Tags count */}
                  {dec.tags && dec.tags.length > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-[var(--color-text-dim)] shrink-0">
                      <Tag className="w-3 h-3" />
                      {dec.tags.length}
                    </span>
                  )}
                </button>

                {/* Expanded edit form */}
                {isExpanded && edit && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)]">
                    <div className="pt-3 space-y-2">
                      <label className="text-xs text-[var(--color-text-dim)] uppercase">Rule</label>
                      <textarea
                        value={edit.rule ?? ""}
                        onChange={(e) => updateField(dec.id, "rule", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] resize-y focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-dim)]">
                          Priority ({edit.priority ?? dec.priority}) — {priorityLabel(edit.priority ?? dec.priority)}
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={edit.priority ?? dec.priority}
                          onChange={(e) => updateField(dec.id, "priority", Number(e.target.value))}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-dim)]">Scope</label>
                        <input
                          type="text"
                          value={edit.scope ?? dec.scope}
                          onChange={(e) => updateField(dec.id, "scope", e.target.value || "global")}
                          placeholder="global"
                          className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-dim)]">Source</label>
                        <span className="block px-2 py-1.5 text-sm text-[var(--color-text-muted)]">{dec.source}</span>
                      </div>
                    </div>

                    {/* Tags display */}
                    {dec.tags && dec.tags.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-dim)] flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {dec.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Context */}
                    {dec.context && (
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--color-text-dim)]">Context</label>
                        <p className="text-sm text-[var(--color-text-muted)]">{dec.context}</p>
                      </div>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)] pt-1">
                      <span>ID: {dec.id}</span>
                      <span>Created: {new Date(dec.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(dec.updated_at).toLocaleDateString()}</span>
                      <span>Applied: {dec.times_applied}x</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-between pt-2">
                      {dec.is_active ? (
                        <button
                          onClick={() => handleDeactivate(dec.id)}
                          disabled={isDeactivating}
                          className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          {isDeactivating ? "Deactivating..." : "Deactivate"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(dec.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isSaving ? "Reactivating..." : "Reactivate"}
                        </button>
                      )}
                      <button
                        onClick={() => handleSave(dec.id)}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
