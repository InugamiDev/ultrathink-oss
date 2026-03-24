import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { HooksClient } from "./hooks-client";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConfiguredHook {
  event: string;
  command: string;
  matcher?: string;
  timeout?: number;
  source: "project" | "global";
  /** Fingerprint for duplicate detection: event + normalized command basename */
  fingerprint: string;
}

export interface DuplicateGroup {
  fingerprint: string;
  event: string;
  description: string;
  hookIndices: number[];
}

export interface HookLogEntry {
  ts: string;
  hook: string;
  status: string;
  detail: string;
  pid?: number;
  duration_ms?: number;
}

export interface HookStats {
  hook: string;
  total: number;
  success: number;
  fail: number;
  started: number;
  avgDurationMs: number | null;
  /** Most recent log entry for this hook */
  lastExecution?: { ts: string; status: string; duration_ms?: number };
  /** Success rate as 0-100 */
  successRate: number;
  /** Health: "good" (>90%), "warning" (50-90%), "critical" (<50%) */
  health: "good" | "warning" | "critical";
  /** Trend based on recent vs overall success rate */
  trend: "improving" | "stable" | "degrading";
}

/* ------------------------------------------------------------------ */
/*  Data loaders (server-side only)                                    */
/* ------------------------------------------------------------------ */

const HOME = process.env.HOME ?? "~";
const GLOBAL_SETTINGS_PATH = join(HOME, ".claude/settings.json");
const HOOK_LOG_DIR = "/tmp/ultrathink-hook-logs";

/** Find project settings.json (look for .claude/settings.json in CWD ancestors) */
function findProjectSettingsPath(): string | null {
  const candidates = [
    join(process.cwd(), ".claude/settings.json"),
    // Common ultrathink project paths
    join(HOME, "Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/settings.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p) && p !== GLOBAL_SETTINGS_PATH) return p;
  }
  return null;
}

function normalizeCommand(cmd: string): string {
  // Extract the script basename for fingerprinting
  const parts = cmd.split(/[\s|;]/)[0]?.split("/") ?? [];
  return (parts[parts.length - 1] ?? cmd).replace(/\.sh$/, "").toLowerCase();
}

function loadHooksFromFile(path: string, source: "project" | "global"): ConfiguredHook[] {
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    const hooks: ConfiguredHook[] = [];
    const hookMap = raw.hooks ?? {};
    for (const [event, groups] of Object.entries(hookMap)) {
      const groupArr = groups as Array<{
        matcher?: string;
        hooks: Array<{ command: string; timeout?: number }>;
      }>;
      for (const group of groupArr) {
        for (const h of group.hooks) {
          const normalized = normalizeCommand(h.command);
          hooks.push({
            event,
            command: h.command,
            matcher: group.matcher,
            timeout: h.timeout,
            source,
            fingerprint: `${event}::${normalized}`,
          });
        }
      }
    }
    return hooks;
  } catch {
    return [];
  }
}

function loadConfiguredHooks(): ConfiguredHook[] {
  const globalHooks = loadHooksFromFile(GLOBAL_SETTINGS_PATH, "global");
  const projectPath = findProjectSettingsPath();
  const projectHooks = projectPath ? loadHooksFromFile(projectPath, "project") : [];
  return [...projectHooks, ...globalHooks];
}

function detectDuplicates(hooks: ConfiguredHook[]): DuplicateGroup[] {
  // Group by event type + similar command patterns
  const groups = new Map<string, number[]>();

  hooks.forEach((hook, idx) => {
    // Group by exact fingerprint (same event + same script name)
    if (!groups.has(hook.fingerprint)) {
      groups.set(hook.fingerprint, []);
    }
    groups.get(hook.fingerprint)!.push(idx);
  });

  // Also detect overlapping matchers within the same event
  const byEvent = new Map<string, number[]>();
  hooks.forEach((hook, idx) => {
    if (!byEvent.has(hook.event)) byEvent.set(hook.event, []);
    byEvent.get(hook.event)!.push(idx);
  });

  // For hooks with the same event and overlapping matchers, flag them
  for (const [event, indices] of byEvent) {
    if (indices.length < 2) continue;
    // Check for overlapping matchers (both undefined = overlap, or same matcher string)
    const matcherGroups = new Map<string, number[]>();
    for (const idx of indices) {
      const matcherKey = hooks[idx].matcher ?? "__no_matcher__";
      if (!matcherGroups.has(matcherKey)) matcherGroups.set(matcherKey, []);
      matcherGroups.get(matcherKey)!.push(idx);
    }
    for (const [matcher, mIndices] of matcherGroups) {
      if (mIndices.length < 2) continue;
      const key = `${event}::matcher::${matcher}`;
      if (!groups.has(key)) {
        groups.set(key, mIndices);
      }
    }
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [fingerprint, indices] of groups) {
    if (indices.length < 2) continue;
    // Deduplicate indices
    const unique = [...new Set(indices)];
    if (unique.length < 2) continue;
    const event = hooks[unique[0]].event;
    const scripts = unique.map((i) => normalizeCommand(hooks[i].command));
    const description =
      scripts[0] === scripts[1]
        ? `Same script "${scripts[0]}" registered multiple times on ${event}`
        : `Multiple hooks on ${event} with same matcher pattern`;
    duplicates.push({ fingerprint, event, description, hookIndices: unique });
  }

  return duplicates;
}

