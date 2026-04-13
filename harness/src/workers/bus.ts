// intent: single event bus for worker ↔ UI communication.
// status: done
// next: add a transport adapter so workers in separate processes can connect
//       over a Unix socket instead of in-process EventEmitter.
// confidence: high

import { EventEmitter } from "node:events";
import type { Phase } from "../pipeline/phases.js";

export type WorkerEvent =
  | { type: "worker:start"; id: string; phase: Phase; skill?: string }
  | { type: "worker:action"; id: string; action: string }
  | { type: "worker:artifact"; id: string; path: string }
  | { type: "worker:log"; id: string; level: "info" | "warn" | "error"; message: string }
  | { type: "worker:done"; id: string; success: boolean; output?: unknown }
  | { type: "worker:error"; id: string; error: string };

class Bus extends EventEmitter {
  send(ev: WorkerEvent) {
    this.emit("event", ev);
    this.emit(ev.type, ev);
  }
}

export const bus = new Bus();
