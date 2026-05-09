// intent: chat input + scrolling event stream container
// status: done
// next: command palette (/), file mention (@), drag-drop attachments
// confidence: high

import { useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { EngineEvent } from "../types.js";
import { startSession, sendMessage, stopSession } from "../lib/engine-client.js";
import { getKey } from "../lib/keychain.js";
import { EventList } from "./EventList.js";

interface ChatPanelProps {
  /** Currently-active project — required to chat. App.tsx owns this. */
  activeProjectDir: string | null;
  activeProjectName?: string;
  /** Open the project picker (anchored at the chat header). */
  onPickProject: () => void;
  /** Open the new-project modal directly. */
  onCreateProject: () => void;
  /** Drop the currently-active project (Build mode goes back to its empty state). */
  onCloseProject: () => void;
}

export function ChatPanel({
  activeProjectDir,
  activeProjectName,
  onPickProject,
  onCreateProject,
  onCloseProject,
}: ChatPanelProps) {
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [input, setInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Reset the chat stream + session when the active project changes — old
  // messages don't apply to the new project's context.
  useEffect(() => {
    setEvents([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setBusy(false);
    setStarting(false);
    setLastPrompt(null);
  }, [activeProjectDir]);

  // Track the wall-clock timestamp of the last event we observed. The
  // watchdog below uses this to detect a stalled session (busy=true but no
  // events for ~60s) so we can show a "still working?" hint instead of
  // permanently locking the input.
  const lastEventAtRef = useRef<number>(Date.now());
  const stallNotedRef = useRef<boolean>(false);
  // Capture the adapter used for the active turn so the idle hint can be
  // adapter-specific (claude needs MCP/auth checks, codex usually means
  // PATH/auth).
  const activeAdapterRef = useRef<string>("claude");

  // Subscribe to the engine event stream on mount, BEFORE any session starts.
  // This avoids the race where Rust emits events before our per-session listener registers.
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;
    void listen<{ sessionId: string; event: EngineEvent }>("engine:event", (msg) => {
      const { sessionId: sid, event } = msg.payload;
      // Filter to our active session if we have one — otherwise accept (so spawn-started/system-init
      // arriving before sessionIdRef is set are still rendered).
      if (sessionIdRef.current && sid !== sessionIdRef.current) return;
      lastEventAtRef.current = Date.now();
      stallNotedRef.current = false;
      setStarting(false); // first real event = sidecar is alive
      setEvents((prev) => [...prev, event]);
      if (event.kind === "completion" || event.kind === "spawn-exited") {
        setBusy(false);
      }
      // Engine process is gone — drop the dead sessionId so the user's next
      // Send starts a fresh session instead of failing with "no such session".
      if (event.kind === "spawn-exited") {
        sessionIdRef.current = null;
        setSessionId(null);
      }
    }).then((u) => {
      if (cancelled) u();
      else unlisten = u;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Stall watchdog: if busy and no events for 60s, surface a stale-banner so
  // the user knows it's not just slow — they can stop and retry. Hard reset
  // busy after 5 minutes to recover from a genuinely dead session.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      const idle = Date.now() - lastEventAtRef.current;
      if (idle > 300_000) {
        setEvents((prev) => [
          ...prev,
          {
            kind: "error",
            message: "Session looks dead — no events for 5 minutes. Resetting. Click Build to retry.",
            recoverable: true,
          },
        ]);
        setBusy(false);
      } else if (idle > 60_000 && !stallNotedRef.current) {
        stallNotedRef.current = true;
        const adapter = activeAdapterRef.current;
        const hint =
          adapter === "claude"
            ? "claude CLI quiet for 60s. Common causes: MCP server hanging on startup, hooks blocking, or `claude` not yet logged in (run `claude` interactively once). Stop to bail."
            : adapter === "codex"
              ? "codex CLI quiet for 60s. Common causes: model not allowed for your auth (gpt-5-codex needs API key, not ChatGPT-account), or `codex login` never completed. Stop to bail."
              : "No activity for 60s — the model might be thinking, or the connection stalled. Stop to bail.";
        setEvents((prev) => [
          ...prev,
          {
            kind: "error",
            message: hint,
            recoverable: true,
          },
        ]);
      }
    }, 5_000);
    return () => clearInterval(id);
  }, [busy]);

  // Smart auto-scroll: only stick to bottom if the user is ALREADY near it.
  // Reading earlier output during a long stream shouldn't yank you back.
  // Threshold = 80px from bottom counts as "near bottom".
  const stickyBottomRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickyBottomRef.current = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickyBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    if (!activeProjectDir) {
      onPickProject();
      return;
    }

    setInput("");
    setLastPrompt(prompt);
    setBusy(true);
    setStarting(true);

    if (!sessionId) {
      try {
        let adapter =
          (localStorage.getItem("studio:adapter") as
            | "claude"
            | "codex"
            | "anthropic-direct"
            | "openai-compat"
            | "ollama"
            | null) ?? "claude";
        activeAdapterRef.current = adapter;
        let model = localStorage.getItem("studio:default-model") || undefined;
        let apiKey: string | undefined;
        let baseUrl: string | undefined;

        // Auto-fallback: if user picked `claude` but binary isn't reachable,
        // swap to `anthropic-direct` when an API key exists. Surfaces a banner
        // so they know what happened.
        if (adapter === "claude") {
          try {
            const status = await invoke<{ ok: boolean }>("check_claude_cli");
            if (!status.ok) {
              const fallback = await getKey("anthropic-api-key");
              if (fallback) {
                adapter = "anthropic-direct";
                if (!model) model = "claude-sonnet-4-6";
                setEvents((prev) => [
                  ...prev,
                  {
                    kind: "error",
                    message:
                      "`claude` not on PATH — auto-switched to direct Anthropic API for this turn. Reconfigure in Settings to make it permanent.",
                    recoverable: true,
                  },
                ]);
              }
            }
          } catch {
            /* if the check fails, just attempt as-is */
          }
        }
        if (adapter === "codex") {
          try {
            const status = await invoke<{ ok: boolean }>("check_codex_cli");
            if (!status.ok) {
              setEvents((prev) => [
                ...prev,
                {
                  kind: "error",
                  message:
                    "`codex` CLI not on PATH. Install with `npm i -g @openai/codex`, or switch adapter to `openai-compat` in Settings.",
                  recoverable: false,
                },
              ]);
              setBusy(false);
              return;
            }
          } catch {
            /* if the check fails, just attempt as-is */
          }
        }

        // Pick the right key + base URL per adapter
        if (adapter === "anthropic-direct") {
          apiKey = (await getKey("anthropic-api-key")) ?? undefined;
        } else if (adapter === "openai-compat") {
          apiKey = (await getKey("openai-api-key")) ?? undefined;
          baseUrl = (await getKey("openai-base-url")) ?? undefined;
        } else if (adapter === "ollama") {
          baseUrl = (await getKey("ollama-base-url")) ?? undefined;
        }

        const { sessionId: sid } = await startSession({
          prompt,
          projectDir: activeProjectDir,
          adapter,
          model,
          apiKey,
          baseUrl,
          topSkills: 3,
        });
        sessionIdRef.current = sid;
        setSessionId(sid);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setEvents((prev) => [...prev, { kind: "error", message: `Failed to start session: ${msg}` }]);
        setBusy(false);
      } finally {
        setStarting(false);
      }
    } else {
      try {
        await sendMessage(sessionId, prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setEvents((prev) => [...prev, { kind: "error", message: `Send failed: ${msg}` }]);
        setBusy(false);
      } finally {
        setStarting(false);
      }
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await stopSession(sessionId);
    } catch {
      // ignore — session may already be done
    }
    setBusy(false);
    setStarting(false);
  };

  // Most-recent error event still in view — surfaced as a pinned banner so it
  // doesn't scroll off as the agent streams new content.
  const latestError = (() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.kind === "error") return e;
      if (e.kind === "completion") return null; // a completed turn supersedes prior errors
    }
    return null;
  })();
  const [errorDismissed, setErrorDismissed] = useState<string | null>(null);
  const showBanner = latestError && latestError.message !== errorDismissed;

  return (
    <div style={containerStyle}>
      {/* Project context bar — always rendered. Picks/creates/closes the
          active project. Switching is a stated, deliberate action. */}
      <div style={contextBarStyle}>
        {activeProjectDir ? (
          <>
            <button type="button" onClick={onPickProject} style={contextChipStyle} title="Switch project (⌘P)">
              <span style={contextGlyphStyle}>📁</span>
              <span style={contextNameStyle}>{activeProjectName ?? "project"}</span>
              <span style={contextHintStyle}>{shortenPathInline(activeProjectDir)}</span>
              <span style={contextSwapStyle}>⇆</span>
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onCloseProject} style={contextCloseStyle} title="Close project">
              ✕
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onPickProject} style={contextChipStyle}>
              <span style={contextGlyphStyle}>＋</span>
              <span style={contextNameStyle}>Pick a project</span>
              <span style={contextHintStyle}>⌘P</span>
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onCreateProject} style={contextNewStyle} title="New project (⌘N)">
              + New
            </button>
          </>
        )}
      </div>

      {/* When no project is active, occupy the stream area with a friendly
          empty state instead of a blank box. */}
      {!activeProjectDir && (
        <div style={emptyChatStateStyle}>
          <div style={emptyChatTitleStyle}>What are you working on?</div>
          <div style={emptyChatHintStyle}>
            Pick or create a project — Studio scopes chat, files, checkpoints, and CAR runs to the active one.
            <br />
            <kbd style={kbdStyle}>⌘P</kbd> picker · <kbd style={kbdStyle}>⌘N</kbd> new project
          </div>
        </div>
      )}

      {/* Pinned error banner — only when a project is active */}
      {activeProjectDir && showBanner && (
        <div
          style={{
            ...errorBannerStyle,
            ...((latestError as { recoverable?: boolean }).recoverable
              ? { borderColor: "var(--amber, #d4a017)", color: "var(--amber, #d4a017)" }
              : null),
          }}
        >
          <span style={{ flex: 1 }}>
            {(latestError as { recoverable?: boolean }).recoverable ? "⚠ " : "✗ "}
            {(latestError as { message: string }).message}
          </span>
          <button
            type="button"
            onClick={() => setErrorDismissed((latestError as { message: string }).message)}
            style={errorDismissBtnStyle}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Skill badges — passengers boarded the bus this turn. Surfaces the
          otherwise-invisible skill-mesh routing decision in front of the user.
          Pulled from the most-recent skill-injected event in the stream. */}
      {activeProjectDir &&
        (() => {
          let lastSkills: Array<{ name: string; score: number }> | null = null;
          for (let i = events.length - 1; i >= 0; i--) {
            const e = events[i];
            if (e.kind === "skill-injected") {
              lastSkills = e.skills;
              break;
            }
          }
          if (!lastSkills?.length) return null;
          return (
            <div style={skillBadgeRowStyle}>
              <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em" }}>🚌 PASSENGERS</span>
              {lastSkills.map((s) => (
                <span key={s.name} style={skillBadgeStyle} title={`relevance score ${s.score.toFixed(1)}`}>
                  {s.name}
                </span>
              ))}
            </div>
          );
        })()}

      {/* Stream — only when a project is active. Otherwise the empty-state
          hero owns the available vertical space. */}
      {activeProjectDir && (
        <div ref={scrollRef} style={streamStyle}>
          <EventList events={events} />
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={inputBarStyle}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={
            !activeProjectDir
              ? "Pick a project first to start chatting…"
              : sessionId
                ? "Add to this build…"
                : "What do you want to build?"
          }
          rows={2}
          style={textareaStyle}
          disabled={!activeProjectDir}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          {busy ? (
            <button type="button" onClick={handleStop} style={stopButtonStyle}>
              Stop
            </button>
          ) : (
            <>
              {/* #5 — Retry button when the last event was an error */}
              {!busy && lastPrompt && events[events.length - 1]?.kind === "error" && (
                <button
                  type="button"
                  onClick={() => {
                    setInput(lastPrompt);
                    setTimeout(() => {
                      const fakeEvent = { preventDefault: () => undefined } as unknown as React.FormEvent;
                      handleSubmit(fakeEvent);
                    }, 0);
                  }}
                  style={retryButtonStyle}
                  title="Retry last prompt"
                >
                  ↻ Retry
                </button>
              )}
              <button type="submit" disabled={!input.trim() || starting || !activeProjectDir} style={sendButtonStyle}>
                {starting && <span className="ut-spinner" />}
                {starting ? (sessionId ? "Sending…" : "Starting…") : `${sessionId ? "Send" : "Build"} ↵`}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "var(--bg)",
  borderRight: "1px solid var(--border)",
};

const headerStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderBottom: "1px solid var(--border)",
  fontSize: "11px",
  color: "var(--text-muted)",
};

const streamStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  background: "var(--bg)",
};

const inputBarStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px 16px",
  borderTop: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  resize: "none",
  fontSize: "13.5px",
  color: "var(--text)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontFamily: "var(--font-sans)",
};

const sendButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  borderRadius: "6px",
  padding: "8px 14px",
};

