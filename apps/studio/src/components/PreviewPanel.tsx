// intent: live preview iframe + dev-server controls + deploy button
// status: done (start/stop preview, embedded iframe, deploy via menu)
// next: hot-reload by file-watcher rather than relying on framework HMR; deploy progress UI
// confidence: medium — preview iframes work for most frameworks but cross-origin can bite
//
// User flow:
//   1. Click "Run" → invokes start_preview, listens for preview:event:<dir>
//   2. On {kind: "ready", port}, embeds iframe to http://localhost:<port>
//   3. Stop button kills the dev-server child
//   4. Deploy button picks a provider and invokes deploy_run, streams to a panel

import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface Props {
  projectDir: string | null;
}

interface PreviewEvent {
  kind: string;
  [k: string]: unknown;
}

type PreviewState =
  | { phase: "idle" }
  | { phase: "starting"; framework?: string }
  | { phase: "ready"; port: number; framework?: string }
  | { phase: "error"; message: string };

interface DeployEvent {
  kind: string;
  [k: string]: unknown;
}

type DeployState =
  | { phase: "idle" }
  | { phase: "running"; provider: string; logs: string[] }
  | { phase: "done"; provider: string; url: string | null; logs: string[] }
  // Keep the accumulated logs on error too — the auth-failure banner reads
  // them to detect "Use `vercel login`" style hints and surface a callout.
  | { phase: "error"; message: string; logs: string[] };

type PreviewViewport = "responsive" | "desktop" | "tablet" | "mobile";

const VIEWPORTS: Record<PreviewViewport, { label: string; width?: number; height?: number }> = {
  responsive: { label: "Fluid" },
  desktop: { label: "Desktop", width: 1440, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1112 },
  mobile: { label: "Mobile", width: 390, height: 844 },
};

function readViewport(): PreviewViewport {
  try {
    const raw = localStorage.getItem("studio:preview:viewport") as PreviewViewport | null;
    return raw && raw in VIEWPORTS ? raw : "responsive";
  } catch {
    return "responsive";
  }
}

