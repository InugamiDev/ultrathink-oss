"use client";

import type { ToolEvent, WebSource } from "@/lib/ai/types";

/* ─── Tool Activity Indicator ──────────────────────────────────────── */

const TOOL_ICONS: Record<string, { icon: string; color: string }> = {
  web_search: { icon: "🔍", color: "text-cyan-400" },
  analyze: { icon: "📊", color: "text-amber-400" },
  plan: { icon: "📋", color: "text-blue-400" },
  generate: { icon: "✨", color: "text-purple-400" },
  tool_call: { icon: "⚡", color: "text-emerald-400" },
};

export function ToolActivityCard({ event }: { event: ToolEvent }) {
  const { icon, color } = TOOL_ICONS[event.type] ?? TOOL_ICONS.tool_call;
  const isRunning = event.status === "running";

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm
                  ${
                    isRunning
                      ? "bg-[var(--color-surface-2)] border-[var(--color-border-hover)] animate-pulse"
                      : "bg-[var(--color-surface)] border-[var(--color-border)]"
                  }`}
    >
      <span className="text-base">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={`font-medium ${color}`}>{event.label}</span>
        {event.detail && (
          <span className="ml-2 text-[var(--color-text-dim)] truncate">{event.detail}</span>
        )}
      </div>
      {isRunning ? (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin text-[var(--color-text-dim)]" />
      ) : event.durationMs !== undefined ? (
        <span className="text-xs text-[var(--color-text-dim)] font-mono shrink-0">{event.durationMs}ms</span>
      ) : (
        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

/* ─── Tool Activity List ───────────────────────────────────────────── */

export function ToolActivityList({ events }: { events: ToolEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-3">
      {events.map((event, i) => (
        <ToolActivityCard key={i} event={event} />
      ))}
    </div>
  );
}

/* ─── Web Source Cards ─────────────────────────────────────────────── */

export function SourceCards({ sources }: { sources: WebSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
      <p className="text-xs font-medium text-[var(--color-text-dim)] mb-2 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
          />
        </svg>
        Sources ({sources.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((src, i) => {
          const domain = (() => {
            try { return new URL(src.url).hostname.replace("www.", ""); }
            catch { return src.url; }
          })();
          return (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]
                         text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
                         transition-colors duration-150 max-w-64 truncate"
            >
              <span className="w-3 h-3 rounded-sm bg-[var(--color-border)] flex items-center justify-center text-[8px] font-bold shrink-0">
                {(i + 1).toString()}
              </span>
              <span className="truncate">{src.title || domain}</span>
              <svg className="w-3 h-3 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
