// intent: shortcut cheat sheet — Cmd+/ or ? to open
// status: done
// next: editable rebinds; per-mode shortcut groups

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "Global",
    items: [
      { keys: ["⌘", "Shift", "U"], description: "Summon Studio (global, even from other apps)" },
      { keys: ["⌘", "`"], description: "Toggle debug terminal" },
      { keys: ["⌘", "Shift", "D"], description: "Toggle debug terminal (alt)" },
      { keys: ["⌘", "/"], description: "Open this cheat sheet" },
      { keys: ["?"], description: "Open this cheat sheet (when no input focused)" },
      { keys: ["Esc"], description: "Close modals / dismiss overlays" },
    ],
  },
  {
    section: "Build mode (chat)",
    items: [
      { keys: ["↵"], description: "Send prompt" },
      { keys: ["Shift", "↵"], description: "Newline in prompt" },
    ],
  },
  {
    section: "CAR (Concurrent Agent Runner)",
    items: [{ keys: ["⌘", "↵"], description: "Run task on active lane" }],
  },
  {
    section: "Window",
    items: [
      { keys: ["click + drag title bar"], description: "Move window" },
      { keys: ["double-click title bar"], description: "Maximize / restore" },
    ],
  },
];

export function ShortcutLegend({ onClose }: { onClose: () => void }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={h2Style}>Keyboard shortcuts</h2>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={bodyStyle}>
          {SHORTCUTS.map((s) => (
            <section key={s.section} style={{ marginBottom: "var(--space-5)" }}>
              <h3 style={h3Style}>{s.section}</h3>
              <ul style={listStyle}>
                {s.items.map((it, i) => (
                  <li key={i} style={rowStyle}>
                    <div style={keysWrapStyle}>
                      {it.keys.map((k, j) => (
                        <kbd key={j} style={kbdStyle}>
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <span style={descStyle}>{it.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 110,
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(560px, 92vw)",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-4) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const h2Style: React.CSSProperties = { fontSize: "16px", fontWeight: 700, color: "var(--text)" };
const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "16px",
  cursor: "pointer",
  width: "28px",
  height: "28px",
  borderRadius: "var(--radius-sm)",
};
const bodyStyle: React.CSSProperties = {
  padding: "var(--space-5)",
  overflowY: "auto",
};
const h3Style: React.CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 700,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "var(--space-2)",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
};
const keysWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  minWidth: "180px",
};
const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "2px 7px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};
const descStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
  flex: 1,
};
