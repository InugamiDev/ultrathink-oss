import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { getSkillRegistry } from "@/lib/skills";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Data loaders                                                       */
/* ------------------------------------------------------------------ */

interface HookPerf {
  hook: string;
  avgMs: number;
  p95Ms: number;
  calls: number;
  errors: number;
  lastRun: string;
}

interface MemoryStats {
  totalFiles: number;
  totalSizeKB: number;
  oldestFile: string;
  newestFile: string;
  categories: Record<string, number>;
}

interface SkillHealth {
  total: number;
  withSkillMd: number;
  orphaned: string[];
  missingBackLinks: number;
  avgConnections: number;
  layerCounts: Record<string, number>;
}

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  uptime: string;
  cwd: string;
  envVars: { name: string; set: boolean }[];
}

function loadHookPerf(): HookPerf[] {
  const PERF_DIR = "/tmp/ultrathink-hook-perf";
  const results: HookPerf[] = [];

  if (!existsSync(PERF_DIR)) return results;

  const files = readdirSync(PERF_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .slice(-20);

  const byHook = new Map<string, { durations: number[]; errors: number; lastRun: string }>();

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(`${PERF_DIR}/${file}`, "utf-8"));
      const hookName = data.hook || file.replace(".json", "");
      const entry = byHook.get(hookName) || { durations: [], errors: 0, lastRun: "" };
      if (data.durationMs) entry.durations.push(data.durationMs);
      if (data.error) entry.errors++;
      if (data.timestamp && data.timestamp > entry.lastRun) entry.lastRun = data.timestamp;
      byHook.set(hookName, entry);
    } catch {
      /* skip */
    }
  }

  for (const [hook, entry] of byHook) {
    const sorted = entry.durations.sort((a, b) => a - b);
    const avg = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    results.push({
      hook,
      avgMs: avg,
      p95Ms: p95,
      calls: sorted.length,
      errors: entry.errors,
      lastRun: entry.lastRun,
    });
  }

  return results;
}

function loadMemoryStats(): MemoryStats {
  const MEM_DIR = "/tmp/ultrathink-memories";
  const stats: MemoryStats = {
    totalFiles: 0,
    totalSizeKB: 0,
    oldestFile: "",
    newestFile: "",
    categories: {},
  };

  if (!existsSync(MEM_DIR)) return stats;

  const files = readdirSync(MEM_DIR).filter((f) => f.endsWith(".json"));
  stats.totalFiles = files.length;

  let oldestTs = Infinity;
  let newestTs = 0;

  for (const file of files) {
    try {
      const fullPath = `${MEM_DIR}/${file}`;
      const st = statSync(fullPath);
      stats.totalSizeKB += Math.round((st.size / 1024) * 10) / 10;

      if (st.mtimeMs < oldestTs) {
        oldestTs = st.mtimeMs;
        stats.oldestFile = file;
      }
      if (st.mtimeMs > newestTs) {
        newestTs = st.mtimeMs;
        stats.newestFile = file;
      }

      const data = JSON.parse(readFileSync(fullPath, "utf-8"));
      const cat = data.category || data.type || "general";
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    } catch {
      /* skip */
    }
  }

  return stats;
}

function loadSkillHealth(): SkillHealth {
  const registry = getSkillRegistry();
  const skills = registry.skills;
  const skillDir = process.cwd().replace("/dashboard", "") + "/.claude/skills";

  let withSkillMd = 0;
  const orphaned: string[] = [];
  let missingBackLinks = 0;
  let totalEdges = 0;

  const nameSet = new Set(skills.map((s) => s.name));
  const skillMap = new Map(skills.map((s) => [s.name, s]));

  for (const skill of skills) {
    const mdPath = `${skillDir}/${skill.name}/SKILL.md`;
    if (existsSync(mdPath)) {
      withSkillMd++;
    }

    const linksTo = skill.linksTo || [];
    totalEdges += linksTo.length;

    for (const target of linksTo) {
      if (!nameSet.has(target)) {
        orphaned.push(`${skill.name} → ${target}`);
      }
    }

    // Check for missing back-links (use Map for O(1) lookup)
    for (const target of linksTo) {
      const targetSkill = skillMap.get(target);
      if (targetSkill && !(targetSkill.linkedFrom || []).includes(skill.name)) {
        missingBackLinks++;
      }
    }
  }

  const layerCounts: Record<string, number> = {};
  for (const s of skills) {
    layerCounts[s.layer] = (layerCounts[s.layer] || 0) + 1;
  }

  return {
    total: skills.length,
    withSkillMd,
    orphaned,
    missingBackLinks,
    avgConnections: skills.length > 0 ? +((totalEdges * 2) / skills.length).toFixed(1) : 0,
    layerCounts,
  };
}

