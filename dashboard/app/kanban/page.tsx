"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: string;
  board: string;
  labels?: string[];
  created_at?: string;
}

type Column = "backlog" | "planned" | "in-progress" | "blocked" | "review" | "done";
const COLUMNS: Column[] = ["backlog", "planned", "in-progress", "blocked", "review", "done"];

const columnColors: Record<Column, string> = {
  backlog: "border-t-slate-500",
  planned: "border-t-blue-500",
  "in-progress": "border-t-amber-500",
  blocked: "border-t-red-500",
  review: "border-t-purple-500",
  done: "border-t-green-500",
};

const priorityColors: Record<number, string> = {
  9: "text-red-400",
  8: "text-amber-400",
  7: "text-yellow-400",
  6: "text-blue-400",
  5: "text-slate-400",
  4: "text-slate-500",
  3: "text-slate-600",
};

export default function KanbanPage() {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState(5);
  const [filterPriority, setFilterPriority] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/kanban?board=main")
      .then((res) => {
        if (!res.ok) throw new Error("Not connected");
        return res.json();
      })
      .then((data) => {
        setIsLive(true);
        if (data.tasks?.length > 0) {
          setTasks(data.tasks);
        }
      })
      .catch((err) => console.warn("[kanban]", err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredTasks = filterPriority ? tasks.filter((t) => t.priority >= filterPriority) : tasks;

  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col] = filteredTasks.filter((t) => t.status === col);
      return acc;
    },
    {} as Record<Column, Task[]>
  );

  const addTask = useCallback(() => {
    if (newTitle.trim().length === 0) return;
    const task: Task = {
      id: `new-${Date.now()}`,
      title: newTitle.trim(),
      priority: newPriority,
      status: "backlog",
      board: "main",
    };
    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
    setShowNewTask(false);
    addToast({ type: "success", title: "Task added", description: task.title, duration: 3000 });

    if (isLive) {
      const tempId = task.id;
      fetch("/api/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.task?.id) {
            setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: data.task.id } : t)));
          }
        })
        .catch(() => {
          addToast({
            type: "error",
            title: "Failed to save task",
            description: "Task saved locally only",
            duration: 4000,
          });
        });
    }
  }, [newTitle, newPriority, isLive, addToast]);

  const handleDrop = useCallback(
    (column: Column) => {
      if (!dragging) return;
      const previousTasks = [...tasks];
      setTasks((prev) => prev.map((t) => (t.id === dragging ? { ...t, status: column } : t)));

      // Persist to API if live
      if (isLive) {
        fetch("/api/kanban", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dragging, status: column }),
        }).catch(() => {
          setTasks(previousTasks);
          addToast({
            type: "error",
            title: "Failed to save status change",
            description: "Change has been reverted",
            duration: 4000,
          });
        });
      }
      setDragging(null);
    },
    [dragging, isLive, addToast, tasks]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">Board: main</p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${isLive ? "text-green-400 border-green-500/20 bg-green-500/10" : "text-amber-400 border-amber-500/20 bg-amber-500/10"}`}
          >
            {loading ? "..." : isLive ? "Live" : "Demo"}
          </span>
          <span className="text-xs text-[var(--color-text-dim)]">{tasks.length} tasks</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterPriority ?? ""}
            onChange={(e) => setFilterPriority(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            <option value="">All priorities</option>
            <option value="9">P9+ (Critical)</option>
            <option value="7">P7+ (High)</option>
            <option value="5">P5+ (Medium)</option>
          </select>
          <button
            onClick={() => setShowNewTask((prev) => !prev)}
            className="px-6 py-2 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium
                       hover:opacity-90 transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-[var(--color-text-muted)] mb-2">Task Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="What needs to be done?"
                className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-base text-[var(--color-text)]
                           placeholder:text-[var(--color-text-dim)] outline-none
                           focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-2">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                className="px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)]
                           focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                {[9, 8, 7, 6, 5, 4, 3].map((p) => (
                  <option key={p} value={p}>
                    P{p}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addTask}
              className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium
                         hover:opacity-90 transition-all duration-200 motion-reduce:transition-none
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              Add to Backlog
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className={`p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] border-t-2 ${columnColors[col]} text-center`}
          >
            <p className="text-xl font-bold text-[var(--color-text)]">{tasksByColumn[col].length}</p>
            <p className="text-xs text-[var(--color-text-dim)] capitalize mt-1">{col.replace("-", " ")}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[36rem]">
        {COLUMNS.map((col) => (
          <div
            key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col)}
            className={`rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-t-2 ${columnColors[col]} shadow-sm flex flex-col`}
          >
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h4 className="text-sm font-medium capitalize text-[var(--color-text-muted)]">{col.replace("-", " ")}</h4>
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-dim)]">
                {tasksByColumn[col].length}
              </span>
            </div>
            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              {tasksByColumn[col].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                  className={`p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]
                             hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none
                             cursor-grab active:cursor-grabbing
                             ${dragging === task.id ? "opacity-50" : ""}`}
                >
                  <p className="text-sm font-medium text-[var(--color-text)]">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-[var(--color-text-dim)] mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {(task.labels ?? []).map((label) => (
                        <span
                          key={label}
                          className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg)] text-[var(--color-text-dim)]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <span className={`text-xs font-mono ${priorityColors[task.priority] ?? "text-slate-400"}`}>
                      P{task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
