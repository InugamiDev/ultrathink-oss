// intent: bottom-of-window status bar — identity, branch, model, token/credit usage, quotas
// status: done — usage and quota segments stay visible, then hydrate from live events
// next: replace placeholder quotas once a periodic Claude Code quota poller emits studio:quota
// confidence: high

import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface StatusLineProps {
  cwd?: string;
  branch?: string;
  version?: string;
  debugOpen?: boolean;
  onToggleDebug?: () => void;
}

interface QuotaState {
  fiveHrPercent: number | null;
  fiveHrResetIn: string | null;
  weekPercent: number | null;
  weekResetIn: string | null;
}

interface BudgetState {
  contextPercent: number | null;
  tokens: string | null;
  cost: string | null;
  uptime: string | null;
  rate: string | null;
  compactRecommended: boolean;
}

interface ModelState {
  adapter: AdapterId;
  model: string;
  activeModel: string | null;
}

type AdapterId = "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";

const EMPTY_QUOTA: QuotaState = {
  fiveHrPercent: null,
  fiveHrResetIn: null,
  weekPercent: null,
  weekResetIn: null,
};

const EMPTY_BUDGET: BudgetState = {
  contextPercent: null,
  tokens: null,
  cost: null,
  uptime: null,
  rate: null,
  compactRecommended: false,
};

interface QuotaPayload {
  fiveHrPercent?: number;
  fiveHrResetIn?: string;
  weekPercent?: number;
  weekResetIn?: string;
}

interface EngineStatusPayload {
  contextPercent?: number;
  tokens?: number;
  costUsd?: number;
  uptimeMs?: number;
  rate?: number;
  compactRecommended?: boolean;
}

const ADAPTER_LABELS: Record<AdapterId, string> = {
  claude: "Claude",
  codex: "Codex",
  "anthropic-direct": "Anthropic",
  "openai-compat": "OpenAI",
  ollama: "Ollama",
};

const ADAPTER_DEFAULTS: Record<AdapterId, string> = {
  claude: "claude-sonnet-4-6",
  codex: "default",
  "anthropic-direct": "claude-sonnet-4-6",
  "openai-compat": "gpt-5",
  ollama: "llama3.2",
};

function readModelState(): ModelState {
  const adapter = ((localStorage.getItem("studio:adapter") as AdapterId | null) ?? "claude") as AdapterId;
  const fallback = ADAPTER_DEFAULTS[adapter] ?? "default";
  return {
    adapter,
    model: localStorage.getItem("studio:default-model") || fallback,
    activeModel: null,
  };
}

