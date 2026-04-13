---
name: brand-studio
description: "Unified brand identity pipeline — brand voice, visual identity, messaging frameworks, asset management, brand consistency, plus full brand kit generator (strategy → color palette → typography → CSS tokens → guidelines). Pipeline: creative vision → brand strategy → full kit."
layer: orchestrator
category: design
triggers: ["brand", "brand assets", "brand color", "brand consistency", "brand guide", "brand guidelines", "brand identity", "brand kit", "brand package", "brand system", "brand tokens", "brand typography", "brand voice", "brandkit", "full brand", "generate brand", "logo design", "logo usage", "messaging framework", "style guide", "visual identity"]
---

# brand-studio

Unified brand identity pipeline — brand voice, visual identity, messaging frameworks, asset management, brand consistency, plus full brand kit generator (strategy → color palette → typography → CSS tokens → guidelines). Pipeline: creative vision → brand strategy → full kit.


## Absorbs

- `brand`
- `brandkit-gen`


---

## From `ckm:brand`

> Brand voice, visual identity, messaging frameworks, asset management, brand consistency. Activate for branded content, tone of voice, marketing assets, brand compliance, style guides.

# Brand

Brand identity, voice, messaging, asset management, and consistency frameworks.

## When to Use

- Brand voice definition and content tone guidance
- Visual identity standards and style guide development
- Messaging framework creation
- Brand consistency review and audit
- Asset organization, naming, and approval
- Color palette management and typography specs

## Quick Start

**Inject brand context into prompts:**
```bash
node scripts/inject-brand-context.cjs
node scripts/inject-brand-context.cjs --json
```

**Validate an asset:**
```bash
node scripts/validate-asset.cjs <asset-path>
```

**Extract/compare colors:**
```bash
node scripts/extract-colors.cjs --palette
node scripts/extract-colors.cjs <image-path>
```

## Brand Sync Workflow

```bash
# 1. Edit docs/brand-guidelines.md (or use /brand update)
# 2. Sync to design tokens
node scripts/sync-brand-to-tokens.cjs
# 3. Verify
node scripts/inject-brand-context.cjs --json | head -20
```

**Files synced:**
- `docs/brand-guidelines.md` → Source of truth
- `assets/design-tokens.json` → Token definitions
- `assets/design-tokens.css` → CSS variables

## Subcommands

| Subcommand | Description | Reference |
|------------|-------------|-----------|
| `update` | Update brand identity and sync to all design systems | `references/update.md` |

## References

