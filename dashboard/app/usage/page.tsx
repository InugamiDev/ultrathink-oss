"use client";

import { useEffect, useState, useCallback } from "react";

interface UsageData {
  sessions: {
    list: Array<{
      id: string;
      task_context: string;
      started_at: string;
      ended_at: string | null;
      memories_created: number;
      duration_min: string;
      summary_preview: string | null;
    }>;
    daily: Array<{
      day: string;
      session_count: string;
      memories_created: string;
      total_minutes: string;
    }>;
    totals: {
      allTime: number;
      thisWeek: number;
      today: number;
      ghostSessions: number;
    };
    recentSessions: Array<{
      task_context: string;
      started_at: string;
      ended_at: string | null;
      memories_created: number;
      duration_min: string;
    }>;
    projectBreakdown: Array<{
      project: string;
      sessions: string;
      memories: string;
      minutes: string;
    }>;
  };
  memory: {
    active: number;
    archived: number;
    relations: number;
    avgImportance: number;
    categories: Array<{ category: string; count: string }>;
    weekNew: number;
    weekArchived: number;
    dailyMemories: Array<{ day: string; created: string }>;
    topAccessed: Array<{
      preview: string;
      category: string;
      access_count: number;
      importance: number;
    }>;
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function shortProject(ctx: string): string {
  const parts = ctx.split("/");
  return parts.length > 1 ? parts.slice(-1)[0] : ctx;
}

// Sparkline from daily data
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  return (
    <span className="font-mono text-sm tracking-tight" style={{ color }}>
      {data.map((v, i) => {
        const idx = Math.min(Math.floor((v / max) * 7), 7);
        return <span key={i}>{blocks[idx]}</span>;
      })}
    </span>
  );
}

// Progress ring
function ProgressRing({ value, max, size = 56, color }: { value: number; max: number; size?: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 motion-reduce:transition-none"
      />
    </svg>
  );
}

// Category color mapping
const catColors: Record<string, string> = {
  solution: "#22c55e",
  pattern: "#3b82f6",
  architecture: "#f59e0b",
  preference: "#a855f7",
  insight: "#06b6d4",
  "tool-preference": "#64748b",
  identity: "#ec4899",
  "project-context": "#14b8a6",
  "session-summary": "#f97316",
  decision: "#ef4444",
};

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading usage data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-error)]/30">
        <p className="text-[var(--color-error)]">Failed to load usage data: {error}</p>
      </div>
    );
  }

  const { sessions, memory } = data;

  // Compute totals from closed sessions only
  const totalMinutes = sessions.daily.reduce((sum, d) => sum + Number(d.total_minutes || 0), 0);
  const _totalMemories = sessions.daily.reduce((sum, d) => sum + Number(d.memories_created || 0), 0);
  const closedCount = sessions.list.length;

  // Sparkline data (reverse to chronological order)
  const dailySessions = [...sessions.daily].reverse().map((d) => Number(d.session_count));
  const dailyMems = [...memory.dailyMemories].reverse().map((d) => Number(d.created));
  const dailyMins = [...sessions.daily].reverse().map((d) => Number(d.total_minutes));

  // Category bar chart data
  const topCats = memory.categories.slice(0, 6);
  const maxCatCount = Math.max(...topCats.map((c) => Number(c.count)), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Usage</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {formatDay(sessions.daily[sessions.daily.length - 1]?.day || "")} —{" "}
            {formatDay(sessions.daily[0]?.day || "")}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="px-4 py-2 rounded-lg text-sm bg-[var(--color-surface)] border border-[var(--color-border)]
                     hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          Refresh
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Sessions",
            value: closedCount,
            sub: `${sessions.totals.allTime} all-time`,
            color: "var(--color-accent)",
            sparkData: dailySessions,
            sparkColor: "#f59e0b",
          },
          {
            label: "Active Time",
            value: formatDuration(totalMinutes),
            sub: `${sessions.totals.today} today`,
            color: "var(--color-info)",
            sparkData: dailyMins,
            sparkColor: "#3b82f6",
          },
          {
            label: "Memories Created",
            value: memory.weekNew,
            sub: `${memory.active} active total`,
            color: "var(--color-success)",
            sparkData: dailyMems,
            sparkColor: "#22c55e",
          },
          {
            label: "Archived",
            value: memory.weekArchived,
            sub: `${memory.archived} total archived`,
            color: "var(--color-error)",
            sparkData: null,
            sparkColor: "",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm
                       hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none"
          >
            <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[var(--color-text-dim)]">{stat.sub}</p>
              {stat.sparkData && <Sparkline data={stat.sparkData} color={stat.sparkColor} />}
            </div>
          </div>
        ))}
      </div>

      {/* Ghost sessions warning */}
      {sessions.totals.ghostSessions > 0 && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-sm text-[var(--color-warning)]">
          {sessions.totals.ghostSessions} ghost sessions detected (no end time). These are from duplicate hook firings
          or unclean exits.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily Timeline — spans 2 cols */}
        <div className="xl:col-span-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Daily Timeline</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-dim)]">
                  <th className="px-6 py-3 font-medium">Day</th>
                  <th className="px-6 py-3 font-medium text-right">Sessions</th>
                  <th className="px-6 py-3 font-medium text-right">Duration</th>
                  <th className="px-6 py-3 font-medium text-right">Memories</th>
                  <th className="px-6 py-3 font-medium w-32">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(() => {
                  const maxMins = Math.max(...sessions.daily.map((d) => Number(d.total_minutes || 0)), 1);
                  return sessions.daily.map((day) => {
                    const mins = Number(day.total_minutes || 0);
                    const mems = Number(day.memories_created || 0);
                    const sess = Number(day.session_count || 0);
                    const barPct = Math.max((mins / maxMins) * 100, 4);
                    return (
                      <tr key={day.day} className="hover:bg-[var(--color-surface-2)] transition-colors duration-150">
                        <td className="px-6 py-3 font-medium">{formatDay(day.day)}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{sess}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-[var(--color-info)]">
                          {formatDuration(mins)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-[var(--color-success)]">+{mems}</td>
                        <td className="px-6 py-3">
                          <div className="h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500 motion-reduce:transition-none"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Projects</h2>
          </div>
          <div className="p-4 space-y-3">
            {(() => {
              const maxSess = Math.max(...sessions.projectBreakdown.map((p) => Number(p.sessions)), 1);
              return sessions.projectBreakdown.map((proj) => {
                const barPct = Math.max((Number(proj.sessions) / maxSess) * 100, 8);
                return (
                  <div key={proj.project} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[160px]" title={proj.project}>
                        {shortProject(proj.project)}
                      </span>
                      <span className="text-[var(--color-text-dim)] tabular-nums shrink-0 ml-2">
                        {proj.sessions}s · {formatDuration(Number(proj.minutes || 0))}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-info)] rounded-full transition-all duration-500 motion-reduce:transition-none"
                        style={{ width: `${barPct}%`, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Memory Overview */}
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Memory Overview</h2>
          </div>
          <div className="p-6">
            {/* Ring stats row */}
            <div className="flex items-center justify-around mb-6">
              {[
                {
                  label: "Active",
                  value: memory.active,
                  max: memory.active + memory.archived,
                  color: "var(--color-success)",
                },
                { label: "Relations", value: memory.relations, max: memory.relations, color: "var(--color-info)" },
                { label: "Avg Imp", value: memory.avgImportance, max: 10, color: "var(--color-accent)" },
              ].map((ring) => (
                <div key={ring.label} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <ProgressRing value={ring.value} max={ring.max} color={ring.color} />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums"
                      style={{ color: ring.color }}
                    >
                      {typeof ring.value === "number" && ring.value > 999
                        ? `${(ring.value / 1000).toFixed(1)}k`
                        : ring.value}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-text-dim)]">{ring.label}</span>
                </div>
              ))}
            </div>

            {/* Category bars */}
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">Categories</p>
              {topCats.map((cat) => {
                const count = Number(cat.count);
                const pct = Math.max((count / maxCatCount) * 100, 4);
                const color = catColors[cat.category] || "#64748b";
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-[var(--color-text-muted)] truncate">{cat.category}</span>
                    <div className="flex-1 h-3 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.75 }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-[var(--color-text-dim)] w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Most Recalled + Daily Growth */}
        <div className="space-y-6">
          {/* Most Recalled */}
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Most Recalled</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {memory.topAccessed.map((mem, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm truncate" title={mem.preview}>
                      {mem.preview}
                    </p>
                    <p className="text-xs text-[var(--color-text-dim)]">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: catColors[mem.category] || "#64748b" }}
                      />
                      {mem.category} · imp {mem.importance}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-accent)] shrink-0">
                    {mem.access_count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Memory Growth */}
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Daily Memory Growth</h2>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-1 h-20">
                {[...memory.dailyMemories].reverse().map((day, i) => {
                  const count = Number(day.created);
                  const maxCreated = Math.max(...memory.dailyMemories.map((d) => Number(d.created)), 1);
                  const heightPct = Math.max((count / maxCreated) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm transition-all duration-500 motion-reduce:transition-none"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: "var(--color-success)",
                          opacity: 0.6 + (heightPct / 100) * 0.4,
                        }}
                        title={`${formatDay(day.day)}: +${count}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1 mt-1">
                {[...memory.dailyMemories].reverse().map((day, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-xs text-[var(--color-text-dim)]">
                      {new Date(day.day).toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Sessions */}
      {sessions.recentSessions.length > 0 && (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Today&apos;s Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-dim)]">
                  <th className="px-6 py-3 font-medium">Started</th>
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium text-right">Duration</th>
                  <th className="px-6 py-3 font-medium text-right">Memories</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {sessions.recentSessions.map((s, i) => (
                  <tr key={i} className="hover:bg-[var(--color-surface-2)] transition-colors duration-150">
                    <td className="px-6 py-3 tabular-nums">{formatTime(s.started_at)}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        {shortProject(s.task_context)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--color-info)]">
                      {formatDuration(Number(s.duration_min))}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {s.memories_created > 0 ? (
                        <span className="text-[var(--color-success)]">+{s.memories_created}</span>
                      ) : (
                        <span className="text-[var(--color-text-dim)]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
