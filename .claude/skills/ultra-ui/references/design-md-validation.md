---
source: https://github.com/google-labs-code/design.md
license: Apache-2.0
---

<!--
intent: Validation notes for DESIGN.md lint, diff, export, and WCAG contrast checks.
status: authored for ultra-ui.
next: Update if upstream linter rule names or severities change.
confidence: high
-->

# DESIGN.md Validation

Use validation before delivering a DESIGN.md file, before exporting Tailwind tokens, and before comparing two versions of a design system.

## Commands

```bash
ultra-ui lint DESIGN.md
ultra-ui validate DESIGN.md
ultra-ui diff DESIGN.md DESIGN.next.md
ultra-ui export DESIGN.md --format tailwind
```

The wrappers call the official upstream CLI:

```bash
npx @google/design.md lint --format json DESIGN.md
npx @google/design.md diff --format json DESIGN.md DESIGN.next.md
npx @google/design.md export DESIGN.md --format tailwind
```

## Lint Output

Lint output is JSON with findings and a summary:

```json
{
  "findings": [
    {
      "rule": "broken-ref",
      "severity": "error",
      "path": "components.button-primary.backgroundColor",
      "message": "Token reference {colors.primary} does not resolve."
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "info": 1 }
}
```

Treat errors as blockers. Treat warnings as design review findings that must either be fixed or explained.

## Rule Map

| Rule | Severity | Action |
|---|---|---|
| `broken-ref` | error | Fix the token path or define the missing token. |
| `missing-primary` | warning | Add `colors.primary` when any color tokens exist. |
| `contrast-ratio` | warning | Adjust foreground/background pairs to meet WCAG AA. |
| `orphaned-tokens` | warning | Reference the token in components or remove it. |
| `token-summary` | info | Use as a quick inventory. |
| `missing-sections` | info | Add rounded/spacing/prose sections when they matter. |
| `missing-typography` | warning | Add typography tokens so consumers do not invent defaults. |
| `section-order` | warning | Reorder markdown sections to the canonical sequence. |

## WCAG Contrast

The linter checks component `backgroundColor` and `textColor` pairs when both resolve to colors.

Minimums:

- Normal text: 4.5:1 for WCAG AA.
- Large text and UI graphics: 3:1 minimum, but prefer 4.5:1 for generated systems.
- Do not rely on color alone; pair danger/success states with text or icon semantics.

If a component token is used only as a border, focus ring, or separator, avoid modeling it as a `backgroundColor` plus low-contrast `textColor` pair. Use a component token only when the pair is meant to be evaluated for readability.

## Common Findings

| Finding | Likely Cause | Fix |
|---|---|---|
| Broken reference | Renamed token or typo in `{group.name}` | Keep references in sync with frontmatter keys. |
| Contrast warning | Accent selected for decoration but used as text background | Add an `on-accent` token or darken/lighten the color. |
| Orphaned token | Palette token exists but no component uses it | Add representative component states or remove unused token. |
| Missing typography | Colors generated without font choices | Run `ultra-ui generate --font ...` or add typography manually. |
| Section order | Prose sections copied out of order | Reorder `##` headings without changing content. |

## Diff Review

Use diff for version-over-version checks. Regressions are most important when:

- Warnings or errors increase in the new file.
- Token names change without migration guidance.
- Contrast-safe component pairs become unsafe.
- Prose contradicts token values.

Review token removals carefully because downstream Tailwind, CSS, and component code may reference those names.
