---
name: ultra-ui
description: "Ultra UI skill - combines Google's DESIGN.md spec (machine-readable design tokens) with the ui-ux-pro-max knowledge base (91 styles, 161 palettes, 73 font pairings, 161 products, 104 UX guidelines, 25 chart types). Generates lint-clean DESIGN.md files, validates token references and WCAG contrast, exports Tailwind/DTCG tokens, and diffs design systems version-over-version."
layer: domain
category: design
triggers: ["/design-pipeline", "/ui-pipeline", "SaaS dashboard", "UI review", "UX improvement", "WCAG compliance", "accessibility audit", "add styles", "admin panel", "ai design", "award-winning", "beautify", "build UI", "build a dashboard", "build a form", "build a landing page", "build component", "color scheme", "complex layout", "component design", "create a website", "create dialog", "create screen", "create table", "create the UI for", "create ui", "css variables", "dark mode", "design a", "design a component", "design a page", "design card", "design from scratch", "design guidelines", "design modal", "design navigation", "design review", "design screen", "design sidebar", "design system", "design this screen", "design to code", "design with stitch", "elevate ui", "fix ui", "generate design", "generate ui", "improve ui", "interface design", "landing page design", "looks bad", "looks ugly", "make a page", "make it look better", "make it look good", "make it pretty", "mockup", "needs polish", "pen file", "pencil design", "pixel perfect", "polish the ui", "premium UI", "professional design", "redesign", "responsive design", "shadcn", "stitch", "style component", "style it", "style this", "tailwind", "theme", "ui", "ui components", "ui design", "ui guidelines", "user interface", "web design", "wireframe to code", "DESIGN.md", "design tokens", "design.md", "design lint", "design diff", "tailwind tokens", "design token export"]
---

<!--
intent: Main operating guide for the ultra-ui mega-skill.
status: authored from ui-ux-pro-max plus upstream DESIGN.md spec behavior.
next: Re-sync counts and lint rule names when copied data or upstream spec changes.
confidence: high
-->

# ultra-ui

Ultra UI turns UI/UX research, product fit, style selection, palette selection, and font pairing into canonical `DESIGN.md` output. Treat `DESIGN.md` as the source of truth; generated Tailwind, CSS, or DTCG tokens are exports.

## Decision Tree

```
What does the user need?
|
+- "Generate a DESIGN.md from scratch"
|  +- Has style/palette/font/product keywords -> lib/generate
|  +- Has a product brief only                -> scripts/search.py --design-system, then lib/generate
|  +- Needs exact DESIGN.md schema            -> references/design-md-format.md
|
+- "Validate a DESIGN.md"
|  +- Structural/token/WCAG lint              -> lib/lint or lib/index validate
|  +- Needs rule explanations                 -> references/design-md-validation.md
|  +- Broken refs or contrast warnings        -> fix tokens first, prose second
|
+- "Diff two DESIGN.md files"
|  +- Version-over-version review             -> lib/diff
|  +- Regression found                        -> inspect removed/modified tokens and lint delta
|
+- "Convert DESIGN.md to Tailwind config"
|  +- Tailwind v3 JSON                        -> lib/export --format tailwind
|  +- Tailwind v4 CSS variables               -> lib/export --format css-tailwind
|  +- W3C design tokens                       -> lib/export --format tokens
|
+- "Choose style / color / font / theme"
|  +- Full recommendation                     -> scripts/search.py "<query>" --design-system
|  +- Deep dive by domain                     -> scripts/search.py "<query>" --domain <domain>
|  +- Persist classic design-system docs      -> scripts/search.py "<query>" --design-system --persist
|
+- "Build / design a page or component"
|  +- From scratch, wants durable tokens      -> generate DESIGN.md first
|  +- From scratch, wants code                -> use DESIGN.md tokens, then implement
|  +- Has a .pen file to edit                 -> stitch workflow, then extract DESIGN.md
|  +- Wants full pipeline                     -> inspire -> define DESIGN.md -> implement -> validate
|
+- "Review / audit existing UI"
|  +- Quick check                             -> Pre-Delivery Checklist
|  +- Token/system audit                      -> extract or write DESIGN.md, then lint
|  +- Accessibility audit                     -> WCAG notes + ux-guidelines search
|
+- "Fix / improve existing UI"
|  +- Broken or inconsistent                  -> normalize tokens into DESIGN.md
|  +- Boring or generic                       -> style/color/font search, then revise DESIGN.md
|  +- Pre-launch quality pass                 -> lint + checklist + responsive validation
|
+- "Match a real brand's style"
|  +- Brand reference exists                  -> design-kit/getdesign, then translate to DESIGN.md
|  +- Brand reference absent                  -> infer tokens, document rationale, lint
|
+- "Implement Stitch/Pencil design as code"
   +- Extract design DNA                      -> DESIGN.md tokens + prose
   +- Implement                               -> code from DESIGN.md, export Tailwind if useful
```

## Canonical DESIGN.md Format

