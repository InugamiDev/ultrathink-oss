// intent: Build-mode project picker — recent projects + create-new + "all projects" link
// status: done — opens above the project context bar; closes on outside click + Esc
// next: pin/favorite recent projects, search-as-you-type
// confidence: high

import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "./NewProjectModal.js";

interface ProjectPickerProps {
  /** Currently active project dir, if any (highlighted in the list). */
  activeDir: string | null;
  onPick: (project: Project) => void;
  onCreateRequest: () => void;
  onShowAll: () => void;
  onClose: () => void;
  /** Anchor placement — where to render relative to the trigger. */
  anchorTop?: number;
  anchorLeft?: number;
}

export function ProjectPicker({
  activeDir,
  onPick,
  onCreateRequest,
  onShowAll,
  onClose,
  anchorTop,
  anchorLeft,
}: ProjectPickerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void invoke<Project[]>("list_projects")
      .then((rows) => {
        setProjects(rows);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  // Outside click + Esc to dismiss.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const q = filter.trim().toLowerCase();
  const filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
  const recent = filtered.slice(0, 6);
  const overflow = Math.max(0, filtered.length - recent.length);

  return (
    <div
      ref={ref}
      style={{
        ...panelStyle,
        ...(anchorTop !== undefined ? { top: anchorTop } : {}),
        ...(anchorLeft !== undefined ? { left: anchorLeft } : {}),
      }}
    >
      <div style={searchWrapStyle}>
        <span style={searchIconStyle}>⌕</span>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search projects…"
          style={searchInputStyle}
        />
      </div>

      {loading && <div style={emptyStyle}>Scanning ~/Studio/projects/…</div>}
      {error && <div style={errorStyle}>{error}</div>}
      {!loading && !error && projects.length === 0 && (
        <div style={emptyStyle}>
          No projects yet. <strong>Start your first one</strong> below.
        </div>
      )}

      {recent.length > 0 && (
        <div style={listStyle} role="listbox">
          {recent.map((p) => {
            const active = p.dir === activeDir;
            return (
              <button
                key={p.dir}
                role="option"
                aria-selected={active}
                onClick={() => onPick(p)}
                style={{
                  ...rowStyle,
                  ...(active ? activeRowStyle : null),
                }}
              >
                <span style={glyphStyle}>{p.name.slice(0, 2).toUpperCase()}</span>
                <div style={rowMainStyle}>
                  <div style={nameStyle}>{p.name}</div>
                  <div style={pathStyle}>
                    {shortenPath(p.dir)} · touched {relativeTime(p.lastModified)}
                  </div>
                </div>
                {active && <span style={activePillStyle}>active</span>}
              </button>
            );
          })}
        </div>
      )}

      <div style={footerStyle}>
        {overflow > 0 && (
          <button style={linkBtnStyle} onClick={onShowAll}>
            All {filtered.length} projects →
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button style={primaryBtnStyle} onClick={onCreateRequest}>
          + New project
        </button>
      </div>
    </div>
  );
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
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
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

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  width: "min(420px, 92vw)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
  overflow: "hidden",
  zIndex: 80,
  display: "flex",
  flexDirection: "column",
  maxHeight: "60vh",
};
const searchWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
};
const searchIconStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontSize: "13px",
};
const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--text)",
  fontSize: "12px",
};
const listStyle: React.CSSProperties = {
  overflowY: "auto",
  padding: "4px",
  flex: 1,
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  textAlign: "left",
};
const activeRowStyle: React.CSSProperties = {
  background: "var(--accent-soft)",
  outline: "1px solid var(--accent)",
};
const glyphStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "var(--radius-md)",
  background: "linear-gradient(135deg, var(--bg-elevated), var(--accent-soft))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--accent)",
  flexShrink: 0,
};
const rowMainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};
const nameStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const pathStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const activePillStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--accent)",
  background: "var(--bg)",
  borderRadius: "var(--radius-sm)",
  padding: "2px 6px",
};
const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 12px",
  borderTop: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};
const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "11px",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#0c0d10",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "6px 12px",
  cursor: "pointer",
};
const emptyStyle: React.CSSProperties = {
  padding: "var(--space-4)",
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
};
const errorStyle: React.CSSProperties = {
  padding: "var(--space-3)",
  fontSize: "11px",
  color: "var(--red)",
  fontFamily: "var(--font-mono)",
};
