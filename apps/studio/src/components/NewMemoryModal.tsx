// intent: quick-capture modal for creating Second Brain memories from Studio
// status: done
// next: TanStack Query invalidation once the app cache is installed
// confidence: high

import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GraphData } from "./MemoryGraph3D.js";

type Wing = "agent" | "user" | "knowledge" | "experience";

interface MemoryCandidate {
  id: string;
  title: string;
  category: string;
  wing: string | null;
  hall: string | null;
}

interface NewMemoryModalProps {
  onClose: () => void;
  onCreated: (result: { id?: string; status?: string }) => void;
}

const HALLS: Record<Wing, string[]> = {
  agent: ["core", "rules", "skills"],
  user: ["profile", "preferences", "projects"],
  knowledge: ["decisions", "patterns", "insights", "reference"],
  experience: ["sessions", "outcomes", "errors"],
};

export function NewMemoryModal({ onClose, onCreated }: NewMemoryModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wing, setWing] = useState<Wing>("knowledge");
  const [hall, setHall] = useState(HALLS.knowledge[2]);
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState(5);
  const [linkQuery, setLinkQuery] = useState("");
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<MemoryCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void invoke<GraphData | null>("query_memory_graph", { limit: 500 })
      .then((graph) => {
        if (cancelled) return;
        setCandidates(
          (graph?.nodes ?? []).map((node) => ({
            id: node.id,
            title: node.title,
            category: node.category,
            wing: node.wing,
            hall: node.hall,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCandidates = useMemo(() => {
    const query = linkQuery.trim().toLowerCase();
    const selected = new Set(selectedLinks);
    const rows = candidates.filter((candidate) => !selected.has(candidate.id));
    if (!query) return rows.slice(0, 6);
    const tokens = query.split(/\s+/).filter(Boolean);
    return rows
      .map((candidate) => {
        const haystack = [candidate.title, candidate.category, candidate.wing ?? "", candidate.hall ?? ""]
          .join(" ")
          .toLowerCase();
        const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
        return { candidate, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
      .slice(0, 8)
      .map((row) => row.candidate);
  }, [candidates, linkQuery, selectedLinks]);

  const selectedCandidates = useMemo(() => {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return selectedLinks.map((id) => byId.get(id)).filter((candidate): candidate is MemoryCandidate => Boolean(candidate));
  }, [candidates, selectedLinks]);

  function setWingAndHall(nextWing: Wing) {
    setWing(nextWing);
    setHall(HALLS[nextWing][0]);
  }

  async function submit() {
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await invoke<{ id?: string; status?: string }>("create_memory", {
        title: title.trim() || null,
        content: trimmedContent,
        wing,
        hall,
        category: category.trim() || null,
        importance,
        links: selectedLinks,
      });
      onCreated(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={scrimStyle} onClick={() => !busy && onClose()}>
      <form
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div style={headerStyle}>
          <div>
            <h3 style={titleStyle}>New memory</h3>
            <p style={subStyle}>Capture a durable note into the UltraThink Second Brain.</p>
          </div>
          <button type="button" style={closeBtnStyle} onClick={onClose} disabled={busy} aria-label="Close">
            x
          </button>
        </div>

        <label style={labelStyle}>
          <span>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label"
            style={inputStyle}
            disabled={busy}
          />
        </label>

        <label style={labelStyle}>
          <span>Content</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should Studio remember?"
            style={textareaStyle}
            disabled={busy}
            required
            minLength={10}
          />
          <span style={hintStyle}>{content.trim().length}/10 minimum characters</span>
        </label>

        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Wing</span>
            <select value={wing} onChange={(e) => setWingAndHall(e.target.value as Wing)} style={inputStyle} disabled={busy}>
              {Object.keys(HALLS).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Hall</span>
            <select value={hall} onChange={(e) => setHall(e.target.value)} style={inputStyle} disabled={busy}>
              {HALLS[wing].map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
              disabled={busy}
            />
          </label>

          <label style={labelStyle}>
            <span>Importance: {importance}</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              style={rangeStyle}
              disabled={busy}
            />
          </label>
        </div>

        <div style={labelStyle}>
          <span>Links</span>
          <input
            value={linkQuery}
            onChange={(e) => setLinkQuery(e.target.value)}
            placeholder="Search existing memories by title"
            style={inputStyle}
            disabled={busy}
          />
          {selectedCandidates.length > 0 && (
            <div style={chipsStyle}>
              {selectedCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  style={chipStyle}
                  onClick={() => setSelectedLinks((ids) => ids.filter((id) => id !== candidate.id))}
                  disabled={busy}
                  title="Remove link"
                >
                  {candidate.title} x
                </button>
              ))}
            </div>
          )}
          {filteredCandidates.length > 0 && (
            <div style={candidateListStyle}>
              {filteredCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  style={candidateStyle}
                  onClick={() => {
                    setSelectedLinks((ids) => [...ids, candidate.id]);
                    setLinkQuery("");
                  }}
                  disabled={busy}
                >
                  <span style={{ color: "var(--text)" }}>{candidate.title}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: "10.5px" }}>
                    {candidate.wing ?? "memory"} / {candidate.hall ?? candidate.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={actionsStyle}>
          <button type="button" style={ghostBtnStyle} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" style={primaryBtnStyle} disabled={busy || content.trim().length < 10}>
            {busy && <span className="ut-spinner" />}
            {busy ? "Creating..." : "Create memory"}
          </button>
        </div>
      </form>
    </div>
  );
}

const scrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.86)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 140,
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(620px, 94vw)",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "var(--space-5)",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "var(--space-4)",
  marginBottom: "var(--space-4)",
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
  lineHeight: 1.5,
};
const closeBtnStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  background: "transparent",
  cursor: "pointer",
};
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  color: "var(--text-muted)",
  fontSize: "11px",
  fontWeight: 600,
  marginBottom: "var(--space-3)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "9px 12px",
  color: "var(--text)",
  fontSize: "12px",
  outline: "none",
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "112px",
  resize: "vertical",
  lineHeight: 1.5,
};
const hintStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontSize: "10px",
  fontWeight: 400,
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "var(--space-3)",
};
const rangeStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "var(--accent)",
};
const chipsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};
const chipStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--bg)",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "4px 7px",
  cursor: "pointer",
};
const candidateListStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  maxHeight: "156px",
  overflowY: "auto",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "6px",
  background: "var(--bg)",
};
const candidateStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "7px 8px",
  cursor: "pointer",
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
  color: "var(--bg)",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};
