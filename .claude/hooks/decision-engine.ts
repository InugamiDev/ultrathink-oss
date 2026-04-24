/**
 * decision-engine.ts — ThinkBetter-style decision framework injection for UltraThink.
 *
 * When the user's prompt looks like a decision, comparison, or complex reasoning task:
 *   1. BM25-scores the prompt against a library of McKinsey-grade frameworks
 *   2. Detects cognitive biases in the prompt
 *   3. Returns context to inject into Claude's additionalContext
 *
 * Called by: prompt-analyzer.ts
 */

// ─── Framework Library ───────────────────────────────────────────────

export interface Framework {
  id: string;
  name: string;
  shortName: string;
  /** One-line explanation injected into the prompt */
  instruction: string;
  /** Decision type label for output */
  decisionType: string;
  /** BM25 keywords (weighted higher = more specific) */
  keywords: string[];
  /** Keywords that lower the score */
  antiKeywords: string[];
  /** When to use this framework */
  useCases: string[];
}

const FRAMEWORKS: Framework[] = [
  {
    id: "hypothesis-decision-tree",
    name: "Hypothesis-Driven Decision Tree",
    shortName: "Hypothesis Tree",
    decisionType: "Binary Choice",
    instruction:
      "State your hypothesis for each option. Test each hypothesis against data before scoring. Identify which assumption, if wrong, would flip your decision. Build the decision tree top-down: root = decision, branches = options, leaves = outcomes with probabilities.",
    keywords: [
      "should i",
      "or should",
      "vs",
      "versus",
      "choose between",
      "decide",
      "option",
      "alternative",
      "either",
      "stay",
      "leave",
      "switch",
      "quit",
      "take",
      "accept",
      "reject",
    ],
    antiKeywords: ["how to", "implement", "build", "code", "debug", "fix"],
    useCases: ["binary choices", "career decisions", "yes/no decisions", "job offers", "partnership decisions"],
  },
  {
    id: "weighted-matrix",
    name: "Weighted Evaluation Matrix",
    shortName: "Weighted Matrix",
    decisionType: "Multi-Criteria Decision",
    instruction:
      "List all options as columns. Define criteria as rows with explicit weights (must sum to 100%). Score each option 1-5 per criterion. Multiply score × weight. Sum columns to get weighted totals. The option with highest weighted total wins — but surface the criteria weights for validation first.",
    keywords: [
      "compare",
      "comparison",
      "options",
      "criteria",
      "tradeoff",
      "trade-off",
      "evaluate",
      "weigh",
      "pick",
      "select",
      "best",
      "which one",
      "framework",
      "stack",
      "tool",
      "technology",
      "vendor",
      "platform",
    ],
    antiKeywords: ["how to implement", "step by step", "tutorial", "fix bug"],
    useCases: ["tech stack selection", "vendor evaluation", "multi-criteria choices", "product decisions"],
  },
  {
    id: "mece",
    name: "MECE Framework",
    shortName: "MECE",
    decisionType: "Problem Decomposition",
    instruction:
      "Decompose the problem into buckets that are Mutually Exclusive (no overlap) and Collectively Exhaustive (cover all cases). Each bucket must be independently actionable. Use MECE to structure your analysis before recommending. Check: do the buckets cover 100% of the problem space? Do any buckets overlap?",
    keywords: [
      "break down",
      "structure",
      "categorize",
      "organize",
      "framework",
      "approach",
      "solve",
      "analyze",
      "analysis",
      "diagnose",
      "understand",
      "root cause",
      "map out",
      "areas",
      "dimensions",
    ],
    antiKeywords: ["implementation", "deploy", "ship", "launch"],
    useCases: ["problem structuring", "consulting frameworks", "root cause analysis", "strategy"],
  },
  {
    id: "issue-tree",
    name: "Issue Tree / Logic Tree",
    shortName: "Issue Tree",
    decisionType: "Root Cause Analysis",
    instruction:
      "Build a logic tree: the issue at the top, then 3-5 mutually exclusive hypotheses as branches, then evidence/data that supports or refutes each. Work hypothesis-first: state the most likely cause BEFORE looking at data to avoid confirmation bias. Eliminate branches with evidence. Follow the surviving branch down to actionable root causes.",
    keywords: [
      "why",
      "root cause",
      "not working",
      "problem",
      "issue",
      "causing",
      "failing",
      "slow",
      "broken",
      "bad",
      "wrong",
      "low",
      "declining",
      "dropping",
      "poor performance",
      "investigate",
    ],
    antiKeywords: ["how to build", "feature request", "add functionality"],
    useCases: ["debugging systems", "performance issues", "business problems", "incident analysis"],
  },
  {
    id: "pre-mortem",
    name: "Pre-Mortem Analysis",
    shortName: "Pre-Mortem",
    decisionType: "Risk Assessment",
    instruction:
      "Assume the plan has already FAILED spectacularly. It's 12 months from now and everything went wrong. Work backwards: What happened? List the top 5 failure modes in order of likelihood. For each failure mode: (1) How likely is it 1-10? (2) How severe is it 1-10? (3) What's the mitigation? Only proceed if expected value (avoiding failure) > cost of mitigation.",
    keywords: [
      "risk",
      "risks",
      "failure",
      "fail",
      "go wrong",
      "concerns",
      "worried",
      "plan",
      "launch",
      "release",
      "ship",
      "deploy",
      "project",
      "strategy",
      "initiative",
      "rollout",
    ],
    antiKeywords: ["already failed", "post mortem", "retrospective"],
    useCases: ["project planning", "launch planning", "strategy validation", "risk identification"],
  },
  {
    id: "second-order",
    name: "Second-Order Thinking",
    shortName: "Second-Order",
    decisionType: "Consequence Mapping",
    instruction:
      "For each option, ask 'And then what?' at least 3 levels deep. First-order effects are obvious. Second and third-order effects are where the real consequences live. Map: Action → First-order consequence → Second-order consequence → Third-order consequence. Optimize for third-order outcomes, not first-order feels.",
    keywords: [
      "consequences",
      "impact",
      "effect",
      "long term",
      "short term",
      "downstream",
      "ripple",
      "future",
      "what happens if",
      "what if",
      "implications",
      "second order",
      "unintended",
    ],
    antiKeywords: ["implement", "build", "code", "install"],
    useCases: ["strategic decisions", "policy decisions", "architectural decisions", "major changes"],
  },
  {
    id: "inversion",
    name: "Inversion Thinking",
    shortName: "Inversion",
    decisionType: "Negative Visualization",
    instruction:
      "Instead of asking 'How do I succeed?' ask 'What would guarantee failure?' List every way this could go catastrophically wrong. Now invert: avoid those failure modes = your success strategy. The goal is not to be clever — it is to not be stupid. Identify the 3 things that, if avoided, give you 80% of the win.",
    keywords: [
      "how to succeed",
      "how to win",
      "best approach",
      "strategy",
      "goal",
      "achieve",
      "accomplish",
      "make work",
      "ensure",
      "guarantee",
    ],
    antiKeywords: ["debug", "fix bug", "error", "exception"],
    useCases: ["strategy", "goal-setting", "problem-solving", "avoiding mistakes"],
  },
  {
    id: "opportunity-cost",
    name: "Opportunity Cost Analysis",
    shortName: "Opportunity Cost",
    decisionType: "Resource Allocation",
    instruction:
      "Every choice is also a rejection of alternatives. For each option: list the top 3 alternatives you're giving up by choosing it. Assign value to what you're NOT getting. The true cost = direct cost + opportunity cost. Factor in: time (what else could this time be spent on?), capital, attention, and optionality (does this close or open future doors?).",
    keywords: [
      "time",
      "resource",
      "invest",
      "spend",
      "cost",
      "budget",
      "allocation",
      "priority",
      "priorities",
      "focus",
      "attention",
      "worth it",
      "valuable",
      "roi",
      "return",
    ],
    antiKeywords: ["syntax", "bug", "error", "implement", "build"],
    useCases: ["resource allocation", "time management", "investment decisions", "prioritization"],
  },
  {
    id: "jobs-to-be-done",
    name: "Jobs-to-be-Done",
    shortName: "JTBD",
    decisionType: "User/Customer Decision",
    instruction:
      "Define the Job: 'When [situation], I want to [motivation], so I can [outcome].' The 'job' is the progress the user is trying to make — not the feature. Separate: Functional job (what they're trying to do), Emotional job (how they want to feel), Social job (how they want to be perceived). Design for the job, not the assumed solution.",
    keywords: [
      "user",
      "customer",
      "product",
      "feature",
      "build for",
      "what do users",
      "user needs",
      "user want",
      "product decision",
      "market",
      "audience",
      "target",
    ],
    antiKeywords: ["database", "backend", "infrastructure", "performance optimization"],
    useCases: ["product decisions", "feature prioritization", "market positioning", "UX decisions"],
  },
  {
    id: "regret-minimization",
    name: "Regret Minimization Framework",
    shortName: "Regret Minimization",
    decisionType: "Life/Career Decision",
    instruction:
      "Project to age 80. Looking back at this moment: which choice would you regret NOT making? Regret from inaction compounds over decades; regret from action fades quickly. Ask: 'Is this a one-way door or a two-way door?' Two-way doors (reversible decisions) → optimize for learning speed. One-way doors (irreversible) → slow down and think hard. Regret the missed shot, not the attempt.",
    keywords: [
      "career",
      "life",
      "regret",
      "opportunity",
      "chance",
      "dream",
      "passion",
      "calling",
      "path",
      "direction",
      "meaningful",
      "purpose",
      "fulfilling",
      "job offer",
      "startup",
      "risk worth taking",
    ],
    antiKeywords: ["code", "implement", "architecture", "database"],
    useCases: ["career decisions", "life choices", "major pivots", "risk-taking decisions"],
  },
  {
    id: "rice-scoring",
    name: "RICE Scoring",
    shortName: "RICE",
    decisionType: "Feature/Task Prioritization",
    instruction:
      "Score each option on: Reach (how many users/units affected in a time period), Impact (how much does it move the metric 0.25/0.5/1/2/3), Confidence (% certain about estimates: 80/50/20), Effort (person-months). RICE Score = (Reach × Impact × Confidence) / Effort. Rank by RICE score. Surface low-effort, high-impact items first.",
    keywords: [
      "prioritize",
      "priority",
      "backlog",
      "roadmap",
      "what to build",
      "what to work on",
      "next",
      "order",
      "sequence",
      "ranking",
      "importance",
      "effort",
      "impact",
      "feature",
    ],
    antiKeywords: ["how to implement", "technical approach", "architecture"],
    useCases: ["feature prioritization", "backlog grooming", "roadmap planning", "sprint planning"],
  },
  {
    id: "five-whys",
    name: "5 Whys",
    shortName: "5 Whys",
    decisionType: "Root Cause Analysis",
    instruction:
      "Ask 'Why?' five times, each time drilling one level deeper. The first answer is a symptom; the fifth is usually the root cause. Stop when you reach something actionable and within your control to fix. Watch for: (1) branching causes — each why may have multiple answers; (2) organizational vs. technical causes — usually both are present; (3) the real fix is often to the process, not the symptom.",
    keywords: [
      "why is",
      "why does",
      "why did",
      "why isn't",
      "why won't",
      "why can't",
      "cause",
      "because",
      "reason",
      "what caused",
      "what's causing",
      "happening",
      "occurring",
    ],
    antiKeywords: ["how to build", "implementation", "feature request"],
    useCases: ["incident analysis", "debugging processes", "understanding failures", "quality problems"],
  },
];

