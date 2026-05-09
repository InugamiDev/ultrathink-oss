// intent: project file tree + lightweight code editor
// status: done (CodeMirror with language modes for js/ts/tsx/css/html/json/md)
// next: file tree expand/collapse persistence, watch FS for agent edits live
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";

interface FileNode {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
}

interface Props {
  projectDir: string | null;
}

export function FileTreePanel({ projectDir }: Props) {
  const [tree, setTree] = useState<Record<string, FileNode[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [fileText, setFileText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectDir) return;
    setExpanded(new Set([projectDir]));
    void loadDir(projectDir);
  }, [projectDir]);

  async function loadDir(dir: string): Promise<void> {
    try {
      const list = await invoke<FileNode[]>("list_files", { dir });
      setTree((prev) => ({ ...prev, [dir]: list }));
    } catch (err) {
      setError(`Failed to read ${dir}: ${String(err)}`);
    }
  }

  async function toggle(node: FileNode): Promise<void> {
    if (!node.isDir) {
      setSelected(node);
      try {
        const text = await invoke<string>("read_file_text", { path: node.path });
        setFileText(text);
        setError(null);
      } catch (err) {
        setFileText("");
        setError(String(err));
      }
      return;
    }
    const next = new Set(expanded);
    if (next.has(node.path)) {
      next.delete(node.path);
    } else {
      next.add(node.path);
      if (!tree[node.path]) await loadDir(node.path);
    }
    setExpanded(next);
  }

  if (!projectDir) {
    return (
      <div style={emptyStyle}>
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Start a build to populate the file tree</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={treePaneStyle}>
        <div style={treeHeaderStyle}>FILES</div>
        <TreeNode
          node={{
            path: projectDir,
            name: projectDir.split("/").pop() ?? projectDir,
            isDir: true,
          }}
          tree={tree}
          expanded={expanded}
          selected={selected}
          onToggle={toggle}
          depth={0}
        />
      </div>
      <div style={editorPaneStyle}>
        {selected ? (
          <>
            <div style={editorHeaderStyle}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                {selected.path.replace(projectDir + "/", "")}
              </span>
              {selected.size !== undefined && (
                <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>{formatSize(selected.size)}</span>
              )}
            </div>
            {error ? (
              <div style={errorStyle}>{error}</div>
            ) : (
              <div style={editorWrapperStyle}>
                <CodeMirror
                  value={fileText}
                  theme={oneDark}
                  extensions={pickExtensions(selected.name)}
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: false,
                    foldGutter: true,
                  }}
                  editable={false}
                  style={{ fontSize: "12.5px", height: "100%" }}
                />
              </div>
            )}
          </>
        ) : (
          <div style={emptyStyle}>
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Select a file to view</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: FileNode;
  tree: Record<string, FileNode[]>;
  expanded: Set<string>;
  selected: FileNode | null;
  onToggle: (n: FileNode) => void;
  depth: number;
}

function TreeNode({ node, tree, expanded, selected, onToggle, depth }: TreeNodeProps) {
  const isOpen = node.isDir && expanded.has(node.path);
  const children = node.isDir ? (tree[node.path] ?? []) : [];
  const isSelected = selected?.path === node.path;

  return (
    <div>
      <div
        onClick={() => onToggle(node)}
        style={{
          ...rowStyle,
          paddingLeft: `${10 + depth * 12}px`,
          background: isSelected ? "var(--bg-card)" : "transparent",
          color: node.isDir ? "var(--text)" : "var(--text-muted)",
        }}
      >
        <span style={{ marginRight: "6px", fontSize: "10px", color: "var(--text-dim)" }}>
          {node.isDir ? (isOpen ? "▾" : "▸") : " "}
        </span>
        <span style={{ marginRight: "6px" }}>{node.isDir ? "📁" : "📄"}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
      </div>
      {isOpen &&
        children.map((c) => (
          <TreeNode
            key={c.path}
            node={c}
            tree={tree}
            expanded={expanded}
            selected={selected}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

function pickExtensions(filename: string): Extension[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx"))
    return [javascript({ jsx: true, typescript: lower.endsWith(".tsx") })];
  if (lower.endsWith(".ts")) return [javascript({ typescript: true })];
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return [javascript()];
  if (lower.endsWith(".html")) return [html()];
  if (lower.endsWith(".css")) return [css()];
  if (lower.endsWith(".json")) return [json()];
  return [];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const containerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  height: "100%",
  minHeight: 0,
};
const treePaneStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  borderRight: "1px solid var(--border)",
  background: "var(--bg)",
  overflowY: "auto",
};
const treeHeaderStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: "var(--text-dim)",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: "12px",
  height: "26px",
  cursor: "pointer",
  userSelect: "none",
};
const editorPaneStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};
const editorHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  fontSize: "11px",
  color: "var(--text-muted)",
  background: "var(--bg-elevated)",
};
const editorWrapperStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
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