export function StatusLine({ cwd, branch, version, debugOpen, onToggleDebug }: StatusLineProps) {
  const [quota, setQuota] = useState<QuotaState>(EMPTY_QUOTA);
  const [budget, setBudget] = useState<BudgetState>(EMPTY_BUDGET);
  const [modelState, setModelState] = useState<ModelState>(() => readModelState());
  const mountedAt = useRef<number>(Date.now());
  const [, forceTick] = useState(0);

  // Live uptime tick — count how long Studio has been running.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const refresh = () => setModelState((prev) => ({ ...readModelState(), activeModel: prev.activeModel }));
    const onModelConfig = (ev: Event) => {
      const detail = (ev as CustomEvent<Partial<ModelState>>).detail;
      setModelState((prev) => ({
        adapter: detail?.adapter ?? prev.adapter,
        model: detail?.model ?? prev.model,
        activeModel: detail?.activeModel ?? prev.activeModel,
      }));
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("studio:model-config", onModelConfig);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("studio:model-config", onModelConfig);
    };
  }, []);

  // Poll local telemetry for historical spend. Token usage comes from live
  // engine usage events; event count is not token count.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      invoke<{
        eventCount: number;
        spendUsd: number;
        hasData: boolean;
      }>("read_telemetry", { window: "all" })
        .then((s) => {
          if (cancelled) return;
          setBudget((prev) => ({
            ...prev,
            cost: s.hasData ? formatCost(s.spendUsd) : prev.cost,
          }));
        })
        .catch(() => undefined);
    };
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Drive budget directly from the engine:event stream. This is the same firehose
  // the debug terminal subscribes to — no need for a separate engine:status emit.
  // We accumulate input+output tokens, cost (cumulative), and a 60s rolling rate.
  const tokenAccRef = useRef({ input: 0, output: 0, cost: 0, marks: [] as number[] });
  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | undefined;
    void listen<{ sessionId: string; event: { kind: string; [k: string]: unknown } }>("engine:event", (msg) => {
      const ev = msg.payload?.event;
      if (!ev || typeof ev !== "object") return;
      const acc = tokenAccRef.current;
      if (ev.kind === "usage") {
        const i = Number((ev as { inputTokens?: number }).inputTokens ?? 0);
        const o = Number((ev as { outputTokens?: number }).outputTokens ?? 0);
        const model = (ev as { model?: string }).model;
        if (model) setModelState((prev) => ({ ...prev, activeModel: model }));
        acc.input += i;
        acc.output += o;
        acc.marks.push(Date.now());
        // keep last 60s of marks
        const cutoff = Date.now() - 60_000;
        acc.marks = acc.marks.filter((t) => t > cutoff);
      }
      if (ev.kind === "completion") {
        const c = Number((ev as { costUsd?: number }).costUsd ?? 0);
        if (c > 0) acc.cost += c;
      }
      if (ev.kind === "task-completed") {
        const usage = (ev as { usage?: { costUsd?: number } }).usage;
        const c = Number(usage?.costUsd ?? 0);
        if (c > 0) acc.cost += c;
      }
        const totalTokens = acc.input + acc.output;
        const ratePerMin = Math.round(acc.marks.length); // events/min ~= calls/min
        setBudget((prev) => ({
          ...prev,
          tokens: totalTokens > 0 ? `${formatTokens(totalTokens)} tok` : prev.tokens,
          cost: acc.cost > 0 ? formatCost(acc.cost) : prev.cost,
          rate: ratePerMin > 0 ? `${ratePerMin}/m` : prev.rate,
        }));
    }).then((u) => {
      if (cancelled) u();
      else unlisten = u;
    });

    const unStatus = listen<EngineStatusPayload>("engine:status", (ev) => {
      const p = ev.payload;
      setBudget((prev) => ({
        contextPercent: p.contextPercent ?? prev.contextPercent,
        tokens: p.tokens !== undefined ? `${formatTokens(p.tokens)} tok` : prev.tokens,
        cost: p.costUsd !== undefined ? formatCost(p.costUsd) : prev.cost,
        uptime: p.uptimeMs !== undefined ? formatUptime(p.uptimeMs) : prev.uptime,
        rate: p.rate !== undefined ? `${p.rate}/m` : prev.rate,
        compactRecommended: p.compactRecommended ?? prev.compactRecommended,
      }));
    });

    const unQuota = listen<QuotaPayload>("studio:quota", (ev) => {
      const p = ev.payload;
      setQuota((prev) => ({
        fiveHrPercent: p.fiveHrPercent ?? prev.fiveHrPercent,
        fiveHrResetIn: p.fiveHrResetIn ?? prev.fiveHrResetIn,
        weekPercent: p.weekPercent ?? prev.weekPercent,
        weekResetIn: p.weekResetIn ?? prev.weekResetIn,
      }));
    });
    return () => {
      cancelled = true;
      unlisten?.();
      void unStatus.then((u) => u());
      void unQuota.then((u) => u());
    };
  }, []);

  const liveUptime = formatUptime(Date.now() - mountedAt.current);
  const ctxPct = budget.contextPercent;
  const ctxColor =
    ctxPct === null ? "var(--text-dim)" : ctxPct >= 90 ? "var(--amber)" : ctxPct >= 70 ? "var(--cyan)" : "var(--green)";

  const tokenLabel = budget.tokens ?? "0 tok";
  const costLabel = budget.cost ?? "$0.0000";
  const rateLabel = budget.rate ?? "0/m";
  const modelLabel = modelState.activeModel || modelState.model || ADAPTER_DEFAULTS[modelState.adapter] || "default";

  return (
    <div style={barStyle}>
      {/* Left zone: identity + project */}
      <Brand />
      {cwd && (
        <>
          <Sep />
          <span style={cwdStyle} title={cwd}>
            {shortenPath(cwd)}
          </span>
        </>
      )}
      {branch && (
        <span style={branchStyle}>
          <span style={{ marginRight: "4px" }}>⎇</span>
          {branch}
        </span>
      )}
      {version && (
        <>
          <Sep />
          <span style={dimMonoStyle}>{version}</span>
        </>
      )}
      {budget.compactRecommended && (
        <>
          <Sep />
          <CompactPill />
        </>
      )}

      {/* Center zone fills the gap so right zone hugs the right edge */}
      <div style={{ flex: 1 }} />

      {/* Right zone: live usage (only when something to show) */}
      <ModelChip adapter={modelState.adapter} model={modelLabel} />
      <Sep />
      <ContextMeter percent={ctxPct} color={ctxColor} />
      <UsageChip label="tok" value={tokenLabel} active={budget.tokens !== null} title="Live token usage this session" />
      <UsageChip label="credit" value={costLabel} active={budget.cost !== null} title="Recorded spend / live cost" />
      <UsageChip label="rate" value={rateLabel} active={budget.rate !== null} title="Engine usage events per minute" />
      <Sep />
      <span style={mutedMonoStyle} title="Studio uptime">
        {budget.uptime ?? liveUptime}
      </span>
      {onToggleDebug && (
        <>
          <Sep />
          <button
            type="button"
            style={{ ...statusButtonStyle, ...(debugOpen ? statusButtonActiveStyle : null) }}
            onClick={onToggleDebug}
            aria-pressed={debugOpen ?? false}
            title="Toggle console (Cmd+`)"
          >
            {debugOpen ? "Hide console" : "Show console"}
          </button>
        </>
      )}
      <QuotaChip label="5hr" percent={quota.fiveHrPercent} resetIn={quota.fiveHrResetIn} />
      <QuotaChip label="7d" percent={quota.weekPercent} resetIn={quota.weekResetIn} />
    </div>
  );
}