| Topic | File |
|-------|------|
| Voice Framework | `references/voice-framework.md` |
| Visual Identity | `references/visual-identity.md` |
| Messaging | `references/messaging-framework.md` |
| Consistency | `references/consistency-checklist.md` |
| Guidelines Template | `references/brand-guideline-template.md` |
| Asset Organization | `references/asset-organization.md` |
| Color Management | `references/color-palette-management.md` |
| Typography | `references/typography-specifications.md` |
| Logo Usage | `references/logo-usage-rules.md` |
| Approval Checklist | `references/approval-checklist.md` |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/inject-brand-context.cjs` | Extract brand context for prompt injection |
| `scripts/sync-brand-to-tokens.cjs` | Sync brand-guidelines.md → design-tokens.json/css |
| `scripts/validate-asset.cjs` | Validate asset naming, size, format |
| `scripts/extract-colors.cjs` | Extract and compare colors against palette |

## Templates

| Template | Purpose |
|----------|---------|
| `templates/brand-guidelines-starter.md` | Complete starter template for new brands |

## Routing

1. Parse subcommand from `$ARGUMENTS` (first word)
2. Load corresponding `references/{subcommand}.md`
3. Execute with remaining arguments


---

## From `brandkit-gen`

> Full brand kit generator. From a single prompt, produces: brand strategy + voice, color palette, typography system, logo SVG, CSS design tokens, component preview, social banners, OG image, and a brand guidelines doc. Chains brand → design-system → impeccable-frontend-design → banner-design.

# BrandKit Generator

> One prompt → complete brand system. Strategy, tokens, logo, components, banners, guidelines.

## What Gets Generated

| Deliverable | Description |
|---|---|
| `brandkit/guidelines/brand-guidelines.md` | Full brand doc: voice, personality, usage rules |
| `brandkit/tokens/design-tokens.css` | CSS variables (primitive → semantic → component) |
| `brandkit/tokens/design-tokens.json` | Token source of truth for design tools |
| `brandkit/logo/logo-primary.svg` | Primary logo (wordmark + mark) |
| `brandkit/logo/logo-mark.svg` | Icon/mark only |
| `brandkit/logo/logo-dark.svg` | Dark background variant |
| `brandkit/logo/favicon.svg` | 32×32 favicon |
| `brandkit/components/preview.html` | Button, card, badge, input, navbar showcase |
| `brandkit/banners/og-image.html` | 1200×630 Open Graph / social share image |
| `brandkit/banners/twitter-header.html` | 1500×500 Twitter/X header |
| `brandkit/banners/linkedin-cover.html` | 1584×396 LinkedIn cover |

---

## Phase 0 — Discovery

Collect brand context. If `$ARGUMENTS` is short/absent, ask:

```
Brand name:
Industry / product type:
Target audience:
3 personality adjectives: (e.g. "bold, minimal, human")
Competitors to NOT look like:
Reference brands you admire: (optional)
Primary use: web app / marketing site / mobile app / SaaS / consumer
Color preferences or restrictions: (optional)
Light / dark / both themes:
```

If `$ARGUMENTS` contains enough context, skip straight to Phase 1. Parse:
- `brandName` — the name
- `industry` — what it does
- `audience` — who for
- `adjectives` — personality words (default: "modern, professional, trustworthy")
- `antiReferences` — brands to avoid resembling
- `colorHints` — any color direction

---

## Phase 1 — Brand Strategy

1. **Invoke `brand`** — Generate brand personality, archetype, tone of voice, and messaging framework based on parsed context.

### 1.1 Brand Personality
- **3-word essence**: distill adjectives into a precise brand character
- **Brand archetype**: (Hero / Sage / Creator / Explorer / Rebel / etc.)
- **Tone of voice**: formal↔casual, serious↔playful, technical↔accessible
- **What it is / is not**: 3 contrasting pairs (e.g. "Precise, not pedantic")

### 1.2 Messaging Framework
- **Tagline**: 5–8 words, active, memorable
- **Elevator pitch**: 1 sentence, audience + value + differentiator
- **Value propositions**: 3 bullets, benefit-first
- **Brand story hook**: 2–3 sentences establishing why this exists

---

## Phase 2 — Visual Identity System

2. **Invoke `design-system`** — Generate color palette, typography selection, and spacing/shape tokens grounded in brand personality.
3. **Invoke `impeccable-frontend-design`** — Apply visual design standards to ensure the palette, type scale, and radii meet production quality.

### 2.1 Color Palette

Generate a cohesive palette derived from brand personality:

```
Primary:    #______  (main brand color — buttons, links, accents)
Secondary:  #______  (supporting — hover states, tags, subtle backgrounds)
Accent:     #______  (highlight, CTA emphasis, special moments)
Neutral-50: #______
Neutral-100:#______
Neutral-200:#______
Neutral-700:#______
Neutral-900:#______
Success:    #______
Warning:    #______
Error:      #______
```

**Rules:**
- Primary must pass WCAG AA against white (4.5:1) for text use
- Accent should be optically distinct from Primary (>30° hue difference)
- Derive palette from a single "seed" hue then build systematic scale
- No more than 2 saturated hues in the base palette

### 2.2 Typography

Select 2 typefaces (all from Google Fonts, no licensing risk):

```
Display / Heading: ________ — [rationale tied to personality]
Body / UI:         ________ — [rationale tied to personality]
Mono (optional):   ________ — only if product is dev/technical
```

**Scale** (rem, 1.25× modular):
```
xs:   0.75rem  (12px) — captions, labels
sm:   0.875rem (14px) — secondary text, meta
base: 1rem     (16px) — body, UI
lg:   1.125rem (18px) — lead text
xl:   1.25rem  (20px) — card titles
2xl:  1.5rem   (24px) — section headings
3xl:  1.875rem (30px) — page headings
4xl:  2.25rem  (36px) — hero titles
5xl:  3rem     (48px) — display
```

### 2.3 Spacing & Shape

```
Radius tokens:
  --radius-sm:  4px   (tags, chips)
  --radius-md:  8px   (inputs, buttons)
  --radius-lg:  12px  (cards, panels)
  --radius-xl:  16px  (modals, drawers)
  --radius-full: 9999px (pills, avatars)

