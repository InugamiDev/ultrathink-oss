"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface WidgetData {
  sessions: {
    daily: Array<{ day: string; session_count: string; total_minutes: string; memories_created: string }>;
    totals: { thisWeek: number; today: number; ghostSessions: number };
  };
  memory: {
    active: number;
    weekNew: number;
    avgImportance: number;
  };
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  return (
    <span className="font-mono text-xs tracking-tight" style={{ color }}>
      {data.map((v, i) => (
        <span key={i}>{blocks[Math.min(Math.floor((v / max) * 7), 7)]}</span>
      ))}
    </span>
  );
}

export function UsageWidget() {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d?.sessions?.daily) setData(d);
      })
      .catch((err) => console.warn("[usage-widget]", err.message));
  }, []);

  if (!data) {
    return (
      <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-[var(--color-surface-2)] rounded mb-4" />
        <div className="h-8 w-20 bg-[var(--color-surface-2)] rounded mb-2" />
        <div className="h-3 w-40 bg-[var(--color-surface-2)] rounded" />
      </div>
    );
  }

  const { sessions, memory } = data;
  const totalMins = sessions.daily.reduce((s, d) => s + Number(d.total_minutes || 0), 0);
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const dailySessions = [...sessions.daily].reverse().map((d) => Number(d.session_count));
  const dailyMems = [...sessions.daily].reverse().map((d) => Number(d.memories_created));

  return (
    <Link
      href="/usage"
      className="group block rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm
                 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-2)]
                 transition-all duration-200 motion-reduce:transition-none
                 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
    >
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Weekly Usage</h3>
          <svg
            className="w-4 h-4 text-[var(--color-text-dim)] group-hover:text-[var(--color-accent)] transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-[var(--color-accent)] tabular-nums">{sessions.totals.thisWeek}</p>
            <p className="text-xs text-[var(--color-text-dim)]">sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-info)] tabular-nums">{timeStr}</p>
            <p className="text-xs text-[var(--color-text-dim)]">active</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-success)] tabular-nums">{memory.weekNew}</p>
            <p className="text-xs text-[var(--color-text-dim)]">memories</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-dim)]">Sessions</span>
              <MiniSparkline data={dailySessions} color="var(--color-accent)" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-dim)]">Memories</span>
              <MiniSparkline data={dailyMems} color="var(--color-success)" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--color-text)]">{memory.active.toLocaleString()}</p>
            <p className="text-xs text-[var(--color-text-dim)]">total active</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
