import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import * as os from "os";
import { getSkillRegistry } from "@/lib/skills";

interface HookInfo {
  name: string;
  type: string;
  file: string;
  description: string;
  sizeBytes: number;
}

function getHookType(name: string): string {
  if (name.startsWith("prompt-")) return "UserPromptSubmit";
  if (name.startsWith("memory-session-start")) return "SessionStart";
  if (name.startsWith("memory-session-end")) return "Stop";
  if (name.startsWith("pre-compact")) return "PreCompact";
  if (name === "privacy-hook.sh") return "PreToolUse";
  if (name === "format-check.sh" || name === "memory-auto-save.sh") return "PostToolUse";
  if (name === "tool-failure-log.sh") return "PostToolUseFailure";
  if (name === "statusline.sh") return "Notification";
  if (name.startsWith("notify") || name.startsWith("desktop-notify")) return "Notification";
  if (name === "hook-log.sh") return "Utility";
  return "Unknown";
}

function getHookDescription(content: string): string {
  const lines = content.split("\n").slice(0, 5);
  for (const line of lines) {
    if (line.startsWith("#") && !line.startsWith("#!")) {
      return line.replace(/^#+\s*/, "").trim();
    }
  }
  return "";
}

export async function GET() {
  try {
    const projectRoot = join(process.cwd(), "..");
    const claudeDir = join(projectRoot, ".claude");

    // --- System Info ---
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf-8")) : { version: "unknown" };

    const systemInfo = {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      osRelease: os.release(),
      dashboardVersion: pkg.version ?? "1.0.0",
      uptime: Math.floor(os.uptime()),
      totalMemoryGB: +(os.totalmem() / 1073741824).toFixed(1),
      freeMemoryGB: +(os.freemem() / 1073741824).toFixed(1),
    };

    // --- Hook Configuration ---
    const hooksDir = join(claudeDir, "hooks");
    const hooks: HookInfo[] = [];

    if (existsSync(hooksDir)) {
      const files = readdirSync(hooksDir).filter((f) => f.endsWith(".sh") || f.endsWith(".ts"));
      for (const file of files) {
        const filePath = join(hooksDir, file);
        const stat = statSync(filePath);
        const content = readFileSync(filePath, "utf-8");
        hooks.push({
          name: file.replace(/\.(sh|ts)$/, ""),
          type: getHookType(file),
          file,
          description: getHookDescription(content),
          sizeBytes: stat.size,
        });
      }
    }

    // --- Config ---
    const ckPath = join(claudeDir, "ck.json");
    const config = existsSync(ckPath) ? JSON.parse(readFileSync(ckPath, "utf-8")) : {};

    // --- Skills Overview ---
    const registry = getSkillRegistry();
    const skills = registry.skills ?? [];
    const layerCounts: Record<string, number> = {};
    const connectionCounts: { name: string; connections: number }[] = [];

    for (const s of skills) {
      layerCounts[s.layer] = (layerCounts[s.layer] || 0) + 1;
      const total = (s.linksTo?.length ?? 0) + (s.linkedFrom?.length ?? 0);
      connectionCounts.push({ name: s.name, connections: total });
    }

    connectionCounts.sort((a, b) => b.connections - a.connections);

    const skillsOverview = {
      total: skills.length,
      layerCounts,
      mostConnected: connectionCounts.slice(0, 8),
      lastUpdated: registry.lastUpdated ?? null,
    };

    // --- Environment Variables (names only) ---
    const envKeys = [
      "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
      "DATABASE_URL",
      "ANTHROPIC_API_KEY",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "DISCORD_WEBHOOK_URL",
      "SLACK_WEBHOOK_URL",
      "NODE_ENV",
      "NEXT_PUBLIC_BASE_URL",
    ];

    const environment = envKeys.map((key) => ({
      name: key,
      isSet: !!process.env[key],
      isSecret: [
        "DATABASE_URL",
        "ANTHROPIC_API_KEY",
        "TELEGRAM_BOT_TOKEN",
        "DISCORD_WEBHOOK_URL",
        "SLACK_WEBHOOK_URL",
      ].includes(key),
    }));

    // --- Memory DB status ---
    let memoryStatus: { connected: boolean; memoriesCount?: number; relationsCount?: number } = {
      connected: false,
    };

    if (process.env.DATABASE_URL) {
      try {
        const sql = getDb();
        const [memRows, relRows] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM memories WHERE is_archived = false`,
          sql`SELECT COUNT(*) as count FROM memory_relations`,
        ]) as Record<string, unknown>[][];
        memoryStatus = {
          connected: true,
          memoriesCount: Number(memRows[0]?.count),
          relationsCount: Number(relRows[0]?.count),
        };
      } catch {
        memoryStatus = { connected: false };
      }
    }

    return NextResponse.json({
      systemInfo,
      hooks,
      config,
      skillsOverview,
      environment,
      memoryStatus,
    });
  } catch (err) {
    console.error("Settings API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
