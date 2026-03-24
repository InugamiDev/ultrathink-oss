"use client";

import { useState, useEffect } from "react";

interface HookInfo {
  name: string;
  type: string;
  file: string;
  description: string;
  sizeBytes: number;
}

interface EnvVar {
  name: string;
  isSet: boolean;
  isSecret: boolean;
}

interface SettingsData {
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    osRelease: string;
    dashboardVersion: string;
    uptime: number;
    totalMemoryGB: number;
    freeMemoryGB: number;
  };
  hooks: HookInfo[];
  config: Record<string, unknown>;
  skillsOverview: {
    total: number;
    layerCounts: Record<string, number>;
    mostConnected: Array<{ name: string; connections: number }>;
    lastUpdated: string | null;
  };
  environment: EnvVar[];
  memoryStatus: {
    connected: boolean;
    memoriesCount?: number;
    relationsCount?: number;
  };
}

const layerColors: Record<string, string> = {
  orchestrator: "var(--color-accent)",
  hub: "var(--color-info)",
  utility: "var(--color-success)",
  domain: "var(--color-text-muted)",
};

const hookTypeColors: Record<string, string> = {
  UserPromptSubmit: "text-[var(--color-accent)]",
  SessionStart: "text-green-400",
  Stop: "text-red-400",
  PreCompact: "text-amber-400",
  PreToolUse: "text-orange-400",
  PostToolUse: "text-[var(--color-info)]",
  PostToolUseFailure: "text-red-500",
  Notification: "text-purple-400",
  Utility: "text-[var(--color-text-dim)]",
  Unknown: "text-[var(--color-text-dim)]",
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 max-w-4xl">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm animate-pulse"
          >
            <div className="h-5 w-36 bg-[var(--color-surface-2)] rounded mb-6" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-3/4 bg-[var(--color-surface-2)] rounded" />
              <div className="h-4 w-1/2 bg-[var(--color-surface-2)] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-red-500/30 shadow-sm max-w-4xl">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to load settings</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  const { systemInfo, hooks, skillsOverview, environment, memoryStatus } = data;
  const maxConnections = skillsOverview.mostConnected[0]?.connections ?? 1;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── System Info ── */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <h3 className="text-lg font-semibold mb-6">System Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoTile label="Node" value={systemInfo.nodeVersion} color="text-[var(--color-accent)]" />
          <InfoTile
            label="Platform"
            value={`${systemInfo.platform} (${systemInfo.arch})`}
            color="text-[var(--color-info)]"
          />
          <InfoTile label="Dashboard" value={`v${systemInfo.dashboardVersion}`} color="text-[var(--color-success)]" />
          <InfoTile label="Skills" value={String(skillsOverview.total)} color="text-amber-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoTile label="Uptime" value={formatUptime(systemInfo.uptime)} color="text-purple-400" />
          <InfoTile
            label="Memory"
            value={`${systemInfo.freeMemoryGB} / ${systemInfo.totalMemoryGB} GB`}
            color="text-[var(--color-text-muted)]"
          />
          <InfoTile
            label="Memory DB"
            value={memoryStatus.connected ? "Connected" : "Disconnected"}
            color={memoryStatus.connected ? "text-green-400" : "text-red-400"}
          />
          <InfoTile
            label="OS Release"
            value={systemInfo.osRelease.split(".").slice(0, 2).join(".")}
            color="text-[var(--color-text-muted)]"
          />
        </div>
      </section>

      {/* ── Hook Configuration ── */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Hook Configuration</h3>
          <span className="text-xs px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface-2)]">
            {hooks.length} hooks
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Hook</th>
                <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Type</th>
                <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)] hidden md:table-cell">
                  Description
                </th>
                <th className="py-3 px-4 text-sm font-medium text-[var(--color-text-muted)] text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {hooks.map((hook) => (
                <tr
                  key={hook.file}
                  className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm">{hook.name}</span>
                    <span className="text-xs text-[var(--color-text-dim)] ml-1">.{hook.file.split(".").pop()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${hookTypeColors[hook.type] ?? hookTypeColors.Unknown}`}>
                      {hook.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-muted)] hidden md:table-cell max-w-xs truncate">
                    {hook.description || "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-dim)] text-right font-mono">
                    {formatBytes(hook.sizeBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Environment ── */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {environment.map((env) => (
            <div
              key={env.name}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    env.isSet ? "bg-green-400" : "bg-[var(--color-text-dim)]"
                  }`}
                />
                <span className="font-mono text-sm truncate">{env.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {env.isSecret && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    secret
                  </span>
                )}
                <span
                  className={`text-xs font-medium ${env.isSet ? "text-green-400" : "text-[var(--color-text-dim)]"}`}
                >
                  {env.isSet ? "SET" : "NOT SET"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Skills Overview ── */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Skills Overview</h3>
          {skillsOverview.lastUpdated && (
            <span className="text-xs text-[var(--color-text-dim)]">
              Updated {formatDate(skillsOverview.lastUpdated)}
            </span>
          )}
        </div>

        {/* Layer breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(skillsOverview.layerCounts).map(([layer, count]) => (
            <div key={layer} className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: layerColors[layer] ?? "var(--color-text-dim)" }}
                />
                <p className="text-xs text-[var(--color-text-dim)] capitalize">{layer}</p>
              </div>
              <p className="text-xl font-bold mt-1" style={{ color: layerColors[layer] ?? "var(--color-text-muted)" }}>
                {count}
              </p>
            </div>
          ))}
        </div>

        {/* Most connected skills */}
        <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Most Connected</h4>
        <div className="space-y-2">
          {skillsOverview.mostConnected.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-28 text-sm font-mono text-[var(--color-text-muted)] text-right truncate">
                {s.name}
              </span>
              <div className="flex-1 h-6 bg-[var(--color-surface-2)] rounded overflow-hidden">
                <div
                  className="h-full rounded bg-[var(--color-accent)] opacity-60 transition-all duration-500 motion-reduce:transition-none"
                  style={{ width: `${(s.connections / maxConnections) * 100}%` }}
                />
              </div>
              <span className="w-8 text-xs text-[var(--color-text-dim)] text-right">{s.connections}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Memory Stats ── */}
      <section className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Memory Stats</h3>
        {memoryStatus.connected ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoTile label="Status" value="Connected" color="text-green-400" />
            <InfoTile
              label="Active Memories"
              value={String(memoryStatus.memoriesCount ?? 0)}
              color="text-[var(--color-info)]"
            />
            <InfoTile
              label="Relations"
              value={String(memoryStatus.relationsCount ?? 0)}
              color="text-[var(--color-success)]"
            />
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Memory database not connected</p>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">
              Set{" "}
              <code className="font-mono px-1 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-accent)]">
                DATABASE_URL
              </code>{" "}
              to enable persistent memory
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-text-dim)]">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
