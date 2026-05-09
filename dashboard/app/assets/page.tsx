"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ImagePlus,
  Play,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings2,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Plus,
  X,
} from "lucide-react";

type Backend = "puter" | "tinyfish" | "gemini-api" | "playwright";
type AssetStatus = "pending" | "generating" | "completed" | "failed";

interface AssetEntry {
  id: string;
  prompt: string;
  negativePrompt?: string;
  style?: string;
  dimensions?: string;
  status: AssetStatus;
  outputPath?: string;
  error?: string;
  retries: number;
  generatedAt?: string;
}

interface AssetManifest {
  id: string;
  name: string;
  description?: string;
  backend: Backend;
  assets: AssetEntry[];
  createdAt: string;
  updatedAt: string;
}

interface BackendConfig {
  puter: { model: string; testMode: boolean };
  tinyfish: { apiKey: string; browserProfile: string; targetUrl: string };
  geminiApi: { secure1psid: string; secure1psidts: string; model: string };
  playwright: { headless: boolean; timeout: number; targetUrl: string };
}

const backendLabels: Record<Backend, string> = {
  puter: "Puter.js",
  tinyfish: "TinyFish",
  "gemini-api": "Gemini-API",
  playwright: "Playwright",
};

const backendDescriptions: Record<Backend, string> = {
  puter: "Free, zero-setup image generation — no API key, no account needed (github.com/nicholasgasior/puter)",
  tinyfish: "Enterprise web agent — cloud browser automation via API",
  "gemini-api": "Reverse-engineered Python API — cookie-based, no browser needed at runtime",
  playwright: "Local browser automation — free fallback, requires Playwright installed",
};

