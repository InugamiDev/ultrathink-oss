---
name: reasoning-frameworks
description: "Unified McKinsey-grade reasoning toolkit — general problem-solving and root cause analysis, step-by-step sequential thinking, structured decision-making framework selection, MECE decomposition, Issue Tree / Logic Tree (hypothesis-driven RCA), Pre-Mortem Analysis (assume failure, work backwards), Weighted Evaluation Matrix (multi-criteria scoring). One skill, mode selects framework."
layer: utility
category: reasoning
triggers: ["/make-decision", "5 whys", "before we launch", "break this down", "categorize", "compare options", "compare solutions", "complex problem", "decision framework", "decision matrix", "decompose", "diagnose", "evaluate alternatives", "evaluate options", "exhaustive analysis", "failure modes", "help me choose", "help me decide", "help me think through", "how should I approach", "investigate why", "issue tree", "logic tree", "mece", "multi-step analysis", "mutually exclusive", "organize my thinking", "pre-mortem", "premortem", "pros and cons", "reason through this", "risk assessment", "risks of this plan", "root cause", "should i", "solve this problem", "structure the problem", "tech stack decision", "think step by step", "trade-off analysis", "tradeoff analysis", "vendor selection", "walk me through", "weighted matrix", "what could go wrong", "which framework", "which is better", "which tool", "why is this happening"]
---

# reasoning-frameworks

Unified McKinsey-grade reasoning toolkit — general problem-solving and root cause analysis, step-by-step sequential thinking, structured decision-making framework selection, MECE decomposition, Issue Tree / Logic Tree (hypothesis-driven RCA), Pre-Mortem Analysis (assume failure, work backwards), Weighted Evaluation Matrix (multi-criteria scoring). One skill, mode selects framework.


## Absorbs

- `problem-solving`
- `sequential-thinking`
- `make-decision`
- `mece`
- `issue-tree`
- `pre-mortem`
- `weighted-matrix`


---

## From `problem-solving`

> Structured problem decomposition frameworks including root cause analysis, decision matrices, and solution evaluation

# Problem Solving

## Purpose

This skill provides structured frameworks for decomposing problems, generating solutions, evaluating trade-offs, and making defensible decisions. It transforms vague "something is wrong" or "which should I pick" situations into systematic analyses with clear recommendations.

## Key Frameworks

### 1. Problem Decomposition (MECE)

Mutually Exclusive, Collectively Exhaustive — ensure you cover the entire problem space without overlap.

```
PROBLEM: [State the problem]

DIMENSION 1: [Category A]
  - Sub-problem A1
  - Sub-problem A2
DIMENSION 2: [Category B]
  - Sub-problem B1
  - Sub-problem B2
DIMENSION 3: [Category C]
  - Sub-problem C1

VERIFICATION:
  - Mutually Exclusive: No sub-problem appears in two categories? ✓
  - Collectively Exhaustive: All aspects of the problem covered? ✓
```

### 2. Five Whys (Root Cause Analysis)

Drill past symptoms to find the actual cause:

```
SYMPTOM: API response times increased 3x
WHY 1: Database queries are slow → Why?
WHY 2: Full table scans on the orders table → Why?
WHY 3: Missing index on customer_id column → Why?
WHY 4: Migration script was reverted during last deploy → Why?
WHY 5: CI pipeline doesn't verify index existence after migration
ROOT CAUSE: No post-migration validation in CI
FIX: Add migration verification step to CI pipeline
```

### 3. Decision Matrix (Weighted Scoring)

For comparing multiple options against weighted criteria:

```
CRITERIA (weight):
  - Performance (0.3)
  - Developer Experience (0.25)
  - Cost (0.2)
  - Ecosystem (0.15)
  - Learning Curve (0.1)

| Option     | Perf | DX  | Cost | Eco | Learn | TOTAL |
|------------|------|-----|------|-----|-------|-------|
| Option A   | 9×.3 | 7×.25 | 8×.2 | 9×.15 | 6×.1 | 8.05 |
| Option B   | 7×.3 | 9×.25 | 6×.2 | 7×.15 | 9×.1 | 7.50 |
| Option C   | 8×.3 | 8×.25 | 9×.2 | 6×.15 | 7×.1 | 7.90 |

RECOMMENDATION: Option A (8.05)
SENSITIVITY: If DX weight increases to 0.35, Option B wins
```

