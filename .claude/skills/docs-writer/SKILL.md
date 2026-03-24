---
name: docs-writer
description: Generate clear, structured technical documentation — API docs, architecture docs, guides, runbooks, and inline code documentation
layer: utility
category: documentation
triggers:
  - "write docs"
  - "document this"
  - "API documentation"
  - "write a guide"
  - "architecture doc"
  - "runbook"
  - "JSDoc"
  - "docstring"
  - "README"
inputs:
  - Code, module, or system to document
  - Audience (developers, end users, ops team)
  - Documentation type (API ref, guide, tutorial, runbook, ADR)
  - Existing documentation to update
outputs:
  - Structured documentation in appropriate format
  - API reference with examples
  - Architecture diagrams (Mermaid syntax)
  - Inline documentation (JSDoc, docstrings)
  - Runbook with step-by-step procedures
linksTo:
  - code-explainer
  - api-designer
  - mermaid
linkedFrom:
  - ship
  - onboard
  - code-review
preferredNextSkills:
  - changelog-writer
  - mermaid
fallbackSkills:
  - code-explainer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates or modifies documentation files
  - May add JSDoc/docstring comments to code
---

# Docs Writer Skill

## Purpose

Write documentation that developers actually read. This skill generates documentation at the right level of detail for the target audience, follows consistent structure, and stays maintainable by staying close to the code it describes.

## Key Concepts

### Documentation Types

| Type | Audience | Purpose | Format |
|------|----------|---------|--------|
| **API Reference** | Developers integrating | Exhaustive endpoint/function docs | OpenAPI, JSDoc, markdown |
| **Architecture Doc** | Team, new hires | System design and decisions | Markdown + diagrams |
| **Tutorial** | New users | Learn by doing | Step-by-step markdown |
| **How-To Guide** | Experienced users | Solve specific problems | Task-oriented markdown |
| **Runbook** | Ops / on-call | Incident response procedures | Checklist markdown |
| **ADR** | Team, future maintainers | Record architecture decisions | Markdown template |
| **README** | Everyone | First impression, quick start | Markdown |
| **Inline Docs** | Code readers | Explain why, not what | JSDoc, docstrings, comments |

### The Four Quadrants (Diataxis Framework)

```
              LEARNING                    WORKING
          ┌─────────────────┬─────────────────┐
PRACTICAL │   Tutorials     │  How-To Guides   │
          │   (learning-    │  (problem-       │
          │    oriented)    │   oriented)      │
          ├─────────────────┼─────────────────┤
THEORY    │  Explanation    │   Reference      │
          │  (understanding-│  (information-   │
          │   oriented)     │   oriented)      │
          └─────────────────┴─────────────────┘
```

Each quadrant serves a different need. Do not mix them in a single document.

## Workflow

### Step 1: Identify Audience and Type

Ask:
1. **Who** will read this? (junior dev, senior dev, ops, end user)
2. **When** will they read it? (onboarding, debugging, integrating, incident)
3. **What** do they need to accomplish? (understand, implement, fix, decide)

### Step 2: Choose Structure

#### API Reference Structure

```markdown
# API Reference: [Service Name]

## Base URL
`https://api.example.com/v1`

## Authentication
All requests require a Bearer token in the Authorization header.

## Endpoints

### Create User
`POST /users`

Creates a new user account.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `name` | string | Yes | Display name (1-100 chars) |
| `role` | string | No | One of: `user`, `admin`. Default: `user` |

**Example Request:**
```json
{
  "email": "alice@example.com",
  "name": "Alice Chen",
  "role": "admin"
}
```

**Response: 201 Created**
```json
{
  "id": "usr_abc123",
  "email": "alice@example.com",
  "name": "Alice Chen",
  "role": "admin",
  "createdAt": "2025-06-15T10:30:00Z"
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_EMAIL` | Email format is invalid |
| 409 | `EMAIL_EXISTS` | Email already registered |
| 422 | `VALIDATION_ERROR` | Request body validation failed |
```

#### Architecture Document Structure

```markdown
# [System Name] Architecture

## Overview
One paragraph explaining what this system does and why it exists.

## Context Diagram
[Mermaid C4 diagram showing system in its environment]

## Key Design Decisions
1. **Decision**: Why we chose X over Y
   - Context: What problem we faced
   - Decision: What we chose
   - Consequences: Trade-offs accepted

## Components
### [Component A]
- **Responsibility**: What it does
- **Technology**: What it uses
- **Interfaces**: How other components interact with it

## Data Flow
[Mermaid sequence diagram for critical flows]

## Non-Functional Requirements
- Performance targets
- Availability requirements
- Security constraints

