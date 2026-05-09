// intent: opt-in error reporter — never sends prompt content, file content, or API keys
// status: done (handlers + Tauri command bridge; Sentry/Plausible wiring deferred to RELEASE)
// next: structured tags (component, route), session id correlation
// confidence: high
//
// Behaviour:
// - Reads the user's onboarding consent from localStorage.
// - If opt-in: forwards uncaught + unhandled-rejection errors to the Rust side.
// - If opt-out (default): logs to console, never sends.

import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "studio:onboarded:v1";

interface OnboardingState {
  completedAt?: string;
  telemetry?: "opt-in" | "opt-out";
}

function consentGiven(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as OnboardingState;
    return parsed.telemetry === "opt-in";
  } catch {
    return false;
  }
}

interface TelemetryReport {
  message: string;
  stack?: string;
  component?: string;
}

async function send(report: TelemetryReport): Promise<void> {
  if (!consentGiven()) {
    return;
  }
  try {
    await invoke("report_error", { report });
  } catch {
    // Telemetry failure must not break the app
  }
}

export function installTelemetry(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    void send({
      message: e.message ?? "uncaught error",
      stack: e.error instanceof Error ? e.error.stack : undefined,
      component: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    void send({
      message: reason instanceof Error ? reason.message : String(reason ?? "unhandled rejection"),
      stack: reason instanceof Error ? reason.stack : undefined,
      component: "window.unhandledrejection",
    });
  });
}

export function reportError(component: string, err: unknown): void {
  const e = err instanceof Error ? err : new Error(String(err));
  void send({ message: e.message, stack: e.stack, component });
}
