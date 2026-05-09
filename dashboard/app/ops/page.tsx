"use client";

import { useState, useEffect } from "react";

/* ─── Types ───────────────────────────────────────────────────────── */

interface CMOData {
  sessions: {
    total: number;
    thisWeek: number;
    today: number;
    ghost: number;
    avgDurationMin: number;
    todayList: Array<{
      task_context: string;
      started_at: string;
      ended_at: string | null;
      memories_created: number;
      duration_min: number;
    }>;
  };
  skills: {
    total: number;
    thisWeek: number;
    successRate: number;
    topSkills: Array<{
      skill_id: string;
      count: number;
      avg_ms: number;
      successes: number;
    }>;
    recentFailures: Array<{
      skill_id: string;
      error_message: string;
      invoked_at: string;
    }>;
    performance: Array<{
      skill_id: string;
      avg_ms: number;
      calls: number;
    }>;
  };
  hooks: {
    total: number;
    thisWeek: number;
    severityBreakdown: Array<{ severity: string; count: number }>;
    actionBreakdown: Array<{ action_taken: string; count: number }>;
    recentBlocked: Array<{
      hook_name: string;
      description: string;
      path_accessed: string;
      created_at: string;
    }>;
  };
  tekio: {
    total: number;
    active: number;
    byCategory: Array<{
      category: string;
      count: number;
      applied: number;
      prevented: number;
    }>;
    topApplied: Array<{
      trigger: string;
      rule: string;
      category: string;
      times_applied: number;
      times_prevented: number;
      severity: number;
    }>;
    recent: Array<{
      trigger: string;
      category: string;
      severity: number;
      created_at: string;
    }>;
  };
  memory: {
    active: number;
    weekNew: number;
    relations: number;
    avgImportance: number;
  };
  dailyTrends: Array<{
    day: string;
    sessions: number;
    memories: number;
    skills: number;
    hooks: number;
  }>;
}

/* ─── Constants ───────────────────────────────────────────────────── */

const TEKIO_COLORS: Record<string, string> = {
  defensive: "var(--color-info)",
  auxiliary: "var(--color-warning)",
  offensive: "var(--color-error)",
};

const TEKIO_ICONS: Record<string, string> = {
  defensive: "🛡",
  auxiliary: "👁",
  offensive: "⚔",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "var(--color-info)",
  warning: "var(--color-warning)",
  critical: "var(--color-error)",
};

