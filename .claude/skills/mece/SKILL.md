---
name: mece
description: MECE (Mutually Exclusive, Collectively Exhaustive) problem decomposition — McKinsey-standard framework for structuring complex problems without gaps or overlaps
layer: utility
category: reasoning
triggers:
  - "mece"
  - "break this down"
  - "structure the problem"
  - "categorize"
  - "decompose"
  - "organize my thinking"
  - "framework for this"
  - "mutually exclusive"
  - "exhaustive analysis"
linksTo:
  - make-decision
  - issue-tree
  - brainstorm
linkedFrom:
  - make-decision
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
---

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
