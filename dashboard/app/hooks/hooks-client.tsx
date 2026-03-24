"use client";

import { useState, useCallback } from "react";
import type { ConfiguredHook, DuplicateGroup, HookLogEntry, HookStats } from "./page";

type Tab = "config" | "logs" | "stats";
type ConfigFilter = "all" | "duplicates";

interface Props {
  configuredHooks: ConfiguredHook[];
  duplicates: DuplicateGroup[];
  stats: HookStats[];
  recentEntries: HookLogEntry[];
  totalLogEntries: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  allowed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  started: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  denied: "bg-red-500/15 text-red-400 border-red-500/30",
};

const eventColors: Record<string, string> = {
  SessionStart: "bg-purple-500",
  Stop: "bg-slate-400",
  PreCompact: "bg-amber-500",
  UserPromptSubmit: "bg-cyan-500",
  PreToolUse: "bg-blue-500",
  PostToolUse: "bg-green-500",
  PostToolUseFailure: "bg-red-500",
  Notification: "bg-pink-500",
};

const eventDescriptions: Record<string, string> = {
  SessionStart: "Fires when a Claude session begins",
  Stop: "Fires when a session ends",
  PreCompact: "Fires before context compaction",
  UserPromptSubmit: "Fires when user submits a prompt",
  PreToolUse: "Fires before a tool is invoked",
  PostToolUse: "Fires after a tool completes successfully",
  PostToolUseFailure: "Fires after a tool fails",
  Notification: "Fires for notification events",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

function formatRelativeTime(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return ts;
  }
}

function extractScriptName(command: string): string {
  const parts = command.split("/");
  const filename = parts[parts.length - 1] ?? command;
  return filename.replace(/\.sh$/, "").replace(/^ultrathink-/, "");
}

function formatMatcher(matcher?: string): string[] {
  if (!matcher) return [];
  // Handle comma-separated or pipe-separated tool names
  return matcher
    .split(/[,|]/)
    .map((m) => m.trim())
    .filter(Boolean);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Copy command"
      className="p-1.5 rounded-md text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors duration-150 shrink-0"
    >
      {copied ? (
        <svg
          className="w-3.5 h-3.5 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

function HealthIndicator({ health }: { health: "good" | "warning" | "critical" }) {
  const config = {
    good: { color: "bg-emerald-500", ring: "ring-emerald-500/30", label: "Healthy" },
    warning: { color: "bg-amber-500", ring: "ring-amber-500/30", label: "Warning" },
    critical: { color: "bg-red-500", ring: "ring-red-500/30", label: "Critical" },
  }[health];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.ring} ring-1`}
      title={config.label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`} />
      <span className="text-[var(--color-text-muted)]">{config.label}</span>
    </span>
  );
}