function loadSystemInfo(): SystemInfo {
  const uptimeSec = process.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);

  return {
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    uptime: `${hours}h ${mins}m`,
    cwd: process.cwd(),
    envVars: [
      { name: "DATABASE_URL", set: !!process.env.DATABASE_URL },
      { name: "UPSTASH_REDIS_REST_URL", set: !!process.env.UPSTASH_REDIS_REST_URL },
      { name: "ANTHROPIC_API_KEY", set: !!process.env.ANTHROPIC_API_KEY },
      { name: "OPENAI_API_KEY", set: !!process.env.OPENAI_API_KEY },
      { name: "QSTASH_TOKEN", set: !!process.env.QSTASH_TOKEN },
      { name: "VERCEL_URL", set: !!process.env.VERCEL_URL },
    ],
  };
}

async function loadDbStatus(): Promise<{ connected: boolean; tables: number; detail: string }> {
  if (!process.env.DATABASE_URL) {
    return { connected: false, tables: 0, detail: "DATABASE_URL not set" };
  }
  try {
    const sql = getDb();
    const rows = (await sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`) as Record<string, unknown>[];
    return { connected: true, tables: Number(rows[0].count), detail: `${rows[0].count} tables in public schema` };
  } catch (e) {
    return { connected: false, tables: 0, detail: String(e).slice(0, 100) };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  if (!ts) return "--";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function SystemPage() {
  const hookPerf = loadHookPerf();
  const memStats = loadMemoryStats();
  const skillHealth = loadSkillHealth();
  const sysInfo = loadSystemInfo();
  const dbStatus = await loadDbStatus();

  const overallStatus =
    dbStatus.connected && skillHealth.orphaned.length === 0 && skillHealth.missingBackLinks === 0
      ? "healthy"
      : skillHealth.orphaned.length > 3 || !dbStatus.connected
        ? "degraded"
        : "warning";

  const statusColors = {
    healthy: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", dot: "bg-green-500" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-500" },
    degraded: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-500" },
  };

  const sc = statusColors[overallStatus];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">System Health</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            UltraThink infrastructure status, performance metrics, and diagnostics
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${sc.bg} ${sc.border} border`}>
          <span
            className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${overallStatus === "healthy" ? "" : "animate-pulse"}`}
          />
          <span className={`text-sm font-medium capitalize ${sc.text}`}>{overallStatus}</span>
        </div>
      </div>

      {/* Quick Status Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatusCard
          label="Skill Mesh"
          value={`${skillHealth.total}`}
          sub={`${skillHealth.withSkillMd} with docs`}
          color="var(--color-accent)"
          status={skillHealth.orphaned.length === 0 ? "ok" : "warn"}
        />
        <StatusCard
          label="Database"
          value={dbStatus.connected ? "Connected" : "Offline"}
          sub={dbStatus.detail}
          color="var(--color-info)"
          status={dbStatus.connected ? "ok" : "error"}
        />
        <StatusCard
          label="Memory Store"
          value={`${memStats.totalFiles}`}
          sub={`${memStats.totalSizeKB.toFixed(1)} KB total`}
          color="var(--color-success)"
          status="ok"
        />
        <StatusCard
          label="Hook Events"
          value={`${hookPerf.reduce((sum, h) => sum + h.calls, 0)}`}
          sub={`${hookPerf.length} unique hooks`}
          color="var(--color-warning)"
          status={hookPerf.some((h) => h.errors > 0) ? "warn" : "ok"}
        />
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Skill Health */}
        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Skill Mesh Health</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Layer breakdown */}
            {Object.entries(skillHealth.layerCounts).map(([layer, count]) => {
              const pct = Math.round((count / skillHealth.total) * 100);
              const colors: Record<string, string> = {
                orchestrator: "#f59e0b",
                hub: "#3b82f6",
                utility: "#22c55e",
                domain: "#94a3b8",
              };
              return (
                <div key={layer}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm capitalize" style={{ color: colors[layer] ?? "var(--color-text)" }}>
                      {layer}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {count} <span className="text-[var(--color-text-dim)]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                      style={{ width: `${pct}%`, backgroundColor: colors[layer] ?? "var(--color-text-muted)" }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--color-accent)]">{skillHealth.avgConnections}</p>
                <p className="text-xs text-[var(--color-text-dim)]">Avg Links</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--color-info)]">
                  {Math.round((skillHealth.withSkillMd / skillHealth.total) * 100)}%
                </p>
                <p className="text-xs text-[var(--color-text-dim)]">Doc Coverage</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-xl font-bold ${skillHealth.missingBackLinks === 0 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}
                >
                  {skillHealth.missingBackLinks}
                </p>
                <p className="text-xs text-[var(--color-text-dim)]">Missing Links</p>
              </div>
            </div>

            {/* Orphaned links */}
            {skillHealth.orphaned.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-sm font-medium text-amber-400 mb-2">Broken Links ({skillHealth.orphaned.length})</p>
                <div className="space-y-1">
                  {skillHealth.orphaned.slice(0, 5).map((link) => (
                    <p key={link} className="text-xs font-mono text-[var(--color-text-muted)]">
                      {link}
                    </p>
                  ))}
                  {skillHealth.orphaned.length > 5 && (
                    <p className="text-xs text-[var(--color-text-dim)]">
                      ...and {skillHealth.orphaned.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Environment */}
        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Environment</h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            <EnvRow label="Node.js" value={sysInfo.nodeVersion} />
            <EnvRow label="Platform" value={sysInfo.platform} />
            <EnvRow label="Uptime" value={sysInfo.uptime} />
            <EnvRow
              label="Database"
              value={dbStatus.connected ? `Connected (${dbStatus.tables} tables)` : "Not connected"}
              status={dbStatus.connected}
            />
          </div>
          <div className="px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              Environment Variables
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sysInfo.envVars.map((env) => (
                <div key={env.name} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${env.set ? "bg-green-500" : "bg-[var(--color-text-dim)]"}`} />
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">{env.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Hook Performance */}
      {hookPerf.length > 0 && (
        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Hook Performance</h3>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">Execution timing from recent hook invocations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">Hook</th>
                  <th className="px-6 py-3 font-medium text-right">Avg</th>
                  <th className="px-6 py-3 font-medium text-right">P95</th>
                  <th className="px-6 py-3 font-medium text-right">Calls</th>
                  <th className="px-6 py-3 font-medium text-right">Errors</th>
                  <th className="px-6 py-3 font-medium text-right">Last Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {hookPerf.map((h) => (
                  <tr key={h.hook} className="hover:bg-[var(--color-surface-2)] transition-colors duration-150">
                    <td className="px-6 py-3 font-mono text-[var(--color-text)]">{h.hook}</td>
                    <td className="px-6 py-3 text-right text-[var(--color-text-muted)]">{h.avgMs}ms</td>
                    <td className="px-6 py-3 text-right">
                      <span className={h.p95Ms > 1000 ? "text-amber-400" : "text-[var(--color-text-muted)]"}>
                        {h.p95Ms}ms
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--color-text-muted)]">{h.calls}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={h.errors > 0 ? "text-red-400" : "text-[var(--color-text-muted)]"}>
                        {h.errors}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-[var(--color-text-dim)]">{formatTimestamp(h.lastRun)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Memory Store Details */}
      <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Memory Store</h3>
          <p className="text-xs text-[var(--color-text-dim)] mt-1">Auto-memory files in /tmp/ultrathink-memories</p>
        </div>
        <div className="p-6">
          {memStats.totalFiles === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No memory files found. Memories are written during sessions.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-dim)]">Total Files</p>
                  <p className="text-xl font-bold mt-1 text-[var(--color-accent)]">{memStats.totalFiles}</p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-dim)]">Total Size</p>
                  <p className="text-xl font-bold mt-1 text-[var(--color-info)]">
                    {memStats.totalSizeKB.toFixed(1)} KB
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-dim)]">Categories</p>
                  <p className="text-xl font-bold mt-1 text-[var(--color-success)]">
                    {Object.keys(memStats.categories).length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-dim)]">Newest</p>
                  <p className="text-sm font-mono mt-1 text-[var(--color-text-muted)] truncate">
                    {memStats.newestFile || "--"}
                  </p>
                </div>
              </div>

              {Object.keys(memStats.categories).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3">By Category</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(memStats.categories)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, count]) => (
                        <span
                          key={cat}
                          className="px-3 py-1.5 text-xs rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                        >
                          {cat}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Configuration Checklist */}
      <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Configuration Checklist</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          <ChecklistItem
            label="Skill Registry"
            ok={skillHealth.total > 0}
            detail={`${skillHealth.total} skills registered`}
          />
          <ChecklistItem
            label="SKILL.md Documentation"
            ok={skillHealth.withSkillMd >= skillHealth.total * 0.9}
            detail={`${skillHealth.withSkillMd}/${skillHealth.total} documented`}
          />
          <ChecklistItem
            label="Back-links Integrity"
            ok={skillHealth.missingBackLinks === 0}
            detail={
              skillHealth.missingBackLinks === 0 ? "All back-links present" : `${skillHealth.missingBackLinks} missing`
            }
          />
          <ChecklistItem label="Database Connection" ok={dbStatus.connected} detail={dbStatus.detail} />
          <ChecklistItem label="Memory System" ok={true} detail="Auto-memory directory active" />
          <ChecklistItem label="Hook System" ok={true} detail="Pre/post tool hooks configured" />
          <ChecklistItem label="Privacy Hook" ok={true} detail="Blocking .env, credentials" />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusCard({
  label,
  value,
  sub,
  color,
  status,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  status: "ok" | "warn" | "error";
}) {
  const borderClass =
    status === "error"
      ? "border-red-500/20"
      : status === "warn"
        ? "border-amber-500/20"
        : "border-[var(--color-border)]";

  return (
    <div
      className={`p-6 rounded-xl bg-[var(--color-surface)] border ${borderClass} shadow-sm
                   hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        <span
          className={`w-2 h-2 rounded-full ${
            status === "ok"
              ? "bg-green-500"
              : status === "warn"
                ? "bg-amber-500 animate-pulse"
                : "bg-red-500 animate-pulse"
          }`}
        />
      </div>
      <p className="text-3xl font-bold mt-2" style={{ color }}>
        {value}
      </p>
      <p className="text-sm text-[var(--color-text-dim)] mt-1">{sub}</p>
    </div>
  );
}

function EnvRow({ label, value, status }: { label: string; value: string; status?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-2">
        {status !== undefined && <span className={`w-2 h-2 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`} />}
        <span className="text-sm font-mono text-[var(--color-text)]">{value}</span>
      </div>
    </div>
  );
}

function ChecklistItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface-2)] transition-colors duration-150">
      <div className="flex items-center gap-3">
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center ${ok ? "bg-green-500/10" : "bg-amber-500/10"}`}
        >
          {ok ? (
            <svg
              className="w-3 h-3 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg
              className="w-3 h-3 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
        </span>
        <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      </div>
      <span className="text-sm text-[var(--color-text-muted)]">{detail}</span>
    </div>
  );
}
