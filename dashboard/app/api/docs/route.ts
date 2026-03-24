import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(process.cwd(), "content/docs");
const NAV_PATH = join(DOCS_DIR, "_nav.json");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  // Return navigation structure
  if (!slug) {
    if (!existsSync(NAV_PATH)) {
      return NextResponse.json({ error: "Nav not found" }, { status: 404 });
    }
    const nav = JSON.parse(readFileSync(NAV_PATH, "utf-8"));
    return NextResponse.json(nav);
  }

  // Return page content
  const filePath = join(DOCS_DIR, `${slug}.md`);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const raw = readFileSync(filePath, "utf-8");

  // Strip MDX frontmatter/imports (lines starting with import or ---)
  const lines = raw.split("\n");
  let content = raw;
  if (lines[0]?.trim() === "---") {
    const endIdx = lines.indexOf("---", 1);
    if (endIdx > 0) {
      content = lines.slice(endIdx + 1).join("\n");
    }
  }
  // Remove MDX import lines
  content = content
    .split("\n")
    .filter((l) => !l.startsWith("import "))
    .join("\n")
    .trim();

  return NextResponse.json({ content, slug });
}
