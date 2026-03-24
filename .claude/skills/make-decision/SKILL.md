---
name: make-decision
description: Structured decision-making hub — selects and applies the best McKinsey-grade framework (MECE, Issue Tree, Pre-Mortem, Weighted Matrix, etc.) with cognitive bias detection
layer: hub
category: reasoning
triggers:
  - "/make-decision"
  - "help me decide"
  - "should i"
  - "help me choose"
  - "which is better"
  - "compare options"
  - "decision framework"
  - "pros and cons"
  - "tradeoff analysis"
  - "help me think through"
linksTo:
  - mece
  - issue-tree
  - pre-mortem
  - weighted-matrix
  - plan
  - brainstorm
linkedFrom:
  - cook
  - plan
riskLevel: low
memoryReadPolicy: always
memoryWritePolicy: selective
---

# Make-Decision Skill

## Purpose

Apply structured decision-making frameworks to complex choices. This skill orchestrates the right analytical method for the decision type, injects cognitive bias warnings, and ensures the output is a clear, justified recommendation — not a hedged "it depends."

This skill helps you make structured decisions using weighted evaluation. It provides the full methodology and output standards.

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
