// intent: list per-turn auto-checkpoints + revert
// status: done — reads list_checkpoints; revert calls revert_to_checkpoint
// next: diff preview between two checkpoints; rename/promote checkpoint to a tag
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Checkpoint } from "../types.js";

interface CheckpointsPanelProps {
  projectDir: string;
  onClose: () => void;
}

export function CheckpointsPanel({ projectDir, onClose }: CheckpointsPanelProps) {
  const [rows, setRows] = useState<Checkpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError(null);
    try {
      const r = await invoke<Checkpoint[]>("list_checkpoints", { projectDir });
      setRows(r);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    void refresh();
  }, [projectDir]);

  async function revert(sha: string, message: string) {
    if (
      !window.confirm(
        `Revert this project to:\n\n${message}\n\n${sha.slice(0, 12)}\n\nUncommitted changes inside the project will be discarded. This is a hard reset.`
      )
    )
      return;
    setBusy(true);
    try {
      await invoke("revert_to_checkpoint", { projectDir, sha });
      await refresh();
    } catch (e) {
      window.alert(`Revert failed: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={scrimStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Checkpoints</h2>
            <p style={subStyle}>
              Auto-snapshot of <code>{shortenPath(projectDir)}</code> after every successful turn.
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        {rows.length === 0 && !error ? (
          <div style={emptyStyle}>
            No commits yet. Run a turn — Studio will snapshot the tree as <code>checkpoint:</code> commit.
          </div>
        ) : (
          <ol style={listStyle}>
            {rows.map((c) => {
              const isCheckpoint = c.message.startsWith("checkpoint:");
              return (
                <li key={c.sha} style={rowStyle}>
                  <div style={rowMainStyle}>
                    <div style={rowMessageStyle}>{c.message}</div>
                    <div style={rowMetaStyle}>
                      <span style={shaStyle}>{c.sha.slice(0, 9)}</span>
                      <span> · {formatDate(c.date)}</span>
                      {isCheckpoint && <span style={badgeStyle}>auto</span>}
                    </div>
                  </div>
                  <button style={revertBtnStyle} disabled={busy} onClick={() => void revert(c.sha, c.message)}>
                    Revert here
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function shortenPath(p: string): string {
  const home = "/Users/";
  const idx = p.indexOf(home);
  if (idx >= 0) {
    const after = p.slice(idx + home.length);
    const parts = after.split("/");
    if (parts.length > 1) return "~/" + parts.slice(1).join("/");
  }
  return p;
}

function formatDate(iso: string): string {
  const ts = Date.parse(iso);
  if (!ts) return iso;
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleString();
}

const scrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 120,
};
const panelStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(640px, 92vw)",
  maxHeight: "82vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "var(--space-5) var(--space-5) var(--space-4)",
  borderBottom: "1px solid var(--border)",
  gap: "var(--space-4)",
};
const titleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: "4px",
};
const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
};
const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  borderRadius: "var(--radius-sm)",
  width: "26px",
  height: "26px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: "var(--space-2) 0",
  overflowY: "auto",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-4)",
  padding: "var(--space-3) var(--space-5)",
  borderBottom: "1px solid var(--border-subtle, var(--border))",
};
const rowMainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};
const rowMessageStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  marginBottom: "2px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const rowMetaStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
};
const shaStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
};
const badgeStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  background: "var(--accent-soft)",
  color: "var(--accent)",
  borderRadius: "var(--radius-sm)",
  padding: "1px 6px",
};
const revertBtnStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "6px 12px",
  cursor: "pointer",
};
const emptyStyle: React.CSSProperties = {
  padding: "var(--space-6)",
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
};
const errorStyle: React.CSSProperties = {
  margin: "var(--space-3) var(--space-5)",
  fontSize: "11px",
  color: "var(--red)",
  fontFamily: "var(--font-mono)",
};
