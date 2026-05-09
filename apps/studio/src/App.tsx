// intent: root layout — left mode-switcher | (chat + workspace) | status bar
// status: done — Build mode shows chat+workspace; other modes take the full pane
// next: persist active mode in localStorage; wire mode-specific keyboard shortcuts
// confidence: high

import { useEffect, useState } from "react";
import { open as openInShell } from "@tauri-apps/plugin-shell";
import { ChatPanel } from "./components/ChatPanel.js";
import { FileTreePanel } from "./components/FileTreePanel.js";
import { PreviewPanel } from "./components/PreviewPanel.js";
import { MemoryGraphPanel } from "./components/MemoryGraphPanel.js";
import { Onboarding, shouldShowOnboarding } from "./components/Onboarding.js";
import { Settings } from "./components/Settings.js";
import { StatusLine } from "./components/StatusLine.js";
import { InsightsPanel } from "./components/InsightsPanel.js";
import { ProjectsPanel } from "./components/ProjectsPanel.js";
import { SkillsLibraryPanel } from "./components/SkillsLibraryPanel.js";
import { CarPanel } from "./components/CarPanel.js";
import { DebugTerminal, isDebugEnabled } from "./components/DebugTerminal.js";
import { ShortcutLegend } from "./components/ShortcutLegend.js";
import { CheckpointsPanel } from "./components/CheckpointsPanel.js";
import { ProjectPicker } from "./components/ProjectPicker.js";
import { NewProjectModal, type Project } from "./components/NewProjectModal.js";
import { IconWand, IconLayers, IconFolder, IconBarChart, IconBookOpen, IconSettings } from "./components/icons.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

function useTitleBarDrag() {
  return {
    onMouseDown: (e: React.MouseEvent) => {
      // Skip if the event originated on an interactive element (button, input, etc).
      let el: HTMLElement | null = e.target as HTMLElement;
      while (el && el !== e.currentTarget) {
        const tag = el.tagName;
        if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "A" || tag === "SELECT") return;
        el = el.parentElement;
      }
      if (e.button !== 0) return;
      // Tauri's window.startDragging() takes over once called. Errors surface
      // to console.error → debug terminal so we can see what's blocking.
      void getCurrentWindow()
        .startDragging()
        .catch((err) => console.error("[drag] startDragging failed:", err));
    },
    onDoubleClick: (e: React.MouseEvent) => {
      let el: HTMLElement | null = e.target as HTMLElement;
      while (el && el !== e.currentTarget) {
        const tag = el.tagName;
        if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
        el = el.parentElement;
      }
      void getCurrentWindow()
        .toggleMaximize()
        .catch((err) => console.error("[drag] toggleMaximize failed:", err));
    },
  };
}

type IconCmp = (p: { size?: number; strokeWidth?: number; style?: React.CSSProperties }) => React.ReactElement;

type Tab = "preview" | "files" | "memory";
type Mode = "build" | "car" | "projects" | "insights" | "skills";

const ACTIVE_PROJECT_KEY = "studio:active-project";

interface ActiveProject {
  dir: string;
  name: string;
}