function TrendArrow({ trend }: { trend: "improving" | "stable" | "degrading" }) {
  if (trend === "improving") {
    return (
      <span className="inline-flex items-center text-emerald-400" title="Improving">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </span>
    );
  }
  if (trend === "degrading") {
    return (
      <span className="inline-flex items-center text-red-400" title="Degrading">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[var(--color-text-dim)]" title="Stable">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function HooksClient({ configuredHooks, duplicates, stats, recentEntries, totalLogEntries }: Props) {
  const [tab, setTab] = useState<Tab>("config");
  const [hookFilter, setHookFilter] = useState<string>("all");
  const [configFilter, setConfigFilter] = useState<ConfigFilter>("all");
  const [expandedHooks, setExpandedHooks] = useState<Set<number>>(new Set());

  const totalSuccess = stats.reduce((s, h) => s + h.success, 0);
  const totalFail = stats.reduce((s, h) => s + h.fail, 0);
  const uniqueHooks = new Set(recentEntries.map((e) => e.hook));
  const filteredEntries = hookFilter === "all" ? recentEntries : recentEntries.filter((e) => e.hook === hookFilter);

  // Build set of duplicate hook indices for quick lookup
  const duplicateIndices = new Set<number>();
  for (const g of duplicates) {
    for (const idx of g.hookIndices) duplicateIndices.add(idx);
  }

  // Group hooks by event type for the config tab
  const hooksByEvent = new Map<string, { hooks: ConfiguredHook[]; indices: number[] }>();
  configuredHooks.forEach((hook, idx) => {
    if (!hooksByEvent.has(hook.event)) hooksByEvent.set(hook.event, { hooks: [], indices: [] });
    const group = hooksByEvent.get(hook.event)!;
    group.hooks.push(hook);
    group.indices.push(idx);
  });

  // Filter for duplicates-only view
  const visibleEvents =
    configFilter === "duplicates"
      ? new Map([...hooksByEvent].filter(([, group]) => group.indices.some((idx) => duplicateIndices.has(idx))))
      : hooksByEvent;

  const toggleExpanded = (idx: number) => {
    setExpandedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Event order for consistent display
  const eventOrder = [
    "SessionStart",
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PreCompact",
    "Stop",
    "Notification",
  ];
  const sortedEvents = [...visibleEvents.keys()].sort(
    (a, b) =>
      (eventOrder.indexOf(a) === -1 ? 99 : eventOrder.indexOf(a)) -
      (eventOrder.indexOf(b) === -1 ? 99 : eventOrder.indexOf(b))
  );

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
          <p className="text-sm text-[var(--color-text-muted)]">Configured Hooks</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">{configuredHooks.length}</p>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {new Set(configuredHooks.map((h) => h.event)).size} event types
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
          <p className="text-sm text-[var(--color-text-muted)]">Total Log Entries</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-info)]">{totalLogEntries}</p>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">{uniqueHooks.size} distinct hooks</p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
          <p className="text-sm text-[var(--color-text-muted)]">Successful</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-success)]">{totalSuccess}</p>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {totalLogEntries > 0 ? `${Math.round((totalSuccess / totalLogEntries) * 100)}% success rate` : "No data"}
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
          <p className="text-sm text-[var(--color-text-muted)]">Failures</p>
          <p className="text-3xl font-bold mt-2 text-[var(--color-error)]">{totalFail}</p>
          <p className="text-sm text-[var(--color-text-dim)] mt-1">
            {totalFail === 0 ? "All clear" : "Needs attention"}
          </p>
        </div>
      </section>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {[
          { key: "config" as Tab, label: "Configuration", badge: null },
          { key: "logs" as Tab, label: "Event Logs", badge: null },
          { key: "stats" as Tab, label: "Statistics", badge: null },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 motion-reduce:transition-none
              focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
              ${
                tab === t.key
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Configuration Tab ---- */}
      {tab === "config" && (
        <section className="space-y-6">
          {/* Duplicate warning banner */}
          {duplicates.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-400">
                    {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} detected
                  </p>
                  <ul className="mt-2 space-y-1">
                    {duplicates.map((d, i) => (
                      <li key={i} className="text-xs text-amber-400/80">
                        {d.description}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setConfigFilter(configFilter === "duplicates" ? "all" : "duplicates")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 shrink-0 ${
                    configFilter === "duplicates"
                      ? "bg-amber-500 text-black"
                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  }`}
                >
                  {configFilter === "duplicates" ? "Show All" : "Show Duplicates Only"}
                </button>
              </div>
            </div>
          )}

          {/* Source legend */}
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Project (.claude/settings.json)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Global (~/.claude/settings.json)
            </span>
            {duplicates.length > 0 && (
              <span className="flex items-center gap-1.5 ml-auto">
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {duplicates.length} duplicate{duplicates.length !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>

          {/* Grouped by event type */}
          {configuredHooks.length === 0 ? (
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm p-12 text-center">
              <svg
                className="w-12 h-12 mx-auto text-[var(--color-text-dim)] mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <p className="text-[var(--color-text-muted)] font-medium">No hooks configured</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-2">
                Add hooks to ~/.claude/settings.json or .claude/settings.json to get started.
              </p>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm p-8 text-center">
              <p className="text-[var(--color-text-muted)]">No duplicates found. All hooks are unique.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedEvents.map((event) => {
                const group = visibleEvents.get(event)!;
                return (
                  <div
                    key={event}
                    className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden"
                  >
                    {/* Event header */}
                    <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${eventColors[event] ?? "bg-gray-500"}`} />
                      <h3 className="text-base font-semibold text-[var(--color-text)]">{event}</h3>
                      <span className="text-xs text-[var(--color-text-dim)]">{eventDescriptions[event] ?? ""}</span>
                      <span className="ml-auto text-sm text-[var(--color-text-muted)]">
                        {group.hooks.length} hook{group.hooks.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Hook cards */}
                    <div className="divide-y divide-[var(--color-border)]">
                      {group.hooks.map((hook, localIdx) => {
                        const globalIdx = group.indices[localIdx];
                        const isDuplicate = duplicateIndices.has(globalIdx);
                        const isExpanded = expandedHooks.has(globalIdx);
                        const matcherParts = formatMatcher(hook.matcher);

                        return (
                          <div
                            key={globalIdx}
                            className={`transition-colors duration-150 ${
                              isDuplicate ? "bg-amber-500/5" : ""
                            } hover:bg-[var(--color-surface-2)]`}
                          >
                            {/* Clickable header row */}
                            <button
                              onClick={() => toggleExpanded(globalIdx)}
                              className="w-full px-6 py-4 flex items-center gap-4 text-left"
                            >
                              {/* Expand/collapse chevron */}
                              <svg
                                className={`w-4 h-4 text-[var(--color-text-dim)] transition-transform duration-200 shrink-0 ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>

                              {/* Source badge */}
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full font-medium shrink-0 ${
                                  hook.source === "project"
                                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                    : "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                                }`}
                              >
                                {hook.source === "project" ? "project" : "global"}
                              </span>

                              {/* Script name */}
                              <span className="text-sm font-semibold text-[var(--color-accent)] truncate">
                                {extractScriptName(hook.command)}
                              </span>

                              {/* Matcher pills */}
                              {matcherParts.length > 0 && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs text-[var(--color-text-dim)]">matches:</span>
                                  {matcherParts.map((m, mi) => (
                                    <span
                                      key={mi}
                                      className="px-1.5 py-0.5 text-xs rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </span>
                              )}

                              {/* Duplicate warning */}
                              {isDuplicate && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium shrink-0">
                                  duplicate
                                </span>
                              )}

                              {/* Timeout */}
                              {hook.timeout && (
                                <span className="ml-auto text-xs text-[var(--color-text-dim)] shrink-0">
                                  {(hook.timeout / 1000).toFixed(0)}s timeout
                                </span>
                              )}
                            </button>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="px-6 pb-4 pl-14 space-y-3">
                                {/* Command code block */}
                                <div className="relative group">
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <CopyButton text={hook.command} />
                                  </div>
                                  <pre className="px-4 py-3 rounded-lg bg-[#0d0d14] border border-[var(--color-border)] text-sm font-mono text-[var(--color-text-muted)] overflow-x-auto">
                                    <code>{hook.command}</code>
                                  </pre>
                                </div>

                                {/* Metadata row */}
                                <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
                                  <span>
                                    Event: <span className="text-[var(--color-text-muted)]">{hook.event}</span>
                                  </span>
                                  {hook.matcher && (
                                    <span>
                                      Matcher: <span className="text-[var(--color-text-muted)]">{hook.matcher}</span>
                                    </span>
                                  )}
                                  {hook.timeout && (
                                    <span>
                                      Timeout: <span className="text-[var(--color-text-muted)]">{hook.timeout}ms</span>
                                    </span>
                                  )}
                                  <span>
                                    Source:{" "}
                                    <span className="text-[var(--color-text-muted)]">
                                      {hook.source === "project" ? ".claude/settings.json" : "~/.claude/settings.json"}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---- Event Logs Tab ---- */}
      {tab === "logs" && (
        <section className="space-y-6">
          {/* Hook filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHookFilter("all")}
              className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                ${
                  hookFilter === "all"
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
            >
              All
            </button>
            {Array.from(uniqueHooks)
              .sort()
              .map((hook) => (
                <button
                  key={hook}
                  onClick={() => setHookFilter(hook)}
                  className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-200 motion-reduce:transition-none
                    focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                    ${
                      hookFilter === hook
                        ? "bg-[var(--color-accent)] text-black"
                        : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                    }`}
                >
                  {hook}
                </button>
              ))}
          </div>

          {/* Log entries list */}
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-text)]">Recent Hook Events</h3>
              <span className="text-sm text-[var(--color-text-muted)]">
                Showing {filteredEntries.length} of {totalLogEntries} entries
              </span>
            </div>
            {filteredEntries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-[var(--color-text-dim)] mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-[var(--color-text-muted)] font-medium">No log entries yet</p>
                <p className="text-sm text-[var(--color-text-dim)] mt-2">
                  Hook execution logs will appear here once hooks fire. Logs are stored in /tmp/ultrathink-hook-logs/
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)] max-h-[32rem] overflow-y-auto">
                {filteredEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="px-6 py-3 flex items-center justify-between hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full border font-medium shrink-0 ${
                          statusColors[entry.status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-sm font-mono font-medium text-[var(--color-text)]">{entry.hook}</span>
                      {entry.detail && (
                        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-64">{entry.detail}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      {entry.pid && (
                        <span className="text-xs text-[var(--color-text-dim)] font-mono">pid:{entry.pid}</span>
                      )}
                      {entry.duration_ms !== undefined && (
                        <span
                          className={`text-sm font-mono font-medium ${
                            entry.duration_ms < 100
                              ? "text-emerald-400"
                              : entry.duration_ms < 500
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {entry.duration_ms}ms
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-dim)]">{formatTimestamp(entry.ts)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- Statistics Tab ---- */}
      {tab === "stats" && (
        <section className="space-y-6">
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="text-base font-semibold text-[var(--color-text)]">Execution Statistics per Hook</h3>
            </div>
            {stats.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-[var(--color-text-dim)] mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-[var(--color-text-muted)] font-medium">No statistics available yet</p>
                <p className="text-sm text-[var(--color-text-dim)] mt-2">
                  Statistics are computed from hook logs in /tmp/ultrathink-hook-logs/. Run some hooks to see data here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 font-medium">Hook</th>
                      <th className="px-6 py-3 font-medium text-center">Health</th>
                      <th className="px-6 py-3 font-medium text-right">Total</th>
                      <th className="px-6 py-3 font-medium text-right">Success</th>
                      <th className="px-6 py-3 font-medium text-right">Failed</th>
                      <th className="px-6 py-3 font-medium text-right">Rate</th>
                      <th className="px-6 py-3 font-medium text-center">Trend</th>
                      <th className="px-6 py-3 font-medium text-right">Avg Duration</th>
                      <th className="px-6 py-3 font-medium text-right">Last Run</th>
                      <th className="px-6 py-3 font-medium w-40">Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {stats
                      .sort((a, b) => b.total - a.total)
                      .map((s) => {
                        const maxTotal = Math.max(...stats.map((x) => x.total));
                        const barWidth = maxTotal > 0 ? (s.total / maxTotal) * 100 : 0;
                        const successPortion = s.total > 0 ? (s.success / s.total) * 100 : 0;
                        const failPortion = s.total > 0 ? (s.fail / s.total) * 100 : 0;

                        return (
                          <tr key={s.hook} className="hover:bg-[var(--color-surface-2)] transition-colors duration-150">
                            <td className="px-6 py-4 font-mono text-[var(--color-text)]">{s.hook}</td>
                            <td className="px-6 py-4 text-center">
                              <HealthIndicator health={s.health} />
                            </td>
                            <td className="px-6 py-4 text-right text-[var(--color-text-muted)]">{s.total}</td>
                            <td className="px-6 py-4 text-right text-emerald-400 font-medium">{s.success}</td>
                            <td className="px-6 py-4 text-right">
                              {s.fail > 0 ? (
                                <span className="text-red-400 font-medium">{s.fail}</span>
                              ) : (
                                <span className="text-[var(--color-text-dim)]">0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`font-medium ${
                                  s.successRate >= 90
                                    ? "text-emerald-400"
                                    : s.successRate >= 50
                                      ? "text-amber-400"
                                      : "text-red-400"
                                }`}
                              >
                                {s.successRate}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <TrendArrow trend={s.trend} />
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-[var(--color-text-muted)]">
                              {s.avgDurationMs !== null ? `${s.avgDurationMs}ms` : "--"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {s.lastExecution ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                                      statusColors[s.lastExecution.status] ??
                                      "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                    }`}
                                  >
                                    {s.lastExecution.status}
                                  </span>
                                  <span className="text-xs text-[var(--color-text-dim)]">
                                    {formatRelativeTime(s.lastExecution.ts)}
                                    {s.lastExecution.duration_ms !== undefined && (
                                      <> / {s.lastExecution.duration_ms}ms</>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--color-text-dim)]">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div
                                className="h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden"
                                title={`Success: ${s.success} | Started: ${s.started} | Failed: ${s.fail}`}
                              >
                                <div className="h-full flex" style={{ width: `${barWidth}%` }}>
                                  <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${successPortion}%` }}
                                  />
                                  <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{
                                      width: `${100 - successPortion - failPortion}%`,
                                    }}
                                  />
                                  {s.fail > 0 && (
                                    <div
                                      className="h-full bg-red-500 transition-all duration-300"
                                      style={{ width: `${failPortion}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-6 text-sm text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Success / Allowed
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Started / In-progress
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Error / Blocked
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
