---
name: plan-validate
description: Validate implementation plans against intent using reverse-questioning, assumption stress-testing, and gap analysis
layer: hub
category: workflow
triggers:
  - "/plan-validate"
  - "validate this plan"
  - "stress test the plan"
  - "check the plan"
  - "review the plan"
inputs:
  - plan: The implementation plan to validate (from plan skill or user-provided)
  - originalIntent: The original goal or request that spawned the plan (optional but recommended)
outputs:
  - validationReport: Structured report with findings, gaps, and recommendations
  - reverseQuestions: Questions that expose hidden assumptions or misalignments
  - strengthScore: Qualitative assessment of plan readiness (Red/Yellow/Green)
linksTo:
  - plan
  - research
  - scout
linkedFrom:
  - plan
  - cook
  - team
  - ship
preferredNextSkills:
  - plan
  - kanban
  - scout
fallbackSkills:
  - brainstorm
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Produces validation report
  - May flag plan for revision
---

# Plan-Validate Skill

## Purpose

Serve as the adversarial reviewer of implementation plans. This skill's job is to find what is wrong, missing, or fragile in a plan BEFORE execution begins. It uses reverse-questioning, assumption stress-testing, and gap analysis to surface problems that are cheap to fix on paper and expensive to fix in code.

Think of this as a pre-mortem: imagine the plan has already failed, then work backward to find out why.

## Workflow

### Pass 1: Intent Alignment Check

1. **Restate the original intent** in one sentence. If the original intent is not available, infer it from the plan's objective.
2. **Compare plan scope to intent** -- Does the plan actually deliver what was asked for? Common misalignments:
   - Plan is broader than intent (scope creep baked in)
   - Plan is narrower than intent (missing features)
   - Plan solves an adjacent problem (misunderstood requirement)
3. **Generate 3-5 reverse questions** -- Questions phrased as "If we complete this plan exactly as written, will we have [X]?" where X tests different facets of the original intent.

### Pass 2: Assumption Stress Test

4. **Extract every assumption** -- Both explicitly stated and implicit ones buried in the plan.
5. **For each assumption, apply the inversion test**: "What happens if the opposite is true?"
   - If the answer is "the plan still works" -- the assumption is non-critical.
   - If the answer is "the plan breaks" -- the assumption is load-bearing and must be verified before execution.
6. **Flag unverified load-bearing assumptions** as blockers.

### Pass 3: Completeness Audit

7. **Check for missing phases** -- Is there a gap between phases where work would need to happen but is not accounted for?
8. **Check for missing tasks within phases** -- Are there implied subtasks not listed?
9. **Check for missing cross-cutting concerns**:
   - Error handling / failure modes
   - Testing strategy
   - Rollback plan
   - Data migration (if applicable)
   - Security implications
   - Performance implications
   - Accessibility (if UI work)
   - Documentation updates
10. **Check dependency chain** -- Are there circular dependencies? Missing dependencies? Implicit ordering that is not stated?

### Pass 4: Feasibility Check

11. **Complexity calibration** -- Are the complexity estimates realistic? Look for:
    - "Low complexity" phases with high uncertainty (likely underestimated)
    - Phases with no unknowns (likely overconfident)
    - Integration phases marked as simple (integration is rarely simple)
12. **Resource check** -- Does the plan assume resources (APIs, services, permissions) that may not be available?
13. **Timeline sanity** -- If a timeline is given, does it account for testing, review, and iteration?

### Pass 5: Verdict

14. **Assign a readiness score**:
    - **Green**: Plan is solid. Minor suggestions only. Proceed to execution.
    - **Yellow**: Plan has gaps or unverified assumptions that should be addressed first. Revise specific sections.
    - **Red**: Plan has fundamental issues. Major revision needed. Return to `plan` skill.
15. **Produce the validation report** using the template below.

## Validation Report Template

```markdown
# Plan Validation Report

## Intent Alignment
**Original intent**: [one sentence]
**Plan delivers**: [one sentence summary of what the plan actually produces]
**Alignment**: Aligned | Partially Aligned | Misaligned

### Reverse Questions
1. If we complete this plan exactly, will [X]? → [Yes/No/Unclear]
2. ...

---

## Assumption Audit
| # | Assumption | Load-Bearing? | Verified? | Risk if Wrong |
|---|-----------|---------------|-----------|---------------|
| A1 | ... | Yes | No | [consequence] |

### Blockers (Unverified Load-Bearing Assumptions)
- A1: [assumption] — Must verify before Phase [N]

---

## Completeness Gaps
- [ ] [Missing element] — Affects Phase [N]
- [ ] ...

## Feasibility Concerns
- [concern 1]
- [concern 2]

---

## Verdict: 🟢 Green | 🟡 Yellow | 🔴 Red

### Recommendations
1. [Highest priority fix]
2. [Second priority fix]
3. ...

### Suggested Next Steps
- [ ] [action]
```

## Usage

### After creating a plan
```
/plan-validate
```
(Automatically picks up the most recent plan from context)

### With explicit plan reference
```
/plan-validate Check the authentication migration plan against the original requirement: "Users must be able to log in with Google and GitHub OAuth"
```

### Quick validation
```
/plan-validate Is this plan ready to execute?
```

## Examples

### Example: Catching scope misalignment

**Plan objective**: "Build user authentication with JWT"
**Original intent**: "Users need to log in"

**Reverse question**: "If we complete this plan, will users be able to reset their password?"
**Finding**: Plan covers login/signup but not password reset, which is implied by "users need to log in."

### Example: Catching a hidden assumption

**Plan task**: "Migrate user table to new schema"
**Hidden assumption**: Existing data can be transformed without loss
**Inversion**: What if some existing data does not fit the new schema?
**Finding**: Plan needs a data audit task before migration phase.

## Guidelines

- **Be constructively adversarial** -- The goal is to make the plan better, not to prove it is bad.
- **Prioritize findings** -- Not all gaps are equal. Flag blockers separately from nice-to-haves.
- **Do not rewrite the plan** -- Identify problems and let the user (or `plan` skill) fix them.
- **Ask the uncomfortable questions** -- "What happens when this fails?" is always a valid question.
- **One round is usually enough** -- If a plan fails validation badly, it needs replanning, not more validation passes.
- **Verify, do not assume** -- If you are unsure whether an assumption holds, flag it rather than guessing.
