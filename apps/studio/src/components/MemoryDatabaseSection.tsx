// intent: surface the Neon/Postgres URL in Settings so .dmg installs don't
//         need a workspace .env file — Studio stores it in the OS keychain
//         and injects DATABASE_URL into every spawned engine/sidecar.
// status: done — get/set/clear + status pill + reveal-on-demand input
// next: optional Test-connection round-trip (needs a Rust pg client or a
//       bundled engine `test-db.js` script — deferred to keep this commit
//       small; for now users save + verify via the Memory tab)
// confidence: high

import { useEffect, useState } from "react";
import { getKey, setKey, deleteKey } from "../lib/keychain.js";

/**
 * Mask the saved URL for display so secrets never paint to the DOM by default.
 * Keeps the host visible so the user can confirm at-a-glance which DB they
 * pasted, without leaking the password or the dbname.
 */
function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname || "?";
    const tail = u.pathname?.replace(/^\//, "") ?? "";
    return `…@${host}/${tail.slice(0, 3)}${tail.length > 3 ? "…" : ""}`;
  } catch {
    return "…";
  }
}

export function MemoryDatabaseSection() {
  const [value, setValue] = useState<string>("");
  const [savedMask, setSavedMask] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState<"save" | "clear" | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err" | "info"; text: string } | null>(null);

  // Hydrate once. We never keep the secret in component state when reveal is
  // off — the field stays empty until the user clicks "Reveal" to edit it.
  useEffect(() => {
    void (async () => {
      const cur = await getKey("database-url");
      if (cur) setSavedMask(maskUrl(cur));
    })();
  }, []);

  async function save(): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      setFeedback({ tone: "err", text: "Paste a postgres:// URL first." });
      return;
    }
    if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
      setFeedback({ tone: "err", text: "Expected a postgres:// or postgresql:// URL." });
      return;
    }
    setBusy("save");
    try {
      await setKey("database-url", trimmed);
      setSavedMask(maskUrl(trimmed));
      setValue("");
      setReveal(false);
      setFeedback({ tone: "ok", text: "Saved to OS keychain. Restart Studio to pick it up everywhere." });
    } catch (err) {
      setFeedback({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function clear(): Promise<void> {
    setBusy("clear");
    try {
      await deleteKey("database-url");
      setSavedMask(null);
      setValue("");
      setReveal(false);
      setFeedback({ tone: "info", text: "Cleared. Studio will fall back to .env (source-tree) or no DB." });
    } catch (err) {
      setFeedback({ tone: "err", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={sectionStyle}>
      <header style={headStyle}>
        <h2 style={titleStyle}>Memory database</h2>
        <p style={subtitleStyle}>
          Neon / Postgres URL. Stored in the OS keychain — Studio injects it as <code>DATABASE_URL</code> into every
          spawned engine, hook, and MCP server.
        </p>
      </header>
      <div style={statusRowStyle}>
        {savedMask ? (
          <span style={{ ...statusPillStyle, background: "var(--accent-soft-translucent)", color: "var(--accent)" }}>
            ● Saved · {savedMask}
          </span>
        ) : (
          <span style={{ ...statusPillStyle, background: "transparent", color: "var(--text-dim)" }}>
            ○ Not set · memory MCP will return empty
          </span>
        )}
      </div>
      <div style={inputRowStyle}>
        <input
          type={reveal ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder={savedMask ? "Paste a new URL to replace the saved one" : "postgres://user:pass@host/dbname"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inputStyle}
        />
        <button type="button" onClick={() => setReveal((s) => !s)} style={secondaryBtnStyle} title="Show/hide">
          {reveal ? "Hide" : "Show"}
        </button>
      </div>
      <div style={btnRowStyle}>
        <button type="button" onClick={save} disabled={busy !== null} style={primaryBtnStyle}>
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={busy !== null || !savedMask}
          style={{ ...secondaryBtnStyle, color: "var(--red)", borderColor: "var(--red)" }}
        >
          Clear
        </button>
        <a href="https://neon.tech" target="_blank" rel="noreferrer" style={{ ...linkStyle, marginLeft: "auto" }}>
          Need a database? → Neon (free tier)
        </a>
      </div>
      {feedback && (
        <div
          style={{
            ...feedbackStyle,
            color: feedback.tone === "ok" ? "var(--green)" : feedback.tone === "err" ? "var(--red)" : "var(--text-dim)",
          }}
        >
          {feedback.text}
        </div>
      )}
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  background: "var(--bg-elevated)",
  marginBottom: "var(--space-4)",
};
const headStyle: React.CSSProperties = { marginBottom: "var(--space-3)" };
const titleStyle: React.CSSProperties = { fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0 };
const subtitleStyle: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" };
const statusRowStyle: React.CSSProperties = { marginBottom: "var(--space-3)" };
const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  padding: "4px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
};
const inputRowStyle: React.CSSProperties = { display: "flex", gap: "6px", marginBottom: "var(--space-2)" };
const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  outline: "none",
};
const btnRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" };
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
const linkStyle: React.CSSProperties = { fontSize: "11px", color: "var(--accent)", textDecoration: "none" };
const feedbackStyle: React.CSSProperties = { fontSize: "11.5px", marginTop: "var(--space-3)" };
