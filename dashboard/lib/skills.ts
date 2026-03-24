import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";

export interface SkillMeta {
  name: string;
  description: string;
  layer: string;
  category: string;
  triggers: string[];
  linksTo: string[];
  linkedFrom: string[];
  riskLevel: string;
}

export interface SkillRegistry {
  skills: SkillMeta[];
  lastUpdated: string;
  layers?: Record<string, number>;
  skillCount?: number;
}

let cachedRegistry: SkillRegistry | null = null;
let cachedMtime: number = 0;

export function invalidateCache() {
  cachedRegistry = null;
  cachedMtime = 0;
}

export function getSkillRegistry(): SkillRegistry {
  const registryPath = join(process.cwd(), "../.claude/skills/_registry.json");

  // In development, invalidate cache when registry file changes
  if (cachedRegistry && process.env.NODE_ENV === "development") {
    try {
      const mtime = statSync(registryPath).mtimeMs;
      if (mtime !== cachedMtime) {
        cachedRegistry = null;
      }
    } catch {
      /* use cache */
    }
  }

  if (cachedRegistry) return cachedRegistry;

  if (existsSync(registryPath)) {
    const raw = readFileSync(registryPath, "utf-8");
    const parsed = JSON.parse(raw);

    // Registry can be either { skills: [...] } or a flat { "name": { ... } } map
    if (Array.isArray(parsed.skills)) {
      cachedRegistry = parsed as SkillRegistry;
    } else {
      // Flat map format — convert to SkillRegistry
      const skills: SkillMeta[] = Object.values(parsed).map((entry: unknown) => {
        const e = entry as Record<string, unknown>;
        return {
          name: (e.name as string) || "",
          description: (e.description as string) || "",
          layer: (e.layer as string) || "",
          category: (e.category as string) || "",
          triggers: (e.triggers as string[]) || [],
          linksTo: (e.linksTo as string[]) || [],
          linkedFrom: (e.linkedFrom as string[]) || [],
          riskLevel: (e.riskLevel as string) || "low",
        };
      });
      cachedRegistry = { skills, lastUpdated: new Date().toISOString() };
    }

    try {
      cachedMtime = statSync(registryPath).mtimeMs;
    } catch {
      /* ignore */
    }
    return cachedRegistry;
  }

  // Fallback: scan skill directories
  const skillsDir = join(process.cwd(), "../.claude/skills");
  const skills: SkillMeta[] = [];

  if (existsSync(skillsDir)) {
    const dirs = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      const skillMdPath = join(skillsDir, dir, "SKILL.md");
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, "utf-8");
        const meta = parseSkillFrontmatter(content);
        if (meta) skills.push(meta);
      }
    }
  }

  cachedRegistry = { skills, lastUpdated: new Date().toISOString() };
  return cachedRegistry;
}

function parseSkillFrontmatter(content: string): SkillMeta | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const get = (key: string): string => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  };

  const getArray = (key: string): string[] => {
    const lineMatch = yaml.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)]`, "m"));
    if (lineMatch) {
      return lineMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    // Check for multi-line array
    const lines: string[] = [];
    const regex = new RegExp(`^${key}:\\s*$`, "m");
    if (regex.test(yaml)) {
      const afterKey = yaml.split(regex)[1];
      const itemLines = afterKey.split("\n");
      for (const line of itemLines) {
        const item = line.match(/^\s+-\s+"?(.+?)"?\s*$/);
        if (item) lines.push(item[1]);
        else if (line.match(/^\S/)) break;
      }
    }
    return lines;
  };

  return {
    name: get("name"),
    description: get("description"),
    layer: get("layer"),
    category: get("category"),
    triggers: getArray("triggers"),
    linksTo: getArray("linksTo"),
    linkedFrom: getArray("linkedFrom"),
    riskLevel: get("riskLevel") || "low",
  };
}
