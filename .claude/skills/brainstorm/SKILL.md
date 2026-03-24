---
name: brainstorm
description: Structured ideation with constraint mapping, divergent exploration, and convergent selection
layer: hub
category: workflow
triggers:
  - "/brainstorm"
  - "brainstorm ideas"
  - "what are the options"
  - "how could we approach this"
  - "explore alternatives"
  - "think of ways to"
inputs:
  - challenge: The problem, question, or goal to brainstorm about
  - constraints: Hard constraints that solutions must satisfy (optional)
  - preferences: Soft preferences to guide selection (optional)
  - quantity: Number of ideas to generate (optional, default 5-7)
outputs:
  - constraintMap: Explicit map of hard constraints, soft preferences, and degrees of freedom
  - ideas: Ranked list of ideas with descriptions, tradeoffs, and feasibility notes
  - recommendation: Top 1-3 recommended approaches with reasoning
  - nextSteps: Concrete actions to move from ideation to execution
linksTo:
  - plan
  - research
  - scout
linkedFrom:
  - plan
  - cook
  - team
preferredNextSkills:
  - plan
  - research
  - scout
fallbackSkills:
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Produces ideation document in working memory
  - May invoke research for domain knowledge
---

# Brainstorm Skill

## Purpose

Generate diverse, well-structured ideas for solving a problem or approaching a challenge. This skill separates divergent thinking (generating options) from convergent thinking (selecting the best ones) to prevent premature optimization of the solution space.

The goal is not to find THE answer. The goal is to find the right set of options and make the tradeoffs visible so the best decision can be made.

## Workflow

### Phase 1: Problem Framing

1. **Restate the challenge** in precise terms. Often the way a problem is framed determines what solutions are visible.
2. **Build the constraint map**:
   - **Hard constraints**: Non-negotiable requirements. Solutions that violate these are automatically disqualified.
   - **Soft preferences**: Desired but flexible. Solutions that satisfy these are preferred but not required.
   - **Degrees of freedom**: Dimensions where we have choices. These are the axes of exploration.
   - **Assumptions**: Things we are taking as given. Worth questioning -- sometimes relaxing an assumption opens new options.

3. **Identify the decision type**:
   - **Reversible** (two-way door): Bias toward action. Pick something and iterate.
   - **Irreversible** (one-way door): Invest in thorough analysis. These decisions are expensive to undo.

### Phase 2: Divergent Exploration

4. **Generate ideas using multiple lenses**:

   **Lens 1: Direct solutions** -- What is the most straightforward way to solve this?

   **Lens 2: Analogies** -- How has this type of problem been solved in other domains?

   **Lens 3: Inversion** -- Instead of solving the problem, what if we removed the conditions that create it?

   **Lens 4: Decomposition** -- Can the problem be broken into subproblems that are each easier to solve?

   **Lens 5: Extreme positions** -- What would the solution look like if we optimized for only ONE dimension (speed, simplicity, flexibility, cost)?

   **Lens 6: Existing solutions** -- What off-the-shelf tools, libraries, or patterns already solve this?

   **Lens 7: Future-backward** -- If this were already solved, what would the solution look like? Work backward from there.

5. **For each idea, capture**:
   - **Name**: Short memorable label
   - **Description**: 2-3 sentence explanation
   - **Tradeoffs**: What you gain vs. what you give up
   - **Feasibility**: How practical is this? (Effort, risk, prerequisites)
   - **Novelty**: Is this a standard approach or an unconventional one?
   - **Constraints satisfied**: Which hard constraints and soft preferences does this meet?

6. **Do not judge during generation** -- In this phase, quantity beats quality. Even "bad" ideas can spark good ones.

### Phase 3: Convergent Selection

7. **Filter by hard constraints** -- Remove any ideas that violate hard constraints.

8. **Score remaining ideas** against soft preferences and practical criteria:
   - **Impact**: How well does this solve the problem?
   - **Effort**: How much work is required?
   - **Risk**: How likely is this to fail or cause problems?
   - **Flexibility**: How easy is it to change course if this does not work?
   - **Alignment**: How well does this fit with existing systems and team capabilities?

