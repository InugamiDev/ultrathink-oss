// intent: CAR — concurrent agent runs across preset lanes. Real CLI subprocesses.
// status: done — lanes loaded from Rust, runs spawn real `claude`/`codex` children
// next: persist run history to `~/.ultrathink-studio/car-history.jsonl`; show diff per run
// confidence: medium — depends on `claude`/`codex` CLIs being on PATH

import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Lane {
  id: string;
  label: string;
  cli: "claude" | "codex" | string;
  model: string;
  systemHint: string;
  color: string;
}

type RunStatus = "running" | "done" | "cancelled" | "error";
type Phase = "starting" | "thinking" | "tool" | "writing" | "complete";

interface Usage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
}

interface LogEntry {
  stream: "stdout" | "stderr";
  line: string;
}

interface Run {
  id: string;
  laneId: string;
  laneLabel: string;
  laneColor: string;
  cli: string;
  task: string;
  status: RunStatus;
  phase: Phase;
  startedAt: number;
  endedAt?: number;
  text: string;
  toolName?: string;
  usage: Usage;
  log: LogEntry[];
  exitInfo?: string;
}

const EMPTY_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  costUsd: 0,
};

interface RunSummary {
  id: string;
  laneId: string;
  task: string;
  startedAt: string;
}

const MAX_RECENT_LINES = 6;

const LANE_COLORS: Array<{ label: string; value: string }> = [
  { label: "Purple", value: "var(--accent)" },
  { label: "Cyan", value: "var(--cyan)" },
  { label: "Teal", value: "var(--teal)" },
  { label: "Pink", value: "var(--pink)" },
  { label: "Green", value: "var(--green)" },
  { label: "Amber", value: "var(--amber)" },
  { label: "Blue", value: "var(--blue)" },
  { label: "Red", value: "var(--red)" },
];

function newLaneId(): string {
  return `lane_${Math.random().toString(36).slice(2, 8)}`;
}