const statusConfig: Record<AssetStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-[var(--color-text-dim)]", label: "Pending" },
  generating: { icon: Loader2, color: "text-blue-400", label: "Generating" },
  completed: { icon: CheckCircle2, color: "text-green-400", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

export default function AssetsPage() {
  const [manifests, setManifests] = useState<AssetManifest[]>([]);
  const [config, setConfig] = useState<BackendConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedManifest, setExpandedManifest] = useState<string | null>(null);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [manifestsRes, configRes] = await Promise.all([fetch("/api/assets"), fetch("/api/assets?id=config")]);
      const { manifests: m } = await manifestsRes.json();
      const { config: c } = await configRes.json();
      setManifests(m || []);
      setConfig(c || null);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for status updates when generating
  useEffect(() => {
    if (generating.size === 0) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [generating.size, fetchData]);

  const handleGenerate = async (manifestId: string) => {
    setGenerating((prev) => new Set(prev).add(manifestId));
    try {
      const res = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Started generating ${data.count} assets via ${data.backend}`, "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Generation failed", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      setManifests((prev) => prev.filter((m) => m.id !== id));
      showToast("Manifest deleted", "success");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const handleSaveConfig = async (newConfig: BackendConfig) => {
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-config", config: newConfig }),
      });
      const { config: c } = await res.json();
      setConfig(c);
      showToast("Configuration saved", "success");
    } catch {
      showToast("Failed to save config", "error");
    }
  };

  // Check if any manifests have generating assets and clear generating set when done
  useEffect(() => {
    const activeIds = new Set(
      manifests.filter((m) => m.assets.some((a) => a.status === "generating")).map((m) => m.id)
    );
    if (activeIds.size === 0 && generating.size > 0) {
      setGenerating(new Set());
    }
  }, [manifests, generating.size]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-dim)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Asset Pipeline</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Generate illustrations and assets via Gemini — TinyFish, Gemini-API, or Playwright
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)]
                       hover:text-[var(--color-text)] bg-[var(--color-surface-2)] border border-[var(--color-border)]
                       hover:border-[var(--color-border-hover)] transition-colors duration-150"
          >
            <Settings2 className="w-4 h-4" />
            Configure
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                       bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)]
                       transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            New Manifest
          </button>
        </div>
      </div>

      {/* Backend Config Panel */}
      {showConfig && config && (
        <ConfigPanel config={config} onSave={handleSaveConfig} onClose={() => setShowConfig(false)} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Manifests" value={manifests.length} />
        <StatCard label="Total Assets" value={manifests.reduce((sum, m) => sum + m.assets.length, 0)} />
        <StatCard
          label="Completed"
          value={manifests.reduce((sum, m) => sum + m.assets.filter((a) => a.status === "completed").length, 0)}
          color="text-green-400"
        />
        <StatCard
          label="Generating"
          value={manifests.reduce((sum, m) => sum + m.assets.filter((a) => a.status === "generating").length, 0)}
          color="text-blue-400"
        />
      </div>

      {/* Manifests */}
      {manifests.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-dim)]">
          <ImagePlus className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg">No manifests yet</p>
          <p className="text-sm mt-1">Create a manifest to start generating assets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {manifests
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((manifest) => {
              const isExpanded = expandedManifest === manifest.id;
              const completedCount = manifest.assets.filter((a) => a.status === "completed").length;
              const failedCount = manifest.assets.filter((a) => a.status === "failed").length;
              const generatingCount = manifest.assets.filter((a) => a.status === "generating").length;
              const pendingCount = manifest.assets.filter((a) => a.status === "pending").length;
              const isRunning = generatingCount > 0;

              return (
                <div
                  key={manifest.id}
                  className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
                >
                  {/* Manifest header */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <button
                      onClick={() => setExpandedManifest(isExpanded ? null : manifest.id)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-dim)] shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-[var(--color-text)] truncate">{manifest.name}</h3>
                        {manifest.description && (
                          <p className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">{manifest.description}</p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Status pills */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                          {backendLabels[manifest.backend]}
                        </span>
                        {completedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                            {completedCount} done
                          </span>
                        )}
                        {failedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            {failedCount} failed
                          </span>
                        )}
                        {generatingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {generatingCount}
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-dim)]">
                            {pendingCount} pending
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGenerate(manifest.id)}
                          disabled={isRunning || pendingCount + failedCount === 0}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)]
                                     hover:bg-[var(--color-surface-2)] transition-colors duration-150
                                     disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isRunning ? "Generation in progress" : "Generate pending assets"}
                        >
                          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => fetchData()}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                                     hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                          title="Refresh status"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(manifest.id)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400
                                     hover:bg-red-500/10 transition-colors duration-150"
                          title="Delete manifest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {manifest.assets.length > 0 && (
                    <div className="h-1 bg-[var(--color-surface-2)]">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${(completedCount / manifest.assets.length) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  {/* Expanded assets list */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)]">
                      <div className="divide-y divide-[var(--color-border)]">
                        {manifest.assets.map((asset) => {
                          const statusCfg = statusConfig[asset.status];
                          const StatusIcon = statusCfg.icon;
                          return (
                            <div key={asset.id} className="px-6 py-3 flex items-start gap-4">
                              <StatusIcon
                                className={`w-4 h-4 mt-0.5 shrink-0 ${statusCfg.color} ${
                                  asset.status === "generating" ? "animate-spin" : ""
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[var(--color-text)]">{asset.prompt}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-dim)]">
                                  {asset.style && <span>Style: {asset.style}</span>}
                                  {asset.dimensions && <span>{asset.dimensions}</span>}
                                  {asset.retries > 0 && (
                                    <span className="text-yellow-500">{asset.retries} retries</span>
                                  )}
                                  {asset.generatedAt && (
                                    <span>Generated {new Date(asset.generatedAt).toLocaleTimeString()}</span>
                                  )}
                                </div>
                                {asset.error && <p className="text-xs text-red-400 mt-1">{asset.error}</p>}
                                {asset.outputPath && (
                                  <p className="text-xs text-green-400 mt-1 truncate">{asset.outputPath}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Create Manifest Modal */}
      {showCreate && (
        <CreateManifestModal
          onClose={() => setShowCreate(false)}
          onCreated={(m) => {
            setManifests((prev) => [m, ...prev]);
            setShowCreate(false);
            showToast("Manifest created", "success");
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg
            ${toast.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ──

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="text-xs text-[var(--color-text-dim)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || "text-[var(--color-text)]"}`}>{value}</div>
    </div>
  );
}

// ── Config Panel ──

function ConfigPanel({
  config,
  onSave,
  onClose,
}: {
  config: BackendConfig;
  onSave: (c: BackendConfig) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(config);
  const [activeTab, setActiveTab] = useState<Backend>("tinyfish");
  const [authStatus, setAuthStatus] = useState<{
    geminiApi?: { authenticated: boolean; cookiePreview?: string };
    playwright?: { hasProfile: boolean };
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    fetch("/api/assets/auth")
      .then((r) => r.json())
      .then(setAuthStatus)
      .catch(() => {});
  }, []);

  const handleGeminiLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/assets/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login-gemini" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh config and auth status
      const [configRes, authRes] = await Promise.all([
        fetch("/api/assets?id=config").then((r) => r.json()),
        fetch("/api/assets/auth").then((r) => r.json()),
      ]);
      if (configRes.config) setLocal(configRes.config);
      setAuthStatus(authRes);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRefreshCookies = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/assets/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-cookies" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const [configRes, authRes] = await Promise.all([
        fetch("/api/assets?id=config").then((r) => r.json()),
        fetch("/api/assets/auth").then((r) => r.json()),
      ]);
      if (configRes.config) setLocal(configRes.config);
      setAuthStatus(authRes);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const res = await fetch("/api/assets/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    if (res.ok) {
      setLocal((prev) => ({
        ...prev,
        geminiApi: { ...prev.geminiApi, secure1psid: "", secure1psidts: "" },
      }));
      setAuthStatus((prev) => (prev ? { ...prev, geminiApi: { authenticated: false } } : null));
    }
  };

  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="font-medium text-[var(--color-text)]">Backend Configuration</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        {(["puter", "tinyfish", "gemini-api", "playwright"] as Backend[]).map((b) => (
          <button
            key={b}
            onClick={() => setActiveTab(b)}
            className={`px-6 py-3 text-sm border-b-2 transition-colors duration-150 ${
              activeTab === b
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {backendLabels[b]}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        <p className="text-xs text-[var(--color-text-dim)]">{backendDescriptions[activeTab]}</p>

        {activeTab === "puter" && (
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <p className="text-sm text-green-400 font-medium">No configuration needed</p>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">
              Puter.js works out of the box — no API key, no account, no setup. Powered by Gemini models via{" "}
              <a
                href="https://github.com/nicholasgasior/puter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline"
              >
                Puter
              </a>
              .
            </p>
          </div>
        )}

        {activeTab === "tinyfish" && (
          <>
            <ConfigInput
              label="API Key"
              value={local.tinyfish.apiKey}
              onChange={(v) => setLocal({ ...local, tinyfish: { ...local.tinyfish, apiKey: v } })}
              type="password"
              placeholder="Get from agent.tinyfish.ai/api-keys"
            />
            <ConfigSelect
              label="Browser Profile"
              value={local.tinyfish.browserProfile}
              options={["lite", "stealth"]}
              onChange={(v) => setLocal({ ...local, tinyfish: { ...local.tinyfish, browserProfile: v } })}
            />
            <ConfigInput
              label="Target URL"
              value={local.tinyfish.targetUrl}
              onChange={(v) => setLocal({ ...local, tinyfish: { ...local.tinyfish, targetUrl: v } })}
            />
          </>
        )}

        {activeTab === "gemini-api" && (
          <>
            {/* Auth status + login button */}
            <div className="p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--color-text)]">Gemini Authentication</span>
                {authStatus?.geminiApi?.authenticated ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Connected {authStatus.geminiApi.cookiePreview}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-text-dim)]" />
                    Not connected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGeminiLogin}
                  disabled={authLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-black
                             hover:bg-[var(--color-accent-hover)] transition-colors duration-150
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Browser open — log in...
                    </span>
                  ) : authStatus?.geminiApi?.authenticated ? (
                    "Re-authenticate"
                  ) : (
                    "Login with Gemini"
                  )}
                </button>

                {authStatus?.geminiApi?.authenticated && (
                  <>
                    <button
                      onClick={handleRefreshCookies}
                      disabled={authLoading}
                      className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)]
                                 bg-[var(--color-surface-2)] border border-[var(--color-border)]
                                 hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)]
                                 disabled:opacity-50"
                      title="Refresh cookies from saved browser profile"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2.5 rounded-lg text-sm text-red-400
                                 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                      title="Clear saved cookies and profile"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-[var(--color-text-dim)] mt-2">
                Opens a browser window — log in to your Google account. Cookies are captured automatically.
              </p>
            </div>

            {/* Manual cookie input (advanced) */}
            <details className="group">
              <summary className="text-xs text-[var(--color-text-dim)] cursor-pointer hover:text-[var(--color-text-muted)] transition-colors">
                Advanced: Manual cookie entry
              </summary>
              <div className="mt-3 space-y-3">
                <ConfigInput
                  label="__Secure-1PSID Cookie"
                  value={local.geminiApi.secure1psid}
                  onChange={(v) => setLocal({ ...local, geminiApi: { ...local.geminiApi, secure1psid: v } })}
                  type="password"
                  placeholder="From gemini.google.com dev tools → Cookies"
                />
                <ConfigInput
                  label="__Secure-1PSIDTS Cookie"
                  value={local.geminiApi.secure1psidts}
                  onChange={(v) => setLocal({ ...local, geminiApi: { ...local.geminiApi, secure1psidts: v } })}
                  type="password"
                  placeholder="From gemini.google.com dev tools → Cookies"
                />
              </div>
            </details>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Model</label>
              <select
                value={local.geminiApi.model}
                onChange={(e) => setLocal({ ...local, geminiApi: { ...local.geminiApi, model: e.target.value } })}
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]
                           text-sm text-[var(--color-text)]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (gemini-3.1-flash-image-preview)</option>
                <option value="gemini-2.5-flash-image">Nano Banana (gemini-2.5-flash-image)</option>
              </select>
            </div>
          </>
        )}

        {activeTab === "playwright" && (
          <>
            <ConfigInput
              label="Target URL"
              value={local.playwright.targetUrl}
              onChange={(v) => setLocal({ ...local, playwright: { ...local.playwright, targetUrl: v } })}
            />
            <ConfigInput
              label="Timeout (ms)"
              value={String(local.playwright.timeout)}
              onChange={(v) =>
                setLocal({
                  ...local,
                  playwright: { ...local.playwright, timeout: parseInt(v) || 60000 },
                })
              }
            />
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={local.playwright.headless}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    playwright: { ...local.playwright, headless: e.target.checked },
                  })
                }
                className="rounded"
              />
              Headless mode
            </label>
          </>
        )}

        <div className="pt-2">
          <button
            onClick={() => onSave(local)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-black
                       hover:bg-[var(--color-accent-hover)] transition-colors duration-150"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]
                   text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
    </div>
  );
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]
                   text-sm text-[var(--color-text)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Create Manifest Modal ──

function CreateManifestModal({ onClose, onCreated }: { onClose: () => void; onCreated: (m: AssetManifest) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [backend, setBackend] = useState<Backend>("tinyfish");
  const [assetsText, setAssetsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return setError("Name is required");

    // Parse assets — one prompt per line, or JSON array
    const trimmed = assetsText.trim();
    let assets: Array<{ prompt: string; style?: string; dimensions?: string }>;

    if (trimmed.startsWith("[")) {
      try {
        assets = JSON.parse(trimmed);
      } catch {
        return setError("Invalid JSON — use one prompt per line or a JSON array");
      }
    } else {
      assets = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((prompt) => ({ prompt }));
    }

    if (assets.length === 0) return setError("At least one asset description required");

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-manifest",
          name: name.trim(),
          description: description.trim() || undefined,
          backend,
          assets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data.manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create manifest");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-medium text-[var(--color-text)]">New Asset Manifest</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <ConfigInput
            label="Manifest Name"
            value={name}
            onChange={setName}
            placeholder="e.g. App Icons, Landing Page Assets"
          />
          <ConfigInput
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="What these assets are for"
          />

          {/* Backend selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Backend</label>
            <div className="grid grid-cols-4 gap-2">
              {(["puter", "tinyfish", "gemini-api", "playwright"] as Backend[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBackend(b)}
                  className={`px-3 py-2.5 rounded-lg text-sm border transition-colors duration-150 ${
                    backend === b
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  {backendLabels[b]}
                </button>
              ))}
            </div>
          </div>

          {/* Asset descriptions */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
              Asset Descriptions
            </label>
            <p className="text-xs text-[var(--color-text-dim)] mb-2">
              One prompt per line, or paste a JSON array with {`{ prompt, style?, dimensions? }`} objects
            </p>
            <textarea
              value={assetsText}
              onChange={(e) => setAssetsText(e.target.value)}
              placeholder={`A futuristic cityscape with neon lights, cyberpunk style\nAn abstract geometric pattern in amber and black\nA minimalist logo of a brain with circuit patterns`}
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]
                         text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                         font-mono resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)]
                       hover:text-[var(--color-text)] bg-[var(--color-surface-2)] border border-[var(--color-border)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-black
                       hover:bg-[var(--color-accent-hover)] transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create Manifest"}
          </button>
        </div>
      </div>
    </div>
  );
}
