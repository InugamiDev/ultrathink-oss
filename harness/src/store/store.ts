// intent: reactive store backed by useSyncExternalStore — single source of truth
//         for the UI. Mutations happen here; workers dispatch via actions or the bus.
// status: done
// confidence: high

import { useSyncExternalStore } from "react";
import type { AppMode, AppScreen, LogEntry, RunState, WorkerInfo } from "./types.js";
import type { ProviderKind } from "../providers/types.js";

type Snapshot = {
  run: RunState | null;
  mode: AppMode;
  screen: AppScreen;
  providerKind: ProviderKind;
};
type Listener = () => void;

class Store {
  private listeners = new Set<Listener>();
  private _run: RunState | null = null;
  private _mode: AppMode = "guided";
  private _screen: AppScreen = "picker";
  private _providerKind: ProviderKind = "stub";
  private _snapshot: Snapshot = { run: null, mode: "guided", screen: "picker", providerKind: "stub" };

  get state(): Snapshot {
    return this._snapshot;
  }

  setMode(mode: AppMode) {
    this._mode = mode;
    this.rebuild();
  }

  setScreen(screen: AppScreen) {
    this._screen = screen;
    this.rebuild();
  }

  setProviderKind(kind: ProviderKind) {
    this._providerKind = kind;
    this.rebuild();
  }

  setRun(run: RunState) {
    this._run = run;
    this.rebuild();
  }

  patchRun(fn: (r: RunState) => RunState) {
    if (!this._run) return;
    this._run = { ...fn(this._run), updatedAt: new Date().toISOString() };
    this.rebuild();
  }

  upsertWorker(w: WorkerInfo) {
    this.patchRun((r) => {
      const idx = r.workers.findIndex((x) => x.id === w.id);
      const workers = idx >= 0 ? r.workers.map((x, i) => (i === idx ? { ...x, ...w } : x)) : [...r.workers, w];
      return { ...r, workers };
    });
  }

  log(entry: Omit<LogEntry, "at">) {
    this.patchRun((r) => ({
      ...r,
      log: [...r.log.slice(-299), { at: Date.now(), ...entry }],
    }));
  }

  subscribe = (cb: Listener) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private rebuild() {
    this._snapshot = {
      run: this._run,
      mode: this._mode,
      screen: this._screen,
      providerKind: this._providerKind,
    };
    for (const l of this.listeners) l();
  }
}

export const store = new Store();

export function useStore(): Snapshot {
  return useSyncExternalStore(
    store.subscribe,
    () => store.state,
    () => store.state
  );
}
