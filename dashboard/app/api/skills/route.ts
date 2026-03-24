import { NextRequest, NextResponse } from "next/server";
import { getSkillRegistry, invalidateCache } from "@/lib/skills";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const registry = getSkillRegistry();
    return NextResponse.json(registry);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface CreateSkillBody {
  name: string;
  description: string;
  layer: string;
  category: string;
  triggers: string[];
  linksTo: string[];
  linkedFrom: string[];
  riskLevel: string;
  content: string;
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const VALID_LAYERS = ["orchestrator", "hub", "utility", "domain"];
const VALID_RISK = ["low", "medium", "high"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateSkillBody;

    // --- Validation ---
    const errors: string[] = [];

    if (!body.name || typeof body.name !== "string") {
      errors.push("name is required");
    } else if (!NAME_RE.test(body.name) || body.name.length > 64) {
      errors.push("name must be lowercase alphanumeric with hyphens, max 64 chars");
    }

    if (!body.description || typeof body.description !== "string") {
      errors.push("description is required");
    } else if (body.description.length > 1024) {
      errors.push("description must be 1024 chars or fewer");
    }

    if (!VALID_LAYERS.includes(body.layer)) {
      errors.push(`layer must be one of: ${VALID_LAYERS.join(", ")}`);
    }

    if (!body.category || typeof body.category !== "string") {
      errors.push("category is required");
    }

    if (!VALID_RISK.includes(body.riskLevel)) {
      errors.push(`riskLevel must be one of: ${VALID_RISK.join(", ")}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    }

    // Check if skill already exists
    const skillsDir = join(process.cwd(), "../.claude/skills");
    const skillDir = join(skillsDir, body.name);

    if (existsSync(skillDir)) {
      return NextResponse.json({ error: `Skill "${body.name}" already exists` }, { status: 409 });
    }

    // --- Build SKILL.md ---
    const triggers = body.triggers?.filter(Boolean) ?? [];
    const linksTo = body.linksTo?.filter(Boolean) ?? [];
    const linkedFrom = body.linkedFrom?.filter(Boolean) ?? [];

    let frontmatter = `---\nname: ${body.name}\n`;
    frontmatter += `description: ${body.description}\n`;
    frontmatter += `layer: ${body.layer}\n`;
    frontmatter += `category: ${body.category}\n`;

    if (triggers.length > 0) {
      frontmatter += `triggers:\n`;
      for (const t of triggers) {
        frontmatter += `  - "${t}"\n`;
      }
    } else {
      frontmatter += `triggers: []\n`;
    }

    if (linksTo.length > 0) {
      frontmatter += `linksTo:\n`;
      for (const l of linksTo) {
        frontmatter += `  - ${l}\n`;
      }
    } else {
      frontmatter += `linksTo: []\n`;
    }

    if (linkedFrom.length > 0) {
      frontmatter += `linkedFrom:\n`;
      for (const l of linkedFrom) {
        frontmatter += `  - ${l}\n`;
      }
    } else {
      frontmatter += `linkedFrom: []\n`;
    }

    frontmatter += `riskLevel: ${body.riskLevel}\n`;
    frontmatter += `---\n`;

    const skillContent = body.content?.trim()
      ? `${frontmatter}\n${body.content.trim()}\n`
      : `${frontmatter}\n# ${body.name}\n\nTODO: Add skill documentation.\n`;

    // --- Write files ---
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), skillContent, "utf-8");

    // --- Update _registry.json ---
    const registryPath = join(skillsDir, "_registry.json");
    let registry: Record<string, unknown> = {};
    if (existsSync(registryPath)) {
      registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    }

    registry[body.name] = {
      name: body.name,
      description: body.description,
      layer: body.layer,
      category: body.category,
      triggers,
      linksTo,
      linkedFrom,
      riskLevel: body.riskLevel,
      path: `skills/${body.name}/SKILL.md`,
    };

    writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf-8");

    // Invalidate in-memory cache so next GET reflects the new skill
    invalidateCache();

    const created = {
      name: body.name,
      description: body.description,
      layer: body.layer,
      category: body.category,
      triggers,
      linksTo,
      linkedFrom,
      riskLevel: body.riskLevel,
    };

    return NextResponse.json({ skill: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/skills error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
