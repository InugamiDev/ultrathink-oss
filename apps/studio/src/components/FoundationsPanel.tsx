// intent: visualize project database fundamentals as an inspectable schema graph
// status: done
// next: add AST parsers for edge-case Drizzle/Prisma syntax
// confidence: medium

import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import type { EngineEvent, StartSessionRequest } from "../types.js";
import { getKey } from "../lib/keychain.js";
import { startSession, subscribeToSession } from "../lib/engine-client.js";

type AdapterId = "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk: boolean;
  fk?: string;
}

interface SchemaNode {
  id: string;
  table: string;
  columns: SchemaColumn[];
  engine: string;
  indexes?: string[];
  source?: string;
}

interface SchemaEdge {
  from: string;
  to: string;
  type: "fk";
}

interface FoundationsGraph {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
  meta?: {
    engines?: string[];
    deps?: string[];
    sources?: string[];
  };
}

interface FoundationsPanelProps {
  projectDir: string | null;
}

function tableFromEndpoint(endpoint: string): string {
  return endpoint.split(".")[0] ?? endpoint;
}

function isJoinTable(node: SchemaNode): boolean {
  return node.columns.length >= 2 && node.columns.every((column) => column.pk || Boolean(column.fk));
}

// intent: per-engine glyph + accent colour for the detail card
// status: done — Postgres/MySQL/SQLite/MongoDB/MSSQL/CockroachDB covered
// next: add Supabase / Turso / Neon distinct glyphs if the scanner ever
//       distinguishes them from the underlying engine
// confidence: high
function engineBadge(engine: string): { glyph: string; tone: string; label: string } {
  const e = engine.toLowerCase();
  if (e.includes("postgres") || e === "pg") return { glyph: "🐘", tone: "var(--blue)", label: "PostgreSQL" };
  if (e.includes("mysql") || e.includes("mariadb")) return { glyph: "🐬", tone: "var(--cyan)", label: "MySQL" };
  if (e.includes("sqlite") || e === "lite") return { glyph: "📦", tone: "var(--text-muted)", label: "SQLite" };
  if (e.includes("mongo")) return { glyph: "🍃", tone: "var(--green)", label: "MongoDB" };
  if (e.includes("mssql") || e.includes("sqlserver")) return { glyph: "🪟", tone: "var(--text-dim)", label: "MS SQL" };
  if (e.includes("cockroach")) return { glyph: "🪳", tone: "var(--accent)", label: "CockroachDB" };
  if (e.includes("redis")) return { glyph: "⚡", tone: "var(--red)", label: "Redis" };
  return { glyph: "🗄️", tone: "var(--text-muted)", label: engine || "Database" };
}

