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
  | { phase: "error"; message: string };

export function PreviewPanel({ projectDir }: Props) {
  const [state, setState] = useState<PreviewState>({ phase: "idle" });
  const [deploy, setDeploy] = useState<DeployState>({ phase: "idle" });
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const deployUnlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(
    () => () => {
      unlistenRef.current?.();
      deployUnlistenRef.current?.();
    },
    []
  );

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
          return { phase: "error", message: String(ev.message ?? "deploy failed") };
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
      setDeploy({ phase: "error", message: String(err) });
    }
  }

  return (
    <div style={containerStyle}>
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
            {state.framework && <span style={{ marginLeft: "8px", color: "var(--text-dim)" }}>{state.framework}</span>}
          </span>
        )}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button
            onClick={() => setDeployMenuOpen((v) => !v)}
            style={primaryButtonStyle}
            disabled={deploy.phase === "running"}
          >
            {deploy.phase === "running" ? `Deploying to ${deploy.provider}…` : "Deploy ↗"}
          </button>
          {deployMenuOpen && (
            <div style={deployMenuStyle}>
              {(["vercel", "cloudflare", "netlify"] as const).map((p) => (
                <div key={p} style={deployMenuItemStyle} onClick={() => runDeploy(p)}>
                  {p === "vercel" ? "▲ Vercel" : p === "cloudflare" ? "☁ Cloudflare Pages" : "◇ Netlify"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={frameWrapStyle}>
        {state.phase === "ready" ? (
          <iframe src={`http://localhost:${state.port}`} style={iframeStyle} title="preview" />
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
            <div style={{ color: "var(--amber)", fontSize: "12px" }}>
              Deploy finished but no URL surfaced — check logs
            </div>
          )}
          {deploy.phase === "error" && <div style={{ color: "var(--red)", fontSize: "12px" }}>✗ {deploy.message}</div>}
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

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
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
};
const frameWrapStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  background: "white",
  position: "relative",
};
const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  border: "none",
};
const emptyStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  background: "var(--bg)",
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
  fontSize: "12px",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  color: "var(--text)",
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
