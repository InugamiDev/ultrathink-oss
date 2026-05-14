// intent: root layout — left mode-switcher | (chat + workspace) | status bar
// status: done — Build mode shows chat+workspace; other modes take the full pane
// next: persist active mode in localStorage; wire mode-specific keyboard shortcuts
// confidence: high

import { lazy, Suspense, useEffect, useState } from "react";
import { open as openInShell } from "@tauri-apps/plugin-shell";
import { Group, Panel, Separator, type Layout } from "react-resizable-panels";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatPanel } from "./components/ChatPanel.js";
import { FileTreePanel } from "./components/FileTreePanel.js";
import { PreviewPanel } from "./components/PreviewPanel.js";
import { Onboarding, shouldShowOnboarding } from "./components/Onboarding.js";
import { Settings } from "./components/Settings.js";
import { StatusLine } from "./components/StatusLine.js";
import { ProjectsPanel } from "./components/ProjectsPanel.js";
import { DebugTerminal, isDebugEnabled } from "./components/DebugTerminal.js";
import { ShortcutLegend } from "./components/ShortcutLegend.js";
import { CheckpointsPanel } from "./components/CheckpointsPanel.js";
import { BUILDER_STATUS_QUERY_KEY, fetchBuilderStatus } from "./components/BuilderCampaignSection.js";
import { ProjectPicker } from "./components/ProjectPicker.js";
import { NewProjectModal, type Project } from "./components/NewProjectModal.js";
import { NewMemoryModal } from "./components/NewMemoryModal.js";
import { IconWand, IconLayers, IconFolder, IconBarChart, IconBookOpen, IconSettings } from "./components/icons.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

const CarPanel = lazy(() => import("./components/CarPanel.js").then((m) => ({ default: m.CarPanel })));
const FoundationsPanel = lazy(() =>
  import("./components/FoundationsPanel.js").then((m) => ({ default: m.FoundationsPanel }))
);
const InsightsPanel = lazy(() => import("./components/InsightsPanel.js").then((m) => ({ default: m.InsightsPanel })));
const MemoryGraphPanel = lazy(() =>
  import("./components/MemoryGraphPanel.js").then((m) => ({ default: m.MemoryGraphPanel }))
);
const SkillsLibraryPanel = lazy(() =>
  import("./components/SkillsLibraryPanel.js").then((m) => ({ default: m.SkillsLibraryPanel }))
);

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

type Tab = "preview" | "files" | "memory" | "foundations";
type Mode = "build" | "car" | "projects" | "insights" | "skills";

const ACTIVE_PROJECT_KEY = "studio:active-project";

interface ActiveProject {
  dir: string;
  name: string;
}

type BuildPanelLayout = Layout & {
  chat: number;
  workspace: number;
};

function readPanelLayout(key: string, fallback: BuildPanelLayout): BuildPanelLayout {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.chat === "number" &&
      typeof parsed.workspace === "number" &&
      Number.isFinite(parsed.chat) &&
      Number.isFinite(parsed.workspace) &&
      parsed.chat > 0 &&
      parsed.workspace > 0
    ) {
      return { chat: parsed.chat, workspace: parsed.workspace };
    }
  } catch {
    /* ignore malformed layout state */
  }
  return fallback;
}