### 4. Ishikawa (Fishbone) Diagram

Categorize potential causes systematically:

```
EFFECT: [The problem]

PEOPLE:
  - Insufficient training on new system
  - Key person dependency on deployment

PROCESS:
  - No code review for hotfixes
  - Missing rollback procedure

TECHNOLOGY:
  - Legacy ORM generating N+1 queries
  - No connection pooling configured

ENVIRONMENT:
  - Production DB on smaller instance than staging
  - No CDN in front of API gateway

DATA:
  - Stale cache entries after schema migration
  - Inconsistent timezone handling
```

### 5. Opportunity Cost Analysis

For resource allocation decisions:

```
OPTION A: Build custom auth system
  COST: 3 developer-weeks
  GAIN: Full control, no vendor lock-in
  OPPORTUNITY COST: 3 weeks not building core features

OPTION B: Use Auth0/Clerk
  COST: $25/month + 2 days integration
  GAIN: Battle-tested, maintained externally
  OPPORTUNITY COST: $300/year, some vendor dependency

ANALYSIS: At current stage (pre-PMF), 3 weeks of feature dev
  is worth more than auth ownership. Use managed service.
```

## Workflow

### Phase 1: Problem Definition

Never solve the wrong problem. Spend time here.

```
OBSERVED BEHAVIOR: [What is actually happening]
EXPECTED BEHAVIOR: [What should be happening]
IMPACT: [Who is affected and how severely]
  - Users: [impact description]
  - Business: [impact description]
  - Technical: [impact description]
SCOPE: [Boundaries — what is NOT part of this problem]
URGENCY: [critical/high/medium/low] — [justification]
```

### Phase 2: Information Gathering

```
KNOWN FACTS:
  1. [Verified fact with source]
  2. [Verified fact with source]

ASSUMPTIONS:
  1. [Assumption — flagged for verification]
  2. [Assumption — flagged for verification]

UNKNOWNS:
  1. [What we need to find out]
  2. [What we need to find out]

ACTIONS TO FILL GAPS:
  - [How to verify assumption 1]
  - [How to discover unknown 1]
```

### Phase 3: Solution Generation

Generate at least 3 solutions before evaluating any:

```
SOLUTION 1: [Name]
  Description: [How it works]
  Pros: [Benefits]
  Cons: [Drawbacks]
  Effort: [Time/cost estimate]
  Risk: [What could go wrong]

SOLUTION 2: [Name]
  ...

SOLUTION 3: [Name]
  ...

HYBRID: Can elements of multiple solutions be combined?
```

### Phase 4: Evaluation

Apply the appropriate framework from Key Frameworks above. Always consider:

- **Reversibility**: Can we undo this decision easily? Prefer reversible choices.
- **Time horizon**: Is this a 1-week fix or a 5-year architecture decision?
- **Second-order effects**: What will this decision cause downstream?
- **Failure modes**: How does each solution fail? Which failure is most tolerable?

### Phase 5: Recommendation

```
RECOMMENDATION: [Solution name]

JUSTIFICATION:
  1. [Primary reason]
  2. [Secondary reason]
  3. [Tertiary reason]

CONDITIONS: This recommendation assumes:
  - [Condition 1]
  - [Condition 2]

REVISIT IF:
  - [Trigger that should cause re-evaluation]
  - [Trigger that should cause re-evaluation]

ACTION PLAN:
  1. [First concrete step]
  2. [Second step]
  3. [Third step]
  ...

ROLLBACK PLAN: [How to reverse if the solution fails]
```

## Specialized Patterns

### Bug Triage Pattern

```
SEVERITY: [P0-P4]
REPRODUCIBILITY: [always/intermittent/rare/once]
BLAST RADIUS: [all users/subset/single user]

HYPOTHESIS 1: [Most likely cause]
  TEST: [How to confirm or refute]
  RESULT: [confirmed/refuted]

HYPOTHESIS 2: [Next most likely cause]
  TEST: [How to confirm or refute]
  RESULT: [confirmed/refuted]

ROOT CAUSE: [Confirmed cause]
FIX: [Description]
PREVENTION: [How to prevent recurrence]
```

### Technology Selection Pattern

