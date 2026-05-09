// intent: pick top-N UltraThink skills for a given prompt, build the appended system prompt
// status: done (works against existing prompt-analyzer + skill registry)
// next: cache analyzer warm-start to shave ~300ms/spawn
// confidence: high
//
// Mirrors the heartbeat-skill-router.sh logic but as in-process Node code so the
// engine can route skills without shelling out. Reads the canonical skill registry
// at .claude/skills/_registry.json and shells out to the prebuilt prompt-analyzer.

import { spawn as spawnProcess } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";

import type { SkillRouterDecision } from "./types.js";

interface SkillEntry {
  name: string;
  description?: string;
  layer?: string;
  triggers?: string[];
  linksTo?: string[];
}

interface SkillRegistry {
  skills?: SkillEntry[];
}

/**
 * Static directive that teaches the agent how UltraThink memory + skill mesh
 * works. Always appended — independent of which skills get routed for the turn.
 * Shaped to match the actual `mcp__memory__memory_save` schema in
 * mcp/memory/src/index.ts (14 categories, 1-10 importance, auto-inferred wing).
 */
function buildPersistentDirective(skillCount: number, pickedNames: string[]): string {
  const linksHint = pickedNames.length
    ? ` The skills routed above each declare \`linksTo\` companions in the registry — load them too if their domain applies (e.g. nextjs → react, server-actions, suspense).`
    : "";
  return [
    `## You have full file-system access`,
    `This is an UltraThink Studio session, not a chat-only assistant. You have **Edit, Write, Bash, Read, Glob, Grep, LS** tools available, and \`--dangerously-skip-permissions\` is on — every edit is auto-applied without an approval prompt. The CWD is set to the user's project directory; \`mcp__vfs__\` and \`mcp__code-intel__\` MCPs are wired.`,
    `**Do the work directly.** Don't say "this session is read-only", don't ask "should I create the files?", don't list "what I'd do if I had write access". When the user says "build me X", scaffold the files and run the build. If you hit a real failure, surface the failure — but never refuse on permission grounds.`,
    ``,
    `## UltraThink mesh — ${skillCount} skills available`,
    `Auto-routed skills (if any) are listed below. Browse the full library at \`.claude/skills/\` or query \`.claude/skills/_registry.json\` directly.${linksHint}`,
    ``,
    `## Memory — write to the graph, not disk`,
    `For findings worth keeping past this turn, call \`mcp__memory__memory_save\`. Pick the right category — wing is auto-inferred:`,
    ``,
    `| When you learn… | category | importance |`,
    `|---|---|---|`,
    `| Who the user is (role, team, identity) | identity | 9-10 |`,
    `| User-stated style preference (formatting, naming, etc.) | style-preference | 7-9 |`,
    `| Tool the user wants you to use / avoid | tool-preference | 7-9 |`,
    `| Workflow the user prefers (PR cadence, review style) | workflow-pattern | 6-8 |`,
    `| General preference that doesn't fit above | preference | 6-8 |`,
    `| What this project is — goals, constraints, stakeholders | project-context | 7-9 |`,
    `| Architecture / framework / library decision | architecture | 8-9 |`,
    `| Smaller decision (file layout, lib pick) | decision | 7-9 |`,
    `| Recurring solution worth re-using | pattern | 6-8 |`,
    `| Specific problem solved (with the fix) | solution | 5-7 |`,
    `| Non-obvious finding from inspection / research | insight | 6-8 |`,
    `| User corrected your approach | correction-log | 8 (never repeat) |`,
    `| New domain knowledge absorbed | learning | 5-7 |`,
    `| Wrap-up of a session | session-summary | 4-6 |`,
    ``,
    `Required: \`title\` (5-80 chars), \`content\` (20-4000 chars), \`category\`.`,
    `Optional: \`tags\`, \`importance\` (default 5), \`confidence\` (0-1, default 0.8). **Always set \`scope\` to the active project's basename** (last path segment of the cwd, e.g. \`acomo\` for \`/Users/.../Studio/projects/acomo\`) so the Studio Memory tab can filter to this project.`,
    ``,
    `**Don't save**: tool output, raw file contents, intermediate reasoning, low-signal observations. Quality > quantity.`,
    `**Don't write** to \`~/.claude/projects/<dir>/memory/*.md\` for durable items — that's the per-conversation cache and never shows in the dashboard graph. Use the MCP tool so it lands in Postgres + the knowledge graph.`,
    ``,
    `Related tools: \`mcp__memory__memory_search\` (find prior memories before deciding), \`mcp__memory__memory_link\` (Zettelkasten relations: learned-from / contradicts / supports / applies-to / caused-by / supersedes), \`mcp__memory__memory_recall\` (layered L0-L3 brain dump).`,
  ].join("\n");
}

interface AnalyzerResult {
  skills?: Array<{ name: string; score?: number }>;
}

export interface RouteOptions {
  /** Plain-English user prompt to score against. */
  prompt: string;

  /** Absolute path to UltraThink root (where .claude/skills/_registry.json lives). */
  ultrathinkRoot: string;

