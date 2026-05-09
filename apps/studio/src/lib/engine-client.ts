// intent: typed bridge from React → Tauri commands → Node engine sidecar
// status: done (basic surface; expand as new commands land)
// next: pause/cancel session, list memory recalls, deploy adapter calls
// confidence: high

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { EngineEvent, ProjectInfo, StartSessionRequest } from "../types.js";

/**
 * Start a new turn against the engine. Resolves with a session id; events arrive
 * via subscribeToSession() as they stream from the underlying claude spawn.
 */
export async function startSession(req: StartSessionRequest): Promise<{
  sessionId: string;
  projectDir: string;
}> {
  return invoke<{ sessionId: string; projectDir: string }>("start_session", {
    req,
  });
}

/**
 * Subscribe to all events for a given session. Returns the unlisten fn; call
 * before re-subscribing or unmount to avoid leaks.
 */
export async function subscribeToSession(sessionId: string, onEvent: (ev: EngineEvent) => void): Promise<UnlistenFn> {
  return listen<EngineEvent>(`engine:event:${sessionId}`, (e) => {
    onEvent(e.payload);
  });
}

/** Send a follow-up prompt to an active session. */
export async function sendMessage(sessionId: string, prompt: string): Promise<void> {
  await invoke("send_message", { sessionId, prompt });
}

/** Stop / abort an active session. */
export async function stopSession(sessionId: string): Promise<void> {
  await invoke("stop_session", { sessionId });
}

/** List Studio projects under ~/Studio/projects/. */
export async function listProjects(): Promise<ProjectInfo[]> {
  return invoke<ProjectInfo[]>("list_projects");
}
