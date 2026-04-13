// intent: lightweight intent → skill matcher. Reuses keyword overlap on
//         name/description/triggers. Not as rich as prompt-analyzer but
//         fast and deterministic, which is what the harness needs.
// status: done
// next: bridge to .claude/hooks/dist/prompt-analyzer.js for the full scorer
//       once we can import it as an ESM module.
// confidence: medium

import { loadRegistry, type SkillEntry } from "./registry.js";

export type SkillMatch = {
  skill: SkillEntry;
  score: number;
  reason: string;
};

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "be", "of", "to", "for", "with", "in", "on",
  "and", "or", "i", "me", "my", "we", "our", "want", "need", "please", "that",
  "this", "it", "its", "by", "as", "at", "from", "can", "will", "should",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

export function scoreSkill(skill: SkillEntry, tokens: Set<string>): number {
  let score = 0;
  const name = skill.name.toLowerCase();
  const desc = skill.description.toLowerCase();
  const triggers = (skill.triggers ?? []).join(" ").toLowerCase();

  for (const t of tokens) {
    if (name.includes(t)) score += 5;
    if (triggers.includes(t)) score += 3;
    if (desc.includes(t)) score += 1;
  }

  // prefer orchestrators + hubs for intent-level matching
  if (skill.layer === "orchestrator") score += 2;
  if (skill.layer === "hub") score += 1;

  return score;
}

export function selectSkillsForIntent(intent: string, top = 5): SkillMatch[] {
  const tokens = tokenize(intent);
  const matches: SkillMatch[] = [];
  for (const s of loadRegistry().skills) {
    const sc = scoreSkill(s, tokens);
    if (sc > 0) matches.push({ skill: s, score: sc, reason: `${sc}pts` });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, top);
}

/**
 * Phase-biased selection — adds weight to skills that naturally belong to
 * a given phase (gsd for plan/validate, hubs for build, ship for ship).
 *
 * Also INJECTS the phase anchor if it's missing from the shortlist. This
 * guarantees that e.g. `gsd` leads the plan phase even if the user's intent
 * contains no tokens that would naturally score gsd.
 */
const PHASE_ANCHORS: Record<string, { skill: string; boost: number }[]> = {
  clarify: [{ skill: "forge", boost: 8 }],
  plan: [{ skill: "gsd", boost: 20 }],
  build: [{ skill: "gsd", boost: 10 }],
  validate: [{ skill: "gsd", boost: 15 }],
  ship: [{ skill: "ship", boost: 20 }, { skill: "gsd", boost: 8 }],
};

export function selectForPhase(intent: string, phase: string): SkillMatch[] {
  const shortlist = selectSkillsForIntent(intent, 12);
  const byName = new Map(shortlist.map((m) => [m.skill.name, m] as const));
  const reg = loadRegistry();

  // Inject anchors if missing.
  for (const anchor of PHASE_ANCHORS[phase] ?? []) {
    if (!byName.has(anchor.skill)) {
      const s = reg.skills.find((x) => x.name === anchor.skill);
      if (s) {
        byName.set(anchor.skill, {
          skill: s,
          score: anchor.boost,
          reason: `${anchor.boost}pts (phase anchor)`,
        });
      }
    }
  }

  // Apply bias to everything in the shortlist.
  const biased: SkillMatch[] = [];
  for (const m of byName.values()) {
    let b = m.score;
    for (const anchor of PHASE_ANCHORS[phase] ?? []) {
      if (m.skill.name === anchor.skill) b += anchor.boost;
    }
    if (phase === "build" && m.skill.layer === "hub") b += 3;
    biased.push({ ...m, score: b });
  }

  return biased.sort((a, b) => b.score - a.score).slice(0, 5);
}
