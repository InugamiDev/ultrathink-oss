---
name: weighted-matrix
description: Weighted Evaluation Matrix — score options across weighted criteria to make defensible multi-criteria decisions with an explicit numerical recommendation
layer: utility
category: reasoning
triggers:
  - "weighted matrix"
  - "decision matrix"
  - "compare options"
  - "evaluate alternatives"
  - "tech stack decision"
  - "vendor selection"
  - "which framework"
  - "which tool"
  - "which approach"
linksTo:
  - make-decision
  - mece
linkedFrom:
  - make-decision
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
---

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
