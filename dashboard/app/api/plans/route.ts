import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PLANS_DIR = join(homedir(), ".claude", "plans");

interface PlanFile {
  id: string;
  title: string;
  status: "active" | "completed" | "draft";
  summary: string;
  phases: { heading: string; completed: boolean }[];
  phaseCount: number;
  completedPhases: number;
  file_path: string;
  created_at: string;
  content: string;
}

function inferStatus(content: string): "active" | "completed" | "draft" {
  const lower = content.toLowerCase();

  // Check for explicit status markers
  const statusMatch = lower.match(/\*\*status\*\*\s*:\s*([^\n*]+)/);
  if (statusMatch) {
    const val = statusMatch[1].trim().toLowerCase();
    if (val.includes("complete") || val.includes("done") || val.includes("finished")) return "completed";
    if (val.includes("draft") || val.includes("planning") || val.includes("proposed")) return "draft";
    if (val.includes("active") || val.includes("progress") || val.includes("ready") || val.includes("implementation"))
      return "active";
  }

  // Heuristic: many checked boxes = completed
  const checked = (content.match(/- \[x\]/gi) || []).length;
  const unchecked = (content.match(/- \[ \]/g) || []).length;
  const total = checked + unchecked;

  if (total > 0) {
    const ratio = checked / total;
    if (ratio >= 0.9) return "completed";
    if (ratio > 0.1) return "active";
  }

  // Check for completion language
  if (lower.includes("all phases complete") || lower.includes("plan completed")) return "completed";
  if (lower.includes("## phase") || lower.includes("## step")) return "active";

  return "draft";
}

function extractPhases(content: string): { heading: string; completed: boolean }[] {
  const phases: { heading: string; completed: boolean }[] = [];

  // Match ## headings that look like phases, steps, stages, or numbered sections
  const headingRegex = /^##\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const heading = match[1].trim();
    // Skip non-phase headings like "Context", "Overview", etc.
    const skipPatterns =
      /^(context|overview|background|summary|notes|references|appendix|what exists|exploration|why)/i;
    if (skipPatterns.test(heading)) continue;

    // Determine if phase appears completed by looking at checkboxes in that section
    const headingPos = match.index;
    const nextHeadingMatch = content.slice(headingPos + match[0].length).match(/^##\s+/m);
    const sectionEnd = nextHeadingMatch
      ? headingPos + match[0].length + (nextHeadingMatch.index ?? content.length)
      : content.length;
    const section = content.slice(headingPos, sectionEnd);

    const sectionChecked = (section.match(/- \[x\]/gi) || []).length;
    const sectionUnchecked = (section.match(/- \[ \]/g) || []).length;
    const sectionTotal = sectionChecked + sectionUnchecked;

    const completed = sectionTotal > 0 ? sectionChecked / sectionTotal >= 0.9 : false;

    phases.push({ heading, completed });
  }

  return phases;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Plan";
}

function extractSummary(content: string): string {
  // Take the first non-heading, non-empty paragraph after the title
  const lines = content.split("\n");
  let pastTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (trimmed.startsWith("# ")) pastTitle = true;
      continue;
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("---") || trimmed.startsWith("**Status")) continue;
    // Return first meaningful paragraph, truncated
    return trimmed.slice(0, 200);
  }
  return "";
}

function parsePlanFile(filePath: string, fileName: string): PlanFile | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const stat = statSync(filePath);
    const phases = extractPhases(content);
    const completedPhases = phases.filter((p) => p.completed).length;

    return {
      id: fileName.replace(/\.md$/, ""),
      title: extractTitle(content),
      status: inferStatus(content),
      summary: extractSummary(content),
      phases,
      phaseCount: phases.length,
      completedPhases,
      file_path: filePath,
      created_at: stat.birthtime.toISOString(),
      content,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  // First try reading from the filesystem (plan .md files)
  if (existsSync(PLANS_DIR)) {
    try {
      const entries = readdirSync(PLANS_DIR)
        .filter((f) => f.endsWith(".md"))
        .sort();
      const plans: PlanFile[] = [];

      for (const file of entries) {
        const plan = parsePlanFile(join(PLANS_DIR, file), file);
        if (plan) {
          if (status && plan.status !== status) continue;
          plans.push(plan);
        }
      }

      // Sort by created date descending
      plans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return NextResponse.json({ plans, source: "filesystem" });
    } catch (err) {
      console.error("Error reading plans directory:", err);
    }
  }

  // Fallback to database if available
  if (process.env.DATABASE_URL) {
    try {
      const sql = getDb();

      const rows = status
        ? await sql`SELECT * FROM plans WHERE status = ${status} ORDER BY created_at DESC`
        : await sql`SELECT * FROM plans ORDER BY created_at DESC`;

      return NextResponse.json({ plans: rows, source: "database" });
    } catch (err) {
      console.error("Database error:", err);
    }
  }

  return NextResponse.json({ plans: [], source: "none" });
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { title, summary, file_path: filePath } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const sql = getDb();

    const planRows = (await sql`
      INSERT INTO plans (title, summary, file_path)
      VALUES (${title}, ${summary ?? null}, ${filePath ?? null})
      RETURNING *
    `) as Record<string, unknown>[];
    const plan = planRows[0];

    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
