---
source: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
license: Apache-2.0
---

<!--
intent: Condensed normative DESIGN.md spec for the ultra-ui skill.
status: authored from upstream docs/spec.md fetched on 2026-05-14; upstream repo license is Apache-2.0.
next: Re-sync when the DESIGN.md alpha schema changes upstream.
confidence: high
-->

# DESIGN.md Spec

DESIGN.md is a self-contained plain-text design-system document. It has two layers:

1. YAML frontmatter for machine-readable tokens.
2. Markdown prose for human-readable design rationale and guidance.

Tokens are normative. Prose explains intent, usage, and fallback behavior.

## Frontmatter Schema

```yaml
version: <string>          # optional; current upstream version: "alpha"
name: <string>
description: <string>      # optional
colors:
  <token-name>: <Color>
typography:
  <token-name>: <Typography>
rounded:
  <scale-level>: <Dimension>
spacing:
  <scale-level>: <Dimension | number>
components:
  <component-name>:
    <token-name>: <string | token reference>
```

## Token Types

| Type | Normative Format | Notes |
|---|---|---|
| `Color` | `#` plus sRGB hex | Quote hex values in YAML so `#` is not treated as a comment. |
| `Dimension` | String with `px`, `em`, or `rem` suffix | Negative dimensions are allowed where CSS allows them, such as letter spacing. |
| `Typography` | Object with font fields | Supports `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation`. |
| `Token Reference` | `{path.to.token}` | References point to another value in the YAML tree. |

Typography fields:

| Field | Type | Notes |
|---|---|---|
| `fontFamily` | string | Family name or stack label. |
| `fontSize` | Dimension | Prefer rem for scalable UI systems, px accepted by the spec. |
| `fontWeight` | number or numeric string | Use numeric values such as `400`, `600`, `700`. |
| `lineHeight` | Dimension or number | Unitless multipliers are recommended CSS practice. |
| `letterSpacing` | Dimension | Use `em` for scalable tracking. |
| `fontFeature` | string | Maps to CSS `font-feature-settings`. |
| `fontVariation` | string | Maps to CSS `font-variation-settings`. |

## Section Order

Every parsed section uses a `##` heading. An optional `#` document title is allowed but not parsed as a section.

| Order | Section | Aliases | Purpose |
|---:|---|---|---|
| 1 | Overview | Brand & Style | Personality, audience, density, emotional target. |
| 2 | Colors | | Palette roles and application rationale. |
| 3 | Typography | | Type roles, hierarchy, readability, loading notes. |
| 4 | Layout | Layout & Spacing | Grid, density, spacing rhythm, safe areas. |
| 5 | Elevation & Depth | Elevation | Shadows, tonal layers, hierarchy cues. |
| 6 | Shapes | | Radius scale and shape language. |
| 7 | Components | | Component atom styling and state guidance. |
| 8 | Do's and Don'ts | | Practical guardrails and anti-patterns. |

Sections can be omitted when irrelevant, but sections that are present should keep this order.

## Colors

`colors` is a map of token names to hex colors.

Recommended non-normative names: `primary`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface`, `error`.

At least `primary` should be present when colors are defined. Other semantic tokens should follow a consistent naming convention.

## Typography

`typography` is a map of token names to typography objects.

Recommended non-normative names: `headline-display`, `headline-lg`, `headline-md`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-sm`.

Most complete systems define 9 to 15 typography levels. Generated ultra-ui systems should define at least display/headline/body/label tokens.

## Spacing

`spacing` is a map of scale names to dimensions or unitless numbers.

Spacing may include regular rhythm tokens (`xs`, `sm`, `md`, `lg`, `xl`) and layout-specific values (`gutter`, `margin`, `columns`).

## Rounded

`rounded` is a map of scale names to dimensions.

Recommended non-normative names: `none`, `sm`, `md`, `lg`, `xl`, `full`.

## Components

`components` is a map from component identifiers to sub-token groups. Values may be literals or references to previously defined tokens.

Supported component property tokens:

| Property | Expected Value |
|---|---|
| `backgroundColor` | Color or color token reference |
| `textColor` | Color or color token reference |
| `typography` | Typography token reference |
| `rounded` | Dimension or rounded token reference |
| `padding` | Dimension or spacing token reference |
| `size` | Dimension |
| `height` | Dimension |
| `width` | Dimension |

Variants such as hover, active, and pressed states are represented as related component keys, for example `button-primary`, `button-primary-hover`, and `button-primary-active`.

## Token References

References use curly braces and a dot path, such as `{colors.primary}` or `{typography.label-md}`.

For most token groups, references must resolve to primitive values. Inside `components`, references to composite typography values are permitted.

Broken references are lint errors.

## Consumer Behavior

| Scenario | Expected Behavior |
|---|---|
| Unknown section heading | Preserve; do not error. |
| Unknown color token name | Accept if the color value is valid. |
| Unknown typography token name | Accept if the typography object is valid. |
| Unknown spacing value | Accept; store as string if not a valid dimension. |
| Unknown component property | Accept with warning. |
| Duplicate section heading | Error; reject the file. |

## Recommended Guardrails

- Prefer semantic token names over raw visual names when the token drives implementation.
- Keep prose and frontmatter synchronized; if they conflict, frontmatter wins.
- Use component tokens to exercise color pairs so contrast linting can catch failures.
- Treat DESIGN.md as the source of truth for downstream Tailwind, CSS, Figma variables, and DTCG exports.
