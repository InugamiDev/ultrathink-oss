import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const checks: Record<string, { status: string; detail: string }> = {};

  // Check skill registry
  try {
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const registryPath = join(process.cwd(), "../.claude/skills/_registry.json");
    checks.skillRegistry = {
      status: existsSync(registryPath) ? "ok" : "degraded",
      detail: existsSync(registryPath) ? "Registry loaded" : "Registry file missing",
    };
  } catch {
    checks.skillRegistry = { status: "error", detail: "Cannot access skill registry" };
  }

  // Check database
  try {
    if (process.env.DATABASE_URL) {
      const sql = getDb();
      await sql`SELECT 1`;
      checks.database = { status: "ok", detail: "Connected" };
    } else {
      checks.database = { status: "degraded", detail: "DATABASE_URL not configured" };
    }
  } catch (err) {
    console.error("Health check DB error:", err);
    checks.database = { status: "error", detail: "Connection failed" };
  }

  // Check hooks
  try {
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const hooksDir = join(process.cwd(), "../.claude/hooks");
    const hookFiles = ["privacy-hook.sh", "memory-auto-save.sh", "format-check.sh", "notify.sh"];
    const existing = hookFiles.filter((f) => existsSync(join(hooksDir, f)));
    checks.hooks = {
      status: existing.length === hookFiles.length ? "ok" : "degraded",
      detail: `${existing.length}/${hookFiles.length} hooks present`,
    };
  } catch {
    checks.hooks = { status: "error", detail: "Cannot access hooks directory" };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "ok")
    ? "healthy"
    : Object.values(checks).some((c) => c.status === "error")
      ? "unhealthy"
      : "degraded";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
}
