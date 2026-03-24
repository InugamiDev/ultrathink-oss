---
name: app-audit
description: Full application quality audit. Chains impeccable-audit + security-scanner + performance-profiler + accessibility + web-vitals + owasp. Produces a single prioritized report with severity scores, WCAG citations, and fix commands for each issue.
argument-hint: "[url or file path] [focus areas]"
layer: orchestrator
category: quality
triggers:
  - app audit
  - full audit
  - quality audit
  - security audit
  - performance audit
  - accessibility audit
  - audit app
  - audit everything
  - code quality check
inputs:
  - Target URL, file path, or directory
  - Optional focus: "security" / "performance" / "a11y" / "ui" / "all" (default: all)
  - Optional WCAG level: "AA" (default) or "AAA"
outputs:
  - Consolidated audit report with severity-ranked issues
  - WCAG citation per accessibility finding
  - OWASP category per security finding
  - Fix command suggestion per issue
  - Executive summary with overall score
linksTo:
  - impeccable-audit
  - security-scanner
  - performance-profiler
  - accessibility
  - web-vitals
  - owasp
preferredNextSkills:
  - fix
  - impeccable-normalize
  - impeccable-harden
fallbackSkills:
  - impeccable-audit
  - code-review
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Read-only analysis — does not modify any files
  - May invoke CLI tools (tsc --noEmit, npm audit)
  - Produces audit report document
---

# App Audit

## Purpose

App Audit is the full-stack quality orchestrator. One command runs UI/UX, security, performance, accessibility, and code quality checks in sequence — then consolidates every finding into a single prioritized report. It does not fix issues; it surfaces them with enough context to fix them fast.

## Workflow

### Phase 0 — Scope

Parse `$ARGUMENTS` for:
- `target` — URL, file path, or "whole project"
- `focus` — "security" / "performance" / "a11y" / "ui" / "all" (default: all)
- `wcagLevel` — "AA" (default) or "AAA"

Confirm scope with user if target is ambiguous.

### Phase 1 — UI/UX Audit

1. **Invoke `impeccable-audit`** — Run the full impeccable audit workflow on the target. Collect all UI findings (anti-patterns, visual hierarchy, typography, color tokens, interactive states, responsiveness) as a findings list with severity levels.

### Phase 2 — Security Scan

2. **Invoke `security-scanner`** — Scan for OWASP Top 10 vulnerabilities: broken access control, injection, cryptographic failures, insecure design, security misconfiguration, vulnerable components, auth failures, integrity failures, logging failures, SSRF.
3. **Invoke `owasp`** — Cross-reference findings against the OWASP standard. Assign OWASP category label (A01–A10) to each security issue.

Additional manual checks during this phase:
- `.env` files in git history
- API keys exposed via `NEXT_PUBLIC_*`
- Missing CSP headers
- Missing rate limiting on auth endpoints

### Phase 3 — Performance Analysis

4. **Invoke `performance-profiler`** — Profile bundle size, N+1 queries, missing indexes, memoization gaps, and render performance.
5. **Invoke `web-vitals`** — Measure Core Web Vitals against targets (LCP < 2.5s, INP < 100ms, CLS < 0.1, TTFB < 800ms). Flag anything in "Needs Work" or "Poor" range.

### Phase 4 — Accessibility

6. **Invoke `accessibility`** — Run WCAG 2.1 AA (or AAA if specified) checks: color contrast, missing alt text, form labels, button names, heading hierarchy, focus indicators, keyboard navigation, ARIA usage, landmark regions, skip nav, aria-live regions.

### Phase 5 — Code Quality

Run static analysis directly:

```bash
# TypeScript errors
npx tsc --noEmit 2>&1 | grep "error TS"

# Dead code
npx knip

# Dependency vulnerabilities
npm audit --audit-level=moderate

# Outdated dependencies
npm outdated
```

Collect all findings from this phase.

---

## Consolidated Report

After all phases complete, produce a single report:

```markdown
# App Audit Report — [Target] — [Date]

## Executive Summary
- Critical: N issues (fix before deploy)
- High: N issues (fix this sprint)
- Medium: N issues (fix next sprint)
- Low: N issues (backlog)
- Overall score: X/100

## Critical Issues
### [Issue Title]
- Category: Security / Performance / A11y / UI
- Location: file:line or URL + selector
- Impact: [what breaks or who is harmed]
- Standard: WCAG 1.4.3 / OWASP A03 / etc.
- Fix: [specific code change or command]

## [Continue for High / Medium / Low...]

## Fix Priority Queue
1. [Critical #1] — [1-line fix description]
2. [Critical #2] — ...
```

---

## Usage

```
/app-audit http://localhost:3000
/app-audit src/ focus:security
/app-audit . focus:performance,a11y wcag:AAA
```
