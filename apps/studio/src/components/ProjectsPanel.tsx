// intent: projects index — cards grid, search, "new project" CTA
// status: done — reads ~/Studio/projects/ via Tauri `list_projects` command
// next: detect framework via package.json read; build counts from telemetry; status from preview state
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Project {
  dir: string;
  name: string;
  lastModified: string;
}

interface ProjectsPanelProps {
  onOpen?: (path: string) => void;
}

export function ProjectsPanel({ onOpen }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    return invoke<Project[]>("list_projects")
      .then((rows) => {
        setProjects(rows);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submitCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    setCreateError(null);
    try {
      const created = await invoke<Project>("create_project", { name: newName.trim() });
      setCreating(false);
      setNewName("");
      await refresh();
      onOpen?.(created.dir);
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={h2Style}>Projects</h2>
          <p style={subStyle}>
            {loading
              ? "Scanning ~/Studio/projects/…"
              : error
                ? `Couldn't read project dir: ${error}`
                : `${projects.length} project${projects.length === 1 ? "" : "s"} in ~/Studio/projects/.`}
          </p>
        </div>
        <div style={actionsStyle}>
          <div style={searchWrapStyle}>
            <span style={searchIconStyle}>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              style={searchInputStyle}
            />
          </div>
          <button style={primaryBtnStyle} onClick={() => setCreating(true)}>
            + New project
          </button>
        </div>
      </div>

      {creating && (
        <div style={modalScrimStyle} onClick={() => !busy && setCreating(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-2)" }}>
              New project
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Creates an empty directory under <code>~/Studio/projects/&lt;name&gt;</code>. Name is sanitised to
              lowercase, alphanumerics and dashes.
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCreate();
                if (e.key === "Escape" && !busy) setCreating(false);
              }}
              placeholder="my-cool-app"
              style={modalInputStyle}
              spellCheck={false}
              autoComplete="off"
              disabled={busy}
            />
            {createError && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                  marginTop: "var(--space-2)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ✗ {createError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "var(--space-2)",
                marginTop: "var(--space-4)",
              }}
            >
              <button style={ghostBtnStyle} onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </button>
              <button style={primaryBtnStyle} onClick={() => void submitCreate()} disabled={busy || !newName.trim()}>
                {busy ? "Creating…" : "Create + open"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={gridStyle}>
        {filtered.map((p) => (
          <ProjectCard
            key={p.dir}
            project={p}
            onOpen={() => onOpen?.(p.dir)}
            onRename={async () => {
              const next = window.prompt(`Rename "${p.name}" to:`, p.name);
              if (!next || next === p.name) return;
              try {
                await invoke("rename_project", { oldPath: p.dir, newName: next });
                await refresh();
              } catch (err) {
                window.alert(`Rename failed: ${err}`);
              }
            }}
            onDuplicate={async () => {
              const next = window.prompt(`Duplicate "${p.name}" as:`, `${p.name}-copy`);
              if (!next) return;
              try {
                await invoke("duplicate_project", { projectDir: p.dir, newName: next });
                await refresh();
              } catch (err) {
                window.alert(`Duplicate failed: ${err}`);
              }
            }}
            onDelete={async () => {
              if (
                !window.confirm(
                  `Move "${p.name}" to Trash?\n\n${p.dir}\n\nThis is reversible — drag back from the Trash.`
                )
              )
                return;
              try {
                await invoke("delete_project", { projectDir: p.dir });
                await refresh();
              } catch (err) {
                window.alert(`Delete failed: ${err}`);
              }
            }}
            onResetSessions={async () => {
              const includeMemory = window.confirm(
                `Reset chat sessions for "${p.name}"?\n\nWipes Claude's session jsonls so the next chat starts truly fresh and "Session ID already in use" goes away.\n\nClick OK to ALSO clear the per-project memory cache, Cancel to keep the cache.`
              );
              if (
                !window.confirm(
                  `One more confirm — discard chat history for "${p.name}"?${
                    includeMemory ? "\n\nMemory cache will ALSO be cleared." : ""
                  }\n\nProject files + dashboard graph memories are NOT touched.`
                )
              )
                return;
              try {
                const r = await invoke<{ jsonlRemoved: number; memoryFilesRemoved: number }>("reset_project_sessions", {
                  projectDir: p.dir,
                  includeMemory,
                });
                window.alert(
                  `Cleared ${r.jsonlRemoved} chat session${r.jsonlRemoved === 1 ? "" : "s"}` +
                    (includeMemory
                      ? ` + ${r.memoryFilesRemoved} memory file${r.memoryFilesRemoved === 1 ? "" : "s"}`
                      : "") +
                    "."
                );
              } catch (err) {
                window.alert(`Reset failed: ${err}`);
              }
            }}
          />
        ))}
        {!loading && filtered.length === 0 && (
          <div style={emptyStyle}>
            {projects.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                <div>No projects yet.</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Switch to <strong>Build</strong> mode and describe what you want — Studio will scaffold one under{" "}
                  <code>~/Studio/projects/&lt;slug&gt;/</code>.
                </div>
              </div>
            ) : (
              `No projects match "${query}"`
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onResetSessions,
}: {
  project: Project;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResetSessions: () => void;
}) {
  const touched = relativeTime(project.lastModified);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);
  return (
    <div
      style={cardStyle}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <div style={previewStyle}>
        <div style={previewGlyphStyle}>{project.name.slice(0, 2).toUpperCase()}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((s) => !s);
          }}
          style={kebabStyle}
          aria-label="Project actions"
          title="Actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
            {[
              {
                label: "Rename…",
                fn: () => {
                  setMenuOpen(false);
                  onRename();
                },
              },
              {
                label: "Duplicate…",
                fn: () => {
                  setMenuOpen(false);
                  onDuplicate();
                },
              },
              {
                label: "Reset chat sessions…",
                fn: () => {
                  setMenuOpen(false);
                  onResetSessions();
                },
              },
              {
                label: "Move to Trash",
                fn: () => {
                  setMenuOpen(false);
                  onDelete();
                },
                danger: true,
              },
            ].map((it) => (
              <button
                key={it.label}
                style={{ ...menuItemStyle, color: it.danger ? "var(--red)" : "var(--text)" }}
                onClick={it.fn}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={cardBodyStyle}>
        <div style={cardTopRowStyle}>
          <h3 style={projectNameStyle}>{project.name}</h3>
        </div>
        <div style={pathStyle}>{shortenPath(project.dir)}</div>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}>
            <span style={metaLabelStyle}>touched</span>
            <span style={metaValueStyle}>{touched}</span>
          </span>
        </div>
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
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
  gap: "var(--space-4)",
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
const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "center",
};
const searchWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "0 var(--space-3)",
  width: "260px",
};
const searchIconStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontSize: "14px",
  marginRight: "var(--space-2)",
};
const searchInputStyle: React.CSSProperties = {
  flex: 1,
  height: "32px",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--text)",
  fontSize: "12px",
};
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#0c0d10",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  cursor: "pointer",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "var(--space-5)",
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
  cursor: "pointer",
  transition: "border-color 0.15s ease, transform 0.15s ease",
};
const previewStyle: React.CSSProperties = {
  position: "relative",
  height: "120px",
  background: "linear-gradient(135deg, var(--bg-card) 0%, var(--accent-soft) 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderBottom: "1px solid var(--border)",
};
const kebabStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "26px",
  height: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  lineHeight: 1,
  color: "var(--text-muted)",
  background: "rgba(12, 13, 16, 0.55)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  backdropFilter: "blur(4px)",
};
const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "38px",
  right: "8px",
  minWidth: "168px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
  padding: "4px",
  display: "flex",
  flexDirection: "column",
  zIndex: 10,
};
const menuItemStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 500,
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  cursor: "pointer",
};
const previewGlyphStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "var(--accent)",
  letterSpacing: "0.05em",
  opacity: 0.8,
};
const cardBodyStyle: React.CSSProperties = {
  padding: "var(--space-4) var(--space-5)",
};
const cardTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "4px",
};
const projectNameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text)",
};
const pathStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  marginBottom: "var(--space-3)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const metaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-4)",
  fontSize: "10.5px",
};
const metaItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};
const metaLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const metaValueStyle: React.CSSProperties = {
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
};
const emptyStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
  padding: "var(--space-8)",
};
const modalScrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 110,
};
const modalCardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(440px, 92vw)",
  padding: "var(--space-5)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const modalInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  outline: "none",
};
const ghostBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-muted)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  cursor: "pointer",
};