function ModelChip({ adapter, model }: { adapter: AdapterId; model: string }) {
  const label = ADAPTER_LABELS[adapter] ?? adapter;
  return (
    <span style={modelChipStyle} title={`Selected LLM: ${label} · ${model}`}>
      <span style={modelAdapterStyle}>{label}</span>
      <span style={modelNameStyle}>{shortModel(model)}</span>
    </span>
  );
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, "").replace(/^gpt-/, "gpt-").replace(/-20\d{6}$/, "");
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function Brand() {
  return (
    <span style={brandStyle}>
      <span style={{ color: "var(--accent)", marginRight: "5px" }}>✦</span>
      <span style={{ color: "var(--accent)", fontWeight: 700 }}>ultrathink</span>
    </span>
  );
}

function Sep() {
  return <span style={sepStyle}>·</span>;
}

function CompactPill() {
  return (
    <span style={compactPillStyle}>
      <span style={{ marginRight: "4px" }}>⚠</span>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>/compact</span>
    </span>
  );
}

function ContextMeter({ percent, color }: { percent: number | null; color: string }) {
  const fill = percent ?? 0;
  return (
    <span style={ctxWrapStyle}>
      <span style={ctxBarOuterStyle}>
        <span style={{ ...ctxBarFillStyle, width: `${Math.min(fill, 100)}%`, background: color }} />
      </span>
      <span style={{ ...ctxPercentStyle, color }}>{percent === null ? "—" : `${percent}%`}</span>
    </span>
  );
}

function UsageChip({ label, value, active, title }: { label: string; value: string; active: boolean; title: string }) {
  return (
      <span style={usageChipStyle} title={active ? title : `${title} - waiting for data`}>
      <span style={usageLabelStyle}>{label}</span>
      <span style={{ ...usageValueStyle, color: active ? "var(--text)" : "var(--text-dim)" }}>{value}</span>
    </span>
  );
}

function QuotaChip({ label, percent, resetIn }: { label: string; percent: number | null; resetIn: string | null }) {
  const tone =
    percent === null
      ? "var(--text-dim)"
      : 100 - percent > 50
        ? "var(--green)"
        : 100 - percent > 20
          ? "var(--amber)"
          : "var(--red)";
  return (
    <span style={quotaChipStyle}>
      <span style={quotaLabelStyle}>{label}</span>
      <span style={{ ...quotaPctStyle, color: tone }}>{percent === null ? "—" : `${percent}%`}</span>
      <span style={quotaResetStyle}>↻{resetIn ?? "—"}</span>
    </span>
  );
}

function shortenPath(p: string): string {
  // …agents/ultrathink/apps/studio
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 4) return p;
  return "…/" + parts.slice(-4).join("/");
}

const barStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  height: "32px",
  padding: "0 var(--space-4)",
  background: "var(--bg-elevated)",
  borderTop: "1px solid var(--border)",
  fontSize: "10.5px",
  flexShrink: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
};
const brandStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "11px",
  fontWeight: 700,
};
const sepStyle: React.CSSProperties = { color: "var(--text-dim)", fontSize: "11px" };
const cwdStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "260px",
};
const branchStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "var(--font-mono)",
  color: "var(--cyan)",
};
const dimMonoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-dim)",
};
const mutedMonoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
};
const compactPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 7px",
  fontSize: "10px",
  color: "var(--amber)",
  background: "rgba(251,191,36,0.13)",
  border: "1px solid rgba(251,191,36,0.33)",
  borderRadius: "var(--radius-sm)",
};
const ctxWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};
const ctxBarOuterStyle: React.CSSProperties = {
  display: "inline-block",
  width: "88px",
  height: "8px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  overflow: "hidden",
  position: "relative",
};
const ctxBarFillStyle: React.CSSProperties = {
  display: "block",
  height: "100%",
  transition: "width 0.4s ease, background 0.3s ease",
};
const ctxPercentStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  fontWeight: 700,
  minWidth: "30px",
};
const usageChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "2px 7px",
  fontSize: "9.5px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
};
const usageLabelStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  textTransform: "uppercase",
};
const usageValueStyle: React.CSSProperties = {
  fontWeight: 600,
};
const quotaChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "2px 8px",
  fontSize: "9.5px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  marginLeft: "var(--space-2)",
};
const quotaLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--text-dim)",
};
const quotaPctStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  fontWeight: 600,
};
const quotaResetStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-dim)",
};
const modelChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  maxWidth: "260px",
  padding: "2px 8px",
  background: "rgba(167,139,250,0.10)",
  border: "1px solid rgba(167,139,250,0.28)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
};
const modelAdapterStyle: React.CSSProperties = {
  color: "var(--accent)",
  fontWeight: 700,
};
const modelNameStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const statusButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: "22px",
  padding: "0 9px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  background: "var(--bg)",
  fontSize: "10px",
  fontWeight: 600,
};
const statusButtonActiveStyle: React.CSSProperties = {
  color: "var(--accent)",
  borderColor: "rgba(167,139,250,0.35)",
  background: "rgba(167,139,250,0.10)",
};