```
REQUIREMENTS:
  MUST HAVE: [Non-negotiable requirements]
  SHOULD HAVE: [Strong preferences]
  NICE TO HAVE: [Bonuses]

ELIMINATION ROUND:
  Candidate X — eliminated: missing MUST HAVE requirement [Y]

DETAILED COMPARISON: [remaining candidates]
  [Use Decision Matrix framework]

PROOF OF CONCEPT:
  Build a minimal prototype with top 2 candidates testing:
  - [Critical requirement 1]
  - [Critical requirement 2]
  Time-box: [hours/days]
```

### Scaling Decision Pattern

```
CURRENT STATE:
  - Load: [requests/second, data volume]
  - Bottleneck: [identified constraint]
  - Headroom: [how much growth before failure]

PROJECTED STATE (6 months):
  - Load: [projected numbers]
  - Growth rate: [%/month]

OPTIONS:
  Vertical: [bigger machine — cost, ceiling]
  Horizontal: [more machines — complexity, cost]
  Architectural: [redesign — effort, payoff]
  Optimize: [fix inefficiencies — effort, payoff]

RECOMMENDATION: [Based on time-to-ceiling and team capacity]
```

## Usage Examples

### Example: Choosing a State Management Library

```
PROBLEM: React app state is scattered across useState, context, and prop drilling

REQUIREMENTS:
  MUST HAVE: TypeScript support, DevTools, <5KB bundle
  SHOULD HAVE: Minimal boilerplate, good documentation
  NICE TO HAVE: Middleware support, persistence

CANDIDATES: Redux Toolkit, Zustand, Jotai, Valtio

ELIMINATION: None eliminated (all meet MUST HAVE)

DECISION MATRIX (weights):
  Bundle Size (0.2) | Boilerplate (0.25) | TypeScript (0.2) | Docs (0.15) | Ecosystem (0.2)

  Redux Toolkit: 4 | 5 | 9 | 9 | 10 = 7.15
  Zustand:       9 | 9 | 8 | 7 | 7  = 8.15
  Jotai:         9 | 8 | 9 | 6 | 6  = 7.70
  Valtio:        8 | 9 | 7 | 5 | 5  = 7.00

RECOMMENDATION: Zustand
  - Smallest learning curve for the team
  - Minimal boilerplate aligns with KISS principle
  - Sufficient for current complexity level
  REVISIT IF: App requires complex computed state graphs (then consider Jotai)
```

## Anti-Patterns

1. **Analysis paralysis**: Set a time-box for the decision. If options score within 10% of each other, pick either — the cost of delay exceeds the difference.
2. **Solutioning before understanding**: Never jump to "use X technology" before fully defining the problem.
3. **Ignoring reversibility**: Two-way doors (reversible decisions) deserve minutes of analysis, not days.
4. **Single-option evaluation**: If you only have one option, you have not explored the problem space. Generate at least three.
5. **Confusing effort with progress**: A detailed analysis of the wrong problem is still wrong. Validate the problem definition first.

## Integration Notes

- Use **sequential-thinking** when a single reasoning chain is needed within a step.
- Hand off to **data-modeling** when the problem involves schema design decisions.
- Hand off to **api-designer** when the problem involves API contract decisions.
- Return structured output to the **orchestrator** for logging and audit trails.


---

## From `sequential-thinking`

> Step-by-step reasoning engine for complex, multi-stage problems requiring deliberate chain-of-thought decomposition

# Sequential Thinking

## Purpose

Sequential thinking is the disciplined practice of breaking complex problems into ordered reasoning steps, where each step builds on verified conclusions from previous steps. This skill prevents cognitive shortcuts, reduces hallucination risk, and produces auditable reasoning chains.

Use this skill when a problem cannot be answered in a single intuitive leap — when intermediate reasoning steps matter as much as the final answer.

## Key Concepts

### Chain-of-Thought (CoT) Structure

Every reasoning chain follows this anatomy:

1. **Premise Identification** — Extract all given facts, constraints, and assumptions
2. **Decomposition** — Break the problem into sub-problems that can be reasoned about independently
3. **Sequential Resolution** — Solve sub-problems in dependency order
4. **Synthesis** — Combine sub-conclusions into a coherent answer
5. **Verification** — Check the answer against original constraints

### Reasoning Depth Levels

| Depth | Steps | Use When |
|-------|-------|----------|
| **Shallow** | 3-5 | Simple multi-step problems, clarifications |
| **Medium** | 5-10 | Architecture decisions, debugging, design choices |
| **Deep** | 10-20+ | System design, security analysis, complex debugging |