const MODELS_BY_CLI: Record<string, Array<{ id: string; label: string }>> = {
  claude: [
    { id: "claude-opus-4-7", label: "Opus 4.7 — strongest reasoning" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6 — balanced (default for code)" },
    { id: "claude-haiku-4-5", label: "Haiku 4.5 — fastest, cheapest" },
  ],
  codex: [
    { id: "gpt-5-codex", label: "gpt-5-codex — full coder" },
    { id: "gpt-5-codex-mini", label: "gpt-5-codex-mini — cheaper / faster" },
  ],
};

function defaultModelFor(cli: string): string {
  return MODELS_BY_CLI[cli]?.[0]?.id ?? "";
}

function blankLane(): Lane {
  return {
    id: newLaneId(),
    label: "New lane",
    cli: "claude",
    model: "claude-sonnet-4-6",
    systemHint: "",
    color: LANE_COLORS[0].value,
  };
}

interface CarPanelProps {
  /** Active project to scope CAR runs against. Optional — runs without one
      land in $HOME (legacy). The banner nudges the user to pick one. */
  activeProjectDir?: string | null;
}

export function CarPanel({ activeProjectDir }: CarPanelProps = {}) {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [activeLane, setActiveLane] = useState<string | null>(null);
  const [task, setTask] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftLanes, setDraftLanes] = useState<Lane[]>([]);
  const [savingLanes, setSavingLanes] = useState(false);

  function loadLanes(): Promise<void> {
    return invoke<Lane[]>("car_list_lanes")
      .then((ls) => {
        setLanes(ls);
        if (ls.length > 0 && !activeLane) setActiveLane(ls[0].id);
      })
      .catch((e) => setError(String(e)));
  }

  useEffect(() => {
    void loadLanes();

    invoke<RunSummary[]>("car_list_runs")
      .then((existing) => {
        if (existing.length === 0) return;
        setRuns((prev) => {
          const known = new Set(prev.map((r) => r.id));
          const reattach = existing
            .filter((r) => !known.has(r.id))
            .map(
              (r): Run => ({
                id: r.id,
                laneId: r.laneId,
                laneLabel: r.laneId,
                laneColor: "var(--accent)",
                cli: "?",
                task: r.task,
                status: "running",
                phase: "starting",
                startedAt: Date.parse(r.startedAt) || Date.now(),
                text: "",
                usage: { ...EMPTY_USAGE },
                log: [],
              })
            );
          return [...prev, ...reattach];
        });
      })
      .catch(() => undefined);
  }, []);

  // Track per-run listeners in a ref (not state) so the unmount cleanup
  // closure always sees the latest map. The original setState-based approach
  // had a stale-closure bug — the useEffect cleanup captured the empty initial
  // map and never tore down anything. Listeners also auto-detach on
  // task-completed (see startRun below) so the map stays bounded.
  const unlistenersRef = useRef<Map<string, () => void>>(new Map());
  useEffect(() => {
    const map = unlistenersRef.current;
    return () => {
      for (const u of map.values()) {
        try {
          u();
        } catch {
          /* ignore */
        }
      }
      map.clear();
    };
  }, []);

  async function startRun() {
    setError(null);
    if (!activeLane) {
      setError("Pick a lane first.");
      return;
    }
    if (!task.trim()) {
      setError("Type a task description.");
      return;
    }
    const lane = lanes.find((l) => l.id === activeLane);
    if (!lane) return;

    let runId: string;
    try {
      runId = await invoke<string>("car_start_run", {
        laneId: lane.id,
        task: task.trim(),
        projectDir: activeProjectDir ?? undefined,
      });
    } catch (e) {
      setError(`Failed to spawn ${lane.cli}: ${e}`);
      return;
    }

    const newRun: Run = {
      id: runId,
      laneId: lane.id,
      laneLabel: lane.label,
      laneColor: lane.color,
      cli: lane.cli,
      task: task.trim(),
      status: "running",
      phase: "starting",
      startedAt: Date.now(),
      text: "",
      usage: { ...EMPTY_USAGE },
      log: [],
    };
    setRuns((prev) => [newRun, ...prev]);
    setTask("");

    const unlisten = await listen<Record<string, unknown>>(`car:event:${runId}`, (ev) => {
      const p = ev.payload as Record<string, unknown>;
      const kind = p.kind as string | undefined;
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== runId) return r;
          const next = { ...r };
          switch (kind) {
            case "task-started":
              next.phase = "thinking";
              break;
            case "log": {
              const stream = (p.stream as "stdout" | "stderr") ?? "stdout";
              const line = (p.line as string) ?? "";
              next.log = [...r.log, { stream, line }].slice(-500);
              break;
            }
            case "thinking":
              next.phase = "thinking";
              break;
            case "tool-call":
              next.phase = "tool";
              next.toolName = (p.name as string) ?? "tool";
              break;
            case "tool-result":
              next.phase = "writing";
              break;
            case "text-delta":
              next.phase = "writing";
              next.text = (r.text + ((p.text as string) ?? "")).slice(-2000);
              break;
            case "usage": {
              const u = (p.usage as Partial<Usage>) ?? {};
              next.usage = {
                inputTokens: u.inputTokens ?? r.usage.inputTokens,
                outputTokens: u.outputTokens ?? r.usage.outputTokens,
                cachedInputTokens: u.cachedInputTokens ?? r.usage.cachedInputTokens,
                costUsd: u.costUsd ?? r.usage.costUsd,
              };
              break;
            }
            case "task-completed": {
              const u = (p.usage as Partial<Usage>) ?? {};
              next.usage = {
                inputTokens: u.inputTokens ?? r.usage.inputTokens,
                outputTokens: u.outputTokens ?? r.usage.outputTokens,
                cachedInputTokens: u.cachedInputTokens ?? r.usage.cachedInputTokens,
                costUsd: u.costUsd ?? r.usage.costUsd,
              };
              next.phase = "complete";
              if (r.status === "running") {
                next.status = "done";
                next.endedAt = Date.now();
              }
              // Auto-detach the listener once the run is finished — bounds
              // the listener map and prevents accumulation across many runs.
              const cleanup = unlistenersRef.current.get(runId);
              if (cleanup) {
                try {
                  cleanup();
                } catch {
                  /* ignore */
                }
                unlistenersRef.current.delete(runId);
              }
              break;
            }
          }
          return next;
        })
      );
    });
    unlistenersRef.current.set(runId, unlisten);
  }

  async function cancelRun(id: string) {
    try {
      await invoke("car_cancel_run", { runId: id });
    } catch (e) {
      console.error("car_cancel_run failed", e);
    }
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled", endedAt: Date.now() } : r)));
    const u = unlistenersRef.current.get(id);
    if (u) {
      try {
        u();
      } catch {
        /* ignore */
      }
      unlistenersRef.current.delete(id);
    }
  }

  const active = runs.filter((r) => r.status === "running");
  const finished = runs.filter((r) => r.status !== "running");

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={h2Style}>CAR</h2>
          <p style={subStyle}>
            Concurrent agent runs across preset lanes. Drop a task on a lane, run as many in parallel as you want.
          </p>
        </div>
        <div style={statBlockStyle}>
          <div style={statItemStyle}>
            <span style={statLabelStyle}>active</span>
            <span style={statValueStyle}>{active.length}</span>
          </div>
          <div style={statItemStyle}>
            <span style={statLabelStyle}>finished</span>
            <span style={statValueStyle}>{finished.length}</span>
          </div>
        </div>
      </div>

      {editing && (
        <LaneEditor
          drafts={draftLanes}
          setDrafts={setDraftLanes}
          saving={savingLanes}
          onCancel={() => setEditing(false)}
          onSave={async () => {
            // #11 — validate lane labels are non-empty before persisting.
            const empty = draftLanes.find((l) => !l.label.trim());
            if (empty) {
              setError(`Lane id ${empty.id} has empty label. Set a name before saving.`);
              return;
            }
            const dupes = new Set<string>();
            const ids = new Set<string>();
            for (const l of draftLanes) {
              if (ids.has(l.id)) dupes.add(l.id);
              ids.add(l.id);
            }
            if (dupes.size > 0) {
              setError(`Duplicate lane id(s): ${[...dupes].join(", ")}. Each lane needs a unique id.`);
              return;
            }
            setSavingLanes(true);
            try {
              await invoke("car_save_lanes", { lanes: draftLanes });
              setLanes(draftLanes);
              if (!draftLanes.find((l) => l.id === activeLane)) {
                setActiveLane(draftLanes[0]?.id ?? null);
              }
              setEditing(false);
            } catch (e) {
              setError(`Save failed: ${e}`);
            } finally {
              setSavingLanes(false);
            }
          }}
          onReset={async () => {
            try {
              const fresh = await invoke<Lane[]>("car_reset_lanes");
              setDraftLanes(fresh);
            } catch (e) {
              setError(`Reset failed: ${e}`);
            }
          }}
        />
      )}

      <section style={composerStyle}>
        <div style={lanePickerHeaderStyle}>
          <div style={lanePickerStyle}>
            {lanes.map((l) => {
              const isActive = l.id === activeLane;
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLane(l.id)}
                  style={{
                    ...laneChipStyle,
                    borderColor: isActive ? l.color : "var(--border)",
                    background: isActive ? "var(--bg-card)" : "var(--bg)",
                    color: isActive ? l.color : "var(--text-muted)",
                  }}
                >
                  <span style={{ ...laneDotStyle, background: l.color }} />
                  <span style={{ fontWeight: 600 }}>{l.label}</span>
                  <span style={laneCliBadgeStyle}>{l.cli}</span>
                </button>
              );
            })}
            {lanes.length === 0 && <span style={{ color: "var(--text-dim)" }}>Loading lanes…</span>}
          </div>
          <button
            style={editLanesBtnStyle}
            onClick={() => {
              setDraftLanes(JSON.parse(JSON.stringify(lanes)));
              setEditing(true);
            }}
            title="Edit lanes (model, system hint, color, add/remove)"
          >
            ⚙ Edit lanes
          </button>
        </div>

        <div style={inputRowStyle}>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={`Task for ${lanes.find((l) => l.id === activeLane)?.label ?? "the lane"}…`}
            rows={2}
            style={textareaStyle}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void startRun();
              }
            }}
          />
          <button style={primaryBtnStyle} onClick={() => void startRun()}>
            ▶ Run
          </button>
        </div>
        <div style={hintRowStyle}>
          <span style={{ color: "var(--text-dim)" }}>⌘↵ to run</span>
          {error && <span style={{ color: "var(--red)" }}>{error}</span>}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={h3Style}>Active runs</h3>
          <span style={mutedStyle}>{active.length} running</span>
        </div>
        <div style={runsGridStyle}>
          {active.map((r) => (
            <RunCard key={r.id} run={r} onCancel={() => void cancelRun(r.id)} />
          ))}
          {active.length === 0 && (
            <div style={emptyStyle}>No active runs. Pick a lane, type a task, and hit ▶ Run.</div>
          )}
        </div>
      </section>

      {finished.length > 0 && (
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={h3Style}>Recent</h3>
            <span style={mutedStyle}>last {finished.length}</span>
          </div>
          <div style={listStyle}>
            {finished.slice(0, 30).map((r) => (
              <FinishedRow key={r.id} run={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LaneEditor({
  drafts,
  setDrafts,
  saving,
  onCancel,
  onSave,
  onReset,
}: {
  drafts: Lane[];
  setDrafts: (l: Lane[]) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  function update(idx: number, patch: Partial<Lane>) {
    setDrafts(drafts.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function remove(idx: number) {
    setDrafts(drafts.filter((_, i) => i !== idx));
  }
  function add() {
    setDrafts([...drafts, blankLane()]);
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...drafts];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDrafts(next);
  }

  return (
    <div style={modalScrimStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Edit CAR lanes</h3>
            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px" }}>
              Saved to ~/.ultrathink-studio/car-lanes.json. Changes apply to new runs immediately.
            </p>
          </div>
          <button style={modalCloseBtnStyle} onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={editorListStyle}>
          {drafts.map((l, idx) => (
            <div key={l.id} style={{ ...editorRowStyle, borderLeft: `3px solid ${l.color}` }}>
              <div style={editorRowTopStyle}>
                <input
                  value={l.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  style={{ ...editorInputStyle, fontSize: "13px", fontWeight: 600 }}
                  placeholder="Lane name"
                />
                <div style={{ display: "flex", gap: "4px" }}>
                  <button style={tinyBtnStyle} onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up">
                    ↑
                  </button>
                  <button
                    style={tinyBtnStyle}
                    onClick={() => move(idx, 1)}
                    disabled={idx === drafts.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    style={{ ...tinyBtnStyle, color: "var(--red)" }}
                    onClick={() => remove(idx)}
                    title="Delete lane"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={editorGridStyle}>
                <Field label="CLI">
                  <select
                    value={l.cli}
                    onChange={(e) => {
                      const nextCli = e.target.value;
                      const validModels = MODELS_BY_CLI[nextCli] ?? [];
                      const stillValid = validModels.some((m) => m.id === l.model);
                      update(idx, {
                        cli: nextCli,
                        model: stillValid ? l.model : defaultModelFor(nextCli),
                      });
                    }}
                    style={editorInputStyle}
                  >
                    <option value="claude">claude</option>
                    <option value="codex">codex</option>
                  </select>
                </Field>
                <Field label="Model">
                  <select
                    value={l.model}
                    onChange={(e) => update(idx, { model: e.target.value })}
                    style={editorInputStyle}
                  >
                    {(MODELS_BY_CLI[l.cli] ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                    {(MODELS_BY_CLI[l.cli] ?? []).every((m) => m.id !== l.model) && l.model && (
                      <option value={l.model}>{l.model} (custom)</option>
                    )}
                  </select>
                </Field>
                <Field label="Color">
                  <div style={colorPickerRowStyle}>
                    {LANE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => update(idx, { color: c.value })}
                        title={c.label}
                        style={{
                          ...colorSwatchStyle,
                          background: c.value,
                          outline: l.color === c.value ? "2px solid var(--text)" : "none",
                        }}
                      />
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="System hint" hint="Prepended to every task on this lane.">
                <textarea
                  value={l.systemHint}
                  onChange={(e) => update(idx, { systemHint: e.target.value })}
                  rows={2}
                  style={{ ...editorInputStyle, fontFamily: "var(--font-sans)", resize: "vertical" }}
                  placeholder="e.g. Implement code changes. Make tests pass. No design discussions."
                />
              </Field>
            </div>
          ))}
          {drafts.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "var(--space-6)" }}>
              No lanes. Add one below or hit Reset to load defaults.
            </div>
          )}
        </div>

        <div style={modalFooterStyle}>
          <button style={ghostBtnStyle} onClick={add}>
            + Add lane
          </button>
          <button style={ghostBtnStyle} onClick={onReset}>
            ↺ Reset to defaults
          </button>
          <div style={{ flex: 1 }} />
          <button style={ghostBtnStyle} onClick={onCancel}>
            Cancel
          </button>
          <button style={primaryBtnStyle} onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
      {hint && <div style={fieldHintStyle}>{hint}</div>}
    </div>
  );
}

function phaseLabel(p: Phase, toolName?: string): string {
  switch (p) {
    case "starting":
      return "Starting…";
    case "thinking":
      return "Thinking";
    case "tool":
      return toolName ? `Tool: ${toolName}` : "Tool call";
    case "writing":
      return "Writing";
    case "complete":
      return "Complete";
  }
}

function RunCard({ run, onCancel }: { run: Run; onCancel: () => void }) {
  const [, setTick] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (showLog && logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [run.log.length, showLog]);

  const elapsed = Date.now() - run.startedAt;

  return (
    <div style={{ ...runCardStyle, borderLeft: `3px solid ${run.laneColor}` }}>
      <div style={runHeadStyle}>
        <span style={{ ...laneTagStyle, color: run.laneColor }}>{run.laneLabel}</span>
        <span style={{ ...statusBadgeStyle, color: "var(--green)" }}>
          <span style={{ ...badgeDotStyle, background: "var(--green)" }} />
          {phaseLabel(run.phase, run.toolName)} · {formatMs(elapsed)}
        </span>
      </div>
      <div style={runTaskStyle}>{run.task}</div>

      <div style={usageRowStyle}>
        <UsageStat label="in" value={run.usage.inputTokens} />
        <UsageStat label="out" value={run.usage.outputTokens} />
        <UsageStat label="cached" value={run.usage.cachedInputTokens} />
        <span style={costPillStyle}>${run.usage.costUsd.toFixed(4)}</span>
      </div>

      {run.text && (
        <div style={previewTextStyle}>
          {truncate(run.text, 320)}
          {run.phase !== "complete" && <span style={cursorBlinkStyle}>▍</span>}
        </div>
      )}

      <div style={runFootStyle}>
        <span style={{ color: "var(--text-dim)" }}>
          {run.cli} · {run.log.length} log{run.log.length === 1 ? "" : "s"}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={ghostMicroBtnStyle} onClick={() => setShowLog((s) => !s)}>
            {showLog ? "Hide log" : "Show log"}
          </button>
          <button style={cancelBtnStyle} onClick={onCancel}>
            ■ Cancel
          </button>
        </div>
      </div>

      {showLog && (
        <div style={logStyle} ref={logEndRef}>
          {run.log.length === 0 ? (
            <span style={{ color: "var(--text-dim)" }}>waiting for first output…</span>
          ) : (
            run.log.map((l, i) => (
              <div
                key={i}
                style={{ ...logLineStyle, color: l.stream === "stderr" ? "var(--amber)" : "var(--text-muted)" }}
              >
                {truncate(l.line, 200)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <span style={usageStatStyle}>
      <span style={usageLabelStyle}>{label}</span>
      <span style={usageValStyle}>{formatTokens(value)}</span>
    </span>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function FinishedRow({ run }: { run: Run }) {
  const tone = run.status === "done" ? "var(--green)" : run.status === "cancelled" ? "var(--text-dim)" : "var(--red)";
  const elapsed = (run.endedAt ?? run.startedAt) - run.startedAt;
  return (
    <div style={finishedRowStyle}>
      <span style={{ ...statusDotStyle, background: tone }} />
      <span style={{ ...laneTagStyle, color: run.laneColor, width: "180px", flexShrink: 0 }}>{run.laneLabel}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={runTaskInlineStyle}>{run.task}</div>
        {run.text && <div style={lastLineStyle}>{truncate(run.text, 200)}</div>}
      </div>
      <div style={finishedMetaStyle}>
        <span>
          {formatMs(elapsed)} · ${run.usage.costUsd.toFixed(4)}
        </span>
        <span style={{ color: tone, fontWeight: 600 }}>{run.status}</span>
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const rootStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "var(--space-7)",
  background: "var(--bg)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: "var(--space-5)",
  gap: "var(--space-4)",
};
const h2Style: React.CSSProperties = { fontSize: "20px", fontWeight: 700, color: "var(--text)" };
const subStyle: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted)", maxWidth: "640px" };
const statBlockStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-4)",
};
const statItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
};
const statLabelStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const statValueStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};
const composerStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4) var(--space-5)",
  marginBottom: "var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};
const lanePickerStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  flexWrap: "wrap",
};
const laneChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid",
  fontSize: "11.5px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};
const laneDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
};
const laneCliBadgeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  color: "var(--text-dim)",
  background: "var(--bg)",
  padding: "1px 5px",
  borderRadius: "var(--radius-sm)",
};
const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "stretch",
};
const textareaStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3)",
  color: "var(--text)",
  fontFamily: "var(--font-sans)",
  fontSize: "12.5px",
  resize: "vertical",
  outline: "none",
};
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#0c0d10",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "0 22px",
  cursor: "pointer",
};
const hintRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
  marginBottom: "var(--space-5)",
};
const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-4) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const h3Style: React.CSSProperties = { fontSize: "13px", fontWeight: 600, color: "var(--text)" };
const mutedStyle: React.CSSProperties = { fontSize: "11px", color: "var(--text-dim)" };
const runsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: "var(--space-4)",
  padding: "var(--space-4) var(--space-5)",
};
const runCardStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3) var(--space-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};
const runHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const laneTagStyle: React.CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontFamily: "var(--font-mono)",
};
const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
};
const badgeDotStyle: React.CSSProperties = { width: "6px", height: "6px", borderRadius: "50%" };
const runTaskStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "var(--text)",
  fontWeight: 500,
  lineHeight: 1.4,
};
const logStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-2) var(--space-3)",
  fontFamily: "var(--font-mono)",
  fontSize: "10.5px",
  color: "var(--text-muted)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minHeight: "60px",
  maxHeight: "120px",
  overflow: "auto",
};
const logLineStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const runFootStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
};
const cancelBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: "10.5px",
  padding: "3px 10px",
  cursor: "pointer",
};
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column" };
const finishedRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const statusDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  flexShrink: 0,
};
const runTaskInlineStyle: React.CSSProperties = {
  fontSize: "12.5px",
  color: "var(--text)",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const lastLineStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  marginTop: "2px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const finishedMetaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
};
const emptyStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
  padding: "var(--space-7)",
};
const usageRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
};
const usageStatStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "4px",
};
const usageLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const usageValStyle: React.CSSProperties = {
  color: "var(--text)",
  fontWeight: 600,
};
const costPillStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  fontWeight: 600,
  color: "var(--accent)",
  background: "var(--accent-soft-translucent)",
  border: "1px solid rgba(167,139,250,0.3)",
  padding: "2px 8px",
  borderRadius: "var(--radius-sm)",
};
const previewTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text)",
  lineHeight: 1.5,
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-2) var(--space-3)",
  maxHeight: "120px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
const cursorBlinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: "2px",
  color: "var(--accent)",
  animation: "pulse 1s ease-in-out infinite",
};
const ghostMicroBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  fontSize: "10.5px",
  padding: "3px 10px",
  cursor: "pointer",
};
const lanePickerHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
};
const editLanesBtnStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-muted)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "6px 12px",
  cursor: "pointer",
  flexShrink: 0,
};
const ghostBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-muted)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 14px",
  cursor: "pointer",
};
const modalScrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-5)",
};
const modalStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  width: "min(720px, 100%)",
  maxHeight: "calc(100vh - 80px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "var(--space-5)",
  borderBottom: "1px solid var(--border)",
};
const modalCloseBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "16px",
  cursor: "pointer",
  width: "28px",
  height: "28px",
  borderRadius: "var(--radius-sm)",
};
const editorListStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: "var(--space-4) var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};
const editorRowStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3) var(--space-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
};
const editorRowTopStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  alignItems: "center",
};
const editorGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 1.4fr",
  gap: "var(--space-3)",
};
const editorInputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  color: "var(--text)",
  fontFamily: "var(--font-mono)",
  fontSize: "11.5px",
  outline: "none",
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "4px",
};
const fieldHintStyle: React.CSSProperties = {
  fontSize: "10.5px",
  color: "var(--text-dim)",
  marginTop: "3px",
};
const colorPickerRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  flexWrap: "wrap",
};
const colorSwatchStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  border: "1px solid var(--border)",
  cursor: "pointer",
  padding: 0,
};
const tinyBtnStyle: React.CSSProperties = {
  width: "26px",
  height: "26px",
  fontSize: "11px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-muted)",
  cursor: "pointer",
};
const modalFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-4) var(--space-5)",
  borderTop: "1px solid var(--border)",
};
