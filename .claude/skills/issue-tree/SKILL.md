---
name: issue-tree
description: Issue Tree / Logic Tree — hypothesis-driven root cause analysis. State hypotheses first, then gather evidence top-down to eliminate branches.
layer: utility
category: reasoning
triggers:
  - "issue tree"
  - "logic tree"
  - "root cause"
  - "why is this happening"
  - "diagnose"
  - "not working"
  - "investigate why"
  - "5 whys"
linksTo:
  - make-decision
  - mece
  - debug
linkedFrom:
  - make-decision
  - debug
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
---

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
