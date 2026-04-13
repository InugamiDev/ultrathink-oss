import Link from "next/link";
import { getSkillRegistry } from "@/lib/skills";
import { getDb } from "@/lib/db";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { UsageWidget } from "@/components/usage/usage-widget";

export const dynamic = "force-dynamic";

function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const then = new Date(timestamp).getTime();
  if (isNaN(then)) return timestamp;
  const diffMs = Date.now() - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

async function fetchStats() {
  try {
    if (!process.env.DATABASE_URL) return null;
    const sql = getDb();

    const [memRows, memWeekRows, planRows, hookRows, sessionRows] = (await Promise.all([
      sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = false`,
      sql`SELECT COUNT(*) as count FROM memories WHERE created_at > NOW() - INTERVAL '7 days' AND is_archived = false`,
      sql`SELECT COUNT(*) as count FROM plans`,
      sql`SELECT COUNT(*) as count FROM hook_events`,
      sql`SELECT COUNT(*) as count FROM sessions`,
    ])) as Record<string, unknown>[][];

    return {
      memories: Number(memRows[0].count),
      memoriesWeek: Number(memWeekRows[0].count),
      plans: Number(planRows[0].count),
      hookEvents: Number(hookRows[0].count),
      sessions: Number(sessionRows[0].count),
    };
  } catch {
    return null;
  }
}

async function fetchHealthChecks() {
  const checks: { name: string; status: string; detail: string }[] = [];

  const registry = getSkillRegistry();
  checks.push({
    name: "Skill Registry",
    status: "ok",
    detail: `${registry.skills.length} skills loaded`,
  });

  const HOOKS_DIR = join(process.cwd(), "../.claude/hooks");
  const hookCount = existsSync(HOOKS_DIR)
    ? readdirSync(HOOKS_DIR).filter((f) => f.endsWith(".sh") || f.endsWith(".ts")).length
    : 0;
  checks.push({ name: "Hook System", status: "ok", detail: `${hookCount} hooks configured` });
  checks.push({ name: "Privacy Hook", status: "ok", detail: "Standard sensitivity" });

  if (!process.env.DATABASE_URL) {
    checks.push({ name: "Database", status: "pending", detail: "Configure DATABASE_URL" });
  } else {
    try {
      const sql = getDb();
      await sql`SELECT 1`;
      checks.push({ name: "Database", status: "ok", detail: "Connected (Neon)" });
    } catch {
      checks.push({ name: "Database", status: "error", detail: "Connection failed" });
    }
  }

  return checks;
}

function fetchRecentActivity(): { type: string; title: string; time: string }[] {
  const items: { type: string; title: string; time: string; ts: number }[] = [];
  const HOOK_DIR = "/tmp/ultrathink-hook-logs";
  const MEM_DIR = "/tmp/ultrathink-memories";

  if (existsSync(HOOK_DIR)) {
    const files = readdirSync(HOOK_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .slice(-1);
    for (const file of files) {
      try {
        const lines = readFileSync(`${HOOK_DIR}/${file}`, "utf-8").split("\n").filter(Boolean).slice(-5);
        for (const line of lines) {
          const e = JSON.parse(line);
          items.push({ type: "hook", title: `Hook: ${e.hook}`, time: e.ts, ts: new Date(e.ts).getTime() });
        }
      } catch {
        /* skip */
      }
    }
  }

  if (existsSync(MEM_DIR)) {
    const files = readdirSync(MEM_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(-5);
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(`${MEM_DIR}/${file}`, "utf-8"));
        const content = (data.content || "").slice(0, 60);
        items.push({
          type: "memory",
          title: `Memory: ${content}`,
          time: data.timestamp || "",
          ts: new Date(data.timestamp || 0).getTime(),
        });
      } catch {
        /* skip */
      }
    }
  }

  items.sort((a, b) => b.ts - a.ts);
  return items.slice(0, 8).map(({ type, title, time }) => ({ type, title, time }));
}

interface RegistrySkill {
  name: string;
  layer: string;
  category?: string;
  linksTo?: string[];
  linkedFrom?: string[];
}

// Returns white or black text depending on background luminance
function barTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#000000" : "#ffffff";
}

function SkillMeshOverview({ skills }: { skills: RegistrySkill[] }) {
  const layers = [
    { name: "orchestrator", label: "Orchestrators", color: "#f59e0b", desc: "End-to-end workflows" },
    { name: "hub", label: "Hubs", color: "#3b82f6", desc: "Multi-step task coordinators" },
    { name: "utility", label: "Utilities", color: "#22c55e", desc: "Reusable tool functions" },
    { name: "domain", label: "Domain", color: "#64748b", desc: "Technology specialists" },
  ];

  const layerCounts: Record<string, number> = {};
  let totalEdges = 0;
  for (const s of skills) {
    layerCounts[s.layer] = (layerCounts[s.layer] || 0) + 1;
    totalEdges += (s.linksTo || []).length;
  }

  const maxCount = Math.max(...Object.values(layerCounts), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-accent)]">{skills.length}</p>
          <p className="text-xs text-[var(--color-text-dim)]">Total Skills</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-info)]">{totalEdges}</p>
          <p className="text-xs text-[var(--color-text-dim)]">Connections</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-success)]">{Object.keys(layerCounts).length}</p>
          <p className="text-xs text-[var(--color-text-dim)]">Layers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-accent)]">
            {skills.length > 0 ? ((totalEdges * 2) / skills.length).toFixed(1) : "0"}
          </p>
          <p className="text-xs text-[var(--color-text-dim)]">Avg Links</p>
        </div>
      </div>
      {layers.map((layer) => {
        const count = layerCounts[layer.name] || 0;
        const textColor = barTextColor(layer.color);
        return (
          <div key={layer.name} className="flex items-center gap-4">
            <div className="w-28 shrink-0">
              <p className="text-sm font-medium" style={{ color: layer.color }}>
                {layer.label}
              </p>
              <p className="text-xs text-[var(--color-text-dim)]">{layer.desc}</p>
            </div>
            <div className="flex-1 h-8 bg-[var(--color-surface-2)] rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-500 motion-reduce:transition-none"
                style={{
                  width: `${Math.max((count / maxCount) * 100, 8)}%`,
                  backgroundColor: layer.color,
                  opacity: 0.85,
                }}
              >
                <span className="text-xs font-bold" style={{ color: textColor }}>
                  {count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Stat card icons
const StatIcons = {
  skills: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
      />
    </svg>
  ),
  memories: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  ),
  plans: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  ),
  hooks: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  ),
};

// Quick action icons
const ActionIcons = {
  plans: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  skills: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
      />
    </svg>
  ),
  kanban: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  ),
  memory: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z"
      />
    </svg>
  ),
  graph: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
      />
    </svg>
  ),
};

export default async function HomePage() {
  const registry = getSkillRegistry();
  const stats = await fetchStats();
  const healthChecks = await fetchHealthChecks();
  const recentActivity = fetchRecentActivity();

  const statCards = [
    {
      label: "Active Skills",
      value: String(registry.skills.length),
      change: `${registry.skills.filter((s) => s.layer === "orchestrator").length} orchestrators`,
      color: "var(--color-accent)",
      icon: StatIcons.skills,
    },
    {
      label: "Memories",
      value: stats ? String(stats.memories) : "--",
      change: stats ? `${stats.memoriesWeek} this week` : "Connect DB",
      color: "var(--color-info)",
      icon: StatIcons.memories,
    },
    {
      label: "Active Plans",
      value: stats ? String(stats.plans) : "--",
      change: stats ? (stats.plans === 0 ? "No plans yet" : "Tracked") : "Connect DB",
      color: "var(--color-success)",
      icon: StatIcons.plans,
    },
    {
      label: "Hook Events",
      value: stats ? String(stats.hookEvents) : "--",
      change: stats ? `${stats.sessions} sessions` : "Connect DB",
      color: "var(--color-accent)",
      icon: StatIcons.hooks,
    },
  ];

  const quickActions = [
    { label: "New Plan", href: "/plans", description: "Create an implementation plan", icon: ActionIcons.plans },
    { label: "View Skills", href: "/skills", description: "Browse the skill catalog", icon: ActionIcons.skills },
    { label: "Kanban Board", href: "/kanban", description: "Manage tasks and workflows", icon: ActionIcons.kanban },
    { label: "Memory Browser", href: "/memory", description: "Search and manage memories", icon: ActionIcons.memory },
    { label: "System Health", href: "/system", description: "Infrastructure diagnostics", icon: ActionIcons.system },
    {
      label: "Skill Graph",
      href: "/skills/graph",
      description: "Interactive skill mesh graph",
      icon: ActionIcons.graph,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <section aria-label="Overview stats">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm
                         hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-[var(--color-text-muted)]">{card.label}</p>
                <span style={{ color: card.color }} className="opacity-60">
                  {card.icon}
                </span>
              </div>
              <p className="text-3xl font-bold mt-2" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">{card.change}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Usage Widget */}
      <section aria-label="Usage overview">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <UsageWidget />
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm
                         hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-2)]
                         transition-all duration-200 motion-reduce:transition-none
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3
                           bg-[var(--color-accent)]/10 text-[var(--color-accent)]
                           group-hover:bg-[var(--color-accent)]/20 transition-colors duration-200 motion-reduce:transition-none"
              >
                {action.icon}
              </div>
              <h3 className="font-medium text-[var(--color-text)]">{action.label}</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section aria-label="Recent activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link
              href="/activity"
              className="text-sm text-[var(--color-accent)] hover:underline
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === "hook"
                          ? "bg-purple-500"
                          : item.type === "memory"
                            ? "bg-[var(--color-info)]"
                            : "bg-[var(--color-success)]"
                      }`}
                    />
                    <span className="text-sm text-[var(--color-text)] truncate" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-text-dim)] shrink-0 ml-4 tabular-nums">
                    {formatRelativeTime(item.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Skill Mesh Overview */}
      <section aria-label="Skill mesh overview">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Skill Mesh</h2>
          <Link
            href="/skills/graph"
            className="text-sm text-[var(--color-accent)] hover:underline
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            View graph
          </Link>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm p-6">
          <SkillMeshOverview skills={registry.skills} />
        </div>
      </section>

      {/* System Health */}
      <section aria-label="System health">
        <h2 className="text-lg font-semibold mb-4">System Health</h2>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {healthChecks.map((check) => (
              <div key={check.name} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      check.status === "ok"
                        ? "bg-[var(--color-success)]"
                        : check.status === "pending"
                          ? "bg-[var(--color-warning)]"
                          : "bg-[var(--color-error)]"
                    }`}
                  />
                  <span className="font-medium">{check.name}</span>
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">{check.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