export function PreviewPanel({ projectDir }: Props) {
  const [state, setState] = useState<PreviewState>({ phase: "idle" });
  const [deploy, setDeploy] = useState<DeployState>({ phase: "idle" });
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [viewport, setViewport] = useState<PreviewViewport>(() => readViewport());
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const deployUnlistenRef = useRef<UnlistenFn | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const readyPort = state.phase === "ready" ? state.port : null;

  useEffect(
    () => () => {
      unlistenRef.current?.();
      deployUnlistenRef.current?.();
    },
    []
  );

  useEffect(() => {
    try {
      localStorage.setItem("studio:preview:viewport", viewport);
    } catch {
      /* ignore quota / private mode */
    }
  }, [viewport]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    let frameWindow: Window | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    try {
      frameWindow = previewFrameRef.current?.contentWindow ?? null;
      frameWindow?.addEventListener("keydown", onKey);
    } catch {
      frameWindow = null;
    }
    return () => {
      try {
        frameWindow?.removeEventListener("keydown", onKey);
      } catch {
        /* iframe may have navigated cross-origin */
      }
    };
  }, [fullscreen, readyPort]);

  useEffect(() => {
    setState({ phase: "idle" });
    setDeploy({ phase: "idle" });
    setDeployMenuOpen(false);
    return () => {
      unlistenRef.current?.();
      deployUnlistenRef.current?.();
      if (projectDir) {
        void invoke("stop_preview", { projectDir }).catch(() => undefined);
      }
    };
  }, [projectDir]);

  if (!projectDir) {
    return (
      <div style={emptyStyle}>
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Preview will appear once a project is scaffolded
        </div>
      </div>
    );
  }

  async function startPreview(): Promise<void> {
    setState({ phase: "starting" });
    unlistenRef.current?.();
    const unlisten = await listen<PreviewEvent>(`preview:event:${projectDir}`, (e) => {
      const ev = e.payload;
      if (ev.kind === "detected") {
        setState((s) => ({
          ...s,
          phase: "starting",
          framework: ev.framework as string,
        }));
      } else if (ev.kind === "ready" && typeof ev.port === "number") {
        setState({
          phase: "ready",
          port: ev.port,
          framework: (ev.framework as string) ?? undefined,
        });
      } else if (ev.kind === "error") {
        setState({
          phase: "error",
          message: typeof ev.message === "string" ? ev.message : "preview failed",
        });
      } else if (ev.kind === "exit") {
        setState({ phase: "idle" });
      }
    });
    unlistenRef.current = unlisten;
    try {
      await invoke("start_preview", { projectDir });
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }

  async function stopPreview(): Promise<void> {
    try {
      await invoke("stop_preview", { projectDir });
    } catch {
      /* ignore */
    }
    setState({ phase: "idle" });
    unlistenRef.current?.();
  }

  async function runDeploy(provider: "vercel" | "cloudflare" | "netlify"): Promise<void> {
    setDeployMenuOpen(false);
    setDeploy({ phase: "running", provider, logs: [] });
    deployUnlistenRef.current?.();
    const unlisten = await listen<DeployEvent>(`deploy:event:${projectDir}`, (e) => {
      const ev = e.payload;
      setDeploy((prev) => {
        if (prev.phase !== "running") return prev;
        const logs = [...prev.logs];
        if (typeof ev.chunk === "string") logs.push(ev.chunk);
        if (ev.kind === "deploy-error") {
          // Preserve accumulated logs so the auth-failure banner can read them.
          return { phase: "error", message: String(ev.message ?? "deploy failed"), logs };
        }
        if (ev.kind === "deploy-done") {
          return {
            phase: "done",
            provider: prev.provider,
            url: typeof ev.url === "string" ? ev.url : null,
            logs,
          };
        }
        return { ...prev, logs };
      });
    });
    deployUnlistenRef.current = unlisten;
    try {
      await invoke("deploy_run", { projectDir, provider });
    } catch (err) {
      setDeploy({ phase: "error", message: String(err), logs: [] });
    }
  }

  const currentViewport = VIEWPORTS[viewport];
  const container: React.CSSProperties = fullscreen
    ? { ...containerStyle, ...fullscreenContainerStyle }
    : containerStyle;

  return (
    <div style={container}>
      {controlsCollapsed ? (
        <button
          type="button"
          onClick={() => setControlsCollapsed(false)}
          style={collapsedControlsButtonStyle}
          aria-label="Show preview controls"
        >
          Show controls
        </button>
      ) : (
        <div style={controlBarStyle}>
          {state.phase === "idle" || state.phase === "error" ? (
            <button onClick={startPreview} style={primaryButtonStyle}>
              ▶ Run
            </button>
          ) : state.phase === "starting" ? (
            <button disabled style={ghostButtonStyle}>
              Starting{state.framework ? ` (${state.framework})` : "…"}…
            </button>
          ) : (
            <button onClick={stopPreview} style={dangerButtonStyle}>
              ⏹ Stop
            </button>
          )}
          {state.phase === "ready" && (
            <span style={portBadgeStyle}>
              ● localhost:{state.port}
              {state.framework && (
                <span style={{ marginLeft: "8px", color: "var(--text-dim)" }}>{state.framework}</span>
              )}
            </span>
          )}
          <div style={viewportGroupStyle} role="group" aria-label="Preview viewport">
            {(Object.keys(VIEWPORTS) as PreviewViewport[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                style={{ ...viewportButtonStyle, ...(viewport === id ? viewportButtonActiveStyle : null) }}
                title={
                  VIEWPORTS[id].width
                    ? `${VIEWPORTS[id].label} ${VIEWPORTS[id].width}x${VIEWPORTS[id].height}`
                    : "Fill the available preview area"
                }
              >
                {VIEWPORTS[id].label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setFullscreen((v) => !v)} style={ghostButtonStyle}>
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeployMenuOpen(false);
              setControlsCollapsed(true);
            }}
            style={ghostButtonStyle}
          >
            Hide controls
          </button>
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button
              onClick={() => setDeployMenuOpen((v) => !v)}
              style={primaryButtonStyle}
              disabled={deploy.phase === "running"}
            >
              {deploy.phase === "running" ? `Deploying to ${deploy.provider}…` : "Deploy ↗"}
            </button>
            {deployMenuOpen && (
              <div style={deployMenuStyle} role="menu" aria-label="Deploy provider">
                {(["vercel", "cloudflare", "netlify"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="menuitem"
                    style={deployMenuItemStyle}
                    onClick={() => runDeploy(p)}
                  >
                    {p === "vercel" ? "▲ Vercel" : p === "cloudflare" ? "☁ Cloudflare Pages" : "◇ Netlify"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={frameWrapStyle(viewport)}>
        {state.phase === "ready" ? (
          <div style={viewportFrameStyle(viewport)}>
            {viewport !== "responsive" && (
              <div style={viewportLabelStyle}>
                {currentViewport.width}x{currentViewport.height}
              </div>
            )}
            <iframe
              ref={previewFrameRef}
              src={`http://localhost:${state.port}`}
              style={iframeStyle}
              title={`preview ${viewport}`}
            />
          </div>
        ) : state.phase === "error" ? (
          <div style={errorStyle}>{state.message}</div>
        ) : (
          <div style={emptyStyle}>
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              {state.phase === "starting" ? "Spinning up the dev server…" : "Click Run to start the preview"}
            </div>
          </div>
        )}
      </div>

      {(deploy.phase === "running" || deploy.phase === "done" || deploy.phase === "error") && (
        <div style={deployPanelStyle}>
          {deploy.phase === "done" && deploy.url && (
            <div style={{ color: "var(--green)", fontSize: "12px", fontWeight: 600 }}>
              ✓ Deployed →{" "}
              <a href={deploy.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {deploy.url}
              </a>
            </div>
          )}
          {deploy.phase === "done" && !deploy.url && (
            <DeployNoUrlBanner logs={deploy.logs.join("")} projectDir={projectDir} provider={deploy.provider} />
          )}
          {deploy.phase === "error" && (
            <DeployErrorBanner message={deploy.message ?? ""} logs={deploy.logs.join("")} projectDir={projectDir} />
          )}
          {deploy.phase === "running" && (
            <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Deploying to {deploy.provider}…</div>
          )}
          {(deploy.phase === "running" || deploy.phase === "done") && deploy.logs.length > 0 && (
            <pre style={deployLogsStyle}>{deploy.logs.join("").slice(-1500)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// intent: detect known CLI auth-failure patterns in deploy logs and offer the
//         user a one-click "open the project in a Terminal" escape hatch so
//         they can run vercel login / wrangler login / gh auth login without
//         leaving Studio. Replaces the unhelpful "no URL surfaced" banner.
// status: done — vercel + netlify + wrangler + gh covered; falls back to a
//         generic banner when the pattern doesn't match.
// next: drop the Terminal hop entirely when we ship an embedded xterm.js +
//       portable-pty surface inside Studio.
// confidence: high
interface AuthHint {
  tool: string;
  command: string;
  reason: string;
}
function detectAuthFailure(logs: string): AuthHint | null {
  const l = logs.toLowerCase();
  if (
    /use\s+`?vercel\s+login`?|specified token is not valid|vercel login to/i.test(logs) ||
    /vercel login/i.test(logs)
  ) {
    return { tool: "Vercel", command: "vercel login", reason: "Vercel token is missing or expired." };
  }
  if (/netlify\s+login|please run.*netlify/i.test(logs)) {
    return { tool: "Netlify", command: "netlify login", reason: "Netlify CLI is not authenticated." };
  }
  if (/wrangler\s+login|wrangler\s+auth|cloudflare.*log.in/i.test(logs)) {
    return {
      tool: "Cloudflare Wrangler",
      command: "wrangler login",
      reason: "Cloudflare Wrangler is not authenticated.",
    };
  }
  if (/gh\s+auth\s+login|gh:\s+to authenticate|run\s+`?gh auth login`?/i.test(logs)) {
    return { tool: "GitHub CLI", command: "gh auth login", reason: "GitHub CLI is not authenticated." };
  }
  if (/not logged in|authentication\s+(failed|required)|401\s+unauthorized/i.test(l)) {
    return {
      tool: "Provider",
      command: "",
      reason: "Authentication failed. Run the provider's login command in a terminal.",
    };
  }
  return null;
}

async function openTerminal(projectDir: string | null, command: string): Promise<void> {
  if (!projectDir) return;
  try {
    await invoke("open_terminal_in_project", { projectDir });
    if (command) {
      // The terminal opens cd'd to the project — copy the command so the user
      // can paste it instantly without retyping.
      try {
        await navigator.clipboard.writeText(command);
      } catch {
        // No clipboard permission — non-fatal, user can type manually.
      }
    }
  } catch (err) {
    console.error("open_terminal_in_project failed:", err);
  }
}

function DeployNoUrlBanner({
  logs,
  projectDir,
  provider,
}: {
  logs: string;
  projectDir: string | null;
  provider: string;
}) {
  const hint = detectAuthFailure(logs);
  if (hint) {
    return <AuthFailureCallout hint={hint} projectDir={projectDir} />;
  }
  return (
    <div style={{ color: "var(--amber)", fontSize: "12px" }}>
      Deploy to {provider} finished but no URL surfaced — check the logs below.
    </div>
  );
}

function DeployErrorBanner({
  message,
  logs,
  projectDir,
}: {
  message: string;
  logs: string;
  projectDir: string | null;
}) {
  const hint = detectAuthFailure(`${message}\n${logs}`);
  if (hint) {
    return <AuthFailureCallout hint={hint} projectDir={projectDir} />;
  }
  return <div style={{ color: "var(--red)", fontSize: "12px" }}>✗ {message}</div>;
}

function AuthFailureCallout({ hint, projectDir }: { hint: AuthHint; projectDir: string | null }) {
  return (
    <div style={authCalloutStyle}>
      <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600, marginBottom: "4px" }}>
        🔐 {hint.tool} needs you to sign in
      </div>
      <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "8px" }}>{hint.reason}</div>
      {hint.command && (
        <div style={authCommandRowStyle}>
          <code style={authCommandStyle}>{hint.command}</code>
        </div>
      )}
      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
        <button
          type="button"
          onClick={() => void openTerminal(projectDir, hint.command)}
          style={authBtnStyle}
          disabled={!projectDir}
          title={hint.command ? `Copies '${hint.command}' to your clipboard` : "Opens a terminal in the project"}
        >
          Open Terminal in project
        </button>
      </div>
    </div>
  );
}

const authCalloutStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--amber)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
};
const authCommandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
const authCommandStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "11.5px",
  color: "var(--accent)",
  background: "var(--bg)",
  padding: "3px 8px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
};
const authBtnStyle: React.CSSProperties = {
  fontSize: "11.5px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--amber)",
  border: "1px solid var(--amber)",
  padding: "5px 11px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  position: "relative",
  background: "var(--bg)",
};
const fullscreenContainerStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 220,
  width: "100vw",
  height: "100vh",
  border: "1px solid var(--border)",
};
const controlBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 12px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};
const portBadgeStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--green)",
  fontFamily: "var(--font-mono)",
};
const primaryButtonStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  borderRadius: "6px",
  padding: "6px 12px",
};
const dangerButtonStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "white",
  background: "var(--red)",
  borderRadius: "6px",
  padding: "6px 12px",
};
const ghostButtonStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "6px 12px",
  background: "transparent",
  cursor: "pointer",
};
const collapsedControlsButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 20,
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  padding: "6px 10px",
  background: "var(--bg-elevated)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
  cursor: "pointer",
};
function frameWrapStyle(viewport: PreviewViewport): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    background:
      viewport === "responsive"
        ? "white"
        : "radial-gradient(circle at top, var(--accent-soft-translucent), transparent 36%), var(--bg)",
    position: "relative",
    display: "flex",
    // `safe` falls back to flex-start when the child would overflow — without
    // it the desktop viewport (1440x900) couldn't be scrolled to its top
    // because the centered position pinned the scroll-overflow to the middle.
    alignItems: "safe center",
    justifyContent: "safe center",
    padding: viewport === "responsive" ? 0 : "18px",
    overflow: "auto",
  };
}
function viewportFrameStyle(viewport: PreviewViewport): React.CSSProperties {
  const vp = VIEWPORTS[viewport];
  if (viewport === "responsive" || !vp.width || !vp.height) {
    return { width: "100%", height: "100%", position: "relative" };
  }
  return {
    width: `${vp.width}px`,
    height: `${vp.height}px`,
    flexShrink: 0,
    position: "relative",
    background: "white",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: viewport === "mobile" ? "28px" : viewport === "tablet" ? "22px" : "12px",
    overflow: "hidden",
    boxShadow: "0 24px 70px rgba(0,0,0,0.62)",
  };
}
const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
  background: "white",
};
const viewportLabelStyle: React.CSSProperties = {
  position: "absolute",
  left: "12px",
  bottom: "10px",
  zIndex: 2,
  fontSize: "10px",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "rgba(255,255,255,0.86)",
  background: "rgba(8,10,14,0.62)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "999px",
  padding: "3px 8px",
  pointerEvents: "none",
};
const viewportGroupStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: "2px",
  padding: "3px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
};
const viewportButtonStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-muted)",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  cursor: "pointer",
};
const viewportButtonActiveStyle: React.CSSProperties = {
  color: "var(--bg)",
  background: "var(--accent)",
};
const emptyStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
};
const errorStyle: React.CSSProperties = {
  padding: "16px",
  color: "var(--red)",
  fontSize: "12px",
};
const deployMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "4px",
  minWidth: "180px",
  boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
  zIndex: 10,
};
const deployMenuItemStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  fontSize: "12px",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  color: "var(--text)",
  background: "transparent",
  border: "none",
};
const deployPanelStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border)",
  background: "var(--bg)",
  padding: "10px 14px",
  maxHeight: "180px",
  overflowY: "auto",
};
const deployLogsStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-dim)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};