  /** Top-N to pick. 0 disables routing. Default 3. */
  topN?: number;

  /** Max ms to wait on the analyzer subprocess. Default 4000. */
  timeoutMs?: number;
}

/**
 * Resolve the top-N skills for this prompt and produce a markdown block to
 * append as system prompt. Returns an empty decision on any failure.
 */
export async function routeSkills(opts: RouteOptions): Promise<SkillRouterDecision> {
  const topN = opts.topN ?? 3;

  const registryJson = join(opts.ultrathinkRoot, ".claude/skills/_registry.json");
  const analyzerJs = join(opts.ultrathinkRoot, ".claude/hooks/dist/prompt-analyzer.js");

  let registry: SkillRegistry = {};
  if (existsSync(registryJson)) {
    try {
      registry = JSON.parse(readFileSync(registryJson, "utf8"));
    } catch {
      /* fall through with empty registry */
    }
  }
  const skillCount = registry.skills?.length ?? 0;

  // Always emit the persistent directive (memory + mesh awareness). The
  // top-N skill block stacks on top when routing succeeds.
  const baseline = buildPersistentDirective(skillCount, []);

  if (topN <= 0 || !existsSync(analyzerJs) || skillCount === 0) {
    return { picked: [], appendSystemPrompt: baseline };
  }

  const analyzerOut = await runAnalyzer(analyzerJs, opts.prompt, opts.timeoutMs ?? 4000);
  if (!analyzerOut?.skills?.length) {
    return { picked: [], appendSystemPrompt: baseline };
  }

  const skillByName = new Map<string, SkillEntry>();
  for (const skill of registry.skills ?? []) {
    if (skill.name) skillByName.set(skill.name, skill);
  }

  const picked = analyzerOut.skills.slice(0, topN).map((s) => {
    const entry = skillByName.get(s.name);
    return {
      name: s.name,
      score: s.score ?? 0,
      description: entry?.description ?? "",
      linksTo: entry?.linksTo ?? [],
    };
  });

  if (!picked.length) return { picked: [], appendSystemPrompt: baseline };

  const lines = picked.map((s) => {
    const desc = s.description.replace(/[\n\r]+/g, " ").slice(0, 140);
    const links = s.linksTo.length ? ` ↪ ${s.linksTo.slice(0, 4).join(", ")}` : "";
    return `- **${s.name}** (score ${s.score.toFixed(1)}) — ${desc}${links}`;
  });

  const skillBlock =
    `## Top ${picked.length} routed skills\n` + lines.join("\n") + `\nLoad via the Skill tool when triggers apply.`;

  // Re-emit the baseline with picked skill names so the linksTo hint can name
  // them concretely. Place skill block first (most actionable), directive after.
  const directiveWithPickedNames = buildPersistentDirective(
    skillCount,
    picked.map((p) => p.name)
  );

  return {
    picked: picked.map(({ name, score, description }) => ({ name, score, description })),
    appendSystemPrompt: `${skillBlock}\n\n${directiveWithPickedNames}`,
  };
}

function runAnalyzer(analyzerJs: string, prompt: string, timeoutMs: number): Promise<AnalyzerResult | null> {
  return new Promise((res) => {
    const proc = spawnProcess(process.execPath, [analyzerJs, prompt], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let resolved = false;

    const finish = (out: AnalyzerResult | null) => {
      if (resolved) return;
      resolved = true;
      try {
        proc.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      res(out);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    proc.on("error", () => finish(null));

    proc.on("close", () => {
      clearTimeout(timer);
      if (resolved) return;
      try {
        finish(JSON.parse(stdout));
      } catch {
        finish(null);
      }
    });
  });
}

/**
 * Resolve a project's UltraThink root by walking up looking for the skills
 * registry. Two subtleties:
 *   1. `~/.claude/skills/_registry.json` is a SYMLINK created by install.sh,
 *      pointing at the real workspace. If we naively return `~/.claude` as
 *      the root, the analyzer subprocess can't find `.claude/hooks/dist/`
 *      and the skill mesh silently dies.
 *   2. So when we hit a registry, we follow symlinks via realpath and check
 *      that the resolved location ALSO has `.claude/hooks/dist/prompt-analyzer.js`
 *      (the marker for a real workspace, not just an install symlink).
 */
export function findUltrathinkRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    const registryPath = join(dir, ".claude/skills/_registry.json");
    if (existsSync(registryPath)) {
      // 1. If registry is a symlink (install layout), follow it to the real
      //    workspace and return the workspace root if it has the analyzer.
      try {
        const real = realpathSync(registryPath);
        const workspace = real.replace(/\/\.claude\/skills\/_registry\.json$/, "");
        if (workspace && workspace !== real && existsSync(join(workspace, ".claude/hooks/dist/prompt-analyzer.js"))) {
          return workspace;
        }
      } catch {
        /* ignore — fall through to the dir-based check */
      }
      // 2. Direct hit: this dir IS a workspace root if the analyzer is here too.
      if (existsSync(join(dir, ".claude/hooks/dist/prompt-analyzer.js"))) return dir;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
}
