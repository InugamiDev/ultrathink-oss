"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  totals: {
    sessions: number;
    memories: number;
    skillInvocations: number;
    hookEvents: number;
  };
  topSkills: Array<{ skill_id: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

const layerColors: Record<string, string> = {
  orchestrator: "var(--color-accent)",
  hub: "var(--color-info)",
  utility: "var(--color-success)",
  domain: "var(--color-text-muted)",
};

type TimeRange = "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics?range=${timeRange}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not connected");
        return res.json();
      })
      .then((d) => {
        if (d.totals) {
          setData(d);
          setIsLive(true);
        }
      })
      .catch((err) => {
        console.warn("[analytics]", err.message);
        setError(err.message || "Failed to load analytics data");
      })
      .finally(() => setLoading(false));
  }, [timeRange]);

  const skillUsage = data?.topSkills
    ? data.topSkills.map((s) => ({
        name: String(s.skill_id),
        count: Number(s.count),
        layer: inferLayer(String(s.skill_id)),
      }))
    : [];

  const maxCount = Math.max(...skillUsage.map((s) => s.count), 1);

  const totals = data?.totals ?? null;

  return (
    <div className="space-y-8">
      {/* Time Range + Source Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                ${
                  timeRange === range
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
            >
              {range}
            </button>
          ))}
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full border ${isLive ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-[var(--color-text-dim)] border-[var(--color-border)]"}`}
        >
          {loading ? "Loading..." : isLive ? "Live" : "No data yet"}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <p className="font-medium">Failed to load analytics</p>
          <p className="text-sm mt-1 opacity-80">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <p className="text-sm text-[var(--color-text-muted)]">Total Sessions</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">{totals ? totals.sessions : "—"}</p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <p className="text-sm text-[var(--color-text-muted)]">Skills Invoked</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-info)]">{totals ? totals.skillInvocations : "—"}</p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <p className="text-sm text-[var(--color-text-muted)]">Memories Created</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-success)]">{totals ? totals.memories : "—"}</p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <p className="text-sm text-[var(--color-text-muted)]">Hook Events</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-warning)]">{totals ? totals.hookEvents : "—"}</p>
        </div>
      </div>

      {/* Skill Usage Bar Chart */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Top Skills</h3>
        <div className="space-y-3">
          {skillUsage.length === 0 && (
            <p className="text-sm text-[var(--color-text-dim)] text-center py-8">
              No skill usage recorded yet — start a session to populate this.
            </p>
          )}
          {skillUsage.map((skill) => (
            <div key={skill.name} className="flex items-center gap-4">
              <span className="w-32 text-sm text-[var(--color-text-muted)] text-right font-mono">{skill.name}</span>
              <div className="flex-1 h-8 bg-[var(--color-surface-2)] rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500 motion-reduce:transition-none"
                  style={{
                    width: `${(skill.count / maxCount) * 100}%`,
                    backgroundColor: layerColors[skill.layer] ?? "var(--color-text-muted)",
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="w-10 text-sm text-[var(--color-text-dim)] text-right">{skill.count}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-6 pt-4 border-t border-[var(--color-border)]">
          {Object.entries(layerColors).map(([layer, color]) => (
            <div key={layer} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-[var(--color-text-muted)] capitalize">{layer}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Graph Metrics */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Skill Graph</h3>
        <SkillGraphMetrics />
      </section>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Skill Invocations</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.slice(0, 14).map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                  >
                    <td className="py-3 px-4 font-medium">{row.date}</td>
                    <td className="py-3 px-4 text-[var(--color-text-muted)]">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SkillGraphMetrics() {
  const [metrics, setMetrics] = useState<{
    total: number;
    edges: number;
    avgConnections: number;
    mostConnected: { name: string; connections: number }[];
    layerCounts: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        const skills = data.skills ?? [];
        let totalEdges = 0;
        const connectionCounts: { name: string; connections: number }[] = [];

        for (const s of skills) {
          const linksTo = (s.linksTo || []).length;
          const linkedFrom = (s.linkedFrom || []).length;
          totalEdges += linksTo;
          connectionCounts.push({ name: s.name, connections: linksTo + linkedFrom });
        }

        connectionCounts.sort((a, b) => b.connections - a.connections);

        const layers: Record<string, number> = {};
        for (const s of skills) {
          layers[s.layer] = (layers[s.layer] || 0) + 1;
        }

        setMetrics({
          total: skills.length,
          edges: totalEdges,
          avgConnections: skills.length > 0 ? +((totalEdges * 2) / skills.length).toFixed(1) : 0,
          mostConnected: connectionCounts.slice(0, 5),
          layerCounts: layers,
        });
      })
      .catch((err) => console.warn("[analytics]", err.message));
  }, []);

  if (!metrics) return <p className="text-sm text-[var(--color-text-muted)]">Loading graph metrics...</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Total Skills</p>
          <p className="text-xl font-bold mt-1 text-[var(--color-accent)]">{metrics.total}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Total Edges</p>
          <p className="text-xl font-bold mt-1 text-[var(--color-info)]">{metrics.edges}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Avg Connections</p>
          <p className="text-xl font-bold mt-1 text-[var(--color-success)]">{metrics.avgConnections}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-dim)]">Graph Density</p>
          <p className="text-xl font-bold mt-1 text-amber-400">
            {metrics.total > 1 ? ((metrics.edges / (metrics.total * (metrics.total - 1))) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Most Connected Skills</h4>
        <div className="space-y-2">
          {metrics.mostConnected.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-28 text-sm font-mono text-[var(--color-text-muted)] text-right">{s.name}</span>
              <div className="flex-1 h-6 bg-[var(--color-surface-2)] rounded overflow-hidden">
                <div
                  className="h-full rounded bg-[var(--color-accent)] opacity-60"
                  style={{ width: `${(s.connections / (metrics.mostConnected[0]?.connections || 1)) * 100}%` }}
                />
              </div>
              <span className="w-8 text-xs text-[var(--color-text-dim)] text-right">{s.connections}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const KNOWN_HUBS = new Set([
  "plan",
  "scout",
  "debug",
  "fix",
  "test",
  "code-review",
  "brainstorm",
  "refactor",
  "optimize",
  "kanban",
  "research",
  "remotion",
]);
const KNOWN_ORCHESTRATORS = new Set(["cook", "team", "bootstrap", "ship", "migrate", "audit", "onboard"]);

function inferLayer(name: string): string {
  if (KNOWN_ORCHESTRATORS.has(name)) return "orchestrator";
  if (KNOWN_HUBS.has(name)) return "hub";
  if (
    name.includes("-") ||
    ["mermaid", "git-workflow", "docs-writer", "security-scanner", "vfs", "sequential-thinking"].includes(name)
  )
    return "utility";
  return "domain";
}