Shadow tokens:
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.08)
  --shadow-md:  0 4px 12px rgba(0,0,0,0.10)
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.12)
```

---

## Phase 3 — Design Tokens

4. **Invoke `design-system`** — Generate the full primitive → semantic → dark-theme CSS token file and the W3C JSON token source.

Generate `brandkit/tokens/design-tokens.css`:

```css
/* ── Primitive tokens ──────────────────────────────────── */
:root {
  /* Colors */
  --color-primary-500: <hex>;
  --color-primary-400: <lighter>;
  --color-primary-600: <darker>;
  /* ... full scale */

  /* Typography */
  --font-heading: '<Heading Font>', system-ui, sans-serif;
  --font-body: '<Body Font>', system-ui, sans-serif;
  --font-mono: '<Mono Font>', ui-monospace, monospace;

  /* Radii, shadows, spacing scale */
}

/* ── Semantic tokens ───────────────────────────────────── */
:root {
  --color-brand: var(--color-primary-500);
  --color-brand-hover: var(--color-primary-600);
  --color-text: var(--color-neutral-900);
  --color-text-muted: var(--color-neutral-600);
  --color-bg: var(--color-neutral-50);
  --color-surface: #ffffff;
  --color-border: var(--color-neutral-200);
}

/* ── Dark theme ────────────────────────────────────────── */
[data-theme="dark"] {
  --color-text: var(--color-neutral-50);
  --color-bg: var(--color-neutral-950);
  --color-surface: var(--color-neutral-900);
  --color-border: var(--color-neutral-800);
}
```

Also generate `brandkit/tokens/design-tokens.json` in W3C Design Tokens format.

---

## Phase 4 — Logo System

5. **Invoke `impeccable-frontend-design`** — Design and generate SVG logo files (primary, mark-only, dark variant, favicon) following logo mark design principles.

Generate SVG logos. Rules:
- Logo mark should be abstract or letterform — NOT a generic clip-art icon
- Must work at 16px (favicon) and 512px scale
- No gradients in the mark (flat colors only, max 2 colors) — gradients can be in wordmark
- Primary logo = mark + wordmark side-by-side
- Mark-only variant = just the icon
- Dark variant = inverted for dark backgrounds

### Logo Mark Design Principles
- Derive mark geometry from brand personality:
  - Bold/confident → strong geometric shapes, thick strokes
  - Elegant/premium → thin strokes, negative space, refined letterforms
  - Technical/precise → grid-aligned, monospace-inspired
  - Friendly/approachable → rounded, organic curves
- The mark should be unique — avoid generic shapes (plain circle, plain square)
- Consider using a letterform from the brand name as the mark base

Generate 3 SVG files:
1. `logo-primary.svg` — mark + wordmark, horizontal layout, light bg
2. `logo-mark.svg` — mark only, suitable for favicon/app icon
3. `logo-dark.svg` — white version for dark backgrounds

---

## Phase 5 — Component Preview

6. **Invoke `impeccable-frontend-design`** — Build the full-featured HTML component preview file that applies all design tokens to real UI components.

Generate `brandkit/components/preview.html` — a single HTML file showing the brand applied to real UI:

**Must include:**
- Color swatches grid
- Typography scale display (all sizes, both fonts)
- Button variants: primary, secondary, ghost, danger — default + hover states
- Form input (text, select, checkbox, radio, toggle)
- Card component with shadow and border variants
- Badge variants: success, warning, error, info, neutral
- Avatar component
- Navigation bar (logo + nav links + CTA button)

**Requirements:**
- Import `../tokens/design-tokens.css` — no hardcoded colors
- Include `<link>` for Google Fonts loaded in the HTML
- Dark mode toggle button (adds `data-theme="dark"` to `<html>`)
- Responsive, max-width 1200px container
- Print-friendly (no dark backgrounds on print)

---

## Phase 6 — Social Banners

7. **Invoke `banner-design`** — Generate the three social banner HTML files (OG image, Twitter/X header, LinkedIn cover) at exact pixel dimensions with inline CSS.

Generate 3 HTML banners (exact pixel dimensions, inline CSS):

### OG Image — `brandkit/banners/og-image.html`
- **Size**: 1200 × 630px
- **Content**: Logo + tagline + subtle background pattern
- **Purpose**: Social share card, Twitter/OG meta image

### Twitter/X Header — `brandkit/banners/twitter-header.html`
- **Size**: 1500 × 500px
- **Content**: Brand visual + tagline, logo bottom-left
- **Safe zone**: content in center 1200×400

### LinkedIn Cover — `brandkit/banners/linkedin-cover.html`
- **Size**: 1584 × 396px
- **Content**: Brand statement, subtle visual system
- **Safe zone**: center 1270×396

**Banner rules (from `banner-design` skill):**
- One CTA max per banner
- All colors from design tokens
- Min 4.5:1 contrast on text
- No more than 2 typefaces
- Text ≤20% of banner area (ad network compliance)

---

## Phase 7 — Brand Guidelines Document

8. **Invoke `brand`** — Compile all generated assets into the final brand-guidelines.md with voice, color system, typography, logo usage, and do/don't rules.

Generate `brandkit/guidelines/brand-guidelines.md`:

```markdown
# [Brand Name] — Brand Guidelines