const ACTION_COLORS: Record<string, string> = {
  allowed: "var(--color-success)",
  blocked: "var(--color-error)",
  prompted: "var(--color-warning)",
  approved: "var(--color-info)",
  denied: "var(--color-error)",
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <p className="text-sm text-[var(--color-text-dim)] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? "var(--color-text)" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-dim)] mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2 mb-4">
      <span className="text-xl">{icon}</span>
      {title}
    </h3>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function CMOPage() {
  const [data, setData] = useState<CMOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ops")
      .then((res) => {
        if (!res.ok) throw new Error("Not connected");
        return res.json();
      })
      .then((d) => {
        if (d.sessions) {
          setData(d);
          setIsLive(true);
        }
      })
      .catch((err) => console.warn("[ops]", err.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]" />
      </div>
    );
  }

  /* ── Offline / no data ── */
  if (!data || !isLive) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <p className="text-base text-[var(--color-text-muted)]">Database not connected</p>
          <p className="text-sm text-[var(--color-text-dim)]">Configure DATABASE_URL in your .env to enable CMO.</p>
        </div>
      </div>
    );
  }

  const { sessions, skills, hooks, tekio, memory, dailyTrends } = data;
  const maxSkillCount = Math.max(...(skills.topSkills.map((s) => Number(s.count)) || [1]), 1);
  const maxPerfMs = Math.max(...(skills.performance.map((s) => Number(s.avg_ms)) || [1]), 1);

  return (
    <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
      {/* ─── Overview Stats ─────────────────────────────────────── */}
      <section>
        <SectionHeader title="Operations Overview" icon="⚡" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Sessions (All Time)"
            value={sessions.total}
            sub={`${sessions.thisWeek} this week`}
            color="var(--color-accent)"
          />
          <StatCard
            label="Today's Sessions"
            value={sessions.today}
            sub={sessions.ghost > 0 ? `${sessions.ghost} ghost sessions` : "All clean"}
            color="var(--color-info)"
          />
          <StatCard
            label="Avg Session Duration"
            value={`${sessions.avgDurationMin}m`}
            sub="Last 7 days"
            color="var(--color-success)"
          />
          <StatCard
            label="Skill Invocations"
            value={skills.total}
            sub={`${skills.thisWeek} this week`}
            color="var(--color-warning)"
          />
          <StatCard
            label="Skill Success Rate"
            value={`${skills.successRate}%`}
            sub="Last 7 days"
            color={skills.successRate >= 95 ? "var(--color-success)" : "var(--color-warning)"}
          />
          <StatCard
            label="Hook Events"
            value={hooks.total}
            sub={`${hooks.thisWeek} this week`}
            color="var(--color-info)"
          />
          <StatCard
            label="Active Memories"
            value={memory.active}
            sub={`+${memory.weekNew} this week`}
            color="var(--color-accent)"
          />
          <StatCard
            label="Tekiō Adaptations"
            value={tekio.active}
            sub={`${tekio.total} total (${tekio.total - tekio.active} inactive)`}
            color="var(--color-error)"
          />
        </div>
      </section>

      {/* ─── Daily Trends ───────────────────────────────────────── */}
      {dailyTrends.length > 0 && (
        <section>
          <SectionHeader title="7-Day Trends" icon="📊" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 text-[var(--color-text-dim)] font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-dim)] font-medium">Sessions</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-dim)] font-medium">Memories</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-dim)] font-medium">Skills</th>
                  <th className="text-right py-3 px-4 text-[var(--color-text-dim)] font-medium">Hooks</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrends.map((d) => (
                  <tr
                    key={d.day}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                  >
                    <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono">{formatDate(d.day)}</td>
                    <td className="text-right py-3 px-4 font-medium text-[var(--color-accent)]">{d.sessions}</td>
                    <td className="text-right py-3 px-4 font-medium text-[var(--color-info)]">{d.memories}</td>
                    <td className="text-right py-3 px-4 font-medium text-[var(--color-success)]">{d.skills}</td>
                    <td className="text-right py-3 px-4 font-medium text-[var(--color-warning)]">{d.hooks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Skill Performance ──────────────────────────────── */}
        <section>
          <SectionHeader title="Top Skills (7d)" icon="🎯" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
            {skills.topSkills.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No skill usage this week</p>
            ) : (
              skills.topSkills.map((s) => (
                <div key={s.skill_id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-[var(--color-text-muted)] truncate max-w-[60%]">
                      {s.skill_id}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
                      <span>{Number(s.count)} calls</span>
                      {s.avg_ms != null && <span>{Number(s.avg_ms)}ms</span>}
                      <span className="text-[var(--color-success)]">
                        {Number(s.count) > 0 ? Math.round((Number(s.successes) / Number(s.count)) * 100) : 100}%
                      </span>
                    </div>
                  </div>
                  <MiniBar value={Number(s.count)} max={maxSkillCount} color="var(--color-accent)" />
                </div>
              ))
            )}
          </div>
        </section>

        {/* ─── Skill Latency ─────────────────────────────────── */}
        <section>
          <SectionHeader title="Skill Latency (7d)" icon="⏱" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
            {skills.performance.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No latency data available</p>
            ) : (
              skills.performance.map((s) => {
                const ms = Number(s.avg_ms);
                const latencyColor =
                  ms > 5000 ? "var(--color-error)" : ms > 2000 ? "var(--color-warning)" : "var(--color-success)";
                return (
                  <div key={s.skill_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-[var(--color-text-muted)] truncate max-w-[60%]">
                        {s.skill_id}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span style={{ color: latencyColor }}>{ms}ms avg</span>
                        <span className="text-[var(--color-text-dim)]">{Number(s.calls)} calls</span>
                      </div>
                    </div>
                    <MiniBar value={ms} max={maxPerfMs} color={latencyColor} />
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ─── Tekiō — Wheel of Adaptation ────────────────────────── */}
      <section>
        <SectionHeader title="Tekiō — Cycle of Nova (適応)" icon="☸" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(["defensive", "auxiliary", "offensive"] as const).map((cat) => {
            const entry = tekio.byCategory.find((c) => c.category === cat);
            return (
              <div
                key={cat}
                className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{TEKIO_ICONS[cat]}</span>
                  <div>
                    <p className="text-sm font-medium capitalize" style={{ color: TEKIO_COLORS[cat] }}>
                      {cat}
                    </p>
                    <p className="text-xs text-[var(--color-text-dim)]">
                      {cat === "defensive" ? "Immunity" : cat === "auxiliary" ? "Perception" : "Strategy"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold" style={{ color: TEKIO_COLORS[cat] }}>
                      {entry ? Number(entry.count) : 0}
                    </p>
                    <p className="text-xs text-[var(--color-text-dim)]">Active</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--color-success)]">{entry ? Number(entry.applied) : 0}</p>
                    <p className="text-xs text-[var(--color-text-dim)]">Applied</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[var(--color-info)]">{entry ? Number(entry.prevented) : 0}</p>
                    <p className="text-xs text-[var(--color-text-dim)]">Prevented</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Applied Adaptations */}
        {tekio.topApplied.length > 0 && (
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-4">Most Applied Adaptations</h4>
            <div className="space-y-4">
              {tekio.topApplied.map((a, i) => (
                <div key={i} className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-1 text-xs rounded-full font-medium capitalize"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${TEKIO_COLORS[a.category]} 15%, transparent)`,
                        color: TEKIO_COLORS[a.category],
                      }}
                    >
                      {TEKIO_ICONS[a.category]} {a.category}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
                      <span>Applied {Number(a.times_applied)}x</span>
                      <span>Prevented {Number(a.times_prevented)}x</span>
                      <span>Severity {a.severity}/10</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text)] mb-1">
                    <span className="text-[var(--color-text-dim)]">Trigger:</span> {a.trigger}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    <span className="text-[var(--color-text-dim)]">Rule:</span> {a.rule}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ─── Hook Security ─────────────────────────────────── */}
        <section>
          <SectionHeader title="Hook Events (7d)" icon="🛡" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
            {/* Severity breakdown */}
            <div>
              <h4 className="text-xs text-[var(--color-text-dim)] mb-2 uppercase tracking-wider">By Severity</h4>
              <div className="flex flex-wrap gap-2">
                {hooks.severityBreakdown.map((s) => (
                  <span
                    key={s.severity}
                    className="px-3 py-1.5 text-sm rounded-full font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${SEVERITY_COLORS[s.severity] ?? "var(--color-text-dim)"} 15%, transparent)`,
                      color: SEVERITY_COLORS[s.severity] ?? "var(--color-text-dim)",
                    }}
                  >
                    {s.severity}: {Number(s.count)}
                  </span>
                ))}
                {hooks.severityBreakdown.length === 0 && (
                  <p className="text-sm text-[var(--color-text-dim)]">No events this week</p>
                )}
              </div>
            </div>

            {/* Action breakdown */}
            <div>
              <h4 className="text-xs text-[var(--color-text-dim)] mb-2 uppercase tracking-wider">By Action</h4>
              <div className="flex flex-wrap gap-2">
                {hooks.actionBreakdown.map((a) => (
                  <span
                    key={a.action_taken}
                    className="px-3 py-1.5 text-sm rounded-full font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${ACTION_COLORS[a.action_taken] ?? "var(--color-text-dim)"} 15%, transparent)`,
                      color: ACTION_COLORS[a.action_taken] ?? "var(--color-text-dim)",
                    }}
                  >
                    {a.action_taken}: {Number(a.count)}
                  </span>
                ))}
                {hooks.actionBreakdown.length === 0 && (
                  <p className="text-sm text-[var(--color-text-dim)]">No actions recorded</p>
                )}
              </div>
            </div>

            {/* Recent blocked */}
            {hooks.recentBlocked.length > 0 && (
              <div>
                <h4 className="text-xs text-[var(--color-text-dim)] mb-2 uppercase tracking-wider">Recent Blocks</h4>
                <div className="space-y-2">
                  {hooks.recentBlocked.map((b, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[var(--color-error)]">{b.hook_name}</span>
                        <span className="text-xs text-[var(--color-text-dim)]">{formatTime(b.created_at)}</span>
                      </div>
                      {b.path_accessed && (
                        <p className="text-xs text-[var(--color-text-dim)] mt-1 font-mono truncate">
                          {b.path_accessed}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Today's Sessions ──────────────────────────────── */}
        <section>
          <SectionHeader title="Today's Sessions" icon="📋" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            {sessions.todayList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] py-4 text-center">No sessions today</p>
            ) : (
              <div className="space-y-3">
                {sessions.todayList.map((s, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {s.task_context || "Unknown context"}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${s.ended_at ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)] animate-pulse"}`}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
                      <span>{formatTime(s.started_at)}</span>
                      <span>{Math.round(Number(s.duration_min))}m</span>
                      <span>{Number(s.memories_created)} memories</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── Recent Failures ────────────────────────────────────── */}
      {skills.recentFailures.length > 0 && (
        <section>
          <SectionHeader title="Recent Skill Failures" icon="⚠" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="space-y-3">
              {skills.recentFailures.map((f, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-error)]/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono text-[var(--color-error)]">{f.skill_id}</span>
                    <span className="text-xs text-[var(--color-text-dim)]">{formatTime(f.invoked_at)}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] truncate">
                    {f.error_message || "Unknown error"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Memory Health ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Memory Health" icon="🧠" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Memories" value={memory.active} color="var(--color-accent)" />
          <StatCard label="New This Week" value={`+${memory.weekNew}`} color="var(--color-success)" />
          <StatCard label="Relations" value={memory.relations} color="var(--color-info)" />
          <StatCard label="Avg Importance" value={`${memory.avgImportance}/10`} color="var(--color-warning)" />
        </div>
      </section>

      {/* ─── Recent Adaptations ─────────────────────────────────── */}
      {tekio.recent.length > 0 && (
        <section>
          <SectionHeader title="Recent Wheel Turns" icon="🔄" />
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="space-y-3">
              {tekio.recent.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                >
                  <span className="text-xl">{TEKIO_ICONS[a.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] truncate">{a.trigger}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-dim)]">
                      <span className="capitalize" style={{ color: TEKIO_COLORS[a.category] }}>
                        {a.category}
                      </span>
                      <span>Severity {a.severity}/10</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