Use DESIGN.md for durable design-system handoff. The YAML frontmatter is machine-readable and normative. The markdown body is human-readable rationale.

### Token Schema

| Token Group | Shape | Notes |
|---|---|---|
| `version` | string | Optional; upstream alpha uses `alpha`. |
| `name` | string | Human-readable design system name. |
| `description` | string | Optional summary. |
| `colors` | map of token to hex color | Values must be sRGB hex strings such as `"#2563EB"`. |
| `typography` | map of token to typography object | Supports `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFeature`, `fontVariation`. |
| `rounded` | map of scale token to dimension | Use `none`, `sm`, `md`, `lg`, `xl`, `full` unless a domain needs more. |
| `spacing` | map of scale token to dimension or number | Use 4px/8px-derived rhythm. |
| `components` | map of component token to property tokens | Use references for `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. |

### Section Order

| Order | Section | When To Include |
|---:|---|---|
| 1 | `## Overview` | Always; product fit, personality, density, audience. |
| 2 | `## Colors` | Always when colors exist; explain role and contrast. |
| 3 | `## Typography` | Always when typography exists; explain hierarchy and loading. |
| 4 | `## Layout` | Grid, spacing, breakpoints, safe areas. |
| 5 | `## Elevation & Depth` | Shadows, borders, tonal layering, blur policy. |
| 6 | `## Shapes` | Radius scale and shape language. |
| 7 | `## Components` | Buttons, cards, forms, nav, states. |
| 8 | `## Do's and Don'ts` | Guardrails and anti-patterns. |

Read `references/design-md-spec.md` for the condensed normative spec and `references/design-md-format.md` for authoring examples.

## Data Assets

| Domain | Count | File | Example Keywords |
|---|---:|---|---|
| Styles | 91 | `data/styles.csv` | glassmorphism, minimalism, bento grid, spatial design, calm UI |
| Color palettes | 161 | `data/colors.csv` | SaaS, ecommerce, healthcare, beauty, fintech |
| Font pairings | 73 | `data/typography.csv` | elegant, playful, professional, modern |
| Product types | 161 | `data/products.csv` | SaaS, e-commerce, portfolio, healthcare |
| UX guidelines | 104 | `data/ux-guidelines.csv` | animation, accessibility, view transitions, APCA, popover |
| Chart types | 25 | `data/charts.csv` | trend, comparison, timeline, funnel, pie |
| Google Fonts | 1,923 | `data/google-fonts.csv` | sans serif, monospace, japanese, variable |
| Icons | 105 | `data/icons.csv` | action icons, navigation icons, status icons |
| Landing patterns | 34 | `data/landing.csv` | hero, social proof, conversion, pricing |
| App interface rules | 30 | `data/app-interface.csv` | layout, state, interaction, accessibility |
| React performance | 44 | `data/react-performance.csv` | memoization, suspense, hydration, bundle |
| Stacks | 16 | `data/stacks/*.csv` | angular, astro, flutter, html-tailwind, jetpack-compose, laravel, nextjs, nuxt-ui, nuxtjs, react-native, react, shadcn, svelte, swiftui, threejs, vue |

## Quick Start

### Generate From A Brief

```bash
cd .claude/skills/ultra-ui/lib
pnpm install
pnpm ultra-ui generate \
  --style "bento grid" \
  --palette "saas-blue" \
  --font "elegant" \
  --product "analytics dashboard" \
  --out ./DESIGN.md
```

The generator shells to `../scripts/search.py` for the top style, color, font, and product matches, emits DESIGN.md frontmatter and Overview/Colors/Typography prose, then runs official lint.

### Validate Existing DESIGN.md

```bash
cd .claude/skills/ultra-ui/lib
pnpm ultra-ui lint ../../examples/heritage/DESIGN.md
pnpm ultra-ui validate ../../examples/heritage/DESIGN.md
```

Fix `error` findings before export. Treat `warning` findings as review items, especially contrast and orphaned tokens.

### Diff Two Versions

```bash
cd .claude/skills/ultra-ui/lib
pnpm ultra-ui diff ./DESIGN.md ./DESIGN.next.md
```

Review removed tokens, modified colors, modified typography, and lint regressions before accepting a design-system change.

## CLI Search Workflow

Use the copied Python search when the user asks for design recommendation depth rather than a finished DESIGN.md file.

```bash
python3 .claude/skills/ultra-ui/scripts/search.py "<product industry tone>" --design-system
python3 .claude/skills/ultra-ui/scripts/search.py "bento" --domain style
python3 .claude/skills/ultra-ui/scripts/search.py "saas-blue" --domain color
python3 .claude/skills/ultra-ui/scripts/search.py "elegant" --domain typography
python3 .claude/skills/ultra-ui/scripts/search.py "dashboard" --domain product
python3 .claude/skills/ultra-ui/scripts/search.py "keyboard focus" --domain ux
python3 .claude/skills/ultra-ui/scripts/search.py "trend comparison" --domain chart
```

Use multi-dimensional queries: product + industry + tone. Example: `"fintech compliance dense operator console"`.