### Cognitive Checkpoints

At each step, explicitly verify:
- **Validity**: Does this step logically follow from the previous?
- **Completeness**: Have I considered all relevant factors?
- **Consistency**: Does this contradict any earlier conclusion?
- **Relevance**: Does this step advance toward the goal?

## Workflow

### Phase 1: Problem Framing

```
GIVEN: [State the problem exactly as presented]
KNOWN: [List all facts and constraints]
UNKNOWN: [List what needs to be determined]
ASSUMPTIONS: [List any assumptions being made — flag each]
GOAL: [State the desired output precisely]
```

### Phase 2: Dependency Mapping

Before solving, map which sub-problems depend on others:

```
Sub-problem A (independent)
Sub-problem B (independent)
Sub-problem C (depends on A)
Sub-problem D (depends on B, C)
Final Answer (depends on D)
```

This reveals which problems can be solved in parallel and which require sequential resolution.

### Phase 3: Step-by-Step Execution

For each step:

```
## Step N: [Title]
REASONING: [The logical argument]
EVIDENCE: [Facts supporting this step]
CONCLUSION: [What this step establishes]
CONFIDENCE: [high/medium/low] — [why]
```

### Phase 4: Synthesis and Verification

```
## Synthesis
CHAIN: Step 1 → Step 2 → ... → Step N
CONCLUSION: [Final answer]
VERIFICATION:
  - Does this satisfy all constraints? [yes/no + explanation]
  - Are there edge cases not covered? [list]
  - What could invalidate this reasoning? [list]
CONFIDENCE: [overall confidence with justification]
```

## Patterns

### Pattern: Backward Chaining

Start from the desired conclusion and work backward to identify what must be true:

```
GOAL: X must be true
FOR X: Y and Z must be true
FOR Y: A must be true
FOR Z: B and C must be true
→ Therefore, verify A, B, C first
```

Useful for: debugging (start from the error), proof construction, requirement tracing.

### Pattern: Elimination

When multiple solutions are possible, systematically eliminate:

```
CANDIDATES: [A, B, C, D]
TEST 1: [criterion] → eliminates B
REMAINING: [A, C, D]
TEST 2: [criterion] → eliminates D
REMAINING: [A, C]
TEST 3: [criterion] → eliminates A
ANSWER: C
```

Useful for: root cause analysis, technology selection, differential diagnosis.

### Pattern: Inductive Building

Build understanding from specific examples to general rules:

```
OBSERVATION 1: When input is X, output is Y
OBSERVATION 2: When input is X', output is Y'
OBSERVATION 3: When input is X'', output is Y''
PATTERN: Output = f(input) where f is [description]
VERIFICATION: Test pattern against new cases
```

Useful for: understanding undocumented behavior, reverse engineering, pattern recognition.

### Pattern: Contradiction Detection

Actively look for contradictions in the reasoning chain:

```
CLAIM A: [statement from step N]
CLAIM B: [statement from step M]
TEST: Can A and B both be true simultaneously?
IF NO: Identify which step contains the error
IF YES: Continue
```

## Usage Examples

### Example 1: Debugging a Race Condition

```
GIVEN: User reports intermittent 500 errors on checkout
KNOWN:
  - Errors occur ~5% of the time
  - Only during high traffic
  - Payment succeeds but order record missing
  - Two services: payment-service, order-service

Step 1: Identify the data flow
  Payment request → payment-service → Kafka event → order-service → DB write
  CONCLUSION: The order depends on an async event being consumed

Step 2: Identify failure modes in async flow
  - Message not published (payment-service failure after charge)
  - Message published but not consumed (consumer lag/crash)
  - Message consumed but DB write fails (constraint violation, timeout)
  CONCLUSION: Three distinct failure points exist

Step 3: Correlate with symptoms
  - "Only during high traffic" → suggests consumer lag or DB contention
  - "Payment succeeds" → message likely published
  - "Order record missing" → DB write never completed
  CONCLUSION: Most likely consumer lag or DB timeout under load

Step 4: Determine root cause
  - Check consumer group lag metrics → lag spikes during traffic
  - Check DB connection pool → maxed out during spikes
  CONCLUSION: DB connection pool exhaustion causes write timeouts,
  message is retried but consumer offset already committed

Step 5: Verify and fix
  - Verify: Enable DB pool metrics, confirm pool exhaustion
  - Fix: Increase pool size + only commit offset after successful write
  CONFIDENCE: high — symptoms match connection pool exhaustion pattern
```