// ─── Bias Library ────────────────────────────────────────────────────

export interface Bias {
  name: string;
  warning: string;
  remedy: string;
}

interface BiasPattern {
  patterns: RegExp[];
  bias: Bias;
}

const BIAS_PATTERNS: BiasPattern[] = [
  {
    patterns: [
      /\b(stay|keep|remain|current|existing|same|status quo|don'?t change|not change)\b/i,
      /\b(already|been doing|used to|familiar with|comfortable with)\b/i,
    ],
    bias: {
      name: "Status Quo Bias",
      warning: "Your current situation receives an unfair cognitive advantage in this comparison.",
      remedy:
        "Calculate the literal cost of inaction over a 1-year horizon. Make the default option compete on equal terms.",
    },
  },
  {
    patterns: [
      /\b(already (invested|spent|put in)|sunk|past (investment|effort|time|money)|how much (i|we)'ve)\b/i,
      /\b(wasted if|lose what|throw away|abandon what|give up everything)\b/i,
    ],
    bias: {
      name: "Sunk Cost Fallacy",
      warning: "Past investment should have zero weight in a forward-looking decision.",
      remedy:
        "Pretend you're starting fresh today. If you had neither option but could choose one now, which would you pick?",
    },
  },
  {
    patterns: [
      /\b(am i right|was i right|good idea|right choice|correct|validate|confirm|makes sense right)\b/i,
      /\b(agree with me|back me up|support my|isn'?t it true|obviously|clearly the right)\b/i,
    ],
    bias: {
      name: "Confirmation Bias",
      warning: "You may be seeking validation rather than analysis. The question is framed to invite agreement.",
      remedy: "Steelman the opposing view first. What's the strongest argument AGAINST your current position?",
    },
  },
  {
    patterns: [
      /\b(everyone (is|does|uses|seems)|most people|all (my friends|companies)|industry (standard|norm)|everyone else)\b/i,
      /\b(popular|trending|hot right now|everyone switched|all the cool)\b/i,
    ],
    bias: {
      name: "Herd Mentality / Social Proof Bias",
      warning: "What's popular is not what's optimal for your specific situation.",
      remedy: "Define your constraints explicitly. Does this choice optimize for YOUR metrics, or for peer approval?",
    },
  },
  {
    patterns: [
      /\b(missing out|fomo|before it'?s too late|last chance|limited time|now or never|running out of time)\b/i,
      /\b(opportunity won'?t|window (is|is closing|closes|will close))\b/i,
    ],
    bias: {
      name: "FOMO / Scarcity Bias",
      warning: "Artificial urgency degrades decision quality. Real opportunities rarely disappear in 24 hours.",
      remedy: "Test the scarcity: What specifically happens if you wait 2 weeks to decide? Usually: nothing.",
    },
  },
  {
    patterns: [/\b(definitely|certainly|obviously|clearly|100%|no doubt|sure thing|guaranteed|can'?t fail)\b/i],
    bias: {
      name: "Overconfidence Bias",
      warning: "High-certainty language in uncertain domains is a red flag.",
      remedy: "Assign explicit probabilities. What would have to be true for your confident assumption to be wrong?",
    },
  },
  {
    patterns: [
      /\b(recently (saw|heard|read|experienced)|just (read|saw|heard)|after (watching|reading|seeing))\b/i,
      /\b(because (of that|that happened)|this (happened|made me)|following (the|a|that))\b/i,
    ],
    bias: {
      name: "Availability Heuristic",
      warning: "A recent event is making one scenario feel more likely than base rates justify.",
      remedy:
        "Look up the actual base rate for this outcome. Don't let a single vivid example distort your probability estimates.",
    },
  },
];

// ─── BM25 Scorer ─────────────────────────────────────────────────────

/** Simplified BM25 — scores each framework against the prompt */
function scoreFrameworks(promptLower: string, frameworks: Framework[]): Array<{ framework: Framework; score: number }> {
  const words = promptLower.split(/\s+/);
  const promptWordCount = words.length;

  const results: Array<{ framework: Framework; score: number }> = [];

  for (const fw of frameworks) {
    let score = 0;

    for (const keyword of fw.keywords) {
      const kw = keyword.toLowerCase();
      // BM25-style: multi-word phrases get higher weight
      const weight = kw.includes(" ") ? 3 : 1;
      if (promptLower.includes(kw)) {
        // Term frequency normalized by prompt length
        const tf = (promptLower.split(kw).length - 1) / Math.max(promptWordCount, 1);
        score += weight * (1 + tf * 10);
      }
    }

    for (const anti of fw.antiKeywords) {
      if (promptLower.includes(anti.toLowerCase())) {
        score -= 4;
      }
    }

    if (score > 0) {
      results.push({ framework: fw, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Bias Detector ───────────────────────────────────────────────────

function detectBiases(prompt: string): Bias[] {
  const found: Bias[] = [];

  for (const bp of BIAS_PATTERNS) {
    // A bias fires if ANY of its patterns matches
    const matched = bp.patterns.some((p) => p.test(prompt));
    if (matched) {
      found.push(bp.bias);
    }
  }

  return found;
}

// ─── Decision Prompt Detection ───────────────────────────────────────

const DECISION_SIGNALS = [
  /\bshould\s+i\b/i,
  /\bshould\s+we\b/i,
  /\bwhich\s+(should|is better|is best|would you|do you recommend)\b/i,
  /\bwhat'?s?\s+(the best|better|your|the right)\s+(way|approach|option|choice|decision|strategy)\b/i,
  /\b(choose|choosing|pick|picking)\s+between\b/i,
  /\bvs\.?\s+/i,
  /\b(option|alternative)\s+(a|b|1|2|one|two)\b/i,
  /\bhow\s+do\s+i\s+(decide|choose|evaluate|prioritize)\b/i,
  /\bcompare\b/i,
  /\btradeoff|trade-off\b/i,
  /\bwhat\s+would\s+you\s+(do|recommend|suggest|advise)\b/i,
  /\bhelp\s+me\s+(decide|choose|think through|evaluate)\b/i,
  /\bpros?\s+(and|&)\s+cons?\b/i,
  /\bdilemma\b/i,
  /\b(risk|risks)\s+(of|involved|associated)\b/i,
  /\bprioritiz/i,
  /\broot\s+cause\b/i,
  /\bwhy\s+(is|does|did|isn'?t|won'?t|can'?t|are|were)\b/i,
];

export function isDecisionPrompt(prompt: string): boolean {
  return DECISION_SIGNALS.some((r) => r.test(prompt));
}

// ─── Main Export ─────────────────────────────────────────────────────

export interface DecisionContext {
  framework: Framework | null;
  alternativeFramework: Framework | null;
  biases: Bias[];
  context: string;
}

export function buildDecisionContext(prompt: string): DecisionContext | null {
  if (!isDecisionPrompt(prompt)) return null;

  const promptLower = prompt.toLowerCase();
  const scored = scoreFrameworks(promptLower, FRAMEWORKS);
  const biases = detectBiases(prompt);

  const top = scored[0]?.framework ?? null;
  const alt = scored[1]?.framework ?? null;

  if (!top && biases.length === 0) return null;

  const lines: string[] = [];

  // Framework injection — compact: just name + type + alt
  if (top) {
    const altStr = alt ? ` | alt: ${alt.shortName}` : "";
    lines.push(`Decision: use **${top.name}** (${top.decisionType})${altStr}.`);
  }

  // Bias warnings — one line each
  if (biases.length > 0) {
    const biasNames = biases.map((b) => `⚠ ${b.name}`).join(", ");
    lines.push(`Bias detected: ${biasNames} — acknowledge before analysis.`);
  }

  // Mandatory output format — single line
  if (top) {
    lines.push(`Format: state framework → list biases → apply step-by-step → recommendation + confidence %.`);
  }

  return {
    framework: top,
    alternativeFramework: alt,
    biases,
    context: lines.join("\n"),
  };
}
