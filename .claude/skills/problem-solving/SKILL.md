---
name: problem-solving
description: Structured problem decomposition frameworks including root cause analysis, decision matrices, and solution evaluation
layer: utility
category: reasoning
triggers:
  - "solve this problem"
  - "root cause"
  - "decision matrix"
  - "trade-off analysis"
  - "how should I approach"
  - "evaluate options"
  - "compare solutions"
inputs:
  - problem_description: Clear statement of the problem to solve
  - constraints: Time, budget, technical, or organizational constraints
  - evaluation_criteria: What defines a good solution (optional, will be derived)
outputs:
  - problem_analysis: Structured decomposition of the problem
  - solution_candidates: Ranked list of potential solutions
  - recommendation: Best solution with justification
  - action_plan: Implementation steps for the recommended solution
  - risks: Known risks and mitigations
linksTo:
  - sequential-thinking
  - data-modeling
  - api-designer
  - error-handling
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - sequential-thinking
  - context-engineering
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

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
