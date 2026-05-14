---
source: https://github.com/google-labs-code/design.md
license: Apache-2.0
---

<!--
intent: Practical authoring guide for lint-clean DESIGN.md documents.
status: authored for ultra-ui.
next: Keep examples aligned with lib/generate.ts output.
confidence: high
-->

# Writing DESIGN.md

Use DESIGN.md when a design system must travel between agents, tools, code, and docs without losing exact token values.

## Authoring Order

1. Start with YAML frontmatter delimited by `---`.
2. Define `version`, `name`, and optional `description`.
3. Define colors before typography so component references can resolve.
4. Define typography, rounded, spacing, then components.
5. Write prose sections in canonical order.
6. Run `ultra-ui lint DESIGN.md` or `npx @google/design.md lint DESIGN.md`.
7. Export only after lint has no errors and contrast warnings are understood.

## Minimal Shape

```md
---
version: alpha
name: Product Design System
description: Short design-system intent.
colors:
  primary: "#2563EB"
  on-primary: "#FFFFFF"
typography:
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  md: 8px
spacing:
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview

Describe the product, audience, tone, density, and emotional target.

## Colors

Explain roles for primary, surface, text, muted, and semantic colors.

## Typography

Explain the type pairing, hierarchy, readability, and loading strategy.
```

## Token Naming

Use semantic tokens for implementation:

| Group | Good Names | Avoid |
|---|---|---|
| Colors | `primary`, `on-primary`, `background`, `foreground`, `card`, `muted`, `destructive` | `blue`, `gray-thing`, `random-accent` |
| Typography | `display`, `headline`, `body`, `label`, `caption` | `big`, `small2`, `nice-font` |
| Rounded | `none`, `sm`, `md`, `lg`, `xl`, `full` | raw one-off radii |
| Spacing | `xs`, `sm`, `md`, `lg`, `xl`, `section`, `gutter` | arbitrary per-component spacing |

Hyphenated keys such as `on-primary` are valid. Reference them as `{colors.on-primary}`.

## Prose Sections

| Section | Include |
|---|---|
| Overview | Product category, design language, audience, density, emotional target. |
| Colors | Palette role, contrast intent, semantic use, dark/light considerations. |
| Typography | Heading/body/label roles, font loading, fallback stack, scale. |
| Layout | Grid model, spacing rhythm, breakpoint behavior, safe areas. |
| Elevation & Depth | Shadows, borders, tonal layers, blur policy. |
| Shapes | Radius scale, shape personality, exceptions. |
| Components | Buttons, cards, inputs, nav, states, interaction rules. |
| Do's and Don'ts | Guardrails that prevent visual drift. |

## Export Targets

- `tailwind` or `json-tailwind`: Tailwind v3 `theme.extend` JSON.
- `css-tailwind`: Tailwind v4 `@theme` CSS variables.
- `tokens` or `dtcg`: W3C Design Tokens compatible JSON.

Prefer DESIGN.md as the canonical source. Regenerate exports instead of editing exports by hand.
