import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";

const LOG_DIR = "/tmp/ultrathink-hook-logs";

interface LogEntry {
  ts: string;
  hook: string;
  status: string;
  detail: string;
  pid: number;
  duration_ms?: number;
}

export async function GET() {
  if (!existsSync(LOG_DIR)) {
    return NextResponse.json({ entries: [], stats: {} });
  }

  const files = readdirSync(LOG_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .slice(-7); // Last 7 days

  const entries: LogEntry[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(`${LOG_DIR}/${file}`, "utf-8");
      for (const line of raw.split("\n").filter(Boolean)) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  // Calculate per-hook stats
  const stats: Record<string, { count: number; avgMs: number; maxMs: number; p95Ms: number; errors: number }> = {};

  const byHook = new Map<string, number[]>();
  const errorsByHook = new Map<string, number>();

  for (const entry of entries) {
    if (entry.duration_ms !== undefined && entry.status === "done") {
      const arr = byHook.get(entry.hook) || [];
      arr.push(entry.duration_ms);
      byHook.set(entry.hook, arr);
    }
    if (entry.status === "error") {
      errorsByHook.set(entry.hook, (errorsByHook.get(entry.hook) || 0) + 1);
    }
  }

  for (const [hook, durations] of byHook) {
    durations.sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Idx = Math.floor(durations.length * 0.95);
    stats[hook] = {
      count: durations.length,
      avgMs: Math.round(sum / durations.length),
      maxMs: durations[durations.length - 1],
      p95Ms: durations[p95Idx] || durations[durations.length - 1],
      errors: errorsByHook.get(hook) || 0,
    };
  }

  return NextResponse.json({
    entries: entries.slice(-100), // Last 100 entries
    stats,
    totalEntries: entries.length,
    daysLoaded: files.length,
  });
}