### Example 2: Architecture Decision

```
GIVEN: Choose between monolith and microservices for a new SaaS product
KNOWN: Team of 4, MVP in 3 months, expected 1000 users first year

Step 1: Assess team capacity
  4 developers cannot maintain multiple service deployments efficiently
  CONCLUSION: Operational overhead of microservices is prohibitive

Step 2: Assess scale requirements
  1000 users/year ≈ 3 users/day ≈ negligible load
  CONCLUSION: No scaling pressure justifies distributed architecture

Step 3: Assess domain boundaries
  MVP scope is still being discovered — boundaries will shift
  CONCLUSION: Premature decomposition will cause costly refactoring

Step 4: Assess future migration path
  Well-structured monolith (modular) can be decomposed later
  CONCLUSION: Modular monolith preserves optionality

SYNTHESIS: Modular monolith. Enforce module boundaries via packages/namespaces.
  Revisit when team > 10 or load requires independent scaling.
CONFIDENCE: high — standard guidance for small teams with uncertain domains
```

## Anti-Patterns

1. **Skipping steps**: Jumping from problem to solution without intermediate reasoning. Always show your work.
2. **Anchoring**: Letting the first hypothesis dominate. Actively generate alternatives at Step 2.
3. **Confirmation bias**: Only looking for evidence that supports your current conclusion. Use contradiction detection.
4. **Infinite regression**: Breaking problems into too-small pieces. Stop decomposing when a step can be resolved with a single clear argument.
5. **Circular reasoning**: Using the conclusion as a premise. Each step must introduce new information or logic.

## Integration Notes

- When invoked by the **orchestrator**, return the full reasoning chain so it can be logged and audited.
- When the problem involves code architecture, hand off to **problem-solving** for framework-specific decomposition.
- When reasoning about data structures, link to **data-modeling** for schema validation.
- Always tag assumptions explicitly — they are the most common source of reasoning errors.


---

## From `make-decision`

> Structured decision-making hub — selects and applies the best McKinsey-grade framework (MECE, Issue Tree, Pre-Mortem, Weighted Matrix, etc.) with cognitive bias detection

# Make-Decision Skill

## Purpose

Apply structured decision-making frameworks to complex choices. This skill orchestrates the right analytical method for the decision type, injects cognitive bias warnings, and ensures the output is a clear, justified recommendation — not a hedged "it depends."

The **decision-engine** in `prompt-analyzer.ts` fires automatically on decision-shaped prompts. This skill provides the full methodology and output standards.

## Framework Selection Guide

| Decision Type | Best Framework |
|---|---|
| Binary choice (A vs B) | Hypothesis-Driven Decision Tree |
| Multi-option with criteria | Weighted Evaluation Matrix |
| Problem decomposition | MECE |
| Root cause unknown | Issue Tree / 5 Whys |
| High-risk plan | Pre-Mortem |
| Long-term life decision | Regret Minimization |
| Resource allocation | Opportunity Cost / RICE |
| Consequence mapping | Second-Order Thinking |

## Mandatory Output Format

Every decision output **must** follow this structure:

```
Decision Type: [type]
Framework: [name]

⚠ BIAS WARNING: [name] (if detected)
[Warning + remedy]

[Framework applied step by step]

Recommendation: [clear answer] — [1-sentence justification]
Confidence: [0-100%]
Key Assumption: [the one assumption that, if wrong, flips the recommendation]
```

## Cognitive Bias Checklist

Before finalizing any recommendation, check for:

- **Status Quo Bias** — Is the current option getting an unfair advantage?
- **Sunk Cost Fallacy** — Are past investments being counted as future value?
- **Confirmation Bias** — Was the question framed to invite a specific answer?
- **Overconfidence** — Are certainty words ("obviously", "clearly", "definitely") being used in uncertain domains?
- **FOMO** — Is artificial urgency distorting the decision?
- **Herd Mentality** — Is "everyone does it" being used as evidence?

## Anti-Patterns to Reject

- **"It depends"** without specifying what it depends on — always specify the conditions
- **Generic pros/cons lists** without weights — always ask for weights or assign them
- **Recommendations without confidence levels** — always state confidence explicitly
- **Analysis without a recommendation** — a framework without a conclusion is just decoration


---

## From `mece`