## Token Reference Resolution Rules

- Write references as `{group.token}` such as `{colors.primary}` or `{spacing.md}`.
- Hyphenated token names are valid: `{colors.on-primary}`.
- References must resolve inside the YAML tree; broken references are lint errors.
- Most references should point to primitive values. Component `typography` may point to a composite typography object.
- Frontmatter wins when prose and tokens disagree.
- If a requested token is missing, search the data assets first, then add the token and rerun lint.
- Unknown section headings should be preserved. Unknown component properties can warn, so prefer spec properties.

## WCAG Contrast Notes

- The linter checks component `backgroundColor` and `textColor` pairs when both resolve to colors.
- Normal text target: 4.5:1 or better.
- UI graphics and large text: 3:1 minimum; generated systems should still prefer 4.5:1.
- Define `on-*` foreground tokens for each saturated background token.
- Do not use decorative accents as text backgrounds unless an accessible `on-accent` token exists.
- Pair color state with text, icon semantics, or ARIA state; never rely on color alone.

## Pre-Delivery Checklist

### DESIGN.md

- [ ] YAML frontmatter parses.
- [ ] `name`, `colors.primary`, typography, rounded, spacing, and representative component tokens exist.
- [ ] Token references resolve; no `broken-ref` errors.
- [ ] Sections follow canonical order.
- [ ] DESIGN.md lints clean or warnings are explicitly resolved.
- [ ] Contrast passes WCAG AA for text-bearing component pairs.
- [ ] Tailwind/DTCG exports are regenerated from DESIGN.md, not edited manually.

### Visual Quality

- [ ] No emojis used as icons; use SVG or the target app's icon system.
- [ ] Consistent icon family and stroke style.
- [ ] Typography matches defined tokens; no ad-hoc sizes.
- [ ] Colors match semantic tokens; no random grays.
- [ ] Spacing follows the defined rhythm.
- [ ] Pressed states do not shift layout bounds.
- [ ] At least one distinctive design element makes the experience memorable.

### Interaction And Accessibility

- [ ] Interactive elements have hover, focus-visible, active, disabled, loading, and error states as relevant.
- [ ] Touch targets are at least 44x44pt on iOS and 48x48dp on Android.
- [ ] Transitions are 150-300ms and respect reduced motion.
- [ ] Focus order matches visual order.
- [ ] Forms have visible labels and accessible error messages.
- [ ] Color is not the only state indicator.

### Responsive

- [ ] Works at 375px, 768px, 1024px, and 1440px.
- [ ] Landscape orientation remains readable.
- [ ] Safe areas are respected.
- [ ] Content is not hidden behind fixed or sticky bars.
- [ ] Horizontal insets adapt by device size.

## References Index

| Reference | Read When |
|---|---|
| `references/design-md-spec.md` | Need the normative DESIGN.md schema and consumer behavior. |
| `references/design-md-format.md` | Need to write or repair DESIGN.md structure. |
| `references/design-md-validation.md` | Need lint rule meanings, WCAG notes, or diff review guidance. |
| `references/ux-laws.md` | Need UX laws, heuristics, and Gestalt principles. |
| `references/design-languages.md` | Need a named design language or style direction. |
| `references/color-systems.md` | Need OKLCH, semantic tokens, dark mode, or accessible palette strategy. |
| `references/themes.md` | Need ready-made theme palettes and exact hex values. |
| `references/component-patterns.md` | Need button/card/input/form implementation patterns. |
| `references/stitch-workflow.md` | Need Stitch or Pencil MCP design workflows. |
| `references/font-pairings.md` | Need curated type pairing options. |
| `references/design-systems.md` | Need examples from established design systems. |
| `references/composition-rules.md` | Need visual hierarchy, grid, balance, and composition rules. |
| `references/illustration-backends.md` | Need custom illustration generation backends. |
| `references/modern-techniques.md` | Need modern CSS, animation, token, APCA, or platform techniques. |
| `references/modern-patterns.md` | Need bento, kinetic, AI chat, command palette, or spatial UI patterns. |
| `references/operator-console-style.md` | Need dense control-plane/operator-console aesthetics. |
| `references/ui-styling/shadcn-components.md` | Need shadcn/ui component usage. |
| `references/ui-styling/shadcn-theming.md` | Need shadcn theme and CSS variable guidance. |
| `references/ui-styling/shadcn-accessibility.md` | Need shadcn ARIA, focus, and keyboard patterns. |
| `references/ui-styling/tailwind-utilities.md` | Need Tailwind utility class guidance. |
| `references/ui-styling/tailwind-responsive.md` | Need responsive Tailwind and container query patterns. |
| `references/ui-styling/tailwind-customization.md` | Need Tailwind theme customization and plugins. |
| `references/ui-styling/canvas-design-system.md` | Need canvas-based visual design philosophy. |

## Attribution

DESIGN.md spec and examples are from `google-labs-code/design.md` by Google LLC. See `THIRD_PARTY_NOTICES.md` for license and source details.
