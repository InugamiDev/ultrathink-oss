"use client";

import { useState, useEffect, useCallback } from "react";

interface ActivityItem {
  id: string;
  type: "hook" | "memory" | "test" | "session";
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "error" | "info";
}

interface ActivityData {
  items: ActivityItem[];
  total: number;
  sources: { hooks: boolean; memories: boolean; tests: boolean };
}

const typeColors: Record<string, string> = {
  hook: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  memory: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  test: "bg-green-500/10 text-green-400 border-green-500/20",
  session: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const statusIcons: Record<string, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

const typeIcons: Record<string, React.ReactNode> = {
  hook: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  ),
  memory: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
      />
    </svg>
  ),
  test: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  ),
  session: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

function formatTime(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return ts;
  }
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      const json = await res.json();
      setData(json);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchActivity]);

  const filteredItems =
    data?.items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      return true;
    }) ?? [];

  const typeCounts = (data?.items ?? []).reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Activity Feed</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {data
              ? `${data.total} events from ${Object.values(data.sources).filter(Boolean).length} sources`
              : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchActivity}
            aria-label="Refresh activity feed"
            className="px-4 py-2 rounded-lg text-sm bg-[var(--color-surface)] border border-[var(--color-border)]
                       text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            Refresh
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-label={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh every 5 seconds"}
            aria-pressed={autoRefresh}
            className={`px-4 py-2 rounded-lg text-sm border transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                       ${
                         autoRefresh
                           ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)]"
                           : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                       }`}
          >
            {autoRefresh ? "Live" : "Auto"}
          </button>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "hook", "memory", "test"].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 motion-reduce:transition-none
              focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
              ${
                typeFilter === type
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
              }`}
          >
            {type === "all" ? `All (${data?.total ?? 0})` : `${type} (${typeCounts[type] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Source Status */}
      {data && (
        <div className="flex gap-6">
          {[
            { name: "Hooks", active: data.sources.hooks },
            { name: "Memories", active: data.sources.memories },
            { name: "Tests", active: data.sources.tests },
          ].map((src) => (
            <div key={src.name} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${src.active ? "bg-green-500" : "bg-[var(--color-text-dim)]"}`} />
              <span className="text-xs text-[var(--color-text-muted)]">{src.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Activity Timeline */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Loading activity...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--color-text-muted)]">No activity recorded yet.</p>
            <p className="text-sm text-[var(--color-text-dim)] mt-2">
              Activity appears when hooks fire, memories are written, or tests run.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-start gap-4 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
              >
                {/* Status dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusIcons[item.status]}`} />
                </div>

                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0 text-[var(--color-text-muted)]">{typeIcons[item.type]}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text)]">{item.title}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${typeColors[item.type]}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 truncate">{item.detail}</p>
                </div>

                {/* Time */}
                <span className="text-xs text-[var(--color-text-dim)] flex-shrink-0 mt-0.5">
                  {formatTime(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
