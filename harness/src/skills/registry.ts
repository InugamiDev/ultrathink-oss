// intent: thin loader for the UltraThink skill registry.
// status: done
// confidence: high

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type SkillLayer = "orchestrator" | "hub" | "utility" | "domain";

export type SkillEntry = {
  name: string;
  description: string;
  layer: SkillLayer;
  category: string;
  triggers?: string[];
  actions?: string[];
  linksTo?: string[];
  linkedFrom?: string[];
};

export type Registry = {
  skillCount?: number;
  skills: SkillEntry[];
};

let cache: Registry | null = null;

function candidatePaths(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  // harness/src/skills → harness/src → harness → ultrathink
  const root = join(here, "..", "..", "..");
  return [
    join(root, ".claude", "skills", "_registry.json"),
    join(process.cwd(), ".claude", "skills", "_registry.json"),
  ];
}

export function loadRegistry(): Registry {
  if (cache) return cache;
  for (const p of candidatePaths()) {
    if (existsSync(p)) {
      cache = JSON.parse(readFileSync(p, "utf8")) as Registry;
      return cache;
    }
  }
  cache = { skills: [] };
  return cache;
}

export function getSkill(name: string): SkillEntry | undefined {
  return loadRegistry().skills.find((s) => s.name === name);
}

export function skillsByLayer(layer: SkillLayer): SkillEntry[] {
  return loadRegistry().skills.filter((s) => s.layer === layer);
}
