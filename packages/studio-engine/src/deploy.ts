// intent: deploy a project via the user's installed CLI (Vercel / Cloudflare / Netlify)
// status: scaffolded (Vercel + Cloudflare + Netlify happy paths; auth detection lives in CLI)
// next: surface auth-not-configured prompts, support Github push for static sites
// confidence: medium — depends on user's chosen CLI being authenticated
//
// CLI surface:
//   node deploy.js detect <projectDir>       → { framework, suggested: "vercel"|"cloudflare"|"netlify" }
//   node deploy.js run    <projectDir> <kind> → streams JSON events; final {kind:"deploy-done", url}

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface DetectResult {
  framework: "next" | "remix" | "astro" | "vite" | "react" | "svelte" | "static" | "unknown";
  suggested: "vercel" | "cloudflare" | "netlify" | null;
  packageManager: "pnpm" | "npm" | "yarn" | "bun";
}

function detectFramework(projectDir: string): DetectResult {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) {
    return { framework: "static", suggested: "cloudflare", packageManager: "npm" };
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
      packageManager?: string;
    };
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    let framework: DetectResult["framework"] = "unknown";
    if (deps.next) framework = "next";
    else if (deps["@remix-run/react"]) framework = "remix";
    else if (deps.astro) framework = "astro";
    else if (deps.vite && deps.svelte) framework = "svelte";
    else if (deps.vite) framework = "vite";
    else if (deps.react) framework = "react";
    else framework = "static";

    const suggested =
      framework === "next" || framework === "remix"
        ? "vercel"
        : framework === "astro" || framework === "svelte" || framework === "vite"
          ? "cloudflare"
          : "netlify";

    let packageManager: DetectResult["packageManager"] = "npm";
    if (pkg.packageManager?.startsWith("pnpm")) packageManager = "pnpm";
    else if (pkg.packageManager?.startsWith("yarn")) packageManager = "yarn";
    else if (pkg.packageManager?.startsWith("bun")) packageManager = "bun";
    else if (existsSync(join(projectDir, "pnpm-lock.yaml"))) packageManager = "pnpm";
    else if (existsSync(join(projectDir, "yarn.lock"))) packageManager = "yarn";
    else if (existsSync(join(projectDir, "bun.lockb"))) packageManager = "bun";

    return { framework, suggested, packageManager };
  } catch {
    return { framework: "unknown", suggested: null, packageManager: "npm" };
  }
}

function emit(event: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}

interface DeployRunOptions {
  projectDir: string;
  kind: "vercel" | "cloudflare" | "netlify";
}

function runDeploy(opts: DeployRunOptions): void {
  const { projectDir, kind } = opts;
  let cmd: string;
  let args: string[];
  switch (kind) {
    case "vercel":
      cmd = "vercel";
      args = ["--prod", "--yes", "--cwd", projectDir];
      break;
    case "cloudflare":
      cmd = "wrangler";
      args = ["pages", "deploy", "--commit-dirty=true", projectDir];
      break;
    case "netlify":
      cmd = "netlify";
      args = ["deploy", "--prod", "--dir", projectDir];
      break;
  }

  emit({ kind: "deploy-started", provider: kind, command: `${cmd} ${args.join(" ")}` });

  const child = spawn(cmd, args, { cwd: projectDir, stdio: ["ignore", "pipe", "pipe"] });

  let stdoutBuf = "";
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stdoutBuf += chunk;
    // Parse provider-specific URL when it appears
    const url = extractUrl(stdoutBuf);
    if (url && !urlEmitted) {
      urlEmitted = true;
      emit({ kind: "deploy-url", url });
    }
    emit({ kind: "deploy-stdout", chunk });
  });

  let urlEmitted = false;
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    emit({ kind: "deploy-stderr", chunk });
  });

  child.on("error", (err) => {
    emit({
      kind: "deploy-error",
      message: err.message,
      hint:
        kind === "vercel"
          ? "Install Vercel CLI: `npm i -g vercel` then `vercel login`"
          : kind === "cloudflare"
            ? "Install Wrangler: `npm i -g wrangler` then `wrangler login`"
            : "Install Netlify CLI: `npm i -g netlify-cli` then `netlify login`",
    });
  });

  child.on("close", (code) => {
    const url = extractUrl(stdoutBuf);
    emit({ kind: "deploy-done", exitCode: code, url: url ?? null, provider: kind });
  });
}

function extractUrl(text: string): string | null {
  // Match the first deployment URL across providers
  const patterns = [
    /https:\/\/[a-z0-9-]+\.vercel\.app[^\s]*/i,
    /https:\/\/[a-z0-9-]+\.pages\.dev[^\s]*/i,
    /https:\/\/[a-z0-9-]+\.netlify\.app[^\s]*/i,
    /https:\/\/[a-z0-9-]+\.workers\.dev[^\s]*/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

const op = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

if (op === "detect" && arg1) {
  process.stdout.write(JSON.stringify(detectFramework(arg1)) + "\n");
} else if (op === "run" && arg1 && arg2) {
  runDeploy({
    projectDir: arg1,
    kind: arg2 as "vercel" | "cloudflare" | "netlify",
  });
} else {
  process.stderr.write(
    "deploy: usage `node deploy.js detect <dir>` or `node deploy.js run <dir> <vercel|cloudflare|netlify>`\n"
  );
  process.exit(2);
}
