---
name: ui
description: Master UI orchestrator. Single entry point for all UI work. Routes to the right impeccable-* skill chain based on goal. Modes: fix (normalize+harden+polish), elevate (bolder+colorize+animate+delight), build (frontend-design+design-system), ship (harden+adapt+optimize+polish), brand (colorize+normalize+delight), full (everything). Always starts with audit.
argument-hint: "[mode] [target] — fix|elevate|build|ship|brand|full"
layer: orchestrator
category: design
triggers:
  - ui
  - improve ui
  - fix ui
  - elevate ui
  - ui work
  - ui overhaul
  - make it look good
  - ui improvements
  - ui polish
  - ui fix
  - redesign
  - ui review
inputs:
  - Mode: fix | elevate | build | ship | brand | full (auto-detected if omitted)
  - Target: file path, page name, URL, or component name (defaults to cwd)
outputs:
  - Modified source files per mode's skill chain
  - Summary of changes per skill invoked
  - Before/after screenshots if target is a live URL
linksTo:
  - impeccable-audit
  - impeccable-critique
  - impeccable-normalize
  - impeccable-colorize
  - impeccable-bolder
  - impeccable-animate
  - impeccable-delight
  - impeccable-polish
  - impeccable-harden
  - impeccable-adapt
  - impeccable-optimize
  - impeccable-distill
  - impeccable-quieter
  - impeccable-clarify
  - impeccable-frontend-design
  - design-system
  - accessibility
  - animation
  - responsive-design
preferredNextSkills:
  - impeccable-polish
  - ship
fallbackSkills:
  - impeccable-audit
  - impeccable-normalize
riskLevel: low
memoryReadPolicy: full
memoryWritePolicy: always
sideEffects:
  - Modifies source files (CSS, TSX, HTML)
  - May create new component files
  - May take Playwright screenshots for before/after diff
---

# UI — Master Orchestrator

> One command. Routes all UI work to the right skill chain.

## Usage

```
/ui fix [target]       — Fix broken or inconsistent UI
/ui elevate [target]   — Make good UI exceptional
/ui build [target]     — Create new UI from scratch
/ui ship [target]      — Pre-launch quality pass
/ui brand [target]     — Apply/strengthen brand identity
/ui full [target]      — Everything, maximum quality

/ui [target]           — Auto-detect mode from context
```

`[target]` = file path, page name, URL, or component name. If omitted, targets the current working directory.

---

## Step 1 — Always Audit First

No matter the mode, always start here:

1. **Invoke `impeccable-audit`** — Diagnose all issues across anti-patterns, visual hierarchy, typography, color tokens, interactive states, and responsiveness. Collect findings as a prioritized list.

Report findings to the user. Confirm mode before proceeding. If mode was not specified, auto-detect from context (see Auto-Detection below).

---

## Step 2 — Execute Mode Chain

### Mode: `fix` — Repair broken/inconsistent UI
*When: UI has issues but no major redesign needed*

2. **Invoke `impeccable-normalize`** — Fix spacing, design tokens, and consistency against the design system.
3. **Invoke `impeccable-harden`** — Add missing states (hover, focus, error, empty, loading).
4. **Invoke `impeccable-clarify`** — Fix confusing copy, labels, and UX language.
5. **Invoke `impeccable-polish`** — Final quality pass before shipping.

### Mode: `elevate` — Make good UI exceptional
*When: UI works but feels generic or uninspired*

2. **Invoke `impeccable-critique`** — Identify what's holding it back. Get a strategic assessment.
3. **Invoke `impeccable-bolder`** — Add personality, confidence, and visual hierarchy.
4. **Invoke `impeccable-colorize`** — Apply color strategically: emphasis, hierarchy, brand.
5. **Invoke `impeccable-animate`** — Add motion and micro-interactions.
6. **Invoke `impeccable-delight`** — Add joy, personality, and memorable moments.
7. **Invoke `impeccable-polish`** — Final pass.

### Mode: `build` — Create new UI from scratch
*When: Building a new page, feature, or component*

2. **Invoke `impeccable-frontend-design`** — Define architecture, component structure, and visual direction.
3. **Invoke `design-system`** — Apply/extend design tokens and component system.
4. **Invoke `impeccable-normalize`** — Align with existing codebase patterns.
5. **Invoke `accessibility`** — WCAG 2.1 AA compliance check.
6. **Invoke `impeccable-polish`** — Production-ready finish.

### Mode: `ship` — Pre-launch quality pass
*When: About to deploy, need confidence*

2. **Invoke `impeccable-harden`** — Fix all edge cases, empty states, error states.
3. **Invoke `impeccable-adapt`** — Responsive + cross-browser verification.
4. **Invoke `impeccable-optimize`** — Performance: render, bundle, images.
5. **Invoke `accessibility`** — Final a11y compliance check.
6. **Invoke `impeccable-polish`** — Final pass.

### Mode: `brand` — Apply/strengthen brand identity
*When: UI doesn't feel on-brand, or brand just changed*

2. **Invoke `impeccable-colorize`** — Apply brand colors strategically.
3. **Invoke `impeccable-normalize`** — Enforce design tokens across all components.
4. **Invoke `impeccable-bolder`** — Amplify brand personality.
5. **Invoke `impeccable-delight`** — Add brand-specific moments of joy.
6. **Invoke `impeccable-polish`** — Consistent finish.

### Mode: `full` — Everything, maximum quality
*When: Major overhaul, or you want the best possible result*

2. **Invoke `impeccable-critique`** — Strategic assessment of what needs to change.
3. **Invoke `impeccable-frontend-design`** — Rethink structure if critique warrants it.
4. **Invoke `impeccable-normalize`** — System consistency.
5. **Invoke `impeccable-colorize`** — Color strategy.
6. **Invoke `impeccable-bolder`** — Personality.
7. **Invoke `impeccable-animate`** — Motion.
8. **Invoke `impeccable-delight`** — Joy.
9. **Invoke `impeccable-harden`** — Resilience.
10. **Invoke `impeccable-adapt`** — Responsive.
11. **Invoke `impeccable-optimize`** — Performance.
12. **Invoke `impeccable-clarify`** — Copy.
13. **Invoke `impeccable-polish`** — Ship.

---

## Auto-Detection

If no mode given, detect from context:

| Signal | Mode |
|---|---|
| "broken", "bug", "wrong", "fix" | `fix` |
| "boring", "generic", "bland", "better" | `elevate` |
| "new", "create", "build", "from scratch" | `build` |
| "launch", "deploy", "ship", "ready" | `ship` |
| "brand", "identity", "colors", "logo" | `brand` |
| No signal / "everything" | `elevate` (default) |

---

## Execution Rules

1. **Always audit first** — never skip `impeccable-audit`, even in build mode
2. **Report before acting** — show audit findings, confirm mode before running fixes
3. **Sequential, not parallel** — each skill's output informs the next
4. **Stop on critical blocker** — if audit finds a critical a11y or security issue, fix it first
5. **One file at a time** — don't scatter changes across many files simultaneously
6. **Screenshot before and after** — use Playwright when target is a live URL

---

## Output

After completing the chain:

```
✓ Audit          N issues found (X critical, Y high, Z medium)
✓ [skill-1]      [what was changed]
✓ [skill-2]      [what was changed]
...
✓ Polish         Ready to ship

Summary of changes:
- [Key change 1]
- [Key change 2]
- [Key change 3]

Before/after screenshots: [if target was a URL]
```
