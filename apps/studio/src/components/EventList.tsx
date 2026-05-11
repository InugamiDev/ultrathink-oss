// intent: render the engine event stream as semantic chat blocks
// status: done (text + tool-use + skill + completion + error covered)
// next: tool-result expand/collapse, file-diff inline rendering, thinking accordion
// confidence: high

import { useMemo, useState } from "react";
import type { EngineEvent } from "../types.js";

interface Props {
  events: EngineEvent[];
}

interface Block {
  id: string;
  kind:
    | "assistant-text"
    | "tool-call"
    | "skills"
    | "thinking"
    | "completion"
    | "error"
    | "memory"
    | "status"
    | "stuck-banner";
  text?: string;
  toolName?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  toolUseId?: string;
  toolError?: boolean;
  skills?: Array<{ name: string; score: number }>;
  durationMs?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  message?: string;
  memoryIds?: string[];
}

/** Fold the event stream into a flat list of blocks suitable for chat rendering. */
function reduceEvents(events: EngineEvent[]): Block[] {
  const blocks: Block[] = [];
  let curText: Block | null = null;
  let blockId = 0;
  const id = () => `b-${blockId++}`;
  const toolNames = new Map<string, string>();
  // Per-turn usage accumulator — drained into the next completion block.
  let pendingTurnInput = 0;
  let pendingTurnOutput = 0;

  let statusBlock: Block | null = null;
  const ensureStatus = (text: string) => {
    if (!statusBlock) {
      statusBlock = { id: id(), kind: "status", text };
      blocks.push(statusBlock);
    } else {
      statusBlock.text = text;
    }
  };
  const clearStatus = () => {
    if (statusBlock) {
      const idx = blocks.indexOf(statusBlock);
      if (idx >= 0) blocks.splice(idx, 1);
      statusBlock = null;
    }
  };

  // Track startup phase for the "this is taking too long" affordance below.
  let spawnedAt = 0;
  let hookStarts = 0;
  let hookResponses = 0;
  for (const ev of events) {
    switch (ev.kind) {
      case "spawn-started":
        spawnedAt = Date.now();
        ensureStatus("Spawning session…");
        break;
      case "system-init": {
        const data = (ev as { data?: { subtype?: string } }).data;
        if (data?.subtype === "hook_started") hookStarts++;
        else if (data?.subtype === "hook_response") hookResponses++;
        const total = hookStarts;
        const done = hookResponses;
        const elapsed = spawnedAt ? Math.round((Date.now() - spawnedAt) / 1000) : 0;
        const detail = total > 0 ? ` (${done}/${total} hooks · ${elapsed}s)` : ` (${elapsed}s)`;
        ensureStatus(`Loading hooks & MCP servers…${detail}`);
        break;
      }
      case "skill-injected":
        clearStatus();
        blocks.push({ id: id(), kind: "skills", skills: ev.skills });
        break;
      case "memory-recalled":
        clearStatus();
        blocks.push({ id: id(), kind: "memory", memoryIds: ev.memoryIds });
        break;
      case "assistant-text-delta":
        clearStatus();
        if (!curText) {
          curText = { id: id(), kind: "assistant-text", text: "" };
          blocks.push(curText);
        }
        curText.text = (curText.text ?? "") + ev.text;
        break;
      case "assistant-text-block":
        clearStatus();
        // Only push final block if we don't already have a delta-built one
        if (!curText) {
          blocks.push({ id: id(), kind: "assistant-text", text: ev.text });
        }
        curText = null;
        break;
      case "thinking":
        clearStatus();
        curText = null;
        blocks.push({ id: id(), kind: "thinking", text: ev.text });
        break;
      case "tool-use-start":
        clearStatus();
        curText = null;
        toolNames.set(ev.toolUseId, ev.name);
        blocks.push({
          id: id(),
          kind: "tool-call",
          toolName: ev.name || inferToolName(ev.input),
          toolInput: ev.input,
          toolUseId: ev.toolUseId,
        });
        break;
      case "tool-result": {
        // Attach result content to the matching tool-call block + flag errors.
        const last = [...blocks].reverse().find((b) => b.kind === "tool-call" && b.toolUseId === ev.toolUseId);
        if (last) {
          if (ev.isError) last.toolError = true;
          last.toolResult = ev.content;
        }
        break;
      }
      case "completion":
        clearStatus();
        curText = null;
        blocks.push({
          id: id(),
          kind: "completion",
          durationMs: ev.durationMs,
          costUsd: ev.costUsd,
          inputTokens: pendingTurnInput,
          outputTokens: pendingTurnOutput,
        });
        // reset per-turn usage accumulator
        pendingTurnInput = 0;
        pendingTurnOutput = 0;
        break;
      case "usage":
        pendingTurnInput += ev.inputTokens;
        pendingTurnOutput += ev.outputTokens;
        break;
      case "error":
        clearStatus();
        curText = null;
        blocks.push({ id: id(), kind: "error", message: ev.message });
        break;
      // spawn-started / spawn-exited / system-init / usage / tool-use-input-delta — not surfaced
      default:
        break;
    }
  }
  // After 20s of nothing-but-system-init, surface a "stuck on hooks?" banner.
  const stuck =
    statusBlock !== null &&
    spawnedAt > 0 &&
    Date.now() - spawnedAt > 20_000 &&
    !blocks.some((b) => b.kind === "assistant-text" || b.kind === "tool-call" || b.kind === "thinking");
  if (stuck) {
    blocks.push({
      id: id(),
      kind: "stuck-banner",
    } as Block);
  }
  return blocks;
}

