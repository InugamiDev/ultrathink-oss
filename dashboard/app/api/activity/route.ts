import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";

const HOOK_LOG_DIR = "/tmp/ultrathink-hook-logs";
const MEMORY_DIR = "/tmp/ultrathink-memories";
const SCREENSHOTS_DIR = "/tmp/ultrathink-screenshots";

interface ActivityItem {
  id: string;
  type: "hook" | "memory" | "test" | "session";
  title: string;
  detail: string;
  timestamp: string;
  status: "success" | "error" | "info";
}

export async function GET() {
  const items: ActivityItem[] = [];

  // Gather hook log entries
  if (existsSync(HOOK_LOG_DIR)) {
    const files = readdirSync(HOOK_LOG_DIR)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .slice(-3);

    for (const file of files) {
      try {
        const raw = readFileSync(`${HOOK_LOG_DIR}/${file}`, "utf-8");
        const lines = raw.split("\n").filter(Boolean).slice(-30);
        for (let i = 0; i < lines.length; i++) {
          try {
            const entry = JSON.parse(lines[i]);
            items.push({
              id: `hook-${file}-${i}-${entry.ts}-${entry.hook}`,
              type: "hook",
              title: `Hook: ${entry.hook}`,
              detail: entry.detail || (entry.duration_ms ? `${entry.duration_ms}ms` : entry.status),
              timestamp: entry.ts,
              status: entry.status === "error" ? "error" : "success",
            });
          } catch {
            // skip
          }
        }
      } catch {
        // skip
      }
    }
  }

  // Gather memory writes
  if (existsSync(MEMORY_DIR)) {
    const files = readdirSync(MEMORY_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(-20);

    for (const file of files) {
      try {
        const raw = readFileSync(`${MEMORY_DIR}/${file}`, "utf-8");
        const data = JSON.parse(raw);
        items.push({
          id: `mem-${file}`,
          type: "memory",
          title: "Memory Written",
          detail: (data.content || "").slice(0, 100),
          timestamp: data.timestamp || file.slice(0, 19).replace(/-/g, ":"),
          status: "info",
        });
      } catch {
        // skip
      }
    }
  }

  // Gather test results
  if (existsSync(SCREENSHOTS_DIR)) {
    const files = readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(-10);

    for (const file of files) {
      try {
        const raw = readFileSync(`${SCREENSHOTS_DIR}/${file}`, "utf-8");
        const data = JSON.parse(raw);
        items.push({
          id: `test-${file}`,
          type: "test",
          title: `Test: ${data.page || "unknown"}`,
          detail: `${data.viewport || "desktop"} — ${data.status || "pass"}`,
          timestamp: data.timestamp || new Date().toISOString(),
          status: data.status === "fail" ? "error" : "success",
        });
      } catch {
        // skip
      }
    }
  }

  // Sort by timestamp descending
  items.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  return NextResponse.json({
    items: items.slice(0, 50),
    total: items.length,
    sources: {
      hooks: existsSync(HOOK_LOG_DIR),
      memories: existsSync(MEMORY_DIR),
      tests: existsSync(SCREENSHOTS_DIR),
    },
  });
}
