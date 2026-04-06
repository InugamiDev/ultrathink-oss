---
name: pre-mortem
description: Pre-Mortem Analysis — assume the plan has already failed, work backwards to identify failure modes before they happen
layer: utility
category: reasoning
triggers:
  - "pre-mortem"
  - "premortem"
  - "what could go wrong"
  - "risks of this plan"
  - "failure modes"
  - "before we launch"
  - "before we ship"
  - "risk assessment"
linksTo:
  - make-decision
  - plan
  - plan-validate
linkedFrom:
  - make-decision
  - plan
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
---

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
