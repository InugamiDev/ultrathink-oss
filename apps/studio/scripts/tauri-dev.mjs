#!/usr/bin/env node
// intent: launch `tauri dev` and forward args; --debug sets VITE_STUDIO_DEBUG=1
//          so the debug terminal mounts on first paint.
// status: done
// next: nothing — launcher is intentionally tiny

import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const debug = args.includes("--debug");
const passthrough = args.filter((a) => a !== "--debug");

const env = { ...process.env };
if (debug) {
  env.VITE_STUDIO_DEBUG = "1";
  env.RUST_LOG = env.RUST_LOG || "ultrathink_studio=debug,tauri=info";
  process.stderr.write("[studio] debug mode ON (Cmd+Shift+D toggles terminal)\n");
}

const child = spawn("tauri", ["dev", ...passthrough], {
  stdio: "inherit",
  env,
  shell: false,
});
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  process.stderr.write(`[studio] launcher failed: ${err.message}\n`);
  process.exit(1);
});
