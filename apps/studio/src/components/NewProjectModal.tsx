// intent: shared "create new project" modal — used by ProjectsPanel + Build mode picker
// status: done — calls Tauri create_project, returns the created Project to caller
// next: starter templates (empty, next.js, vite-react, etc.) selectable in the form
// confidence: high

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface Project {
  dir: string;
  name: string;
  lastModified: string;
}

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await invoke<Project>("create_project", { name: name.trim() });
      onCreated(created);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={scrimStyle} onClick={() => !busy && onClose()}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={titleStyle}>New project</h3>
        <p style={subStyle}>
          Creates an empty directory under <code>~/Studio/projects/&lt;name&gt;</code>. Names are sanitised to
          lowercase, alphanumerics, and dashes. Studio runs <code>git init</code> automatically.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape" && !busy) onClose();
          }}
          placeholder="my-cool-app"
          style={inputStyle}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
        />
        {error && <div style={errorStyle}>✗ {error}</div>}
        <div style={actionsStyle}>
          <button style={ghostBtnStyle} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button style={primaryBtnStyle} onClick={() => void submit()} disabled={busy || !name.trim()}>
            {busy && <span className="ut-spinner" />}
            {busy ? "Creating…" : "Create + open"}
          </button>
        </div>
      </div>
    </div>
  );
}

const scrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 130,
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(440px, 92vw)",
  padding: "var(--space-5)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const titleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: "var(--space-2)",
};
const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
  marginBottom: "var(--space-4)",
  lineHeight: 1.5,
};
const inputStyle: React.CSSProperties = {
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
const errorStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--red)",
  marginTop: "var(--space-2)",
  fontFamily: "var(--font-mono)",
};
const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-2)",
  marginTop: "var(--space-4)",
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
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#0c0d10",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};