function loadHookLogs(maxFiles = 3, maxLines = 500): HookLogEntry[] {
  if (!existsSync(HOOK_LOG_DIR)) return [];
  try {
    const files = readdirSync(HOOK_LOG_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .slice(-maxFiles);

    const entries: HookLogEntry[] = [];
    for (const file of files) {
      const lines = readFileSync(join(HOOK_LOG_DIR, file), "utf-8").split("\n").filter(Boolean).slice(-maxLines);
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          /* skip malformed */
        }
      }
    }
    return entries.slice(-maxLines);
  } catch {
    return [];
  }
}

function computeStats(entries: HookLogEntry[]): HookStats[] {
  const map = new Map<
    string,
    {
      total: number;
      success: number;
      fail: number;
      started: number;
      durations: number[];
      lastEntry?: HookLogEntry;
      /** Track success in the most recent 20% of entries for trend */
      recentSuccess: number;
      recentFail: number;
    }
  >();

  // First pass: count totals per hook
  for (const e of entries) {
    if (!map.has(e.hook)) {
      map.set(e.hook, {
        total: 0,
        success: 0,
        fail: 0,
        started: 0,
        durations: [],
        recentSuccess: 0,
        recentFail: 0,
      });
    }
    const s = map.get(e.hook)!;
    s.total++;
    if (e.status === "done" || e.status === "allowed") s.success++;
    else if (e.status === "error" || e.status === "blocked" || e.status === "denied") s.fail++;
    else if (e.status === "started") s.started++;
    if (e.duration_ms !== undefined) s.durations.push(e.duration_ms);
    // Track last entry with a result status
    if (e.status !== "started") {
      s.lastEntry = e;
    }
  }

  // Second pass: compute recent trend (last 20% of entries per hook)
  const hookEntries = new Map<string, HookLogEntry[]>();
  for (const e of entries) {
    if (!hookEntries.has(e.hook)) hookEntries.set(e.hook, []);
    hookEntries.get(e.hook)!.push(e);
  }
  for (const [hook, hEntries] of hookEntries) {
    const s = map.get(hook)!;
    const recentCount = Math.max(1, Math.ceil(hEntries.length * 0.2));
    const recent = hEntries.slice(-recentCount);
    for (const e of recent) {
      if (e.status === "done" || e.status === "allowed") s.recentSuccess++;
      else if (e.status === "error" || e.status === "blocked" || e.status === "denied") s.recentFail++;
    }
  }

  return Array.from(map.entries()).map(([hook, s]) => {
    const resolved = s.success + s.fail;
    const successRate = resolved > 0 ? Math.round((s.success / resolved) * 100) : 100;

    const recentResolved = s.recentSuccess + s.recentFail;
    const recentRate = recentResolved > 0 ? Math.round((s.recentSuccess / recentResolved) * 100) : 100;

    let trend: "improving" | "stable" | "degrading" = "stable";
    if (resolved >= 4) {
      // Need enough data
      if (recentRate > successRate + 5) trend = "improving";
      else if (recentRate < successRate - 5) trend = "degrading";
    }

    let health: "good" | "warning" | "critical" = "good";
    if (successRate < 50) health = "critical";
    else if (successRate < 90) health = "warning";

    return {
      hook,
      total: s.total,
      success: s.success,
      fail: s.fail,
      started: s.started,
      avgDurationMs:
        s.durations.length > 0 ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : null,
      lastExecution: s.lastEntry
        ? {
            ts: s.lastEntry.ts,
            status: s.lastEntry.status,
            duration_ms: s.lastEntry.duration_ms,
          }
        : undefined,
      successRate,
      health,
      trend,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Page (server component)                                            */
/* ------------------------------------------------------------------ */

export default function HooksPage() {
  const configuredHooks = loadConfiguredHooks();
  const duplicates = detectDuplicates(configuredHooks);
  const logEntries = loadHookLogs();
  const stats = computeStats(logEntries);
  const recentEntries = logEntries.slice(-100).reverse();

  return (
    <HooksClient
      configuredHooks={configuredHooks}
      duplicates={duplicates}
      stats={stats}
      recentEntries={recentEntries}
      totalLogEntries={logEntries.length}
    />
  );
}