const stopButtonStyle: React.CSSProperties = {
  ...sendButtonStyle,
  background: "var(--red)",
  color: "white",
};

const retryButtonStyle: React.CSSProperties = {
  ...sendButtonStyle,
  background: "transparent",
  color: "var(--accent)",
  border: "1px solid var(--accent)",
};
const errorBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "8px 12px",
  margin: "var(--space-2) var(--space-3) 0",
  fontSize: "12px",
  color: "var(--red, #e5484d)",
  background: "rgba(229, 72, 77, 0.08)",
  border: "1px solid var(--red, #e5484d)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-mono)",
  lineHeight: 1.4,
};
const errorDismissBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  fontSize: "14px",
  padding: "0 4px",
  opacity: 0.7,
};
// Skill-mesh "passengers boarded" row — visible right above the chat stream.
const skillBadgeRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderBottom: "1px solid var(--border)",
  background: "linear-gradient(180deg, rgba(124, 92, 255, 0.06), transparent)",
  fontSize: "11px",
};
const skillBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 9px",
  fontFamily: "var(--font-mono)",
  fontSize: "10.5px",
  fontWeight: 600,
  color: "var(--accent)",
  background: "var(--accent-soft)",
  border: "1px solid var(--accent)",
  borderRadius: "999px",
  letterSpacing: "0.02em",
};

