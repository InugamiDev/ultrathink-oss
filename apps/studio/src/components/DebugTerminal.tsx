// intent: developer debug console — slide-up panel, topic chips, pause/resume, resize, copy
// status: done — grouped by topic with live counts; click chip to filter; ⏸ to freeze stream
// next: persist column widths between sessions; export as JSONL file
// confidence: high

import { useEffect, useMemo, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const SUBSCRIBE_TOPICS = ["engine:event", "engine:status", "studio:quota", "studio:summon"];

interface LogRow {
  at: number;
  topic: string;
  payload: unknown;
  level: "info" | "warn" | "error";
}

const TOPIC_TONES: Record<string, string> = {
  "engine:event": "var(--accent)",
  "engine:status": "var(--cyan)",
  "studio:quota": "var(--blue)",
  "studio:summon": "var(--pink)",
  "console:error": "var(--red)",
  "diagnose:spawn": "var(--teal)",
};

function toneFor(topic: string, level: "info" | "warn" | "error"): string {
  if (level === "error") return "var(--red)";
  if (level === "warn") return "var(--amber)";
  if (TOPIC_TONES[topic]) return TOPIC_TONES[topic];
  if (topic.startsWith("car:event:")) return "var(--teal)";
  return "var(--text-muted)";
}

export function isDebugEnabled(): boolean {
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("debug") === "1" || qs.get("debug") === "true") return true;
  } catch {
    /* ignore */
  }
  try {
    if (localStorage.getItem("studio:debug") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && env.VITE_STUDIO_DEBUG === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function DebugTerminal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");
  const [excludedTopics, setExcludedTopics] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const [height, setHeight] = useState(() => {
    const saved = Number(localStorage.getItem("studio:debug:height"));
    return Number.isFinite(saved) && saved > 100 ? saved : 320;
  });
  const [carRunIds, setCarRunIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyBottom = useRef(true);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const bufferRef = useRef<LogRow[]>([]);

  // Subscribe to base topics on mount
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;

    const ingest = (topic: string, payload: unknown, level: "info" | "warn" | "error" = "info") => {
      const row: LogRow = { at: Date.now(), topic, payload, level };
      if (pausedRef.current) {
        bufferRef.current.push(row);
        return;
      }
      setRows((prev) => append(prev, row));
    };

    for (const topic of SUBSCRIBE_TOPICS) {
      void listen(topic, (ev) => {
        // Detect error events on engine:event so they color correctly
        const payload = ev.payload as { event?: { kind?: string } };
        const kind = payload?.event?.kind;
        const level: "info" | "warn" | "error" =
          kind === "error" ? "error" : kind === "sidecar-stderr" ? "warn" : "info";
        ingest(topic, ev.payload, level);
      }).then((u) => {
        if (cancelled) u();
        else unlisteners.push(u);
      });
    }

    const origError = console.error;
    console.error = (...args: unknown[]) => {
      ingest(
        "console:error",
        args.map((a) => (a instanceof Error ? a.message : a)),
        "error"
      );
      origError(...args);
    };

    return () => {
      cancelled = true;
      unlisteners.forEach((u) => u());
      console.error = origError;
    };
  }, []);

  // Per-CAR-run topic subscriptions
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let cancelled = false;
    for (const id of carRunIds) {
      void listen(`car:event:${id}`, (ev) => {
        const row: LogRow = {
          at: Date.now(),
          topic: `car:event:${id}`,
          payload: ev.payload,
          level: "info",
        };
        if (pausedRef.current) {
          bufferRef.current.push(row);
          return;
        }
        setRows((prev) => append(prev, row));
      }).then((u) => {
        if (cancelled) u();
        else unlisteners.push(u);
      });
    }
    return () => {
      cancelled = true;
      unlisteners.forEach((u) => u());
    };
  }, [carRunIds]);

  // When unpausing, drain the buffer
  useEffect(() => {
    if (!paused && bufferRef.current.length > 0) {
      setRows((prev) => {
        const drained = bufferRef.current;
        bufferRef.current = [];
        const next = [...prev, ...drained];
        return next.length > 1000 ? next.slice(next.length - 1000) : next;
      });
    }
  }, [paused]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickyBottom.current || paused) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length, paused]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickyBottom.current = el.scrollHeight - (el.scrollTop + el.clientHeight) < 30;
  }

  // Drag-to-resize from top edge
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  function startResize(e: React.MouseEvent) {
    dragRef.current = { startY: e.clientY, startHeight: height };
    const onMove = (mv: MouseEvent) => {
      if (!dragRef.current) return;
      const dy = dragRef.current.startY - mv.clientY;
      const next = Math.max(160, Math.min(window.innerHeight - 100, dragRef.current.startHeight + dy));
      setHeight(next);
    };
    const onUp = () => {
      if (dragRef.current) localStorage.setItem("studio:debug:height", String(height));
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Per-topic counts
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.topic, (m.get(r.topic) ?? 0) + 1);
    return m;
  }, [rows]);

  const topics = useMemo(() => Array.from(topicCounts.keys()).sort(), [topicCounts]);

  const filtered = useMemo(() => {
    const q = filter.trim();
    if (!q && excludedTopics.size === 0) return rows;
    // Parse key:value tokens (Chrome DevTools style). Bare words become free-text.
    const constraints: { key: string; value: string }[] = [];
    const freeTerms: string[] = [];
    for (const tok of q.split(/\s+/)) {
      if (!tok) continue;
      const m = tok.match(/^([a-z]+):(.+)$/i);
      if (m) constraints.push({ key: m[1].toLowerCase(), value: m[2].toLowerCase() });
      else freeTerms.push(tok.toLowerCase());
    }
    return rows.filter((r) => {
      if (excludedTopics.has(r.topic)) return false;
      const blob = (() => {
        try {
          return JSON.stringify(r.payload).toLowerCase();
        } catch {
          return String(r.payload).toLowerCase();
        }
      })();
      for (const c of constraints) {
        if (c.key === "topic" && !r.topic.toLowerCase().includes(c.value)) return false;
        else if (c.key === "level" && r.level !== c.value) return false;
        else if (c.key === "kind") {
          const kind = ((r.payload as { event?: { kind?: string } })?.event?.kind ?? "").toLowerCase();
          if (!kind.includes(c.value)) return false;
        } else if (c.key === "session") {
          const sid = ((r.payload as { sessionId?: string })?.sessionId ?? "").toLowerCase();
          if (!sid.includes(c.value)) return false;
        } else if (!blob.includes(`${c.key}:${c.value}`) && !blob.includes(c.value)) {
          return false;
        }
      }
      for (const term of freeTerms) {
        if (!r.topic.toLowerCase().includes(term) && !blob.includes(term)) return false;
      }
      return true;
    });
  }, [rows, filter, excludedTopics]);

  // Sticky errors — pin most recent error to the top, separately from filtered list.
  const stickyError = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].level === "error") return rows[i];
    }
    return null;
  }, [rows]);

  function toggleTopic(t: string) {
    setExcludedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function soloTopic(t: string) {
    setExcludedTopics(new Set(topics.filter((x) => x !== t)));
  }

  function clearExcludes() {
    setExcludedTopics(new Set());
  }

  async function runDiagnose() {
    try {
      const result = await invoke("diagnose_spawn");
      setRows((prev) => append(prev, { at: Date.now(), topic: "diagnose:spawn", payload: result, level: "info" }));
    } catch (err) {
      setRows((prev) =>
        append(prev, { at: Date.now(), topic: "diagnose:spawn", payload: { error: String(err) }, level: "error" })
      );
    }
  }

  return (
    <div style={{ ...rootStyle, height: `${height}px` }}>
      {/* Resize handle */}
      <div style={resizeHandleStyle} onMouseDown={startResize} title="Drag to resize" />

      {/* Toolbar */}
      <div style={headerStyle}>
        <span style={titleStyle}>Debug</span>
        <span style={mutedStyle}>
          {filtered.length}
          {filtered.length !== rows.length && <> / {rows.length}</>} events
        </span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter — supports topic:engine level:error kind:usage session:abc"
          title="Free text matches anywhere. Use key:value tokens — keys: topic, level, kind, session."
          style={filterInputStyle}
        />
        <input
          placeholder="watch run id"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v && !carRunIds.includes(v)) setCarRunIds((prev) => [...prev, v]);
              (e.target as HTMLInputElement).value = "";
            }
          }}
          style={{ ...filterInputStyle, width: "150px" }}
          title="Press Enter to subscribe to car:event:<id>"
        />
        <div style={{ flex: 1 }} />
        <button
          style={{ ...iconBtnStyle, color: paused ? "var(--amber)" : "var(--text-muted)" }}
          onClick={() => setPaused((p) => !p)}
          title={paused ? "Resume stream (buffered events drain on resume)" : "Pause stream"}
        >
          {paused ? `▶ Resume (${bufferRef.current.length})` : "⏸ Pause"}
        </button>
        <button style={iconBtnStyle} onClick={runDiagnose} title="Run diagnose_spawn">
          🔍 Diagnose
        </button>
        <button style={iconBtnStyle} onClick={() => setRows([])} title="Clear all events">
          Clear
        </button>
        <button style={iconBtnStyle} onClick={onClose} title="Close (Cmd+`)">
          ✕
        </button>
      </div>

      {/* Topic chip rail */}
      {topics.length > 0 && (
        <div style={chipRailStyle}>
          {excludedTopics.size > 0 && (
            <button style={{ ...chipBaseStyle, color: "var(--text-dim)" }} onClick={clearExcludes}>
              show all
            </button>
          )}
          {topics.map((t) => {
            const muted = excludedTopics.has(t);
            const tone = toneFor(t, "info");
            return (
              <button
                key={t}
                onClick={() => toggleTopic(t)}
                onDoubleClick={() => soloTopic(t)}
                title={muted ? "Click to show" : "Click to hide · double-click to solo"}
                style={{
                  ...chipBaseStyle,
                  borderColor: muted ? "var(--border)" : tone,
                  background: muted ? "transparent" : "var(--bg)",
                  color: muted ? "var(--text-dim)" : tone,
                  textDecoration: muted ? "line-through" : "none",
                }}
              >
                <span style={{ ...chipDotStyle, background: tone, opacity: muted ? 0.3 : 1 }} />
                <span style={{ fontFamily: "var(--font-mono)" }}>{t}</span>
                <span style={chipCountStyle}>{topicCounts.get(t)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky error banner — most recent error pinned above the list */}
      {stickyError && (
        <div style={stickyErrorStyle}>
          <span style={{ color: "var(--red)", fontWeight: 700 }}>!</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
            {(() => {
              try {
                const ev = (stickyError.payload as { event?: { message?: string } })?.event;
                return ev?.message ?? JSON.stringify(stickyError.payload).slice(0, 200);
              } catch {
                return String(stickyError.payload);
              }
            })()}
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "9.5px" }}>
            {new Date(stickyError.at).toLocaleTimeString("en-GB", { hour12: false })}
          </span>
        </div>
      )}

      {/* Event list */}
      <div style={listStyle} ref={scrollRef} onScroll={onScroll}>
        {filtered.length === 0 ? (
          <div style={emptyStyle}>
            {rows.length === 0
              ? "No events yet. Send a prompt or hit ▶ Run on a CAR lane to start streaming."
              : "All events filtered out. Click a topic chip above to re-enable."}
          </div>
        ) : (
          filtered.map((r, i) => <Row key={`${r.at}-${i}`} row={r} />)
        )}
      </div>
    </div>
  );
}

function Row({ row }: { row: LogRow }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ts = new Date(row.at).toLocaleTimeString("en-GB", { hour12: false });
  const tone = toneFor(row.topic, row.level);

  const fullJson = useMemo(() => {
    try {
      return JSON.stringify(row.payload, null, 2);
    } catch {
      return String(row.payload);
    }
  }, [row.payload]);

  const preview = useMemo(() => {
    try {
      const s = JSON.stringify(row.payload);
      return s.length > 220 ? s.slice(0, 220) + "…" : s;
    } catch {
      return String(row.payload);
    }
  }, [row.payload]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      style={{
        ...rowStyle,
        borderLeft: `2px solid ${tone}`,
        background: expanded ? "var(--bg)" : "transparent",
      }}
      onClick={() => setExpanded((s) => !s)}
    >
      <div style={rowHeadStyle}>
        <span style={tsStyle}>{ts}</span>
        <span style={{ ...topicChipStyle, color: tone, borderColor: tone }}>{shortTopic(row.topic)}</span>
        <span style={previewStyle}>{preview}</span>
      </div>
      {expanded && (
        <div style={expandedStyle}>
          <pre style={preStyle}>{fullJson}</pre>
          <div style={expandedActionsStyle}>
            <button
              style={miniBtnStyle}
              onClick={(e) => {
                e.stopPropagation();
                void copy();
              }}
            >
              {copied ? "✓ Copied" : "Copy JSON"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function shortTopic(t: string): string {
  if (t.startsWith("car:event:")) return "car:" + t.slice("car:event:".length, "car:event:".length + 8);
  return t;
}

function append(prev: LogRow[], next: LogRow): LogRow[] {
  const arr = [...prev, next];
  return arr.length > 1000 ? arr.slice(arr.length - 1000) : arr;
}

const rootStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: "32px",
  background: "var(--bg-elevated)",
  borderTop: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  zIndex: 60,
  fontFamily: "var(--font-mono)",
  boxShadow: "0 -8px 24px rgba(0,0,0,0.3)",
};
const resizeHandleStyle: React.CSSProperties = {
  position: "absolute",
  top: -3,
  left: 0,
  right: 0,
  height: 6,
  cursor: "ns-resize",
  zIndex: 1,
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-2) var(--space-3)",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};
const titleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--accent)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontFamily: "var(--font-sans)",
};
const mutedStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-sans)",
};
const filterInputStyle: React.CSSProperties = {
  flex: "0 1 200px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  padding: "5px 9px",
  outline: "none",
};
const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: "11px",
  padding: "5px 11px",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  whiteSpace: "nowrap",
};
const chipRailStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
  padding: "var(--space-2) var(--space-3)",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
  maxHeight: "60px",
  overflowY: "auto",
};
const chipBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "2px 8px",
  border: "1px solid",
  borderRadius: "999px",
  background: "transparent",
  fontSize: "10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-sans)",
};
const chipDotStyle: React.CSSProperties = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
};
const chipCountStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  fontWeight: 700,
  color: "var(--text-dim)",
  background: "var(--bg)",
  padding: "0 5px",
  borderRadius: "8px",
  marginLeft: "2px",
};
const listStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  fontSize: "10.5px",
  minHeight: 0,
};
const rowStyle: React.CSSProperties = {
  padding: "3px var(--space-3) 3px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
  cursor: "pointer",
};
const rowHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-2)",
};
const tsStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  flexShrink: 0,
  width: "60px",
  fontFamily: "var(--font-mono)",
};
const topicChipStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "auto",
  minWidth: "100px",
  maxWidth: "200px",
  fontSize: "9.5px",
  fontWeight: 600,
  padding: "1px 7px",
  border: "1px solid",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const previewStyle: React.CSSProperties = {
  flex: 1,
  color: "var(--text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const expandedStyle: React.CSSProperties = {
  marginTop: "6px",
  padding: "var(--space-2) var(--space-3)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
};
const preStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "10.5px",
  color: "var(--text)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "var(--font-mono)",
  maxHeight: "300px",
  overflow: "auto",
};
const expandedActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-2)",
  marginTop: "6px",
};
const miniBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: "10px",
  padding: "3px 10px",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
const emptyStyle: React.CSSProperties = {
  padding: "var(--space-5)",
  color: "var(--text-dim)",
  fontSize: "11px",
  textAlign: "center",
  fontFamily: "var(--font-sans)",
};
const stickyErrorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "5px var(--space-3)",
  background: "rgba(248,113,113,0.10)",
  borderBottom: "1px solid rgba(248,113,113,0.3)",
  fontSize: "10.5px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  flexShrink: 0,
};