function savePanelLayout(key: string, layout: Layout): void {
  const chat = layout.chat;
  const workspace = layout.workspace;
  if (typeof chat !== "number" || typeof workspace !== "number") return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        chat: Number(chat.toFixed(2)),
        workspace: Number(workspace.toFixed(2)),
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

// intent: keep every debug-console entry point aligned with the persisted Studio preference
// status: done
// next: none
// blockers: none
// confidence: high
function writeDebugPreference(enabled: boolean): void {
  try {
    localStorage.setItem("studio:debug", enabled ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function App() {
  const queryClient = useQueryClient();
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
  const builderStatus = useQuery({
    queryKey: BUILDER_STATUS_QUERY_KEY,
    queryFn: fetchBuilderStatus,
  });
  const builderActive = builderStatus.data?.tier === "builder" && builderStatus.data.valid === true;
  const [showOnboarding, setShowOnboarding] = useState<boolean>(shouldShowOnboarding());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"builder" | undefined>(undefined);
  const [showDebug, setShowDebug] = useState<boolean>(() => isDebugEnabled());
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showCheckpoints, setShowCheckpoints] = useState<boolean>(false);
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);
  const [showNewProject, setShowNewProject] = useState<boolean>(false);
  const [showNewMemory, setShowNewMemory] = useState<boolean>(false);
  const [memoryToast, setMemoryToast] = useState<string | null>(null);
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
  }, []);

  function pickProject(p: { dir: string; name: string }): void {
    setActiveProject({ dir: p.dir, name: p.name });
    setShowProjectPicker(false);
    setMode("build");
  }
  function closeActiveProject(): void {
    setActiveProject(null);
  }

  function closeDebug(): void {
    writeDebugPreference(false);
    setShowDebug(false);
  }

  function toggleDebug(): void {
    setShowDebug((open) => {
      const next = !open;
      writeDebugPreference(next);
      return next;
    });
  }

  function confirmMemoryCreated(): void {
    setShowNewMemory(false);
    setMemoryToast("Memory created");
    void queryClient.invalidateQueries({ queryKey: ["memoryGraph"] });
    window.dispatchEvent(new CustomEvent("studio:memory-created"));
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
      if (mod && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setShowNewMemory(true);
        return;
      }
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
        setShowNewMemory(false);
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
          writeDebugPreference(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!memoryToast) return;
    const timer = window.setTimeout(() => setMemoryToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [memoryToast]);

  // Programmatic drag — bulletproof on Tauri 2 macOS. We bypass the
  // `data-tauri-drag-region` attribute system (which is finicky with overlay
  // title bars + nested spans) and call window.startDragging() on mousedown.
  // Double-click maximizes (matches native macOS title bar behaviour).
  const startDragRegion = useTitleBarDrag();
  const buildLayoutKey = "studio:layout:build";
  const buildLayout = readPanelLayout(buildLayoutKey, { chat: 34, workspace: 66 });

  return (
    <div style={layoutStyle}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {showSettings && (
        <Settings
          initialSection={settingsInitialSection}
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialSection(undefined);
          }}
        />
      )}
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
      {showNewMemory && <NewMemoryModal onClose={() => setShowNewMemory(false)} onCreated={confirmMemoryCreated} />}
      {memoryToast && <div style={toastStyle}>{memoryToast}</div>}

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
        {builderActive && (
          <button
            style={builderPillStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              setSettingsInitialSection("builder");
              setShowSettings(true);
            }}
            title="Open Builder Campaign settings"
            aria-label="Builder active"
          >
            BUILDER
          </button>
        )}
        {projectDir && (
          <button
            style={checkpointButtonStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowCheckpoints(true)}
            title="Checkpoints — auto-snapshots after each turn"
            aria-label="Checkpoints"
          >
            <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>⎌</span>
            Checkpoints
          </button>
        )}
        <button
          style={gearButtonStyle}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            setSettingsInitialSection(undefined);
            setShowSettings(true);
          }}
          title="Settings"
          aria-label="Settings"
        >
          <IconSettings size={16} strokeWidth={1.7} />
        </button>
      </div>

      <div style={mainRowStyle}>
        <ModeSidebar mode={mode} setMode={setMode} />
        <div style={contentColumnStyle}>
          <div style={modePaneStyle(mode === "build")} aria-hidden={mode !== "build"}>
            <Group
              id={buildLayoutKey}
              orientation="horizontal"
              defaultLayout={buildLayout}
              style={buildSplitStyle}
              onLayoutChanged={(layout) => savePanelLayout(buildLayoutKey, layout)}
            >
              <Panel id="chat" defaultSize={`${buildLayout.chat}%`} minSize="24%" maxSize="58%" style={panelStyle}>
                <div style={chatPanelShellStyle}>
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
              </Panel>
              <Separator className="studio-resize-handle" />
              <Panel id="workspace" defaultSize={`${buildLayout.workspace}%`} minSize="36%" style={panelStyle}>
                <WorkspacePane
                  tab={tab}
                  setTab={setTab}
                  projectDir={projectDir}
                  projectName={activeProject?.name}
                  onNewMemory={() => setShowNewMemory(true)}
                />
              </Panel>
            </Group>
          </div>
          {mode === "projects" && (
            <div style={modePaneStyle(true)}>
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
            </div>
          )}
          {mode === "car" && (
            <div style={modePaneStyle(true)}>
              <Suspense fallback={<PanelFallback label="Loading CAR" />}>
                <CarPanel activeProjectDir={projectDir} />
              </Suspense>
            </div>
          )}
          {mode === "insights" && (
            <div style={modePaneStyle(true)}>
              <Suspense fallback={<PanelFallback label="Loading insights" />}>
                <InsightsPanel />
              </Suspense>
            </div>
          )}
          {mode === "skills" && (
            <div style={modePaneStyle(true)}>
              <Suspense fallback={<PanelFallback label="Loading skills" />}>
                <SkillsLibraryPanel />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {showDebug && <DebugTerminal onClose={closeDebug} />}
      <StatusLine
        cwd={projectDir ?? undefined}
        branch={branch}
        version="0.1.0"
        debugOpen={showDebug}
        onToggleDebug={toggleDebug}
      />
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
  onNewMemory: () => void;
}

function WorkspacePane({ tab, setTab, projectDir, projectName, onNewMemory }: WorkspaceProps) {
  const tabLabels: Record<Tab, string> = {
    preview: "Preview",
    files: "Files",
    memory: "Memory",
    foundations: "Foundations",
  };

  return (
    <div style={workspaceStyle}>
      <div style={tabsStyle}>
        {(["preview", "files", "memory", "foundations"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{ ...tabStyle, ...(tab === t ? tabActiveStyle : null) }}
          >
            {tabLabels[t]}
          </button>
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
        <div style={tabPaneStyle(tab === "preview")} aria-hidden={tab !== "preview"}>
          <PreviewPanel projectDir={projectDir} />
        </div>
        <div style={tabPaneStyle(tab === "files")} aria-hidden={tab !== "files"}>
          <FileTreePanel projectDir={projectDir} />
        </div>
        <div style={tabPaneStyle(tab === "memory")} aria-hidden={tab !== "memory"}>
          <Suspense fallback={<PanelFallback label="Loading memory graph" />}>
            <MemoryGraphPanel projectName={projectName} projectDir={projectDir ?? undefined} onNewMemory={onNewMemory} />
          </Suspense>
        </div>
        <div style={tabPaneStyle(tab === "foundations")} aria-hidden={tab !== "foundations"}>
          <Suspense fallback={<PanelFallback label="Loading foundations" />}>
            <FoundationsPanel projectDir={projectDir} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function PanelFallback({ label }: { label: string }) {
  return <div style={loadingPanelStyle}>{label}...</div>;
}

const layoutStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100vw",
  paddingBottom: "32px",
};
const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: "64px",
  right: "16px",
  zIndex: 180,
  background: "var(--bg-card)",
  border: "1px solid var(--accent)",
  borderRadius: "var(--radius-md)",
  color: "var(--text)",
  fontSize: "12px",
  fontWeight: 600,
  padding: "9px 12px",
  boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
};
const loadingPanelStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
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
const builderPillStyle: React.CSSProperties = {
  background: "rgba(52,211,153,0.13)",
  border: "1px solid rgba(52,211,153,0.35)",
  color: "var(--green)",
  borderRadius: "999px",
  padding: "4px 9px",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  cursor: "pointer",
};
const checkpointButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
};
const mainRowStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
};
const sidebarStyle: React.CSSProperties = {
  width: "80px",
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
  width: "68px",
  height: "54px",
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
  fontSize: "8.5px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  lineHeight: 1.1,
};
const contentColumnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};
function modePaneStyle(active: boolean): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    visibility: active ? "visible" : "hidden",
    pointerEvents: active ? "auto" : "none",
    zIndex: active ? 2 : 1,
  };
}
const buildSplitStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};
const panelStyle: React.CSSProperties = {
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};
const chatPanelShellStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
  height: "100%",
};
const workspaceStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-elevated)",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
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
  background: "transparent",
  border: "none",
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
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0,
  position: "relative",
};
function tabPaneStyle(active: boolean): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    display: active ? "flex" : "none",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
  };
}