## Deployment
How and where this runs in production.
```

#### ADR (Architecture Decision Record)

```markdown
# ADR-NNN: [Title of Decision]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we are seeing that motivates this decision?

## Decision
What is the change that we are proposing and/or doing?

## Consequences
What becomes easier or harder because of this change?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

### Risks
- Risk 1 and mitigation
```

#### Runbook Structure

```markdown
# Runbook: [Incident Type]

## Severity
P1 / P2 / P3

## Symptoms
- What alerts fire
- What users report
- What metrics look abnormal

## Diagnosis Steps
1. Check [specific dashboard/metric]
2. Run `command to check logs`
3. Verify [specific system state]

## Resolution Steps
1. [ ] Step 1 with exact command
2. [ ] Step 2 with exact command
3. [ ] Verify fix: [how to confirm]

## Escalation
If unresolved after 15 minutes:
- Contact: [team/person]
- Slack: [channel]

## Post-Incident
- [ ] Write incident report
- [ ] Update this runbook if procedures changed
- [ ] Create tickets for preventive measures
```

### Step 3: Write Inline Documentation

#### JSDoc / TypeScript

```typescript
/**
 * Calculates the compound interest on a principal amount.
 *
 * Uses the formula: A = P(1 + r/n)^(nt)
 *
 * @param principal - Initial investment amount in dollars
 * @param annualRate - Annual interest rate as a decimal (e.g., 0.05 for 5%)
 * @param compoundsPerYear - Number of times interest is compounded per year
 * @param years - Number of years to calculate
 * @returns The total amount after compound interest
 *
 * @example
 * ```ts
 * // $1000 at 5% compounded monthly for 10 years
 * calculateCompoundInterest(1000, 0.05, 12, 10);
 * // => 1647.01
 * ```
 *
 * @throws {RangeError} If principal is negative
 * @throws {RangeError} If annualRate is negative
 *
 * @see https://en.wikipedia.org/wiki/Compound_interest
 */
function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundsPerYear: number,
  years: number
): number {
  if (principal < 0) throw new RangeError('Principal cannot be negative');
  if (annualRate < 0) throw new RangeError('Annual rate cannot be negative');

  return Math.round(
    principal * Math.pow(1 + annualRate / compoundsPerYear, compoundsPerYear * years) * 100
  ) / 100;
}
```

#### Python Docstrings

```python
def calculate_compound_interest(
    principal: float,
    annual_rate: float,
    compounds_per_year: int,
    years: int,
) -> float:
    """Calculate compound interest on a principal amount.

    Uses the formula: A = P(1 + r/n)^(nt)

    Args:
        principal: Initial investment amount in dollars. Must be non-negative.
        annual_rate: Annual interest rate as decimal (e.g., 0.05 for 5%).
        compounds_per_year: Times interest compounds per year (e.g., 12 for monthly).
        years: Duration in years.

    Returns:
        Total amount after compound interest, rounded to 2 decimal places.

    Raises:
        ValueError: If principal or annual_rate is negative.

    Example:
        >>> calculate_compound_interest(1000, 0.05, 12, 10)
        1647.01
    """
```

### Step 4: Comments — When and How

**Comment the WHY, not the WHAT:**

```typescript
// BAD: Comments that describe what the code does (the code already says that)
// Increment counter by 1
counter++;
// Check if user is admin
if (user.role === 'admin') { ... }

// GOOD: Comments that explain WHY
// We retry 3 times because the payment gateway has transient 503s during deployments
const MAX_RETRIES = 3;

// Sorted descending so the most recent item appears first in the feed
// without needing a separate query
items.sort((a, b) => b.createdAt - a.createdAt);

// HACK: The OAuth library doesn't expose token expiry, so we decode the JWT
// ourselves. Remove this when they merge PR #847.
const expiry = decodeJwtExpiry(token);
```

## Documentation Quality Checklist

- [ ] **Accurate** — Matches actual current behavior
- [ ] **Complete** — All parameters, return values, errors documented
- [ ] **Examples** — At least one working example per function/endpoint
- [ ] **Scannable** — Headers, tables, and code blocks for quick navigation
- [ ] **Maintained** — Updated when code changes (or auto-generated where possible)
- [ ] **No jargon** — Or jargon is defined on first use
- [ ] **Error cases** — Documents what happens when things go wrong

## Auto-Generation Tips

- Use TypeScript types to generate API docs (TypeDoc, tsdoc)
- Use OpenAPI spec to generate REST API docs (Swagger UI, Redoc)
- Use Storybook for component documentation
- Use `jest --coverage` output to identify undocumented code
- Prefer co-located docs (JSDoc in code) over separate files — they stay in sync better
