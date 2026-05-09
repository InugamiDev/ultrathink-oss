// intent: insights/analytics view — KPI cards + recent activity + skill-cost breakdown
// status: done — reads ~/.ultrathink-studio/telemetry.jsonl via Tauri `read_telemetry`
// next: emit telemetry events from car_start_run / send_message; sparkline charts
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TelemetryEvent {
  at: string;
  kind: string;
  project?: string;
  prompt?: string;
  status?: string;
  durationMs?: number;
  costUsd?: number;
  skill?: string;
}

interface InsightsSummary {
  eventCount: number;
  buildsShipped: number;
  buildsFailed: number;
  successRatePct: number;
  p95DurationMs: number;
  spendUsd: number;
  recent: TelemetryEvent[];
  skillCosts: Array<[string, number, number]>;
  hasData: boolean;
}

const EMPTY: InsightsSummary = {
  eventCount: 0,
  buildsShipped: 0,
  buildsFailed: 0,
  successRatePct: 0,
  p95DurationMs: 0,
  spendUsd: 0,
  recent: [],
  skillCosts: [],
  hasData: false,
};

export function InsightsPanel() {
  const [data, setData] = useState<InsightsSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");

  useEffect(() => {
    setLoading(true);
    invoke<InsightsSummary>("read_telemetry", { window: range })
      .then((s) => {
        setData(s ?? EMPTY);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [range]);

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={h2Style}>Insights</h2>
          <p style={subStyle}>
            {loading
              ? "Reading telemetry…"
              : error
                ? `Couldn't read ~/.ultrathink-studio/telemetry.jsonl: ${error}`
                : data.hasData
                  ? `${data.eventCount.toLocaleString()} events recorded.`
                  : "No telemetry yet — once you run builds and CAR runs, KPIs appear here."}
          </p>
        </div>
        <div style={rangeWrapStyle}>
          {(["24h", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{ ...rangeBtnStyle, ...(range === r ? rangeBtnActiveStyle : null) }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={kpiGridStyle}>
        <KpiCard label="Builds shipped" value={fmt(data.buildsShipped)} />
        <KpiCard
          label="Success rate"
          value={data.hasData ? `${data.successRatePct.toFixed(0)}%` : "—"}
          hint={data.hasData ? `${data.buildsFailed} failed` : undefined}
        />
        <KpiCard label="p95 build time" value={data.hasData ? formatMs(data.p95DurationMs) : "—"} />
        <KpiCard label="Spend" value={data.hasData ? `$${data.spendUsd.toFixed(2)}` : "—"} />
      </div>

      <div style={twoColStyle}>
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={h3Style}>Recent activity</h3>
            <span style={mutedStyle}>{range}</span>
          </div>
          <div style={listStyle}>
            {data.recent.length === 0 ? (
              <div style={emptyStyle}>{data.hasData ? "Nothing in this window." : "No events yet."}</div>
            ) : (
              data.recent.map((b, i) => <ActivityItem key={i} ev={b} />)
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={h3Style}>Top skills by cost</h3>
            <span style={mutedStyle}>{range}</span>
          </div>
          <div style={listStyle}>
            {data.skillCosts.length === 0 ? (
              <div style={emptyStyle}>{data.hasData ? "No per-skill cost data yet." : "No data."}</div>
            ) : (
              data.skillCosts.map(([name, cost, count]) => (
                <SkillCostRow
                  key={name}
                  name={name}
                  cost={cost}
                  count={count}
                  share={(cost / Math.max(data.spendUsd, 0.0001)) * 100}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return n === 0 ? "—" : n.toLocaleString();
}
function formatMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={kpiCardStyle}>
      <div style={kpiLabelStyle}>{label}</div>
      <div style={kpiValueStyle}>{value}</div>
      <div style={kpiFootStyle}>{hint && <span style={{ color: "var(--text-dim)" }}>{hint}</span>}</div>
    </div>
  );
}

function ActivityItem({ ev }: { ev: TelemetryEvent }) {
  const tone =
    ev.status === "ok" || ev.status === "shipped" || ev.status === "completed"
      ? "var(--green)"
      : ev.status === "fail" || ev.status === "failed" || ev.status === "error"
        ? "var(--red)"
        : "var(--amber)";
  return (
    <div style={buildRowStyle}>
      <span style={{ ...statusDotStyle, background: tone }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={buildPromptStyle}>{ev.prompt ?? ev.kind}</div>
        <div style={buildMetaStyle}>
          {ev.project && <span style={projectChipStyle}>{ev.project}</span>}
          {ev.durationMs !== undefined && (
            <>
              <span>·</span>
              <span>{formatMs(ev.durationMs)}</span>
            </>
          )}
          {ev.costUsd !== undefined && (
            <>
              <span>·</span>
              <span style={{ color: "var(--text)" }}>${ev.costUsd.toFixed(2)}</span>
            </>
          )}
          <span>·</span>
          <span>{relativeTime(ev.at)}</span>
        </div>
      </div>
    </div>
  );
}

function SkillCostRow({ name, cost, count, share }: { name: string; cost: number; count: number; share: number }) {
  return (
    <div style={skillRowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={skillNameStyle}>{name}</div>
        <div style={skillMetaStyle}>
          <span>{count.toLocaleString()} runs</span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={skillCostStyle}>${cost.toFixed(2)}</div>
        <div style={skillShareStyle}>{share.toFixed(1)}%</div>
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "var(--space-7)",
  background: "var(--bg)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  marginBottom: "var(--space-6)",
};
const h2Style: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: "4px",
};
const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
};
const rangeWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "2px",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "3px",
};
const rangeBtnStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-muted)",
  padding: "5px 12px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
};
const rangeBtnActiveStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  color: "var(--text)",
};
const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "var(--space-4)",
  marginBottom: "var(--space-6)",
};
const kpiCardStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};
const kpiLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const kpiValueStyle: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: 700,
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  lineHeight: 1.1,
};
const kpiFootStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  alignItems: "center",
  fontSize: "11px",
  minHeight: "14px",
};
const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: "var(--space-5)",
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
};
const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-4) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const h3Style: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text)",
};
const mutedStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
};
const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};
const buildRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const statusDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  flexShrink: 0,
};
const buildPromptStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "var(--text)",
  fontWeight: 500,
  marginBottom: "3px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const buildMetaStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--text-dim)",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: "var(--font-mono)",
};
const projectChipStyle: React.CSSProperties = {
  background: "var(--accent-soft)",
  color: "var(--accent)",
  padding: "1px 6px",
  borderRadius: "var(--radius-sm)",
  fontSize: "10px",
  fontWeight: 600,
};
const skillRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const skillNameStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "var(--text)",
  fontWeight: 500,
  marginBottom: "3px",
  fontFamily: "var(--font-mono)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const skillMetaStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--text-dim)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
const skillCostStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};
const skillShareStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
};
const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
  padding: "var(--space-7)",
};
