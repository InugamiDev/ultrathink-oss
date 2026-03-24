---
name: sequential-thinking
description: Step-by-step reasoning engine for complex, multi-stage problems requiring deliberate chain-of-thought decomposition
layer: utility
category: reasoning
triggers:
  - "think step by step"
  - "break this down"
  - "reason through this"
  - "walk me through"
  - "complex problem"
  - "multi-step analysis"
inputs:
  - problem_statement: The problem or question requiring structured reasoning
  - constraints: Any constraints or boundaries on the solution space
  - depth: shallow | medium | deep — controls reasoning granularity
outputs:
  - reasoning_chain: Ordered list of reasoning steps with conclusions
  - final_answer: The synthesized conclusion
  - confidence: Confidence level with justification
  - alternatives: Alternative reasoning paths considered
linksTo:
  - problem-solving
  - data-modeling
  - error-handling
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - problem-solving
  - context-engineering
fallbackSkills:
  - problem-solving
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

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