export function EventList({ events }: Props) {
  const blocks = useMemo(() => reduceEvents(events), [events]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (blockId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });

  if (events.length === 0 && blocks.length === 0) {
    return (
      <div style={emptyStyle}>
        <div style={{ fontSize: "16px", color: "var(--text-muted)" }}>What do you want to build?</div>
        <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-dim)" }}>
          Try: "a tip calculator", "a portfolio site for a photographer", "a kanban board"
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px" }}>
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} isExpanded={expanded.has(b.id)} onToggle={() => toggle(b.id)} />
      ))}
    </div>
  );
}

function BlockView({ block, isExpanded, onToggle }: { block: Block; isExpanded: boolean; onToggle: () => void }) {
  switch (block.kind) {
    case "skills":
      return (
        <div style={skillBadgeRow}>
          {block.skills?.map((s) => (
            <span key={s.name} style={skillBadge}>
              ⌬ {s.name}
            </span>
          ))}
        </div>
      );
    case "memory":
      return (
        <div style={memoryRow}>
          ⌬ recalled {block.memoryIds?.length ?? 0} memor{block.memoryIds?.length === 1 ? "y" : "ies"}
        </div>
      );
    case "assistant-text":
      return <div style={assistantTextStyle}>{block.text}</div>;
    case "thinking":
      return <div style={thinkingStyle}>⟪ {truncate(block.text ?? "", 200)} ⟫</div>;
    case "tool-call": {
      const summary = summariseInput(block.toolInput);
      const hasDetail = !!block.toolInput || !!block.toolResult;
      return (
        <div style={block.toolError ? toolCallErrorStyle : toolCallStyle}>
          <button
            type="button"
            onClick={hasDetail ? onToggle : undefined}
            disabled={!hasDetail}
            style={toolHeaderBtnStyle}
            aria-expanded={isExpanded}
          >
            <span style={{ color: "var(--amber)", display: "inline-block", width: "14px" }}>
              {isExpanded ? "▾" : hasDetail ? "▸" : "·"}
            </span>{" "}
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{block.toolName || "(unnamed tool)"}</span>{" "}
            {summary && <span style={{ color: "var(--text-dim)" }}>{summary}</span>}
            {block.toolError && <span style={{ marginLeft: "8px", color: "var(--red)", fontWeight: 600 }}>error</span>}
          </button>
          {isExpanded && hasDetail && (
            <div style={toolDetailStyle}>
              {block.toolInput != null && (
                <>
                  <div style={toolDetailLabelStyle}>input</div>
                  <pre style={toolJsonStyle}>{prettyJson(block.toolInput)}</pre>
                </>
              )}
              {block.toolResult != null && (
                <>
                  <div style={{ ...toolDetailLabelStyle, marginTop: "10px" }}>
                    result {block.toolError && <span style={{ color: "var(--red)" }}>(error)</span>}
                  </div>
                  <pre style={toolJsonStyle}>{prettyResult(block.toolResult)}</pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    case "completion": {
      const parts: string[] = [];
      parts.push(`done in ${((block.durationMs ?? 0) / 1000).toFixed(1)}s`);
      if (block.inputTokens || block.outputTokens) {
        const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
        parts.push(`${fmt(block.inputTokens ?? 0)} → ${fmt(block.outputTokens ?? 0)} tokens`);
      }
      if (block.costUsd != null && block.costUsd > 0) {
        parts.push(`$${block.costUsd.toFixed(4)}`);
      }
      return <div style={completionStyle}>{parts.join(" · ")}</div>;
    }
    case "error":
      return <div style={errorStyle}>✗ {block.message}</div>;
    case "status":
      return (
        <div style={statusStyle}>
          <span style={statusDotStyle} /> {block.text}
        </div>
      );
    case "stuck-banner":
      return (
        <div style={stuckBannerStyle}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "var(--amber)" }}>
            Startup is taking longer than usual
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
            UltraThink's hook chain runs every Claude session start. It can take 20-60s on first run if the memory MCP
            is reaching out to Postgres. Two escape hatches:
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "18px" }}>
              <li>
                <strong>Settings → Defaults</strong> → switch to <code>Anthropic API (direct, no CLI)</code> and paste
                an <code>sk-ant-…</code> key. First-byte text in &lt;1s, no hooks.
              </li>
              <li>
                Open the debug terminal (<kbd>⌘`</kbd>) and click <strong>🔍 Diagnose</strong> + watch the
                <code>engine:event</code> stream to see what hook is slow.
              </li>
            </ul>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function summariseInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;
  if (typeof obj.file_path === "string") return obj.file_path;
  if (typeof obj.path === "string") return obj.path;
  if (typeof obj.command === "string") return truncate(obj.command, 80);
  if (typeof obj.pattern === "string") return `'${truncate(obj.pattern, 60)}'`;
  if (typeof obj.url === "string") return obj.url;
  if (typeof obj.query === "string") return `'${truncate(obj.query, 60)}'`;
  if (typeof obj.title === "string") return `'${truncate(obj.title, 60)}'`;
  return "";
}

/** Best-effort tool name when the upstream JSON omits it. */
function inferToolName(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;
  if (typeof obj.command === "string") return "Bash";
  if (typeof obj.url === "string") return "WebFetch";
  if (typeof obj.pattern === "string") return "Grep";
  if (typeof obj.file_path === "string") return obj.old_string ? "Edit" : obj.content ? "Write" : "Read";
  if (typeof obj.path === "string") return "Read";
  if (typeof obj.query === "string") return "Search";
  return "tool";
}

/** Pretty-print JSON, capped to keep large blobs readable. */
function prettyJson(value: unknown): string {
  try {
    const out = JSON.stringify(value, null, 2);
    return out.length > 6000 ? out.slice(0, 6000) + "\n…(truncated)" : out;
  } catch {
    return String(value);
  }
}

/** Tool results can be a string or an array of {type:"text", text}. Render either. */
function prettyResult(value: unknown): string {
  if (typeof value === "string") return truncate(value, 6000);
  if (Array.isArray(value)) {
    const text = value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as { type?: string; text?: string };
          if (p.type === "text" && typeof p.text === "string") return p.text;
        }
        return JSON.stringify(part);
      })
      .join("\n");
    return truncate(text, 6000);
  }
  return prettyJson(value);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

const emptyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  textAlign: "center",
};

const skillBadgeRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const skillBadge: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--accent)",
  background: "var(--accent-glow)",
  border: "1px solid rgba(167,139,250,0.3)",
  padding: "3px 8px",
  borderRadius: "12px",
};

const memoryRow: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--blue)",
  fontWeight: 500,
};

const assistantTextStyle: React.CSSProperties = {
  fontSize: "13.5px",
  lineHeight: 1.6,
  color: "var(--text)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const thinkingStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-dim)",
  fontStyle: "italic",
};

const toolCallStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  overflow: "hidden",
};

const toolCallErrorStyle: React.CSSProperties = {
  ...toolCallStyle,
  borderColor: "rgba(248,113,113,0.4)",
  color: "var(--red)",
};

const toolHeaderBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: "8px 12px",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
};

const toolDetailStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border)",
  background: "rgba(0,0,0,0.25)",
  padding: "10px 12px",
};

const toolDetailLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  marginBottom: "4px",
};

const toolJsonStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "11.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  lineHeight: 1.5,
  maxHeight: "320px",
  overflowY: "auto",
};

const completionStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
  fontStyle: "italic",
  paddingTop: "8px",
  borderTop: "1px dashed var(--border)",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--red)",
  background: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.3)",
  borderRadius: "6px",
  padding: "8px 12px",
};

const statusStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  color: "var(--text-muted)",
  fontStyle: "italic",
};

const stuckBannerStyle: React.CSSProperties = {
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.3)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3) var(--space-4)",
};

const statusDotStyle: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "var(--accent)",
  animation: "pulse 1.2s ease-in-out infinite",
  display: "inline-block",
};