// Column-kind icon — small SVG glyphs that read cleanly at 12px next to the
// column name. Beats hex badges because shape stays legible at any zoom.
function ColumnTypeIcon({ column }: { column: SchemaColumn }) {
  if (column.pk) {
    return (
      <span title="Primary key" style={{ color: "var(--amber)", display: "inline-flex" }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="15" r="4" />
          <path d="m10.85 12.15 7.65-7.65" />
          <path d="M18 8 22 4" />
          <path d="m17 5-7.5 7.5" />
        </svg>
      </span>
    );
  }
  if (column.fk) {
    return (
      <span title={`FK → ${column.fk}`} style={{ color: "var(--cyan)", display: "inline-flex" }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </span>
    );
  }
  // Type-based glyph: number, date, boolean, text — cheap visual signal.
  const t = column.type.toLowerCase();
  if (/(int|float|numeric|decimal|double|bigint|smallint|serial)/.test(t)) {
    return (
      <span title={column.type} style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
        #
      </span>
    );
  }
  if (/(timestamp|date|time)/.test(t)) {
    return (
      <span title={column.type} style={{ color: "var(--text-dim)", display: "inline-flex" }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    );
  }
  if (/(bool|boolean|bit)/.test(t)) {
    return (
      <span title={column.type} style={{ color: "var(--text-dim)", display: "inline-flex" }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="6" width="20" height="12" rx="6" ry="6" />
          <circle cx="8" cy="12" r="3" />
        </svg>
      </span>
    );
  }
  if (/(json|jsonb)/.test(t)) {
    return (
      <span title={column.type} style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
        {}
      </span>
    );
  }
  // text / varchar / uuid — keep a faint generic glyph so rows align uniformly.
  return (
    <span title={column.type} style={{ color: "var(--text-dim)", display: "inline-flex" }}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    </span>
  );
}

function cssColor(token: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}

function calloutsForTable(node: SchemaNode): string[] {
  const callouts: string[] = [];
  for (const column of node.columns) {
    if (column.fk) {
      callouts.push(`FK to ${column.fk}`);
      const hasIndex = column.pk || (node.indexes ?? []).includes(column.name);
      const looksLikeFk = column.name.endsWith("_id") || column.name.endsWith("Id") || Boolean(column.fk);
      if (!hasIndex && looksLikeFk) callouts.push(`No index on FK column ${column.name} - joins on this will scan`);
    }
    if (/^(deleted_at|deletedAt|is_deleted|isDeleted|archived_at|archivedAt)$/i.test(column.name)) {
      callouts.push("Soft-delete column detected - consider partial index");
    }
  }
  if (isJoinTable(node)) callouts.push("N:M join table (only FKs + PK)");
  return [...new Set(callouts)];
}

function schemaFragment(node: SchemaNode): string {
  return [
    `table ${node.table} (${node.engine})`,
    ...node.columns.map(
      (column) =>
        `- ${column.name}: ${column.type}${column.nullable ? " nullable" : " not null"}${column.pk ? " pk" : ""}${
          column.fk ? ` fk -> ${column.fk}` : ""
        }`
    ),
  ].join("\n");
}

async function buildStartRequest(projectDir: string, prompt: string): Promise<StartSessionRequest> {
  const adapter = (localStorage.getItem("studio:adapter") as AdapterId | null) ?? "claude";
  const rawModel = localStorage.getItem("studio:default-model");
  const model =
    adapter === "codex" && rawModel?.startsWith("gpt-5-codex")
      ? undefined
      : (adapter === "claude" || adapter === "anthropic-direct") && rawModel && !rawModel.startsWith("claude-")
        ? undefined
        : rawModel || undefined;
  const req: StartSessionRequest = {
    prompt,
    projectDir,
    adapter,
    model,
    topSkills: 1,
  };
  if (adapter === "anthropic-direct") {
    req.apiKey = (await getKey("anthropic-api-key")) ?? undefined;
  } else if (adapter === "openai-compat") {
    req.apiKey = (await getKey("openai-api-key")) ?? undefined;
    req.baseUrl = (await getKey("openai-base-url")) ?? undefined;
  } else if (adapter === "ollama") {
    req.baseUrl = (await getKey("ollama-base-url")) ?? undefined;
  }
  return req;
}

export function FoundationsPanel({ projectDir }: FoundationsPanelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const [hovered, setHovered] = useState<SchemaNode | null>(null);
  // intent: pin the detail card on click so the user can reach the "Explain
  // deeper" button without it vanishing the moment the cursor moves
  // status: done — close button restores hover-only mode
  // next: keyboard nav (arrow keys) to step through nodes
  // confidence: high
  const [pinned, setPinned] = useState<SchemaNode | null>(null);
  // Lets the user temporarily hide the detail card without losing the
  // pinned node — useful when they want to orbit the camera unobstructed.
  const [cardHidden, setCardHidden] = useState(false);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainError, setExplainError] = useState<string | null>(null);
  const [helpingSchema, setHelpingSchema] = useState(false);
  const [schemaHelp, setSchemaHelp] = useState("");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(260, Math.floor(width)), h: Math.max(260, Math.floor(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Esc unpins / dismisses the side card so the user can orbit unobstructed
  // and recover without reaching for the mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (cardHidden) {
        setCardHidden(false);
        return;
      }
      if (pinned || hovered) {
        setPinned(null);
        setHovered(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned, hovered, cardHidden]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["foundations", projectDir],
    enabled: Boolean(projectDir),
    queryFn: () => invoke<FoundationsGraph>("scan_foundations", { projectDir }),
  });

  const graph = data ?? { nodes: [], edges: [] };
  const tableIds = useMemo(() => new Set(graph.nodes.map((node) => node.table)), [graph.nodes]);
  const forceData = useMemo(
    () => ({
      nodes: graph.nodes,
      links: graph.edges
        .map((edge) => ({
          source: tableFromEndpoint(edge.from),
          target: tableFromEndpoint(edge.to),
          label: `${edge.from} -> ${edge.to}`,
        }))
        .filter((edge) => tableIds.has(edge.source) && tableIds.has(edge.target)),
    }),
    [graph.edges, graph.nodes, tableIds]
  );

  async function explain(node: SchemaNode): Promise<void> {
    if (!projectDir || explaining) return;
    setExplaining(node.table);
    setExplainError(null);
    setExplanations((prev) => ({ ...prev, [node.table]: "" }));
    const prompt = `Explain this table in 1 short paragraph for someone new to databases:\n${schemaFragment(node)}`;
    try {
      const req = await buildStartRequest(projectDir, prompt);
      const { sessionId } = await startSession(req);
      const unlisten = await subscribeToSession(sessionId, (ev: EngineEvent) => {
        if (ev.kind === "assistant-text-delta") {
          setExplanations((prev) => ({ ...prev, [node.table]: (prev[node.table] ?? "") + ev.text }));
        } else if (ev.kind === "assistant-text-block") {
          setExplanations((prev) => ({ ...prev, [node.table]: (prev[node.table] ?? "") + ev.text }));
        } else if (ev.kind === "error") {
          setExplainError(ev.message);
        } else if (ev.kind === "completion" || ev.kind === "spawn-exited") {
          setExplaining(null);
          unlisten();
        }
      });
    } catch (err) {
      setExplainError(String(err));
      setExplaining(null);
    }
  }

  async function helpAddSchema(): Promise<void> {
    if (!projectDir || helpingSchema) return;
    setHelpingSchema(true);
    setSchemaHelp("");
    setExplainError(null);
    const prompt =
      "This project has no detected Prisma, Drizzle, or SQL migration schema. Inspect the project, recommend the smallest fitting database schema setup, and implement it only if the stack clearly supports it. Keep the change minimal.";
    try {
      const req = await buildStartRequest(projectDir, prompt);
      const { sessionId } = await startSession(req);
      const unlisten = await subscribeToSession(sessionId, (ev: EngineEvent) => {
        if (ev.kind === "assistant-text-delta") {
          setSchemaHelp((prev) => prev + ev.text);
        } else if (ev.kind === "assistant-text-block") {
          setSchemaHelp((prev) => prev + ev.text);
        } else if (ev.kind === "error") {
          setExplainError(ev.message);
        } else if (ev.kind === "completion" || ev.kind === "spawn-exited") {
          setHelpingSchema(false);
          unlisten();
        }
      });
    } catch (err) {
      setExplainError(String(err));
      setHelpingSchema(false);
    }
  }

  const greenColor = cssColor("--green", "rgb(34, 197, 94)");
  const amberColor = cssColor("--amber", "rgb(251, 191, 36)");
  const graphBackgroundColor = cssColor("--bg", "rgb(15, 23, 42)");

  const nodeThreeObject = (raw: object): THREE.Object3D => {
    const node = raw as SchemaNode;
    const group = new THREE.Group();
    const color = isJoinTable(node) ? amberColor : greenColor;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(14, 8, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
    );
    group.add(mesh);
    const halo = new THREE.Mesh(
      new THREE.BoxGeometry(18, 10, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.BackSide })
    );
    group.add(halo);
    return group;
  };

  if (!projectDir) {
    return (
      <div style={emptyWrapStyle}>
        <div style={emptyTitleStyle}>Open a project to inspect its foundations.</div>
      </div>
    );
  }

  if (!isLoading && !error && graph.nodes.length === 0) {
    return (
      <div style={emptyWrapStyle}>
        <div style={emptyTitleStyle}>No schema detected.</div>
        <div style={emptyTextStyle}>Studio scans for Prisma, Drizzle, and SQL migrations.</div>
        <button type="button" style={primaryBtnStyle} onClick={() => void helpAddSchema()} disabled={helpingSchema}>
          {helpingSchema ? "Starting helper..." : "Help me add one"}
        </button>
        {(schemaHelp || explainError) && <div style={emptyOutputStyle}>{explainError ?? schemaHelp}</div>}
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={h2Style}>Foundations</h2>
          <p style={subStyle}>
            {isLoading
              ? "Scanning schema files..."
              : error
                ? `Scan failed: ${error}`
                : `${graph.nodes.length} table${graph.nodes.length === 1 ? "" : "s"} · ${graph.edges.length} FK edge${
                    graph.edges.length === 1 ? "" : "s"
                  }`}
          </p>
        </div>
        <div style={metaStyle}>
          {(graph.meta?.engines ?? []).map((engine) => (
            <span key={engine} style={pillStyle}>
              {engine}
            </span>
          ))}
        </div>
      </div>

      <div ref={wrapRef} style={graphWrapStyle}>
        {isLoading && <div style={overlayStyle}>Scanning schema...</div>}
        {error && <div style={overlayStyle}>Scan failed: {String(error)}</div>}
        {!isLoading && !error && (
          <ForceGraph3D
            graphData={forceData}
            width={size.w}
            height={size.h}
            backgroundColor={graphBackgroundColor}
            nodeLabel={(n) => (n as SchemaNode).table}
            nodeThreeObject={nodeThreeObject as never}
            linkColor={() => amberColor}
            linkOpacity={0.42}
            linkWidth={1.4}
            linkDirectionalParticles={2}
            linkDirectionalParticleColor={() => amberColor}
            linkDirectionalParticleSpeed={0.004}
            onNodeHover={(node) => setHovered((node as SchemaNode | null) ?? null)}
            onNodeClick={(node) => setPinned((node as SchemaNode | null) ?? null)}
            // Clicking empty space dismisses the pinned card so the user can
            // freely orbit the camera without the side panel always blocking
            // the right ~40% of the view.
            onBackgroundClick={() => {
              setPinned(null);
              setHovered(null);
            }}
            enableNodeDrag={true}
            controlType="orbit"
            cooldownTicks={120}
            d3AlphaDecay={0.035}
          />
        )}
        {(() => {
          // intent: prefer the click-pinned node so the user can move the
          // mouse to the card's buttons without it disappearing
          // status: done
          // confidence: high
          const active = pinned ?? hovered;
          if (!active) return null;
          const badge = engineBadge(active.engine);
          const isPinned = Boolean(pinned);
          // When hidden, render a small pill at the top-right so the user can
          // bring the card back without losing which node they pinned.
          if (cardHidden && isPinned) {
            return (
              <button
                type="button"
                onClick={() => setCardHidden(false)}
                style={miniPillStyle}
                title="Show table details (Esc)"
              >
                <span style={{ fontSize: "13px", lineHeight: 1 }}>{badge.glyph}</span>
                <span>{active.table}</span>
              </button>
            );
          }
          return (
            <div style={detailStyle}>
              <div style={detailHeadStyle}>
                <div style={detailHeadLeftStyle}>
                  <span
                    style={{ ...engineBadgeStyle, background: `${badge.tone}1a`, color: badge.tone }}
                    title={badge.label}
                  >
                    <span style={{ fontSize: "15px", lineHeight: 1 }}>{badge.glyph}</span>
                  </span>
                  <div>
                    <div style={tableTitleStyle}>{active.table}</div>
                    <div style={detailMetaStyle}>
                      {badge.label} · {active.columns.length} column{active.columns.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {isJoinTable(active) && <span style={joinPillStyle}>join</span>}
                  {isPinned && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCardHidden(true)}
                        style={closeBtnStyle}
                        title="Hide card to orbit the graph"
                        aria-label="Hide"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => setPinned(null)}
                        style={closeBtnStyle}
                        title="Close pinned details (Esc)"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={columnsStyle}>
                {active.columns.map((column) => (
                  <div key={column.name} style={columnRowStyle}>
                    <ColumnTypeIcon column={column} />
                    <span style={{ color: "var(--text)", flex: 1 }}>{column.name}</span>
                    <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                      {column.type}
                    </span>
                    {column.pk && <span style={badgeStyle}>pk</span>}
                    {column.fk && <span style={badgeStyle}>fk</span>}
                    {column.nullable && <span style={mutedBadgeStyle}>null</span>}
                  </div>
                ))}
              </div>
              <div style={calloutsStyle}>
                {calloutsForTable(active).map((callout) => (
                  <div key={callout} style={calloutStyle}>
                    {callout}
                  </div>
                ))}
              </div>
              <button
                type="button"
                style={primaryBtnStyle}
                disabled={explaining === active.table}
                onClick={() => void explain(active)}
              >
                {explaining === active.table ? "Explaining..." : "Explain deeper"}
              </button>
              {(explanations[active.table] || explainError) && (
                <div style={explanationStyle}>{explainError ?? explanations[active.table]}</div>
              )}
              {!isPinned && <div style={pinHintStyle}>Click the node to pin this card</div>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};
const h2Style: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "var(--text)",
};
const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
  marginTop: "2px",
};
const metaStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
};
const pillStyle: React.CSSProperties = {
  color: "var(--bg)",
  background: "var(--green)",
  borderRadius: "var(--radius-sm)",
  fontSize: "10.5px",
  fontWeight: 700,
  padding: "3px 7px",
};
const graphWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  overflow: "hidden",
};
const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  color: "var(--text-muted)",
  background: "var(--bg)",
};
const detailStyle: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  width: "min(420px, 46vw)",
  maxHeight: "calc(100% - 32px)",
  overflowY: "auto",
  zIndex: 20,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-4)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
};
const detailHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "var(--space-3)",
};
const detailHeadLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};
const engineBadgeStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  flex: "0 0 32px",
};
const closeBtnStyle: React.CSSProperties = {
  width: "22px",
  height: "22px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
  padding: 0,
};
const pinHintStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--text-dim)",
  marginTop: "6px",
  textAlign: "center",
};
const miniPillStyle: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  zIndex: 20,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  padding: "5px 12px",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
};
const tableTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "var(--text)",
};
const detailMetaStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
};
const joinPillStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  color: "var(--bg)",
  background: "var(--amber)",
  borderRadius: "var(--radius-sm)",
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 6px",
};
const columnsStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};
const columnRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(90px, 1fr) minmax(80px, 0.8fr) auto auto auto",
  gap: "8px",
  alignItems: "center",
  fontSize: "11.5px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  paddingBottom: "5px",
};
const badgeStyle: React.CSSProperties = {
  color: "var(--bg)",
  background: "var(--green)",
  borderRadius: "var(--radius-sm)",
  fontSize: "9px",
  fontWeight: 700,
  padding: "1px 5px",
};
const mutedBadgeStyle: React.CSSProperties = {
  ...badgeStyle,
  color: "var(--text-muted)",
  background: "var(--bg)",
};
const calloutsStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  margin: "var(--space-4) 0",
};
const calloutStyle: React.CSSProperties = {
  color: "var(--amber)",
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.25)",
  borderRadius: "var(--radius-sm)",
  fontSize: "11px",
  padding: "6px 8px",
};
const primaryBtnStyle: React.CSSProperties = {
  color: "var(--bg)",
  background: "var(--green)",
  border: "none",
  borderRadius: "var(--radius-md)",
  fontSize: "12px",
  fontWeight: 700,
  padding: "8px 12px",
  cursor: "pointer",
};
const explanationStyle: React.CSSProperties = {
  marginTop: "var(--space-3)",
  color: "var(--text)",
  fontSize: "12px",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
};
const emptyWrapStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-3)",
  background: "var(--bg)",
  color: "var(--text-muted)",
};
const emptyTitleStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: "16px",
  fontWeight: 700,
};
const emptyTextStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "12px",
};
const emptyOutputStyle: React.CSSProperties = {
  width: "min(680px, 88vw)",
  maxHeight: "220px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  color: "var(--text)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-4)",
  fontSize: "12px",
  lineHeight: 1.55,
};
