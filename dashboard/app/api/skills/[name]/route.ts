import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { resolve, sep } from "path";
import { getSkillRegistry } from "@/lib/skills";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  try {
    const registry = getSkillRegistry();
    const skill = registry.skills.find((s) => s.name === name);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Path traversal protection: resolve and verify it stays within skills dir
    const skillsBase = resolve(process.cwd(), "../.claude/skills");
    const skillMdPath = resolve(skillsBase, name, "SKILL.md");
    if (!skillMdPath.startsWith(skillsBase + sep)) {
      return NextResponse.json({ error: "Invalid skill name" }, { status: 400 });
    }
    let content = "";
    if (existsSync(skillMdPath)) {
      content = readFileSync(skillMdPath, "utf-8");
      // Strip YAML frontmatter
      const fmEnd = content.indexOf("---", content.indexOf("---") + 3);
      if (fmEnd !== -1) {
        content = content.slice(fmEnd + 3).trim();
      }
    }

    return NextResponse.json({ ...skill, content });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
