"use client";

// intent: Admin approval dashboard for Builder Campaign applications
// status: done
// next: none
// confidence: high

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  Users,
  AlertTriangle,
  BarChart3,
  Lock,
} from "lucide-react";

type AppStatus = "pending" | "approved" | "rejected";
type TabFilter = "all" | AppStatus;

interface Application {
  id: string;
  user_handle: string;
  email: string | null;
  proof_type: string;
  proof_url: string;
  description: string | null;
  status: AppStatus;
  key_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface BuilderKey {
  id: string;
  user_handle: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "var(--color-warning)",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    color: "var(--color-success)",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    color: "var(--color-error)",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const PROOF_LABELS: Record<string, string> = {
  project: "Project",
  skill: "Skill",
  contribution: "Contribution",
};

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminBuilderPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [applications, setApplications] = useState<Application[]>([]);
  const [keys, setKeys] = useState<BuilderKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabFilter>("all");
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-admin-secret": secret,
    }),
    [secret]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, keysRes] = await Promise.all([
        fetch("/api/builder/admin", { headers: { "x-admin-secret": secret } }),
        fetch("/api/builder/admin?type=keys", { headers: { "x-admin-secret": secret } }),
      ]);

      if (appsRes.status === 401) {
        setAuthenticated(false);
        setAuthError("Invalid admin secret.");
        setLoading(false);
        return;
      }

      const appsData = await appsRes.json();
      const keysData = await keysRes.json();

      setApplications(appsData.applications ?? []);
      setKeys(keysData.keys ?? []);
      setAuthenticated(true);
      setAuthError("");
    } catch {
      setAuthError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [secret]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    await fetchData();
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  async function handleAction(applicationId: string, action: "approve" | "reject") {
    setActionLoading((prev) => new Set(prev).add(applicationId));
    try {
      const res = await fetch("/api/builder/admin", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ application_id: applicationId, action }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm(`Revoke key ${keyId}?`)) return;
    setActionLoading((prev) => new Set(prev).add(keyId));
    try {
      const res = await fetch("/api/builder/admin", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ action: "revoke", key_id: keyId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Filtered applications
  const filtered = tab === "all" ? applications : applications.filter((a) => a.status === tab);

  // Stats
  const total = applications.length;
  const pending = applications.filter((a) => a.status === "pending").length;
  const approved = applications.filter((a) => a.status === "approved").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : "0";

  // Auth gate
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-24">
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold">Admin Access</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Admin Secret</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter admin secret..."
                className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-colors duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !secret.trim()}
              className="w-full py-3 rounded-lg bg-[var(--color-accent)] text-black font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Authenticate"
              )}
            </button>
            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[var(--color-accent)]" />
          <div>
            <h1 className="text-2xl font-bold">Builder Admin</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Review applications & manage keys</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            Total
          </div>
          <p className="text-2xl font-bold tabular-nums">{total}</p>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--color-warning)" }}>
            <Clock className="w-3.5 h-3.5" />
            Pending
          </div>
          <p className="text-2xl font-bold tabular-nums">{pending}</p>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--color-success)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </div>
          <p className="text-2xl font-bold tabular-nums">{approved}</p>
        </div>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--color-error)" }}>
            <BarChart3 className="w-3.5 h-3.5" />
            Rejection Rate
          </div>
          <p className="text-2xl font-bold tabular-nums">{rejectionRate}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] w-fit">
        {TABS.map((t) => {
          const count = t.value === "all" ? total : applications.filter((a) => a.status === t.value).length;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                tab === t.value
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Application list */}
      {loading && applications.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          No {tab === "all" ? "" : tab} applications found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const cfg = STATUS_CONFIG[app.status];
            const isLoading = actionLoading.has(app.id);

            return (
              <div
                key={app.id}
                className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 hover:border-[var(--color-border-hover)] transition-colors duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--color-text)]">{app.user_handle}</span>
                      {/* Proof type badge */}
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium">
                        {PROOF_LABELS[app.proof_type] ?? app.proof_type}
                      </span>
                      {/* Status badge */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium"
                        style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    {/* Proof URL */}
                    <a
                      href={app.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{app.proof_url}</span>
                    </a>

                    {/* Description */}
                    {app.description && <p className="text-sm text-[var(--color-text-muted)]">{app.description}</p>}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-dim)]">
                      <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                      {app.reviewed_at && <span>Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</span>}
                    </div>

                    {/* Generated key (for approved) */}
                    {app.status === "approved" && app.key_id && (
                      <div className="flex items-center gap-2 mt-1">
                        <KeyRound className="w-3.5 h-3.5 text-[var(--color-success)]" />
                        <code className="text-xs font-mono bg-[var(--color-surface-2)] px-2 py-1 rounded border border-[var(--color-border)]">
                          {app.key_id}
                        </code>
                        <button
                          onClick={() => copyKey(app.key_id!)}
                          className="p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
                          title="Copy key"
                        >
                          {copiedKey === app.key_id ? (
                            <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: actions for pending */}
                  {app.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(app.id, "approve")}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm font-medium hover:bg-[var(--color-success)]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(app.id, "reject")}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm font-medium hover:bg-[var(--color-error)]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Key management */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[var(--color-accent)]" />
          <h2 className="text-xl font-semibold">Builder Keys</h2>
          <span className="text-sm text-[var(--color-text-muted)]">
            ({keys.filter((k) => k.is_active).length} active)
          </span>
        </div>

        {keys.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            No builder keys issued yet.
          </div>
        ) : (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-dim)] uppercase tracking-wide">
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const isLoading = actionLoading.has(key.id);
                  return (
                    <tr
                      key={key.id}
                      className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-2)]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs">{key.id}</code>
                          <button
                            onClick={() => copyKey(key.id)}
                            className="p-0.5 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
                          >
                            {copiedKey === key.id ? (
                              <Check className="w-3 h-3 text-[var(--color-success)]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)]">{key.user_handle}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {key.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-dim)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-dim)]" />
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {key.is_active && (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-lg text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