> MECE (Mutually Exclusive, Collectively Exhaustive) problem decomposition — McKinsey-standard framework for structuring complex problems without gaps or overlaps

# MECE Skill

## What is MECE?

**Mutually Exclusive** — no overlap between categories. Each item belongs to exactly one bucket.
**Collectively Exhaustive** — no gaps. All possibilities are covered by the buckets.

MECE is the fundamental structuring tool of management consulting. It forces rigorous thinking by demanding that your decomposition covers the full problem space without redundancy.

## When to Use

- Structuring an analysis before diving in
- Segmenting a market, user base, or problem space
- Organizing recommendations
- Building an issue tree or hypothesis tree
- Presenting options to stakeholders

## Workflow

### Step 1: State the core question
Write it as a single sentence: "What are the possible reasons for X?" or "What are all the ways we could achieve Y?"

### Step 2: Generate candidate buckets
Brainstorm without filtering. Aim for 5-8 candidates.

### Step 3: Apply the ME test
For each pair of buckets: "Can an item belong to both?" If yes → merge or refine boundaries.

### Step 4: Apply the CE test
Ask: "Is there any item that doesn't fit any bucket?" If yes → add a bucket or expand existing ones.

### Step 5: Name and order buckets
Use parallel grammatical structure. Order by: logical sequence, importance, or frequency.

## Common MECE Structures

**For root causes:**
- People / Process / Technology / External
- Internal / External
- Strategic / Operational / Financial

**For markets:**
- Geography
- Customer segment
- Product line
- Channel

**For solutions:**
- Short-term / Medium-term / Long-term
- Quick wins / Strategic investments / Moonshots

## MECE Validation Checklist

```
□ Each bucket has a clear, specific definition
□ No two buckets can contain the same item
□ Every possible item fits in exactly one bucket
□ The buckets are named with parallel structure
□ The full set of buckets answers the original question
□ Each bucket is independently actionable
```

## Output Format

```
Question: [core question being decomposed]

MECE Structure:
├── Bucket A: [definition]
│   ├── Sub-item 1
│   └── Sub-item 2
├── Bucket B: [definition]
│   ├── Sub-item 1
│   └── Sub-item 2
└── Bucket C: [definition]
    ├── Sub-item 1
    └── Sub-item 2

ME Check: [confirm no overlaps]
CE Check: [confirm no gaps]
```


---

## From `issue-tree`

> Issue Tree / Logic Tree — hypothesis-driven root cause analysis. State hypotheses first, then gather evidence top-down to eliminate branches.

# Issue Tree Skill

## Purpose

Systematically identify the root cause of a problem using a structured hypothesis tree. Work hypothesis-first to avoid confirmation bias.

## Workflow

### Step 1: Frame the Issue
State the problem as a single, measurable question:
- ❌ "The app is slow"
- ✅ "Why is p95 API response time > 2s for /checkout endpoints since Tuesday?"

### Step 2: Generate Hypotheses (Top-Down, MECE)
List 3-5 mutually exclusive hypotheses that could explain the issue.
Do NOT look at data yet — state hypotheses first.

```
Issue: [clearly stated problem]
├── Hypothesis A: [possible cause]
├── Hypothesis B: [possible cause]
├── Hypothesis C: [possible cause]
└── Hypothesis D: [possible cause]
```

### Step 3: Identify Eliminating Tests
For each hypothesis, define the ONE data point that would eliminate it if false.

| Hypothesis | Eliminating Test | Data | Status |
|---|---|---|---|
| A | [test] | [result] | ✓ Eliminated / ⚠ Survives |

### Step 4: Follow Surviving Branches
Drill into surviving hypotheses 1-2 levels deeper until you reach actionable root causes.

### Step 5: Synthesize
```
Root Cause: [specific, actionable statement]
Evidence: [data points that confirm it]
Fix: [concrete next action]
Estimated Impact: [what fixing this will change]
```

## Anti-Patterns to Avoid

- **Looking at data before forming hypotheses** → confirmation bias
- **Too many hypotheses** → pick the 3-5 most likely based on prior knowledge
- **Vague hypotheses** → "network issues" is not a hypothesis, "CDN cache miss rate > 50%" is
- **Stopping at symptoms** → "the query is slow" is a symptom; "missing index on user_id" is a root cause


---

## From `pre-mortem`