## Brand Essence
[3-word essence], [archetype], [tagline]

## Personality & Voice
...tone, what it is/isn't, writing style

## Color System
...palette with hex values, usage rules, accessibility notes

## Typography
...typefaces, scale, usage rules, pairing examples

## Logo Usage
...clear space rules, minimum size, approved/prohibited usages

## Component Patterns
...link to preview.html, key UI principles

## Social Media
...banner files, profile photo specs

## Do / Don't
...10 concrete dos and don'ts with rationale
```

---

## Output Summary

After all phases complete, print a summary:

```
✓ Brand Strategy    brandkit/guidelines/brand-guidelines.md
✓ Design Tokens     brandkit/tokens/design-tokens.css + .json
✓ Logo System       brandkit/logo/ (3 SVG files + favicon)
✓ Component Preview brandkit/components/preview.html
✓ OG Image          brandkit/banners/og-image.html
✓ Twitter Header    brandkit/banners/twitter-header.html
✓ LinkedIn Cover    brandkit/banners/linkedin-cover.html

Open preview:
  open brandkit/components/preview.html
```

---

## Quality Gates

Before completing, verify:
- [ ] All SVG logos render at 16px AND 256px without artifacts
- [ ] Primary color passes WCAG AA on white (`contrast-ratio primary #fff ≥ 4.5`)
- [ ] Component preview loads without console errors
- [ ] Dark mode toggle works in preview.html
- [ ] All banner files are exact pixel dimensions (check via viewBox)
- [ ] Design tokens CSS has no hardcoded hex values in semantic/component layer
- [ ] Brand voice is consistent across guidelines doc

---

## Usage

```
/brandkit-gen Plano — AI proxy infrastructure for enterprise teams. Bold, technical, minimal.

/brandkit-gen Meey — Vietnam real estate platform. Trustworthy, modern, local warmth.

/brandkit-gen InuAuth — developer auth library. Clean, precise, no-nonsense.
```

