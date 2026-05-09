#!/usr/bin/env node
// intent: detect a project's dev-server command + port, run it, surface readiness
// status: scaffolded (covers next/vite/astro/remix/static; works for the common case)
// next: per-framework health probe rather than first-port-match
// confidence: medium — port heuristics work most of the time
//
// CLI:
//   node preview-server.js start <projectDir>     → streams JSON: starting, port-detected, ready, exit
//   node preview-server.js detect <projectDir>    → one-shot {framework, devCommand, defaultPort}

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface DetectResult {
  framework: string;
  devCommand: { cmd: string; args: string[] };
  defaultPort: number;
  packageManager: "pnpm" | "npm" | "yarn" | "bun";
}

function detect(projectDir: string): DetectResult {
  const pkgPath = join(projectDir, "package.json");
  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    packageManager?: string;
  } = {};
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      /* ignore */
    }
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  let pm: DetectResult["packageManager"] = "npm";
  if (pkg.packageManager?.startsWith("pnpm")) pm = "pnpm";
  else if (pkg.packageManager?.startsWith("yarn")) pm = "yarn";
  else if (pkg.packageManager?.startsWith("bun")) pm = "bun";
  else if (existsSync(join(projectDir, "pnpm-lock.yaml"))) pm = "pnpm";
  else if (existsSync(join(projectDir, "yarn.lock"))) pm = "yarn";
  else if (existsSync(join(projectDir, "bun.lockb"))) pm = "bun";

  let framework = "unknown";
  let defaultPort = 3000;
  let devScript = "dev";

  if (deps.next) {
    framework = "next";
    defaultPort = 3000;
  } else if (deps.astro) {
    framework = "astro";
    defaultPort = 4321;
  } else if (deps["@remix-run/react"]) {
    framework = "remix";
    defaultPort = 3000;
  } else if (deps.vite) {
    framework = "vite";
    defaultPort = 5173;
  } else if (deps["react-scripts"]) {
    framework = "cra";
    defaultPort = 3000;
  } else if (existsSync(join(projectDir, "index.html"))) {
    framework = "static";
    // For pure static, we'll spin up a tiny HTTP server
  }

  // Prefer a `dev` script; fall back to `start`
  if (pkg.scripts?.dev) devScript = "dev";
  else if (pkg.scripts?.start) devScript = "start";

  const devCommand =
    framework === "static"
      ? {
          cmd: "npx",
          args: ["--yes", "serve", "-l", String(defaultPort), projectDir],
        }
      : { cmd: pm, args: ["run", devScript] };

  return { framework, devCommand, defaultPort, packageManager: pm };
}

function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}

function start(projectDir: string): void {
  const det = detect(projectDir);
  emit({ kind: "detected", ...det });

  const child = spawn(det.devCommand.cmd, det.devCommand.args, {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });

  let detectedPort: number | null = null;
  let readyEmitted = false;

  const trySurfacePort = (text: string): void => {
    if (detectedPort !== null) return;
    // Most dev servers print http://localhost:PORT. Extract the first one.
    const m = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i);
    if (m) {
      detectedPort = parseInt(m[1], 10);
      emit({ kind: "port-detected", port: detectedPort });
    } else if (/(ready|listening|started|local:|compiled successfully)/i.test(text)) {
      // No port surfaced but ready signal — fall back to default
      detectedPort = det.defaultPort;
      emit({ kind: "port-detected", port: detectedPort, fallback: true });
    }
    if (detectedPort !== null && !readyEmitted) {
      readyEmitted = true;
      emit({ kind: "ready", port: detectedPort });
    }
  };

  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    emit({ kind: "stdout", chunk });
    trySurfacePort(chunk);
  });

  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    emit({ kind: "stderr", chunk });
    trySurfacePort(chunk);
  });

  child.on("error", (err) => {
    emit({ kind: "error", message: err.message });
  });

  child.on("close", (code, signal) => {
    emit({ kind: "exit", exitCode: code, signal: signal ?? null });
  });

  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
}

const op = process.argv[2];
const dir = process.argv[3];

if (op === "detect" && dir) {
  process.stdout.write(JSON.stringify(detect(dir)) + "\n");
} else if (op === "start" && dir) {
  start(dir);
} else {
  process.stderr.write("preview-server: usage `node preview-server.js <detect|start> <projectDir>`\n");
  process.exit(2);
}