export function App() {
  const [tab, setTab] = useState<Tab>("preview");
  const [mode, setMode] = useState<Mode>("build");
  // Active project is the source of truth. ChatPanel + CarPanel + Insights
  // all derive from it.
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
      return raw ? (JSON.parse(raw) as ActiveProject) : null;
    } catch {
      return null;
    }
  });
  const projectDir = activeProject?.dir ?? null;
  const [showOnboarding, setShowOnboarding] = useState<boolean>(shouldShowOnboarding());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(() => isDebugEnabled());
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showCheckpoints, setShowCheckpoints] = useState<boolean>(false);
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);
  const [showNewProject, setShowNewProject] = useState<boolean>(false);
  const [branch, setBranch] = useState<string | undefined>(undefined);

  // Persist the active project so reopening the app restores context.
  useEffect(() => {
    try {
      if (activeProject) localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(activeProject));
      else localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }, [activeProject]);

  // Validate the persisted project still exists on disk on first mount —
  // if it was deleted out-of-band we don't want to fail every send.
  useEffect(() => {
    if (!activeProject) return;
    void invoke<{ dir: string }[]>("list_projects")
      .then((rows) => {
        if (!rows.some((p) => p.dir === activeProject.dir)) setActiveProject(null);
      })
      .catch(() => {
        /* ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickProject(p: { dir: string; name: string }): void {
    setActiveProject({ dir: p.dir, name: p.name });
    setShowProjectPicker(false);
    setMode("build");
  }
  function closeActiveProject(): void {
    setActiveProject(null);
  }

  // Read the current git branch whenever the active project changes.
  useEffect(() => {
    if (!projectDir) {
      setBranch(undefined);
      return;
    }
    void (async () => {
      try {
        const b = await invoke<string | null>("git_branch", { projectDir });
        setBranch(b ?? undefined);
      } catch {
        setBranch(undefined);
      }
    })();
  }, [projectDir]);

  // Toggle the debug terminal:
  //   Cmd/Ctrl + `   → primary (matches VS Code's terminal toggle)
  //   Cmd/Ctrl + Shift + D → secondary (mnemonic)
  useEffect(() => {
    const isInputTarget = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cheat sheet — Cmd/Ctrl+/ always; bare ? when no input is focused
      if ((mod && e.key === "/") || (e.key === "?" && !isInputTarget(e.target))) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }
      // Esc closes overlays
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowProjectPicker(false);
        return;
      }
      if (!mod) return;
      // Cmd/Ctrl + P → project picker; Cmd/Ctrl + N → new project. Block
      // browser print/new-window default. Skip when an input is focused so
      // typing in Settings/Onboarding doesn't get hijacked.
      if (!isInputTarget(e.target)) {
        if (e.key.toLowerCase() === "p" && !e.shiftKey) {
          e.preventDefault();
          setShowProjectPicker((s) => !s);
          return;
        }
        if (e.key.toLowerCase() === "n" && !e.shiftKey) {
          e.preventDefault();
          setShowNewProject(true);
          return;
        }
      }
      const isBacktick = e.key === "`" || e.code === "Backquote";
      const isShiftD = e.shiftKey && e.key.toLowerCase() === "d";
      if (isBacktick || isShiftD) {
        e.preventDefault();
        setShowDebug((s) => {
          const next = !s;
          try {
            localStorage.setItem("studio:debug", next ? "1" : "0");
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Programmatic drag — bulletproof on Tauri 2 macOS. We bypass the
  // `data-tauri-drag-region` attribute system (which is finicky with overlay
  // title bars + nested spans) and call window.startDragging() on mousedown.
  // Double-click maximizes (matches native macOS title bar behaviour).
  const startDragRegion = useTitleBarDrag();

  return (
    <div style={layoutStyle}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showShortcuts && <ShortcutLegend onClose={() => setShowShortcuts(false)} />}
      {showCheckpoints && projectDir && (
        <CheckpointsPanel projectDir={projectDir} onClose={() => setShowCheckpoints(false)} />
      )}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(p: Project) => {
            setShowNewProject(false);
            pickProject(p);
          }}
        />
      )}

      <div
        style={titleBarStyle}
        onMouseDown={startDragRegion.onMouseDown}
        onDoubleClick={startDragRegion.onDoubleClick}
      >
        <div style={brandStyle}>
          <span style={{ fontWeight: 700, color: "var(--accent)", letterSpacing: "0.02em" }}>ultrathink</span>
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> studio</span>
        </div>
        <div style={{ flex: 1 }} />
        {projectDir && (
          <button
            style={gearButtonStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowCheckpoints(true)}
            title="Checkpoints — auto-snapshots after each turn"
            aria-label="Checkpoints"
          >
            <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>⎌</span>
          </button>
        )}
        <button
          style={gearButtonStyle}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Settings"
        >
          <IconSettings size={16} strokeWidth={1.7} />
        </button>
      </div>

      <div style={mainRowStyle}>
        <ModeSidebar mode={mode} setMode={setMode} />
        <div style={contentColumnStyle}>
          {mode === "build" && (
            <div style={buildGridStyle}>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <ChatPanel
                  activeProjectDir={projectDir}
                  activeProjectName={activeProject?.name}
                  onPickProject={() => setShowProjectPicker(true)}
                  onCreateProject={() => setShowNewProject(true)}
                  onCloseProject={closeActiveProject}
                />
                {showProjectPicker && (
                  <ProjectPicker
                    activeDir={projectDir}
                    onPick={(p) => pickProject(p)}
                    onCreateRequest={() => {
                      setShowProjectPicker(false);
                      setShowNewProject(true);
                    }}
                    onShowAll={() => {
                      setShowProjectPicker(false);
                      setMode("projects");
                    }}
                    onClose={() => setShowProjectPicker(false)}
                    anchorTop={44}
                    anchorLeft={12}
                  />
                )}
              </div>
              <WorkspacePane tab={tab} setTab={setTab} projectDir={projectDir} projectName={activeProject?.name} />
            </div>
          )}
          {mode === "projects" && (
            <ProjectsPanel
              onOpen={(dir) => {
                // ProjectsPanel returns just the dir; refetch the row to grab the
                // user-facing name for the active-project chip.
                void invoke<{ dir: string; name: string }[]>("list_projects").then((rows) => {
                  const found = rows.find((r) => r.dir === dir);
                  if (found) pickProject(found);
                  else setActiveProject({ dir, name: dir.split("/").pop() ?? "project" });
                });
                setMode("build");
              }}
            />
          )}
          {mode === "car" && <CarPanel activeProjectDir={projectDir} />}
          {mode === "insights" && <InsightsPanel />}
          {mode === "skills" && <SkillsLibraryPanel />}
        </div>
      </div>

      {showDebug && <DebugTerminal onClose={() => setShowDebug(false)} />}
      <StatusLine cwd={projectDir ?? undefined} branch={branch} version="0.1.0" />
    </div>
  );
}

interface ModeSidebarProps {
  mode: Mode;
  setMode: (m: Mode) => void;
}

function ModeSidebar({ mode, setMode }: ModeSidebarProps) {
  const items: Array<{ id: Mode; label: string; Icon: IconCmp; hint: string }> = [
    { id: "build", label: "Build", Icon: IconWand, hint: "Chat with the agent" },
    { id: "car", label: "CAR", Icon: IconLayers, hint: "Concurrent agent runs across lanes" },
    { id: "projects", label: "Projects", Icon: IconFolder, hint: "Browse all projects" },
    { id: "insights", label: "Insights", Icon: IconBarChart, hint: "Builds, cost, latency" },
    { id: "skills", label: "Skills", Icon: IconBookOpen, hint: "Skill library" },
  ];
  return (
    <div style={sidebarStyle}>
      {items.map(({ id, label, Icon, hint }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            title={`${label} — ${hint}`}
            aria-label={label}
            style={{ ...sidebarBtnStyle, ...(active ? sidebarBtnActiveStyle : null) }}
          >
            <Icon size={18} strokeWidth={1.7} />
            <span style={sidebarBtnLabelStyle}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface WorkspaceProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  projectDir: string | null;
  projectName?: string;
}

function WorkspacePane({ tab, setTab, projectDir, projectName }: WorkspaceProps) {
  return (
    <div style={workspaceStyle}>
      <div style={tabsStyle}>
        {(["preview", "files", "memory"] as const).map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{ ...tabStyle, ...(tab === t ? tabActiveStyle : null) }}>
            {t === "preview" ? "Preview" : t === "files" ? "Files" : "Memory"}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            disabled={!projectDir}
            style={ghostButtonStyle}
            onClick={async () => {
              if (!projectDir) return;
              try {
                await openInShell(projectDir);
              } catch (err) {
                console.error("open in Finder failed:", err);
              }
            }}
          >
            Open in Finder
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {tab === "preview" && <PreviewPanel projectDir={projectDir} />}
        {tab === "files" && <FileTreePanel projectDir={projectDir} />}
        {tab === "memory" && <MemoryGraphPanel projectName={projectName} projectDir={projectDir ?? undefined} />}
      </div>
    </div>
  );
}

const layoutStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100vw",
  paddingBottom: "32px",
};
// macOS Tauri 2 + `titleBarStyle: "Overlay"`: rely on `data-tauri-drag-region`
// (set on the JSX). `-webkit-app-region` is Electron-only and a no-op in WKWebView,
// so it was just clutter. Bumped to 52px for more comfortable drag surface.
const titleBarStyle: React.CSSProperties = {
  height: "52px",
  display: "flex",
  alignItems: "center",
  background: "var(--bg-elevated)",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
  paddingLeft: "82px",
  paddingRight: "12px",
  gap: "12px",
  userSelect: "none",
};
const gearButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "16px",
  cursor: "pointer",
  width: "28px",
  height: "28px",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const brandStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.02em",
  userSelect: "none",
};
const mainRowStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
};
const sidebarStyle: React.CSSProperties = {
  width: "56px",
  flexShrink: 0,
  background: "var(--bg-elevated)",
  borderRight: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "var(--space-3) 0",
  gap: "var(--space-1)",
};
const sidebarBtnStyle: React.CSSProperties = {
  width: "44px",
  height: "52px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-md)",
  background: "transparent",
  color: "var(--text-dim)",
  cursor: "pointer",
  transition: "background 0.15s ease, color 0.15s ease",
};
const sidebarBtnActiveStyle: React.CSSProperties = {
  background: "var(--accent-soft-translucent)",
  borderColor: "rgba(167,139,250,0.35)",
  color: "var(--accent)",
};
const sidebarBtnLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.02em",
};
const contentColumnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};
const buildGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "380px 1fr",
  flex: 1,
  minHeight: 0,
};
const workspaceStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-elevated)",
  minHeight: 0,
};
const tabsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "10px 16px",
  borderBottom: "1px solid var(--border)",
};
const tabStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-muted)",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};
const tabActiveStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  color: "var(--text)",
};
const ghostButtonStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "6px 12px",
};
const contentStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};
