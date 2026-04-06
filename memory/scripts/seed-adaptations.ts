#!/usr/bin/env npx tsx
/**
 * Seed initial adaptations from known failures.
 * These are the first wheel turns — lessons already learned.
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

interface SeedAdaptation {
  trigger: string;
  rule: string;
  source: string;
  category: "defensive" | "auxiliary" | "offensive";
  severity: number;
  scope: string | null;
  tags: string[];
}

const seeds: SeedAdaptation[] = [
  // ── Defensive (immunity) ──────────────────────────────────────
  {
    trigger: "top-level await in tsx -e inline code",
    rule: 'NEVER use `npx tsx -e "..."` with top-level await. The CJS output format does not support it. Always create a separate .ts script file (e.g., memory/scripts/<name>.ts) and run with `npx tsx <file>`.',
    source:
      "Multiple failures: Transform failed with error 'Top-level await is currently not supported with the \"cjs\" output format'",
    category: "defensive",
    severity: 9,
    scope: null,
    tags: ["tsx", "top-level-await", "cjs", "defensive"],
  },
  {
    trigger: "identity extraction pulls Claude instructions as user preferences",
    rule: "Identity extraction regex catches things Claude SAID, not what the user PREFERS. Before saving an identity-extracted preference, verify: (1) the speaker is the user, not Claude, (2) it's a genuine preference, not a code instruction, (3) it makes sense as a personal preference (e.g., 'prefers dark mode' YES, 'prefers validate request bodies' NO).",
    source:
      "144 of 148 identity-extracted preferences were garbage — Claude's own instructions saved as user preferences",
    category: "defensive",
    severity: 8,
    scope: null,
    tags: ["identity", "preference", "extraction", "defensive"],
  },
  {
    trigger: "auto-save creates noise memories from every file edit",
    rule: "Auto-save must have a quality gate. Only save memories for: (1) bash errors with exit code != 0, (2) schema/migration/config changes, (3) new file creation. NEVER save 'Modified X' for routine edits — git blame does this better.",
    source: "2000+ noise memories like 'Modified Button.tsx' had to be bulk-archived",
    category: "defensive",
    severity: 8,
    scope: "ai-agents/ultrathink",
    tags: ["auto-save", "noise", "quality-gate", "defensive"],
  },
  {
    trigger: "neon serverless client has no unsafe() method",
    rule: "The @neondatabase/serverless `neon()` client only supports tagged template literals (sql`...`). It does NOT have `.unsafe()`, `.query()`, or raw SQL string execution. Always use tagged templates. For dynamic SQL, create separate tagged template calls per statement.",
    source: "TypeError: sql.unsafe is not a function — neon serverless vs postgres.js API confusion",
    category: "defensive",
    severity: 7,
    scope: null,
    tags: ["neon", "sql", "api", "defensive"],
  },

  // ── Auxiliary (perception) ────────────────────────────────────
  {
    trigger: "Übersicht widget event types and updateState API",
    rule: "Übersicht command output events have NO `type` property — they just have `event.output` and `event.error` directly. Custom events dispatched via `dispatch({type: 'SET_TAB', tab: id})` DO have a type. In `updateState`: check `event.type` for custom events first, then handle command output as the default case (check `event.output !== undefined`).",
    source:
      "Widget stuck at loading because updateState checked for event.type === 'UB/COMMAND_RAN' which never matched",
    category: "auxiliary",
    severity: 7,
    scope: null,
    tags: ["ubersicht", "widget", "event-api", "auxiliary"],
  },
  {
    trigger: "Übersicht render function receives state object not destructured props",
    rule: "Übersicht `render` signature with `updateState` is `render(state, dispatch)` where state is the FULL state object (including custom keys like tab). NOT `render({output, error}, dispatch)`. The dispatch parameter is a function, not an object — `dispatch.state` does not exist.",
    source: "Widget crashed because render destructured ({output, error}, dispatch) but received full state object",
    category: "auxiliary",
    severity: 6,
    scope: null,
    tags: ["ubersicht", "render", "api", "auxiliary"],
  },
  {
    trigger: "reading a directory path as a file",
    rule: "Before using the Read tool on a path, verify it's a file not a directory. If the path has no file extension or you're unsure, use `ls` first. Error: EISDIR means you tried to read a directory.",
    source: "Tool 'Read' failed: EISDIR: illegal operation on a directory",
    category: "auxiliary",
    severity: 5,
    scope: null,
    tags: ["read", "eisdir", "directory", "auxiliary"],
  },
  {
    trigger: "gh repo view --json with unsupported fields",
    rule: "The GitHub CLI `gh repo view --json` only supports specific fields. Check available fields with `gh repo view --help` or omit unsupported ones. Common unsupported: `topics`. Use `gh api repos/{owner}/{repo}/topics` instead.",
    source: "Unknown JSON field: 'topics' — gh repo view volcengine/OpenViking --json name,description,topics",
    category: "auxiliary",
    severity: 4,
    scope: null,
    tags: ["github-cli", "gh", "json-fields", "auxiliary"],
  },

  // ── Offensive (approach change) ───────────────────────────────
  {
    trigger: "plainto_tsquery misses expanded synonym queries",
    rule: "Use `to_tsquery('english', expandedQuery)` with OR-separated terms (word1 | word2 | synonym) instead of `plainto_tsquery`. plainto_tsquery treats all words as AND which misses synonym matches. The expandQuery() function in enrich.ts generates the right format.",
    source: "Search missed semantically related memories because plainto_tsquery required ALL terms to match",
    category: "offensive",
    severity: 6,
    scope: "ai-agents/ultrathink",
    tags: ["search", "tsvector", "tsquery", "offensive"],
  },
  {
    trigger: "API rate limiting on frequent polling",
    rule: "When polling external APIs (e.g., Anthropic usage API), always implement cache fallback. Write successful responses to a cache file (e.g., /tmp/ultrathink-status/<api>.json), read from cache when API returns error. Both CLI statusline and widget should share the same cache.",
    source: "Anthropic usage API rate-limited the widget which polled every 30 seconds",
    category: "offensive",
    severity: 6,
    scope: null,
    tags: ["api", "rate-limit", "cache", "offensive"],
  },
  {
    trigger: "user correction: CLI should not show Vietnam time",
    rule: "Vietnam time reset labels belong in the Übersicht desktop widget ONLY, not in the CLI statusline. The CLI statusline shows: identity, model, session %, 5hr %, weekly %, memory count, cost, project. Skills on line 2.",
    source: "User feedback: 'the time we dont have vnese time, only in cli'",
    category: "offensive",
    severity: 7,
    scope: "ai-agents/ultrathink",
    tags: ["user-correction", "cli", "widget", "statusline"],
  },
  {
    trigger: "user correction: stat cards in widget should show API usage not session time",
    rule: "Widget hero stat cards show: sessions count, 5hr % LEFT (from Anthropic API), weekly % LEFT (from Anthropic API), new memories. NOT '2h 59m ACTIVE / 8 today' — the user explicitly removed active time display.",
    source: "User feedback: '2h 59m ACTIVE / 8 today not needed'",
    category: "offensive",
    severity: 6,
    scope: "ai-agents/ultrathink",
    tags: ["user-correction", "widget", "stat-cards"],
  },
];

console.log("Seeding Tekiō — Cycle of Nova — Initial Adaptations");
console.log("=================================================\n");

let created = 0;
for (const seed of seeds) {
  // Check if similar adaptation already exists
  const existing = await sql`
    SELECT id FROM adaptations
    WHERE similarity(trigger_pattern, ${seed.trigger}) > 0.5
    LIMIT 1
  `;

  if ((existing as any[]).length > 0) {
    console.log(`⊘ Already exists: ${seed.trigger.slice(0, 60)}...`);
    continue;
  }

  await sql`
    INSERT INTO adaptations (trigger_pattern, adaptation_rule, source_failure, category, severity, scope, tags)
    VALUES (${seed.trigger}, ${seed.rule}, ${seed.source}, ${seed.category}, ${seed.severity}, ${seed.scope}, ${seed.tags})
  `;
  console.log(`☸ ${seed.category.padEnd(10)} ${seed.trigger.slice(0, 60)}`);
  created++;
}

console.log(`\nSeeded ${created} adaptations. The wheel has turned ${seeds.length} times.`);

const [stats] = (await sql`
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE category = 'defensive') as def,
    COUNT(*) FILTER (WHERE category = 'auxiliary') as aux,
    COUNT(*) FILTER (WHERE category = 'offensive') as off
  FROM adaptations WHERE is_active = true
`) as any[];
console.log(
  `\n☸ Tekiō: ${stats.total} adaptations forged (${stats.def} defensive, ${stats.aux} auxiliary, ${stats.off} offensive)`
);
process.exit(0);