// --- Project context bar ----------------------------------------------------
const contextBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};
const contextChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 10px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontSize: "12px",
  color: "var(--text)",
  maxWidth: "100%",
};
const contextGlyphStyle: React.CSSProperties = {
  fontSize: "13px",
  opacity: 0.85,
};
const contextNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--text)",
  whiteSpace: "nowrap",
};
const contextHintStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "180px",
};
const contextSwapStyle: React.CSSProperties = {
  marginLeft: "4px",
  color: "var(--text-dim)",
  fontSize: "11px",
};
const contextCloseStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-muted)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  cursor: "pointer",
};
const contextNewStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#0c0d10",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "5px 10px",
  cursor: "pointer",
};

// --- Empty-state hero (no active project) -----------------------------------
const emptyChatStateStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "var(--space-7)",
  color: "var(--text-muted)",
};
const emptyChatTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: "var(--space-2)",
};
const emptyChatHintStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-dim)",
  maxWidth: "420px",
  lineHeight: 1.6,
};
const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  margin: "0 2px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
};

function shortenPathInline(p: string): string {
  const home = "/Users/";
  const idx = p.indexOf(home);
  if (idx >= 0) {
    const after = p.slice(idx + home.length);
    const parts = after.split("/");
    if (parts.length > 1) return "~/" + parts.slice(1).join("/");
  }
  return p;
}
