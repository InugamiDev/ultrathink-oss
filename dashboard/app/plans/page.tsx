"use client";

import { useState, useEffect, useCallback } from "react";

interface PlanPhase {
  heading: string;
  completed: boolean;
}

interface Plan {
  id: string;
  title: string;
  status: "draft" | "active" | "completed";
  summary: string;
  phases: PlanPhase[];
  phaseCount: number;
  completedPhases: number;
  file_path: string;
  created_at: string;
  content: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
};

const statusDots: Record<string, string> = {
  draft: "bg-slate-400",
  active: "bg-blue-400",
  completed: "bg-green-400",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Not connected");
      const data = await res.json();
      setIsLive(true);
      if (data.plans?.length > 0) {
        setPlans(data.plans);
      }
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const statusCounts = plans.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filtered = plans
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q);
    });

  const totalPhases = plans.reduce((sum, p) => sum + p.phaseCount, 0);
  const totalCompleted = plans.reduce((sum, p) => sum + p.completedPhases, 0);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard label="Total Plans" value={plans.length} color="var(--color-accent)" loading={loading} />
        <SummaryCard label="Active" value={statusCounts["active"] ?? 0} color="var(--color-info)" loading={loading} />
        <SummaryCard
          label="Completed"
          value={statusCounts["completed"] ?? 0}
          color="var(--color-success)"
          loading={loading}
        />
        <SummaryCard
          label="Phase Progress"
          value={totalPhases > 0 ? `${totalCompleted}/${totalPhases}` : "0"}
          color="var(--color-warning)"
          loading={loading}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "completed", "draft"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-3 rounded-lg text-base font-medium capitalize transition-all duration-200 motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                ${
                  statusFilter === status
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
            >
              {status === "all" ? `All (${plans.length})` : `${status} (${statusCounts[status] ?? 0})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-dim)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-lg text-base bg-[var(--color-surface)] border border-[var(--color-border)]
                         text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]
                         hover:border-[var(--color-border-hover)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                         transition-all duration-200 motion-reduce:transition-none w-56"
            />
          </div>

          {/* Source Indicator */}
          <span
            className={`text-xs px-3 py-1 rounded-full border shrink-0 ${
              isLive
                ? "text-green-400 border-green-500/20 bg-green-500/10"
                : "text-amber-400 border-amber-500/20 bg-amber-500/10"
            }`}
          >
            {loading ? "..." : isLive ? "Live" : "No Data"}
          </span>
        </div>
      </div>

      {/* Overall Progress Bar */}
      {totalPhases > 0 && (
        <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--color-text-muted)]">Overall Phase Completion</h3>
            <span className="text-sm font-mono text-[var(--color-text-dim)]">
              {totalCompleted} / {totalPhases} phases ({Math.round((totalCompleted / totalPhases) * 100)}%)
            </span>
          </div>
          <div className="h-3 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${(totalCompleted / totalPhases) * 100}%` }}
            />
          </div>
        </section>
      )}

      {/* Plans List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center text-[var(--color-text-muted)]">
            Loading plans...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-muted)]">
              {plans.length === 0 ? "No plan files found." : "No plans matching filter."}
            </p>
            {plans.length === 0 && (
              <p className="text-sm text-[var(--color-text-dim)] mt-2">
                Plans are read from ~/.claude/plans/*.md files.
              </p>
            )}
          </div>
        ) : (
          filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isExpanded={expandedId === plan.id}
              onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Summary Card ──────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="text-3xl font-bold mt-2" style={{ color }}>
        {loading ? "..." : value}
      </p>
    </div>
  );
}

/* ─── Plan Card ─────────────────────────────────────────────────── */

function PlanCard({ plan, isExpanded, onToggle }: { plan: Plan; isExpanded: boolean; onToggle: () => void }) {
  const progressPercent = plan.phaseCount > 0 ? Math.round((plan.completedPhases / plan.phaseCount) * 100) : 0;

  return (
    <div
      className={`rounded-xl bg-[var(--color-surface)] border shadow-sm transition-all duration-200 motion-reduce:transition-none ${
        isExpanded
          ? "border-[var(--color-accent)]/40"
          : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
      }`}
    >
      {/* Card Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-xl transition-all duration-200 motion-reduce:transition-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDots[plan.status]}`} />
              <h4 className="text-lg font-medium text-[var(--color-text)] truncate">{plan.title}</h4>
              <span className={`px-2 py-1 text-xs rounded-full border shrink-0 ${statusColors[plan.status]}`}>
                {plan.status}
              </span>
            </div>

            {plan.summary && (
              <p className="text-sm text-[var(--color-text-muted)] mt-2 ml-[1.375rem] line-clamp-2">{plan.summary}</p>
            )}

            <div className="flex items-center gap-4 mt-3 ml-[1.375rem] text-sm text-[var(--color-text-dim)]">
              <span>{formatDate(plan.created_at)}</span>
              {plan.phaseCount > 0 && (
                <span>
                  {plan.completedPhases}/{plan.phaseCount} phases
                </span>
              )}
              <span className="font-mono text-xs truncate max-w-[20rem]">{shortenPath(plan.file_path)}</span>
            </div>
          </div>

          {/* Progress ring + expand chevron */}
          <div className="flex items-center gap-3 shrink-0">
            {plan.phaseCount > 0 && <ProgressRing percent={progressPercent} size={40} />}
            <svg
              className={`w-5 h-5 text-[var(--color-text-dim)] transition-transform duration-200 motion-reduce:transition-none ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Inline progress bar */}
        {plan.phaseCount > 0 && (
          <div className="mt-4 ml-[1.375rem]">
            <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor:
                    plan.status === "completed"
                      ? "var(--color-success)"
                      : plan.status === "active"
                        ? "var(--color-info)"
                        : "var(--color-text-dim)",
                }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          {/* Phase list */}
          {plan.phases.length > 0 && (
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h5 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Phases</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plan.phases.map((phase, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                  >
                    {phase.completed ? (
                      <svg
                        className="w-5 h-5 text-green-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-[var(--color-text-dim)] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    )}
                    <span
                      className={`text-sm ${phase.completed ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text)]"}`}
                    >
                      {phase.heading}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content preview */}
          <div className="px-6 py-4">
            <h5 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Content</h5>
            <div className="max-h-[32rem] overflow-y-auto rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4">
              <MarkdownContent content={plan.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Progress Ring ─────────────────────────────────────────────── */

function ProgressRing({ percent, size }: { percent: number; size: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percent >= 100 ? "var(--color-success)" : "var(--color-info)"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[var(--color-text-dim)]">
        {percent}%
      </span>
    </div>
  );
}

/* ─── Simple Markdown Renderer ──────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trimEnd();

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h5 key={i} className="text-base font-semibold text-[var(--color-text)] mt-4 mb-1">
              {trimmed.slice(4)}
            </h5>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4
              key={i}
              className="text-lg font-semibold text-[var(--color-accent)] mt-6 mb-2 pb-1 border-b border-[var(--color-border)]"
            >
              {trimmed.slice(3)}
            </h4>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={i} className="text-xl font-bold text-[var(--color-text)] mt-4 mb-2">
              {trimmed.slice(2)}
            </h3>
          );
        }

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
          return <hr key={i} className="border-[var(--color-border)] my-3" />;
        }

        // Checkbox items
        if (trimmed.startsWith("- [x]") || trimmed.startsWith("- [X]")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <svg
                className="w-4 h-4 mt-0.5 text-green-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-[var(--color-text-muted)] line-through">{trimmed.slice(6)}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- [ ]")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="w-4 h-4 mt-0.5 rounded border border-[var(--color-border)] shrink-0" />
              <span className="text-[var(--color-text)]">{trimmed.slice(6)}</span>
            </div>
          );
        }

        // Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-[var(--color-text-dim)] shrink-0" />
              <span className="text-[var(--color-text-muted)]">{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Code blocks (simple — just detect backtick lines)
        if (trimmed.startsWith("```")) {
          return (
            <div key={i} className="text-xs font-mono text-[var(--color-text-dim)]">
              {trimmed}
            </div>
          );
        }

        // Bold text lines (like **Status**: ...)
        if (trimmed.startsWith("**")) {
          return (
            <p key={i} className="text-[var(--color-text-muted)]">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        }

        // Table rows
        if (trimmed.startsWith("|")) {
          if (/^\|[\s-:|]+\|$/.test(trimmed)) return null; // skip separator rows
          const cells = trimmed
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          return (
            <div key={i} className="flex gap-4 font-mono text-xs text-[var(--color-text-muted)]">
              {cells.map((cell, j) => (
                <span key={j} className="flex-1 truncate">
                  {cell}
                </span>
              ))}
            </div>
          );
        }

        // Empty lines
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={i} className="text-[var(--color-text-muted)]">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Inline Formatting ─────────────────────────────────────────── */

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle **bold** and `code` inline
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find the earliest match
    const boldIdx = boldMatch?.index ?? Infinity;
    const codeIdx = codeMatch?.index ?? Infinity;

    if (boldIdx === Infinity && codeIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    if (boldIdx <= codeIdx && boldMatch) {
      parts.push(remaining.slice(0, boldIdx));
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--color-text)]">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (codeMatch) {
      parts.push(remaining.slice(0, codeIdx));
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-accent)]"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeIdx + codeMatch[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function shortenPath(filePath: string): string {
  // Show ~/.claude/plans/filename.md instead of full absolute path
  const marker = ".claude/plans/";
  const idx = filePath.indexOf(marker);
  if (idx !== -1) return "~/" + filePath.slice(idx);
  return filePath;
}