9. **Rank ideas** and identify the top 1-3 recommendations.

10. **For each recommendation, provide**:
    - Why this approach over others
    - What the key risks are
    - What the first concrete step would be
    - What would make you reconsider this choice

### Phase 4: Output

11. **Produce the brainstorm report** using the template below.
12. **Recommend next steps** -- Typically `plan` to flesh out the chosen approach, or `research` to investigate unknowns.

## Brainstorm Report Template

```markdown
# Brainstorm: [Challenge Title]

## Challenge
[Precise problem statement]

## Constraint Map
### Hard Constraints
- [constraint 1]: [why it is non-negotiable]
- [constraint 2]: [why it is non-negotiable]

### Soft Preferences
- [preference 1]: [importance level]
- [preference 2]: [importance level]

### Degrees of Freedom
- [dimension 1]: [range of options]
- [dimension 2]: [range of options]

### Assumptions (worth questioning)
- [assumption 1]: What if this is wrong?
- [assumption 2]: What if this is wrong?

---

## Ideas

### Idea 1: [Name]
**Description**: [2-3 sentences]
**Tradeoffs**: Gains [X], gives up [Y]
**Feasibility**: [Low/Medium/High] — [brief reasoning]
**Constraints met**: [list]

### Idea 2: [Name]
...

### Idea 3: [Name]
...

(continue for all ideas)

---

## Comparison Matrix
| Idea | Impact | Effort | Risk | Flexibility | Score |
|------|--------|--------|------|-------------|-------|
| [1]  | High   | Medium | Low  | High        | ★★★★  |
| [2]  | Medium | Low    | Low  | Medium      | ★★★   |
| [3]  | High   | High   | Med  | Low         | ★★★   |

---

## Recommendations

### Top Pick: [Idea Name]
**Why**: [reasoning]
**Key risk**: [main concern]
**First step**: [concrete action]
**Reconsider if**: [condition that would change this choice]

### Runner-up: [Idea Name]
**Why**: [when this would be the better choice]

---

## Next Steps
- [ ] [action 1] (via [skill])
- [ ] [action 2]
```

## Usage

### Open exploration
```
/brainstorm How should we handle real-time notifications in the app?
```

### With constraints
```
/brainstorm How to implement search functionality?
Constraints: Must use existing PostgreSQL database, no Elasticsearch, must support fuzzy matching
Preferences: Fast implementation over perfect accuracy
```

### Architecture decision
```
/brainstorm Should we use a monorepo or polyrepo for the new microservices?
```

### Problem solving
```
/brainstorm Our API response times are over 2 seconds. What are our options for improving them?
```

## Examples

### Example: Notification system brainstorm

**Challenge**: "How should we handle real-time notifications?"

**Ideas generated**:
1. **WebSocket push**: Direct push via persistent connections. High immediacy, complex infrastructure.
2. **Server-Sent Events**: Simpler than WebSocket, one-way. Good for notifications, limited browser support in some contexts.
3. **Long polling**: Simple fallback. Works everywhere, higher latency.
4. **Third-party service** (Pusher, Ably): No infrastructure to manage. Cost scales with usage.
5. **Hybrid**: SSE for primary, long-poll fallback, queued for offline.

**Recommendation**: Start with SSE + long-poll fallback (simplest to implement and sufficient for notification use case). Migrate to WebSocket only if bidirectional communication becomes needed.

## Guidelines

- **Separate generation from evaluation** -- Do not kill ideas during the divergent phase.
- **Aim for diversity, not just quantity** -- Five different approaches are worth more than five variations of the same approach.
- **Name your tradeoffs** -- Every option has downsides. Making them visible is the whole point.
- **Challenge assumptions** -- The best ideas often come from questioning what seems fixed.
- **Prefer reversible decisions** -- When options are close, choose the one that is easier to reverse.
- **Match depth to stakes** -- A reversible two-way door needs 20 minutes of brainstorming, not two days.
- **Include the boring option** -- Sometimes the best approach is the most obvious one. Do not dismiss it because it is not clever.
- **Think in time horizons** -- What is the best option for this week? This quarter? This year? They may be different.