> Pre-Mortem Analysis — assume the plan has already failed, work backwards to identify failure modes before they happen

# Pre-Mortem Skill

## Purpose

Project to a future failure state and reason backwards. Prevents the planning fallacy, overconfidence bias, and groupthink by forcing explicit enumeration of failure modes BEFORE execution.

Named after Gary Klein's research: teams that do pre-mortems identify 30% more failure modes than those that don't.

## Workflow

### Step 1: Set the scene
"It is [date + 6 months]. The [plan/feature/project] has failed catastrophically. The team is conducting a retrospective."

### Step 2: Enumerate failure modes
List the top 5-8 failure modes. For each:
- **What happened?** (specific, not vague)
- **Why?** (the actual cause)
- **Who/what was affected?**

Use MECE buckets: Technical / Product / Market / Team / External

### Step 3: Score each failure mode

| Failure Mode | Likelihood (1-10) | Severity (1-10) | Risk Score (L×S) | Mitigation |
|---|---|---|---|---|
| [mode] | | | | |

### Step 4: Prioritize
Focus on failure modes with Risk Score > 50. These are the ones that will kill the plan.

### Step 5: Build mitigations
For each high-risk failure mode:
- **Prevention**: How do we stop this from happening?
- **Detection**: How do we know early if it's happening?
- **Recovery**: If it happens anyway, what's the playbook?

### Step 6: Go/No-Go decision
```
High-risk failure modes: [count]
Mitigated: [count]
Residual risk: [Low / Medium / High / Unacceptable]
Recommendation: GO / NO-GO / GO WITH CONDITIONS
Conditions: [specific requirements that must be met first]
```

## Common Failure Mode Categories

**Technical**: Performance doesn't scale, data loss, security breach, API dependency fails, migration corruption
**Product**: Users don't understand the feature, adoption is slower than expected, wrong metric improves
**Market**: Competitor launches first, regulation changes, pricing is wrong, distribution fails
**Team**: Key person leaves, knowledge silo, burnout, miscommunication between teams
**External**: Infrastructure outage (AWS, payment processor), partner API changes, legal challenge


---

## From `weighted-matrix`

> Weighted Evaluation Matrix — score options across weighted criteria to make defensible multi-criteria decisions with an explicit numerical recommendation

# Weighted Evaluation Matrix Skill

## Purpose

Make multi-criteria decisions defensible and reproducible. Eliminates gut-feel bias by forcing explicit weighting of criteria before scoring options.

## Workflow

### Step 1: Define options
List all serious options as columns. Discard obviously inferior options before building the matrix.

### Step 2: Define criteria and weights
- Identify 4-8 evaluation criteria
- Assign weights that **must sum to 100%**
- Weights reflect priorities, not importance — ask: "If I could only optimize for one thing, what would it be?"
- Surface criteria weights for explicit validation before scoring

### Step 3: Score each option per criterion (1-5)
| Score | Meaning |
|---|---|
| 5 | Excellent — exceeds requirements |
| 4 | Good — meets requirements comfortably |
| 3 | Adequate — meets minimum requirements |
| 2 | Poor — partially meets requirements |
| 1 | Unacceptable — fails requirement |

### Step 4: Calculate weighted scores
`Weighted Score = Score × (Weight / 100)`
`Total = Sum of all weighted scores`

### Step 5: Output

```
Weighted Evaluation Matrix: [Decision Name]

| Criteria         | Weight | [Option A] | [Option B] | [Option C] |
|-----------------|--------|-----------|-----------|-----------|
| [criterion 1]   | XX%    | ★★★★★ (5) | ★★★☆☆ (3) | ★★★★☆ (4) |
| [criterion 2]   | XX%    | ★★★☆☆ (3) | ★★★★★ (5) | ★★★★☆ (4) |
| ...             | ...    | ...       | ...       | ...       |
| **Weighted Total** |      | **X.XX**  | **X.XX**  | **X.XX**  |

✅ Recommendation: [Option X] — scores X.XX vs X.XX
Key assumption: [the weight that most influences the outcome]
```

## Anti-Patterns

- **Criteria weights that sum ≠ 100%** → invalid matrix
- **Adding criteria after scoring** → gaming the matrix
- **All criteria weighted equally** → not a weighted matrix; reveals unclear priorities
- **Score without rationale** → document WHY each option scores as it does
- **Ignoring the key assumption** → always name which weight, if changed, would flip the recommendation

