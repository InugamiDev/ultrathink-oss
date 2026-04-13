---
name: design-kit
description: "Unified design foundations — design system architecture, tokens, component specs, visual principles, creative vision, figma integration, plus brand design system loader (66 real brands via DESIGN.md). Absorbs design, design-system, design-systems, design-principles, design-router, creative-vision, figma, design-md."
layer: hub
category: design
triggers: ["UI library", "aesthetic", "auto layout", "beautify", "brainstorm design", "brand identity", "brand reference", "brand style", "branding", "build page", "claymorphism", "clone style", "code to figma", "color palette", "color theory", "color tokens", "component architecture", "component library", "component spec", "create brand", "create component", "creative direction", "css variables", "dark mode", "dashboard", "design", "design concept", "design direction", "design handoff", "design language", "design like", "design principles", "design system", "design token", "design tokens", "design.md", "elevate", "explore styles", "figma", "figma api", "figma component", "figma dev mode", "figma handoff", "figma to code", "figma variables", "font", "font pairing", "glassmorphism", "how should it look", "improve design", "improve the style", "landing page", "layout", "like airbnb", "like claude", "like figma", "like linear", "like notion", "like stripe", "like vercel", "liquid glass", "logo design", "look and feel", "look like", "make it look", "make it unique", "match brand", "match the style", "minimalism", "mood board", "polish", "primitive component", "real brand", "redesign", "reference brand", "reference design", "responsive", "spacing", "spacing scale", "spacing system", "storybook", "style", "style of", "theme", "token architecture", "token system", "typography", "typography scale", "ui", "variant", "vibe", "visual design", "visual hierarchy", "visual identity", "what color", "what style", "what would look good", "which font", "whitespace"]
---

# design-kit

Unified design foundations — design system architecture, tokens, component specs, visual principles, creative vision, figma integration, plus brand design system loader (66 real brands via DESIGN.md). Absorbs design, design-system, design-systems, design-principles, design-router, creative-vision, figma, design-md.


## Absorbs

- `design`
- `design-system`
- `design-systems`
- `design-principles`
- `design-router`
- `creative-vision`
- `figma`
- `design-md`


---

## From `ckm:design`

> Comprehensive design skill: brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), corporate identity program (50 deliverables, CIP mockups), HTML presentations (Chart.js), banner design (22 styles, social/ads/web/print), icon design (15 styles, SVG, Gemini 3.1 Pro), social photos (HTML→screenshot, multi-platform). Actions: design logo, create CIP, generate mockups, build slides, design banner, generate icon, create social photos, social media images, brand identity, design system. Platforms: Facebook, Twitter, LinkedIn, YouTube, Instagram, Pinterest, TikTok, Threads, Google Ads.

# Design

Unified design skill: brand, tokens, UI, logo, CIP, slides, banners, social photos, icons.

## When to Use

- Brand identity, voice, assets
- Design system tokens and specs
- UI styling with shadcn/ui + Tailwind
- Logo design and AI generation
- Corporate identity program (CIP) deliverables
- Presentations and pitch decks
- Banner design for social media, ads, web, print
- Social photos for Instagram, Facebook, LinkedIn, Twitter, Pinterest, TikTok

## Brand Reference (DESIGN.md)

Fetch and apply DESIGN.md files from the [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) ecosystem. Each file is a complete, AI-readable design spec with exact CSS values for 66 real brands.

### Fetching a Brand

```bash
npx getdesign@latest add <brand>
```

### Available Brands (66)

| Category | Brands |
|----------|--------|
| AI / LLM | claude, cohere, elevenlabs, minimax, mistral.ai, ollama, opencode.ai, replicate, runwayml, together.ai, x.ai |
| Dev Tools | cursor, expo, raycast, vercel, warp, composio, lovable, voltagent |
| Backend | clickhouse, hashicorp, mongodb, sentry, supabase, posthog, sanity |
| SaaS | linear.app, notion, cal, zapier, intercom, miro, superhuman, semrush, mintlify, resend |
| Design | figma, framer, webflow, airtable |
| Fintech | stripe, coinbase, kraken, revolut, wise |
| Consumer | airbnb, pinterest, shopify, uber, spotify |
| Tech | apple, nvidia, ibm, spacex, clay |
| Auto | tesla, ferrari, bmw, lamborghini, renault |

### DESIGN.md Structure

Every file follows 9 sections:

1. **Visual Theme & Atmosphere** — brand philosophy, key characteristics
2. **Color Palette & Roles** — exact hex/hsla by role (primary, accent, neutrals, surfaces, shadows)
3. **Typography Rules** — font families + fallbacks, full size/weight/line-height hierarchy
4. **Component Stylings** — buttons, cards, inputs, navigation with exact padding/radius/shadow
5. **Layout Principles** — spacing system (base unit + scale), grid widths, border radius scale
6. **Depth & Elevation** — shadow levels (0-3 + focus)
7. **Do's and Don'ts** — explicit brand usage rules
8. **Responsive Behavior** — breakpoints, touch targets, collapsing strategy
9. **Agent Prompt Guide** — quick color reference, example component prompts

### Translating to Tailwind v4

```css
@theme {
  --color-primary: <primary hex>;
  --color-accent: <accent hex>;
  --color-surface: <surface hex>;
  --color-border: <border hex>;
  --font-sans: <font family stack>;
  --font-mono: <mono family stack>;
  --spacing-base: <base unit>;
  --radius-sm: <small radius>;
  --radius-md: <medium radius>;
  --radius-lg: <large radius>;
  --shadow-sm: <level 0 shadow>;
  --shadow-md: <level 1 shadow>;
  --shadow-lg: <level 2 shadow>;
}
```

### Translating to CSS Custom Properties

```css
:root {
  --color-bg: <bg hex>;
  --color-fg: <text hex>;
  --color-primary: <primary hex>;
  --color-muted: <muted hex>;
  --color-border: <border hex>;
  --font-sans: <sans stack>;
  --font-size-base: <base size>;
  --line-height-base: <line height>;
  --space-unit: <base unit>;
  --shadow-sm: <shadow>;
  --shadow-md: <shadow>;
  --shadow-lg: <shadow>;
  --radius-sm: <radius>;
  --radius-md: <radius>;
  --radius-lg: <radius>;
}
```

### Blending Multiple Brands

When mixing styles ("Linear's layout with Stripe's colors"):
1. Fetch both DESIGN.md files
2. Extract relevant sections from each
3. Resolve conflicts (colors from one, typography from another)
4. Document which brand each token came from

## Sub-skill Routing

| Task | Sub-skill | Details |
|------|-----------|---------|
| Brand identity, voice, assets | `brand` | External skill |
| Tokens, specs, CSS vars | `design-system` | External skill |
| shadcn/ui, Tailwind, code | `ui-styling` | External skill |
| Logo creation, AI generation | Logo (built-in) | `references/logo-design.md` |
| CIP mockups, deliverables | CIP (built-in) | `references/cip-design.md` |
| Presentations, pitch decks | Slides (built-in) | `references/slides.md` |
| Banners, covers, headers | Banner (built-in) | `references/banner-sizes-and-styles.md` |
| Social media images/photos | Social Photos (built-in) | `references/social-photos-design.md` |
| SVG icons, icon sets | Icon (built-in) | `references/icon-design.md` |

## Logo Design (Built-in)

55+ styles, 30 color palettes, 25 industry guides. Gemini Nano Banana models.

### Logo: Generate Design Brief

```bash
python3 ~/.claude/skills/design/scripts/logo/search.py "tech startup modern" --design-brief -p "BrandName"
```

### Logo: Search Styles/Colors/Industries

```bash
python3 ~/.claude/skills/design/scripts/logo/search.py "minimalist clean" --domain style
python3 ~/.claude/skills/design/scripts/logo/search.py "tech professional" --domain color
python3 ~/.claude/skills/design/scripts/logo/search.py "healthcare medical" --domain industry
```

### Logo: Generate with AI

**ALWAYS** generate output logo images with white background.

```bash
python3 ~/.claude/skills/design/scripts/logo/generate.py --brand "TechFlow" --style minimalist --industry tech
python3 ~/.claude/skills/design/scripts/logo/generate.py --prompt "coffee shop vintage badge" --style vintage
```

**IMPORTANT:** When scripts fail, try to fix them directly.

After generation, **ALWAYS** ask user about HTML preview via `AskUserQuestion`. If yes, invoke `/ui-ux-pro-max` for gallery.

## CIP Design (Built-in)

50+ deliverables, 20 styles, 20 industries. Gemini Nano Banana (Flash/Pro).

### CIP: Generate Brief

```bash
python3 ~/.claude/skills/design/scripts/cip/search.py "tech startup" --cip-brief -b "BrandName"
```

### CIP: Search Domains

```bash
python3 ~/.claude/skills/design/scripts/cip/search.py "business card letterhead" --domain deliverable
python3 ~/.claude/skills/design/scripts/cip/search.py "luxury premium elegant" --domain style
python3 ~/.claude/skills/design/scripts/cip/search.py "hospitality hotel" --domain industry
python3 ~/.claude/skills/design/scripts/cip/search.py "office reception" --domain mockup
```

### CIP: Generate Mockups

```bash
# With logo (RECOMMENDED)
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --deliverable "business card" --industry "consulting"

# Full CIP set
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo /path/to/logo.png --industry "consulting" --set

# Pro model (4K text)
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TopGroup" --logo logo.png --deliverable "business card" --model pro

# Without logo
python3 ~/.claude/skills/design/scripts/cip/generate.py --brand "TechFlow" --deliverable "business card" --no-logo-prompt
```

Models: `flash` (default, `gemini-2.5-flash-image`), `pro` (`gemini-3-pro-image-preview`)

### CIP: Render HTML Presentation

```bash
python3 ~/.claude/skills/design/scripts/cip/render-html.py --brand "TopGroup" --industry "consulting" --images /path/to/cip-output
```

**Tip:** If no logo exists, use Logo Design section above first.

## Slides (Built-in)

Strategic HTML presentations with Chart.js, design tokens, copywriting formulas.

Load `references/slides-create.md` for the creation workflow.

### Slides: Knowledge Base

| Topic | File |
|-------|------|
| Creation Guide | `references/slides-create.md` |
| Layout Patterns | `references/slides-layout-patterns.md` |
| HTML Template | `references/slides-html-template.md` |
| Copywriting | `references/slides-copywriting-formulas.md` |
| Strategies | `references/slides-strategies.md` |

## Banner Design (Built-in)

22 art direction styles across social, ads, web, print. Uses `frontend-design`, `ai-artist`, `ai-multimodal`, `chrome-devtools` skills.

Load `references/banner-sizes-and-styles.md` for complete sizes and styles reference.

### Banner: Workflow

1. **Gather requirements** via `AskUserQuestion` — purpose, platform, content, brand, style, quantity
2. **Research** — Activate `ui-ux-pro-max`, browse Pinterest for references
3. **Design** — Create HTML/CSS banner with `frontend-design`, generate visuals with `ai-artist`/`ai-multimodal`
4. **Export** — Screenshot to PNG at exact dimensions via `chrome-devtools`
5. **Present** — Show all options side-by-side, iterate on feedback

### Banner: Quick Size Reference

| Platform | Type | Size (px) |
|----------|------|-----------|
| Facebook | Cover | 820 x 312 |
| Twitter/X | Header | 1500 x 500 |
| LinkedIn | Personal | 1584 x 396 |
| YouTube | Channel art | 2560 x 1440 |
| Instagram | Story | 1080 x 1920 |
| Instagram | Post | 1080 x 1080 |
| Google Ads | Med Rectangle | 300 x 250 |
| Website | Hero | 1920 x 600-1080 |

### Banner: Top Art Styles

| Style | Best For |
|-------|----------|
| Minimalist | SaaS, tech |
| Bold Typography | Announcements |
| Gradient | Modern brands |
| Photo-Based | Lifestyle, e-com |
| Geometric | Tech, fintech |
| Glassmorphism | SaaS, apps |
| Neon/Cyberpunk | Gaming, events |

### Banner: Design Rules

- Safe zones: critical content in central 70-80%
- One CTA per banner, bottom-right, min 44px height
- Max 2 fonts, min 16px body, ≥32px headline
- Text under 20% for ads (Meta penalizes)
- Print: 300 DPI, CMYK, 3-5mm bleed

## Icon Design (Built-in)

15 styles, 12 categories. Gemini 3.1 Pro Preview generates SVG text output.

### Icon: Generate Single Icon

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "settings gear" --style outlined
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "shopping cart" --style filled --color "#6366F1"
python3 ~/.claude/skills/design/scripts/icon/generate.py --name "dashboard" --category navigation --style duotone
```

### Icon: Generate Batch Variations

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "cloud upload" --batch 4 --output-dir ./icons
```

### Icon: Multi-size Export

```bash
python3 ~/.claude/skills/design/scripts/icon/generate.py --prompt "user profile" --sizes "16,24,32,48" --output-dir ./icons
```

### Icon: Top Styles

| Style | Best For |
|-------|----------|
| outlined | UI interfaces, web apps |
| filled | Mobile apps, nav bars |
| duotone | Marketing, landing pages |
| rounded | Friendly apps, health |
| sharp | Tech, fintech, enterprise |
| flat | Material design, Google-style |
| gradient | Modern brands, SaaS |

**Model:** `gemini-3.1-pro-preview` — text-only output (SVG is XML text). No image generation API needed.

## Social Photos (Built-in)

Multi-platform social image design: HTML/CSS → screenshot export. Uses `ui-ux-pro-max`, `brand`, `design-system`, `chrome-devtools` skills.

Load `references/social-photos-design.md` for sizes, templates, best practices.

### Social Photos: Workflow

1. **Orchestrate** — `project-management` skill for TODO tasks; parallel subagents for independent work
2. **Analyze** — Parse prompt: subject, platforms, style, brand context, content elements
3. **Ideate** — 3-5 concepts, present via `AskUserQuestion`
4. **Design** — `/ckm:brand` → `/ckm:design-system` → randomly invoke `/ck:ui-ux-pro-max` OR `/ck:frontend-design`; HTML per idea × size
5. **Export** — `chrome-devtools` or Playwright screenshot at exact px (2x deviceScaleFactor)
6. **Verify** — Use Chrome MCP or `chrome-devtools` skill to visually inspect exported designs; fix layout/styling issues and re-export
7. **Report** — Summary to `plans/reports/` with design decisions
8. **Organize** — Invoke `assets-organizing` skill to sort output files and reports

### Social Photos: Key Sizes

| Platform | Size (px) | Platform | Size (px) |
|----------|-----------|----------|-----------|
| IG Post | 1080×1080 | FB Post | 1200×630 |
| IG Story | 1080×1920 | X Post | 1200×675 |
| IG Carousel | 1080×1350 | LinkedIn | 1200×627 |
| YT Thumb | 1280×720 | Pinterest | 1000×1500 |

## Workflows

### Complete Brand Package

1. **Logo** → `scripts/logo/generate.py` → Generate logo variants
2. **CIP** → `scripts/cip/generate.py --logo ...` → Create deliverable mockups
3. **Presentation** → Load `references/slides-create.md` → Build pitch deck

### New Design System

1. **Brand** (brand skill) → Define colors, typography, voice
2. **Tokens** (design-system skill) → Create semantic token layers
3. **Implement** (ui-styling skill) → Configure Tailwind, shadcn/ui

## References

| Topic | File |
|-------|------|
| Design Routing | `references/design-routing.md` |
| Logo Design Guide | `references/logo-design.md` |
| Logo Styles | `references/logo-style-guide.md` |
| Logo Colors | `references/logo-color-psychology.md` |
| Logo Prompts | `references/logo-prompt-engineering.md` |
| CIP Design Guide | `references/cip-design.md` |
| CIP Deliverables | `references/cip-deliverable-guide.md` |
| CIP Styles | `references/cip-style-guide.md` |
| CIP Prompts | `references/cip-prompt-engineering.md` |
| Slides Create | `references/slides-create.md` |
| Slides Layouts | `references/slides-layout-patterns.md` |
| Slides Template | `references/slides-html-template.md` |
| Slides Copy | `references/slides-copywriting-formulas.md` |
| Slides Strategy | `references/slides-strategies.md` |
| Banner Sizes & Styles | `references/banner-sizes-and-styles.md` |
| Social Photos Guide | `references/social-photos-design.md` |
| Icon Design Guide | `references/icon-design.md` |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/logo/search.py` | Search logo styles, colors, industries |
| `scripts/logo/generate.py` | Generate logos with Gemini AI |
| `scripts/logo/core.py` | BM25 search engine for logo data |
| `scripts/cip/search.py` | Search CIP deliverables, styles, industries |
| `scripts/cip/generate.py` | Generate CIP mockups with Gemini |
| `scripts/cip/render-html.py` | Render HTML presentation from CIP mockups |
| `scripts/cip/core.py` | BM25 search engine for CIP data |
| `scripts/icon/generate.py` | Generate SVG icons with Gemini 3.1 Pro |

## Setup

```bash
export GEMINI_API_KEY="your-key"  # https://aistudio.google.com/apikey
pip install google-genai pillow
```

## Integration

**External sub-skills:** brand, design-system, ui-styling
**Related Skills:** frontend-design, ui-ux-pro-max, ai-multimodal, chrome-devtools


---

## From `ckm:design-system`

> Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→component), CSS variables, spacing/typography scales, component specs, strategic slide creation. Use for design tokens, systematic design, brand-compliant presentations.

# Design System

Token architecture, component specifications, systematic design, slide generation.

## When to Use

- Design token creation
- Component state definitions
- CSS variable systems
- Spacing/typography scales
- Design-to-code handoff
- Tailwind theme configuration
- **Slide/presentation generation**

## Token Architecture

Load: `references/token-architecture.md`

### Three-Layer Structure

```
Primitive (raw values)
       ↓
Semantic (purpose aliases)
       ↓
Component (component-specific)
```

**Example:**
```css
/* Primitive */
--color-blue-600: #2563EB;

/* Semantic */
--color-primary: var(--color-blue-600);

/* Component */
--button-bg: var(--color-primary);
```

## Quick Start

**Generate tokens:**
```bash
node scripts/generate-tokens.cjs --config tokens.json -o tokens.css
```

**Validate usage:**
```bash
node scripts/validate-tokens.cjs --dir src/
```

## References

| Topic | File |
|-------|------|
| Token Architecture | `references/token-architecture.md` |
| Primitive Tokens | `references/primitive-tokens.md` |
| Semantic Tokens | `references/semantic-tokens.md` |
| Component Tokens | `references/component-tokens.md` |
| Component Specs | `references/component-specs.md` |
| States & Variants | `references/states-and-variants.md` |
| Tailwind Integration | `references/tailwind-integration.md` |

## Component Spec Pattern

| Property | Default | Hover | Active | Disabled |
|----------|---------|-------|--------|----------|
| Background | primary | primary-dark | primary-darker | muted |
| Text | white | white | white | muted-fg |
| Border | none | none | none | muted-border |
| Shadow | sm | md | none | none |

## Scripts

| Script | Purpose |
|--------|---------|
| `generate-tokens.cjs` | Generate CSS from JSON token config |
| `validate-tokens.cjs` | Check for hardcoded values in code |
| `search-slides.py` | BM25 search + contextual recommendations |
| `slide-token-validator.py` | Validate slide HTML for token compliance |
| `fetch-background.py` | Fetch images from Pexels/Unsplash |

## Templates

| Template | Purpose |
|----------|---------|
| `design-tokens-starter.json` | Starter JSON with three-layer structure |

## Integration

**With brand:** Extract primitives from brand colors/typography
**With ui-styling:** Component tokens → Tailwind config

**Skill Dependencies:** brand, ui-styling
**Primary Agents:** ui-ux-designer, frontend-developer

## Slide System

Brand-compliant presentations using design tokens + Chart.js + contextual decision system.

### Source of Truth

| File | Purpose |
|------|---------|
| `docs/brand-guidelines.md` | Brand identity, voice, colors |
| `assets/design-tokens.json` | Token definitions (primitive→semantic→component) |
| `assets/design-tokens.css` | CSS variables (import in slides) |
| `assets/css/slide-animations.css` | CSS animation library |

### Slide Search (BM25)

```bash
# Basic search (auto-detect domain)
python scripts/search-slides.py "investor pitch"

# Domain-specific search
python scripts/search-slides.py "problem agitation" -d copy
python scripts/search-slides.py "revenue growth" -d chart

# Contextual search (Premium System)
python scripts/search-slides.py "problem slide" --context --position 2 --total 9
python scripts/search-slides.py "cta" --context --position 9 --prev-emotion frustration
```

### Decision System CSVs

| File | Purpose |
|------|---------|
| `data/slide-strategies.csv` | 15 deck structures + emotion arcs + sparkline beats |
| `data/slide-layouts.csv` | 25 layouts + component variants + animations |
| `data/slide-layout-logic.csv` | Goal → Layout + break_pattern flag |
| `data/slide-typography.csv` | Content type → Typography scale |
| `data/slide-color-logic.csv` | Emotion → Color treatment |
| `data/slide-backgrounds.csv` | Slide type → Image category (Pexels/Unsplash) |
| `data/slide-copy.csv` | 25 copywriting formulas (PAS, AIDA, FAB) |
| `data/slide-charts.csv` | 25 chart types with Chart.js config |

### Contextual Decision Flow

```
1. Parse goal/context
        ↓
2. Search slide-strategies.csv → Get strategy + emotion beats
        ↓
3. For each slide:
   a. Query slide-layout-logic.csv → layout + break_pattern
   b. Query slide-typography.csv → type scale
   c. Query slide-color-logic.csv → color treatment
   d. Query slide-backgrounds.csv → image if needed
   e. Apply animation class from slide-animations.css
        ↓
4. Generate HTML with design tokens
        ↓
5. Validate with slide-token-validator.py
```

### Pattern Breaking (Duarte Sparkline)

Premium decks alternate between emotions for engagement:
```
"What Is" (frustration) ↔ "What Could Be" (hope)
```

System calculates pattern breaks at 1/3 and 2/3 positions.

### Slide Requirements

**ALL slides MUST:**
1. Import `assets/design-tokens.css` - single source of truth
2. Use CSS variables: `var(--color-primary)`, `var(--slide-bg)`, etc.
3. Use Chart.js for charts (NOT CSS-only bars)
4. Include navigation (keyboard arrows, click, progress bar)
5. Center align content
6. Focus on persuasion/conversion

### Chart.js Integration

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<canvas id="revenueChart"></canvas>
<script>
new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
        labels: ['Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            data: [5, 12, 28, 45],
            borderColor: '#FF6B6B',  // Use brand coral
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            fill: true,
            tension: 0.4
        }]
    }
});
</script>
```

### Token Compliance

```css
/* CORRECT - uses token */
background: var(--slide-bg);
color: var(--color-primary);
font-family: var(--typography-font-heading);

/* WRONG - hardcoded */
background: #0D0D0D;
color: #FF6B6B;
font-family: 'Space Grotesk';
```

### Reference Implementation

Working example with all features:
```
assets/designs/slides/claudekit-pitch-251223.html
```

### Command

```bash
/slides:create "10-slide investor pitch for ClaudeKit Marketing"
```

## Best Practices

1. Never use raw hex in components - always reference tokens
2. Semantic layer enables theme switching (light/dark)
3. Component tokens enable per-component customization
4. Use HSL format for opacity control
5. Document every token's purpose
6. **Slides must import design-tokens.css and use var() exclusively**


---

## From `design-systems`

> Component library architecture, design tokens, Storybook, theming, documentation, and scalable design system patterns

# Design Systems & Component Libraries

## Purpose

Provide expert guidance on building scalable design systems: token architecture, component API design, variant systems, theming, Storybook documentation, and the organizational patterns that make component libraries maintainable across teams and products.

## Key Patterns

### Token Architecture

Tokens are the atomic design decisions that feed every component. Structure them in three tiers:

**Tier 1 — Primitive Tokens (raw values):**

```ts
// tokens/primitives.ts
export const primitives = {
  colors: {
    blue: {
      50: 'oklch(0.97 0.01 250)',
      100: 'oklch(0.93 0.03 250)',
      200: 'oklch(0.87 0.06 250)',
      300: 'oklch(0.77 0.10 250)',
      400: 'oklch(0.67 0.14 250)',
      500: 'oklch(0.55 0.18 250)',
      600: 'oklch(0.48 0.18 250)',
      700: 'oklch(0.40 0.16 250)',
      800: 'oklch(0.32 0.13 250)',
      900: 'oklch(0.25 0.10 250)',
      950: 'oklch(0.18 0.08 250)',
    },
    gray: {
      50: 'oklch(0.98 0.005 250)',
      100: 'oklch(0.95 0.008 250)',
      200: 'oklch(0.90 0.010 250)',
      300: 'oklch(0.83 0.012 250)',
      400: 'oklch(0.70 0.012 250)',
      500: 'oklch(0.55 0.012 250)',
      600: 'oklch(0.45 0.012 250)',
      700: 'oklch(0.37 0.012 250)',
      800: 'oklch(0.27 0.012 250)',
      900: 'oklch(0.20 0.012 250)',
      950: 'oklch(0.13 0.010 250)',
    },
  },
  spacing: {
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  radii: {
    none: '0',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.625rem',
    '3xl': '2rem',
    '4xl': '2.625rem',
    '5xl': '4.25rem',
  },
  shadows: {
    sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
    md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)',
  },
} as const;
```

**Tier 2 — Semantic Tokens (purpose-driven aliases):**

```ts
// tokens/semantic.ts
import { primitives } from './primitives';

export const lightTheme = {
  // Surfaces
  surface: {
    default: primitives.colors.gray[50],
    elevated: '#ffffff',
    overlay: 'oklch(0 0 0 / 0.5)',
    sunken: primitives.colors.gray[100],
  },

  // Text
  text: {
    primary: primitives.colors.gray[900],
    secondary: primitives.colors.gray[600],
    tertiary: primitives.colors.gray[400],
    inverse: '#ffffff',
    link: primitives.colors.blue[600],
    error: 'oklch(0.55 0.20 25)',
    success: 'oklch(0.55 0.17 145)',
  },

  // Borders
  border: {
    default: primitives.colors.gray[200],
    strong: primitives.colors.gray[300],
    focus: primitives.colors.blue[500],
    error: 'oklch(0.65 0.20 25)',
  },

  // Interactive
  interactive: {
    primary: primitives.colors.blue[600],
    primaryHover: primitives.colors.blue[700],
    primaryActive: primitives.colors.blue[800],
    secondary: 'transparent',
    secondaryHover: primitives.colors.gray[100],
  },
} as const;

export const darkTheme = {
  surface: {
    default: primitives.colors.gray[950],
    elevated: primitives.colors.gray[900],
    overlay: 'oklch(0 0 0 / 0.7)',
    sunken: 'oklch(0.10 0.01 250)',
  },
  text: {
    primary: primitives.colors.gray[50],
    secondary: primitives.colors.gray[400],
    tertiary: primitives.colors.gray[500],
    inverse: primitives.colors.gray[900],
    link: primitives.colors.blue[400],
    error: 'oklch(0.70 0.18 25)',
    success: 'oklch(0.70 0.15 145)',
  },
  // ... rest
} as const;
```

**Tier 3 — Component Tokens (component-specific):**

```ts
// tokens/components/button.ts
export const buttonTokens = {
  minHeight: {
    sm: '2rem',
    md: '2.625rem',
    lg: '3rem',
  },
  padding: {
    sm: `${primitives.spacing[2]} ${primitives.spacing[4]}`,
    md: `${primitives.spacing[4]} ${primitives.spacing[6]}`,
    lg: `${primitives.spacing[4]} ${primitives.spacing[8]}`,
  },
  fontSize: {
    sm: primitives.fontSizes.sm,
    md: primitives.fontSizes.base,
    lg: primitives.fontSizes.lg,
  },
  borderRadius: primitives.radii.lg,
} as const;
```

### Component API Design

**Principles:**
1. **Composition over configuration** — Prefer smaller composable pieces over massive prop APIs.
2. **Sensible defaults** — Every prop should have a reasonable default.
3. **HTML forwarding** — Components should accept and forward native HTML attributes.
4. **Accessible by default** — ARIA roles, labels, and keyboard navigation built in.

**Component Anatomy Pattern:**

```tsx
// components/ui/card/index.ts — Barrel export
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

// components/ui/card/card.tsx
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface-elevated shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-text-primary', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

**Usage (Composable API):**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
    <CardDescription>Manage your project configuration.</CardDescription>
  </CardHeader>
  <CardContent>
    <form>...</form>
  </CardContent>
  <CardFooter className="justify-end gap-3">
    <Button variant="secondary">Cancel</Button>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

### Variant System

Use CVA (Class Variance Authority) for structured, type-safe variants:

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-all duration-200',
  {
    variants: {
      intent: {
        default: 'bg-gray-100 text-gray-700 border border-gray-200',
        primary: 'bg-blue-100 text-blue-700 border border-blue-200',
        success: 'bg-green-100 text-green-700 border border-green-200',
        warning: 'bg-amber-100 text-amber-700 border border-amber-200',
        danger: 'bg-red-100 text-red-700 border border-red-200',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'default',
      interactive: false,
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, intent, interactive, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent, interactive }), className)} {...props} />;
}
```

### Storybook Stories

```tsx
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

### Theme Provider

```tsx
// providers/theme-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function resolve() {
      const resolved = theme === 'system'
        ? (mq.matches ? 'dark' : 'light')
        : theme;
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }

    resolve();
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

### Component Library File Structure

```
packages/ui/
  src/
    tokens/
      primitives.ts       # Raw values
      semantic.ts          # Theme-aware aliases
      components/          # Component-specific tokens
    components/
      ui/
        button/
          button.tsx       # Component implementation
          button.stories.tsx
          button.test.tsx
          index.ts         # Public exports
        card/
        input/
        badge/
        dialog/
        dropdown/
        tooltip/
    hooks/
      use-theme.ts
      use-media-query.ts
    lib/
      utils.ts            # cn(), cva helpers
    index.ts              # Package entry point
  package.json
  tsconfig.json
```

## Best Practices

1. **Three-tier tokens** — Primitives, semantic, component-specific. Never reference primitives directly in components.
2. **Composition API** — Build `Card + CardHeader + CardContent` not `Card` with 20 props.
3. **HTML forwarding** — Every component extends its base HTML element props and forwards `className` and `...rest`.
4. **CVA for variants** — Type-safe, composable, and easily extendable variant definitions.
5. **Storybook for every component** — Document all variants, states, and edge cases.
6. **Accessible defaults** — ARIA attributes, keyboard navigation, focus management baked in.
7. **`cn()` for class merging** — Consumer can always override styles via `className` prop.
8. **Semantic color naming** — `text-primary`, `surface-elevated`, not `gray-900`, `white`.
9. **Test visual regression** — Use Chromatic or Percy for screenshot-based testing.
10. **Version and changelog** — Changesets for semantic versioning, auto-generated changelogs.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Primitive tokens in components | Theme changes require touching every component | Use semantic tokens that map to primitives |
| Monolithic components | `<Card showHeader showFooter variant={...}` grows unbounded | Composable sub-components |
| Missing dark mode tokens | Components break in dark theme | Define both light and dark semantic tokens |
| Inconsistent prop naming | `onPress` vs `onClick` vs `onTap` | Standardize: follow HTML convention (`onClick`) |
| No `className` forwarding | Consumers cannot customize styles | Always merge consumer `className` with `cn()` |
| Hardcoded spacing | Inconsistent whitespace across components | Use token-based spacing scale |
| Missing loading states | Components have no loading UI | Design skeleton/placeholder states for every component |
| No keyboard support | Inaccessible for keyboard users | Implement `onKeyDown` handlers for Enter, Space, Escape, Arrow keys |


---

## From `design-principles`

> Visual design fundamentals — golden ratio, visual hierarchy, spacing systems, typography scale, color theory, Gestalt principles, and layout patterns

# Design Principles

## Purpose

Provide foundational visual design knowledge that informs every UI decision: proportional systems, hierarchy tools, spacing mathematics, typography, color theory, perceptual psychology (Gestalt), and proven layout patterns. This skill underpins all UI-related skills in the mesh.

---

## Golden Ratio (phi = 1.618)

The golden ratio produces naturally harmonious proportions. Use it to derive type scales, spacing progressions, and layout divisions.

### Phi-Based Type Scale

Starting from `1rem` (16px base), multiply/divide by phi:

```
4.236rem   (67.8px)  — Hero / display
2.618rem   (41.9px)  — H1
1.618rem   (25.9px)  — H2
1.000rem   (16.0px)  — Body / base
0.618rem   (9.9px)   — Caption / fine print (use sparingly, min 0.75rem for readability)
```

Practical scale (rounded for pixel grid alignment):

```css
:root {
  --text-xs:   0.625rem;   /* 10px — badges, labels only */
  --text-sm:   0.8125rem;  /* 13px — captions, metadata */
  --text-base: 1rem;       /* 16px — body text */
  --text-lg:   1.625rem;   /* 26px — H3, subheadings */
  --text-xl:   2.625rem;   /* 42px — H1, section titles */
  --text-2xl:  4.25rem;    /* 68px — hero, display */
}
```

### Phi-Based Spacing

Derive spacing tokens from the same ratio:

```css
:root {
  --space-1:  0.25rem;   /* 4px  — micro spacing */
  --space-2:  0.5rem;    /* 8px  — tight spacing */
  --space-3:  0.75rem;   /* 12px — compact */
  --space-4:  1rem;      /* 16px — base unit */
  --space-5:  1.5rem;    /* 24px — comfortable */
  --space-6:  2rem;      /* 32px — spacious */
  --space-8:  3rem;      /* 48px — section gap */
  --space-10: 4rem;      /* 64px — section padding */
  --space-12: 6rem;      /* 96px — hero spacing */
}
```

### Golden Section Layout

Divide containers using the golden ratio:

```
|---------- 100% ----------|
|---- 61.8% ----|-- 38.2% -|

CSS: grid-template-columns: 1.618fr 1fr;
```

Use for: content + sidebar, text + image, main + aside.

---

## Visual Hierarchy

The order in which the eye processes elements. Use these tools in priority order:

### Hierarchy Tools (strongest to weakest)

```
1. SIZE            Larger elements are seen first
2. COLOR/CONTRAST  High-contrast or saturated elements pop
3. WEIGHT          Bold text draws the eye before regular weight
4. POSITION        Top-left (LTR) and above-the-fold have priority
5. WHITESPACE      Isolated elements with breathing room stand out
6. DEPTH           Shadows and elevation create foreground/background
```

### Applying Hierarchy

| Content Role | Size | Weight | Color | Spacing Above |
|-------------|------|--------|-------|--------------|
| Primary heading | `2.625rem` | 700-800 | High contrast | `4rem` |
| Secondary heading | `1.625rem` | 600-700 | High contrast | `2rem` |
| Body text | `1rem` | 400 | Medium contrast | `1rem` |
| Caption / metadata | `0.8125rem` | 400 | Low contrast | `0.5rem` |
| Label / badge | `0.75rem` | 500-600 | Accent color | `0.25rem` |

### Hierarchy Anti-patterns

- **Everything bold** = nothing bold. Limit bold to 1-2 elements per section.
- **Too many colors** = visual noise. Stick to 1 primary + 1 accent + neutrals.
- **No breathing room** = claustrophobic. Content needs whitespace to breathe.
- **Equal sizing** = flat hierarchy. Vary sizes by at least 1.2x between levels.

---

## Spacing Systems

### 4px Base Grid (Micro Grid)

All spacing values must be multiples of 4px (0.25rem):

```
4px   (0.25rem) — Icon gaps, badge padding
8px   (0.5rem)  — Tight element spacing, input padding-y
12px  (0.75rem) — Compact spacing, small card padding
16px  (1rem)    — Base unit, paragraph spacing, button padding-x
24px  (1.5rem)  — Comfortable spacing, card padding
32px  (2rem)    — Spacious, group separation
48px  (3rem)    — Section internal spacing
64px  (4rem)    — Section padding (vertical)
96px  (6rem)    — Major section breaks
```

### 8px Major Grid (Component Grid)

Components snap to 8px increments for consistent alignment:

```
Component heights: 32px, 40px, 48px, 56px (buttons, inputs, chips)
Card padding: 16px (compact), 24px (default), 32px (spacious)
Section padding: 48px, 64px, 96px (vertical)
Max content width: 1280px (80rem) with 16-24px gutters
```

### Spacing Relationships

```
Within component:   4-12px  (tight coupling)
Between components: 16-32px (related grouping)
Between sections:   48-96px (clear separation)
```

### The 3C Rule

**Content** spacing < **Component** spacing < **Container** spacing. Never let inner spacing exceed outer spacing.

---

## Typography

### Measure (Line Length)

Optimal reading measure: **45-75 characters** per line. Target 65ch.

```css
.prose { max-width: 65ch; }                    /* Ideal for body text */
.prose-wide { max-width: 80ch; }               /* Code, tables */
.prose-narrow { max-width: 45ch; }             /* Captions, sidebars */
```

### Line Height

```
Headings:  1.1 - 1.25  (tight, because large text needs less leading)
Body:      1.5 - 1.6   (comfortable reading)
Small:     1.6 - 1.75  (small text needs more leading)
Code:      1.5 - 1.7   (legibility in monospace)
```

### Letter Spacing

```
Large headings (>2rem):  -0.02em to -0.04em  (tighten)
Body text:                0 (default)
All caps:                +0.05em to +0.1em   (widen for legibility)
Small text (<0.875rem):  +0.01em to +0.02em  (slight widen)
```

### Font Pairing Rules

1. **Contrast, not conflict** — Pair a serif with a sans-serif, not two similar sans-serifs.
2. **Max 2 families** — One for headings, one for body. A third for code if needed.
3. **Weight range** — Ensure the chosen families have weights 400, 500, 600, 700 minimum.
4. **x-height match** — Paired fonts should have similar x-heights for visual harmony.

### System Font Stacks

```css
/* Sans-serif (default) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace */
font-family: "SF Mono", "Cascadia Code", "Fira Code", Consolas, "Liberation Mono", monospace;

/* Display (headings) */
font-family: "Cal Sans", "Inter", -apple-system, sans-serif;
```

---

## Color Theory

### Color Spaces

Prefer **OKLCH** for perceptually uniform color manipulation. Fall back to **HSL** for broad browser support.

```css
/* OKLCH — perceptually uniform */
--color-primary: oklch(0.65 0.25 250);    /* Lightness, Chroma, Hue */

/* HSL — widely supported */
--color-primary: hsl(220, 80%, 55%);      /* Hue, Saturation, Lightness */
```

OKLCH advantages: uniform lightness perception, predictable chroma scaling, better dark mode generation.

### 60-30-10 Rule

Distribute color usage across the interface:

```
60% — Dominant   (background, base surfaces)     Neutral: white, gray-50, gray-900
30% — Secondary  (cards, containers, nav)         Subtle:  gray-100, gray-800
10% — Accent     (CTAs, links, active states)     Brand:   primary-500, primary-600
```

### Palette Construction

Build palettes from a single hue with systematic lightness steps:

```
50:   Background tint (lightest)
100:  Hover background
200:  Active background, borders
300:  Disabled text, secondary borders
400:  Placeholder text
500:  Base color (the "brand" shade)
600:  Hover state for base
700:  Active state, dark text on light
800:  Headings on light backgrounds
900:  Primary text on light backgrounds
950:  Darkest shade (near black)
```

### Contrast Requirements (WCAG AA)

```
Normal text (<24px / <19px bold):  4.5:1 minimum
Large text (>=24px / >=19px bold): 3:1 minimum
UI components (borders, icons):    3:1 minimum
Focus indicators:                  3:1 minimum against adjacent colors
```

### Dark Mode Strategy

Don't just invert. Reduce contrast to avoid eye strain:

```
Light mode:  text gray-900 on white         (21:1 ratio — soften to gray-800)
Dark mode:   text gray-100 on gray-900      (~15:1 ratio — comfortable)

Light mode surfaces:  white, gray-50, gray-100
Dark mode surfaces:   gray-950, gray-900, gray-800

Accent colors: reduce chroma slightly in dark mode to avoid vibrating
```

---

## Gestalt Principles

Perceptual psychology principles that explain how users group visual elements.

### 1. Proximity

Elements close together are perceived as related. Use spacing to create groups.

```
Related items:   8-16px gap    (tight = grouped)
Unrelated items: 32-48px gap   (loose = separate)
```

### 2. Similarity

Elements that look alike are perceived as related. Use consistent styling for related items.

```
Same role → same size, color, weight
Different role → vary at least 2 visual properties
```

### 3. Continuity

The eye follows lines and curves. Use alignment to create visual flow.

```
Left-align body text (LTR languages)
Maintain consistent left edge across sections
Use consistent grid columns for vertical alignment
```

### 4. Closure

The brain completes incomplete shapes. Use this for:

```
Card boundaries with subtle borders (don't need heavy outlines)
Icon design (simple shapes, brain fills gaps)
Truncated content with "..." (user infers continuation)
```

### 5. Figure-Ground

Elements are perceived as either foreground (figure) or background (ground).

```
Elevation creates figure:  shadow-sm for cards over background
Color contrast creates figure:  primary button on neutral surface
Blur creates depth:  backdrop-blur for overlays
```

### 6. Common Region

Elements within a shared boundary are perceived as grouped.

```
Cards group related content
Bordered sections separate concerns
Background color changes delineate areas
```

---

## Layout Patterns

### F-Pattern (Content-Heavy Pages)

Users scan in an F shape: across the top, then down the left side.

```
Use for: articles, documentation, dashboards, feeds
Structure:
  - Strong horizontal element at top (hero, title bar)
  - Left-aligned headings serve as scan anchors
  - Most important content in the first two paragraphs
  - Secondary content in sidebars (right, 38.2% width)
```

### Z-Pattern (Marketing / Landing Pages)

Users scan in a Z: top-left → top-right → bottom-left → bottom-right.

```
Use for: landing pages, sign-up screens, product pages
Structure:
  - Top-left: logo / brand
  - Top-right: nav / CTA
  - Center: hero content (the diagonal)
  - Bottom-left: supporting info
  - Bottom-right: primary CTA
```

### Rule of Thirds

Divide the viewport into a 3x3 grid. Place key elements at intersections.

```
+-------+-------+-------+
|       |   *   |       |     * = focal point
|       |       |       |
+-------+-------+-------+
|       |       |       |     Place primary CTA at
|       |       |   *   |     bottom-right intersection
+-------+-------+-------+
```

### Common Grid Systems

```
12-column grid:  Most flexible, standard for dashboards and complex layouts
4-column grid:   Mobile layouts, simple content pages
Asymmetric:      61.8% / 38.2% (golden ratio), 2fr / 1fr, content + sidebar
Full-bleed:      Edge-to-edge sections with contained content max-width
```

### Responsive Breakpoints

```css
/* Mobile first */
sm:   640px    /* Large phones, small tablets */
md:   768px    /* Tablets portrait */
lg:   1024px   /* Tablets landscape, small desktops */
xl:   1280px   /* Standard desktops */
2xl:  1536px   /* Large desktops */
```

### Content Width Constraints

```
Prose content:   65ch (~600px)
Card grids:      max 1280px with 16-24px gutters
Dashboards:      max 1440px or full-width with sidebar
Marketing hero:  max 1200px centered
Forms:           max 480px for single-column, 640px for two-column
```

---

## Quick Reference: Component Design Checklist

Before outputting any UI component, verify:

```
[ ] Spacing uses 4px grid (0.25rem multiples)
[ ] Typography follows the phi scale (or project scale)
[ ] Heading hierarchy is correct (only one H1, correct nesting)
[ ] Line length is 45-75ch for body text
[ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
[ ] Related elements are grouped by proximity
[ ] Interactive elements have distinct hover/focus/active states
[ ] Whitespace creates clear visual hierarchy
[ ] Layout follows F-pattern (content) or Z-pattern (marketing)
[ ] Cards have depth (shadow or border, never flat)
[ ] Maximum 2 font families in use
```

---

## Pitfalls

1. **Pixel-perfect obsession** — Design systems work in relative units (rem, em, %). Don't fight sub-pixel rendering.
2. **Too many accent colors** — One primary + one secondary accent. More than that creates visual chaos.
3. **Ignoring the grid** — Off-grid elements create subliminal unease. Everything should align to the 4px/8px grid.
4. **Symmetric spacing everywhere** — Asymmetry creates visual interest. Use golden ratio divisions, not 50/50 splits.
5. **Dark mode as an afterthought** — Design for both modes simultaneously. Color tokens should have light/dark variants from day one.
6. **Skipping the squint test** — Blur your eyes and look at the layout. If you can't tell what's most important, the hierarchy is flat.


---

## From `design-router`

> Design intent orchestrator — analyzes what the user wants and activates the precise skill chain needed. The brain before the hands.

# Design Router — Intent Orchestrator

## Purpose

This is the **decision layer** for all design work. Before any UI code is written, this skill
analyzes the user's intent and assembles the right skill chain. Think of it as the architect
who reads the brief before calling in specialists.

## How It Works

### Step 1: Classify the Intent

Read the user's request and classify into one of these design intents:

```
BUILD       → Create something new from scratch
IMPROVE     → Make existing UI better
FIX         → Repair broken layout/styling/responsiveness
REVIEW      → Audit existing design quality
STYLE       → Change aesthetic (glassmorphism, minimalism, etc.)
BRAND       → Logo, identity, color system, design tokens
RESPONSIVE  → Mobile/tablet/desktop adaptation
ANIMATE     → Add motion and transitions
TYPOGRAPHY  → Font selection, type scale, text styling
SYSTEM      → Design system / component library creation
```

### Step 2: Activate the Skill Chain

Each intent maps to an ordered chain of skills. Load them in sequence:

```
BUILD:
  1. creative-vision    → Brainstorm style direction
  2. design-principles  → Lock typography + color + spacing
  3. impeccable-frontend-design → Build it
  4. ui-ux-pro          → Validate against standards

IMPROVE:
  1. ui-ux-pro          → Audit current state (Phase 1-4 review)
  2. creative-vision    → Identify style improvements
  3. impeccable-frontend-design → Implement changes
  4. ui-ux-pro          → Re-validate

FIX:
  1. ui-ux-pro          → Identify what's broken
  2. responsive-design  → If layout issue
  3. css-architecture   → If styling/specificity issue
  4. accessibility      → If a11y issue

REVIEW:
  1. ui-ux-pro          → Full 4-phase review
  2. web-design-guidelines → Vercel guidelines check
  3. accessibility      → WCAG audit

STYLE:
  1. creative-vision    → Explore style options
  2. design-principles  → Apply composition rules
  3. ui-styling         → Implement with Tailwind/shadcn
  4. animation          → Add motion if requested

BRAND:
  1. creative-vision    → Brainstorm brand direction
  2. design-principles  → Color theory + typography
  3. brand              → Identity system
  4. design-systems     → Component library

RESPONSIVE:
  1. responsive-design  → Breakpoint strategy
  2. css-architecture   → Container queries, grid
  3. ui-ux-pro          → Validate at all viewports

ANIMATE:
  1. animation          → Motion strategy
  2. tailwindcss        → Tailwind animation utilities
  3. ui-ux-pro          → Validate motion-reduce support

TYPOGRAPHY:
  1. design-principles  → Type scale, font pairing (PRIMARY source)
  2. ui-ux-pro          → Visual hierarchy validation
  3. css-architecture   → CSS custom properties for fonts
  4. responsive-design  → Fluid typography with clamp()

SYSTEM:
  1. design-systems     → Token architecture, component specs
  2. design-principles  → Foundational scales
  3. ui-styling         → shadcn/Tailwind implementation
  4. brand              → Brand token integration

GENERATE (AI Design):
  1. stitch             → Generate screens with Google Stitch AI
  2. design-principles  → Validate typography + color + spacing
  3. impeccable-frontend-design → Convert to production code
  4. ui-ux-pro          → Validate against standards

DESIGN-TO-CODE:
  1. stitch (extract)   → Extract design DNA from screenshot/URL
  2. stitch (implement) → Convert to React/Next.js components
  3. design-systems     → Apply design tokens
  4. impeccable-polish  → Production finish

PENCIL-EDIT:
  1. stitch (edit)      → Open/edit in Pencil visual editor
  2. stitch (extract)   → Extract variables and tokens
  3. stitch (implement) → Convert to production code
```

### Step 3: Context Injection

Before handing off to the first skill in the chain, inject:

- **Style context**: Which of the 5 styles applies? (Glassmorphism, Skeuomorphism, Claymorphism, Minimalism, Liquid Glass)
- **Composition rules**: Which rules are most relevant? (Thirds, Odds, Balance, Scale, Grid)
- **Existing patterns**: What does the current codebase use? (Check Tailwind config, globals.css, component patterns)
- **Typography state**: What fonts/scale does the project already have?

## Typography Locator

Typography content lives in multiple places. Here's the definitive map:

### Data Files (the big libraries)
| What | Path | Size |
|------|------|------|
| **230 font pairings** (10 categories) | `docs/font-pairings.md` | Master catalog |
| **50 curated pairings** with Tailwind + Google Fonts | `.claude/skills/ui-ux-pro-max/data/typography.csv` | Ready-to-paste configs |
| **Google Fonts metadata** | `.claude/skills/ui-ux-pro-max/data/google-fonts.csv` | Full font database |

### Skill Files (rules & quick-reference)
| What | Where |
|------|-------|
| **Type scale** (modular 1.25 ratio) | `design-principles` SKILL.md |
| **13 quick-reference pairings** | `design-principles` SKILL.md |
| **Visual hierarchy** (5 levels) | `ui-ux-pro` SKILL.md |
| **Golden ratio scale** | `ui-ux-pro` SKILL.md |
| **Fluid typography** (clamp) | `responsive-design` SKILL.md |
| **CSS font variables** | `css-architecture` SKILL.md |
| **Tailwind font config** | `ui-styling` SKILL.md |

### How to use typography data
1. **Quick pick**: Read `design-principles` for the 13 go-to pairings
2. **Full exploration**: Read `docs/font-pairings.md` for all 230
3. **Ready to implement**: Read `typography.csv` for the pairing + its Tailwind config + Google Fonts import URL
4. **Font rules**: Read `design-principles` for weight/height/spacing rules

## Decision Shortcuts

Quick patterns for common requests:

| User Says | Activate |
|-----------|----------|
| "build me a..." | creative-vision → impeccable-frontend-design |
| "make it look better" | ui-ux-pro (review) → creative-vision |
| "fix the layout" | responsive-design → css-architecture |
| "use glassmorphism" | ui-styling (has Tailwind classes for all 5 styles) |
| "what font should I use" | design-principles (font pairing rules) |
| "design system" | design-systems → design-principles |
| "landing page" | landing-gen → impeccable-frontend-design |
| "add animations" | animation → ui-ux-pro (motion-reduce check) |
| "dark mode" | ui-styling (dark mode patterns section) |
| "audit my design" | ui-ux-pro (4-phase review workflow) |
| "generate a design" | stitch (AI generation → code) |
| "design with AI" | stitch (generate mode) |
| "edit in pencil" | stitch (edit mode → Pencil .pen) |
| "screenshot to code" | stitch (extract → implement) |
| "wireframe to code" | stitch (generate → implement) |
| "design to code" | stitch (full pipeline) |


---

## From `creative-vision`

> Creative brainstorming agent — explores style directions, generates design concepts, and proposes aesthetic improvements before any code is written

# Creative Vision — Design Brainstorming Agent

## Purpose

This is the **creative thinker** in the design pipeline. Before writing CSS or JSX, this skill
explores what the design *could be*. It generates multiple style concepts, evaluates trade-offs,
and proposes a direction the user can approve before implementation begins.

**This skill does NOT write code.** It outputs a design brief that downstream skills execute.

## Brainstorming Process

### Phase 1: Understand the Canvas

Before proposing anything, gather:

```
QUESTIONS TO ANSWER (from context, code, or by asking):
  1. What is being designed? (page type, component, full app)
  2. Who is the audience? (developers, consumers, enterprise, creative, kids)
  3. What emotion should it evoke? (trust, excitement, calm, urgency, playfulness)
  4. What's the existing tech? (Tailwind version, shadcn, existing theme)
  5. Are there brand constraints? (colors, fonts, existing identity)
  6. What's the competitive context? (what do similar products look like?)
```

### Phase 2: Generate 3 Concepts

Always propose **exactly 3** directions (Rule of Odds). Each concept is a mini design brief:

```markdown
## Concept A: [Name] — [1-line vibe description]

**Style**: [Primary style from the 5 available]
**Palette**: [3-5 colors with hex/oklch values]
**Typography**: [Heading font + Body font, with reasoning]
**Composition**: [Which rules apply most — Thirds? Grid? Balance?]
**Motion**: [Animation strategy — subtle/bold/none]
**Mood**: [2-3 reference sites from inspiration sources]
**Best for**: [When this concept wins over the others]

### Visual Preview (text description)
[Describe what the hero/main section would look like in vivid detail]
```

### Concept Generation Matrix

Cross the **audience** with the **emotion** to find the right style starting point:

```
                 Trust       Excitement    Calm         Playful
Developers:    Minimalism   Liquid Glass  Minimalism   Glassmorphism
Enterprise:    Minimalism   Minimalism    Minimalism   —
Consumers:     Glassmorphism Liquid Glass Minimalism   Claymorphism
Creative:      Glassmorphism Skeuomorphism Liquid Glass Claymorphism
Kids/Youth:    Claymorphism Claymorphism  Claymorphism Claymorphism
Premium:       Liquid Glass  Liquid Glass Liquid Glass  Glassmorphism
```

### Phase 3: Typography Pairing

**Data sources** (read these for the full catalog):
- `docs/font-pairings.md` — **230 pairings** in 10 categories with source + mood
- `.claude/skills/ui-ux-pro-max/data/typography.csv` — **50 curated** with Tailwind config, Google Fonts URLs, CSS imports (ready to paste)

Quick-reference picks by vibe:

| Pair | Vibe | Best For |
|------|------|----------|
| **Inter + Inter** | Clean, neutral, professional | SaaS, dashboards, tools |
| **Poppins + Open Sans** | Modern, friendly, corporate | Startups, business apps |
| **Space Grotesk + DM Sans** | Tech, innovative, bold | AI products, dev tools |
| **Playfair Display + Inter** | Elegant, premium, editorial | Luxury brands, fashion |
| **Geist + Geist Mono** | Developer-native, Vercel feel | Dev tools, CLIs, code-heavy |
| **DM Sans + DM Serif** | Contemporary editorial | Magazines, portfolios, creative |
| **Cabinet Grotesk + Instrument Serif** | Bold geometric + elegant serif | Fashion, luxury, agencies |
| **Clash Display + Satoshi** | Statement headline + clean body | Product launches |
| **Cormorant Garamond + Libre Baskerville** | Classic, literary, refined | Publishing, editorial |
| **General Sans + Sentient** | Friendly geometric + humanist | Consumer apps, social |

For the **full 230 pairings** organized by category (Serif+Sans, Sans+Sans, Display+Body, Monospace+Sans, Handwritten+Sans, etc.), read `docs/font-pairings.md`.

### Phase 4: Color Exploration

Generate palettes using these methods:

```
MONOCHROMATIC:  Single hue, varying lightness. Safe. Professional.
  Example: Blue-500 primary, Blue-100 bg, Blue-900 text

ANALOGOUS:      Adjacent hues (30° apart). Harmonious. Warm/cool themes.
  Example: Blue-500 primary, Cyan-400 accent, Indigo-600 hover

COMPLEMENTARY:  Opposite hues (180°). High contrast. Bold.
  Example: Blue-500 primary, Orange-400 accent (use sparingly)

SPLIT-COMPLEMENT: One hue + two neighbors of its complement. Vibrant but balanced.
  Example: Blue-500 primary, Orange-300 accent, Red-400 highlight

TRIADIC:        Three equally-spaced hues (120°). Energetic. Use for playful/creative.
  Example: Blue-500, Yellow-500, Red-500 (only one dominant)
```

**Palette generation formula:**
```
1. Pick primary hue based on emotion (Blue=trust, Green=growth, Purple=creative, etc.)
2. Generate 50-950 scale using oklch for perceptual uniformity
3. Add 1 accent color (complementary or analogous)
4. Add semantic colors (success=emerald, warning=amber, error=red, info=blue)
5. Generate neutral scale (true neutral or slightly tinted toward primary)
```

### Phase 5: Present & Decide

Present all 3 concepts clearly. Recommend one with reasoning. Ask the user to pick or mix.

**Output format:**
```markdown
# Design Direction: [Project Name]

## The Brief
[1-2 sentences: what we're designing and for whom]

## Concept A: [Name]
[Full concept as described above]

## Concept B: [Name]
[Full concept]

## Concept C: [Name]
[Full concept]

## Recommendation
I'd go with **Concept [X]** because [reasoning tied to audience + emotion + tech constraints].

## Next Steps
Once you pick a direction, I'll hand off to:
1. `design-principles` — Lock the type scale + color tokens
2. `impeccable-frontend-design` — Build it
3. `ui-ux-pro` — Validate against standards
```

## Inspiration Quick-Reference

When brainstorming, mentally reference these for current trends:

| Source | What to Steal |
|--------|---------------|
| **Awwwards** | Animation techniques, hero layouts, scroll interactions |
| **Dark.design** | Dark mode palettes, high-contrast typography, moody gradients |
| **Shots.so** | Mockup presentation styles, shadow depths, rounded corners |
| **3dicons.co** | 3D icon styles for claymorphism, playful UIs |
| **Mobbin** | Mobile patterns, bottom sheets, gesture interactions |
| **Godly** | Landing page structures, above-the-fold patterns |
| **Dribbble** | Color palette trends, icon styles, illustration approaches |
| **Behance** | Full case studies, design process documentation |
| **Refero** | Category-based design references |

## Anti-Patterns

- **Don't propose without understanding the audience** — a kids' app and an enterprise dashboard need wildly different aesthetics
- **Don't default to minimalism for everything** — it's safe but not always right
- **Don't ignore existing brand** — if the project has colors/fonts, work with them
- **Don't over-specify code** — this skill outputs intent, not implementation
- **Don't propose more than 3 concepts** — decision paralysis is real (Rule of Odds applies to concepts too)
- **Don't skip typography** — font choice makes or breaks a design. Always specify the pair.


---

## From `figma`

> Figma API integration, design tokens export, Auto Layout to Flexbox mapping, Dev Mode handoff, code-to-design reverse translation, and component property mapping

# Figma

## Purpose

Bridge the gap between design and code. This skill covers the Figma REST API, design token extraction, Auto Layout to CSS/Flexbox translation, Dev Mode handoff workflows, component property to React prop mapping, and reverse code-to-design translation.

---

## Figma REST API

### Authentication

```
Header: X-Figma-Token: <personal_access_token>
Base URL: https://api.figma.com/v1
```

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/files/:file_key` | GET | Get full file tree (nodes, styles, components) |
| `/files/:file_key/nodes?ids=:ids` | GET | Get specific nodes by ID |
| `/images/:file_key?ids=:ids&format=png` | GET | Export nodes as images (png, jpg, svg, pdf) |
| `/files/:file_key/styles` | GET | Get all published styles |
| `/files/:file_key/components` | GET | Get all published components |
| `/files/:file_key/component_sets` | GET | Get component sets (variant groups) |
| `/files/:file_key/variables/local` | GET | Get local variables (colors, spacing, etc.) |
| `/files/:file_key/variables/published` | GET | Get published variable collections |

### File Key Extraction

From URL: `https://www.figma.com/design/ABC123xyz/Project-Name`
File key: `ABC123xyz`

Node IDs are in the format `1:234` (page:node). URL-encode as `1%3A234`.

### Pagination and Depth

```
?depth=1        Only top-level children (fast, for structure scanning)
?depth=2        Two levels deep (good for page → frame overview)
?depth=N        N levels (full tree can be very large)
```

For large files, always use `?ids=` to request specific nodes rather than the full tree.

### Image Export

```
GET /images/:file_key
  ?ids=1:234,5:678
  &format=svg          (svg | png | jpg | pdf)
  &scale=2             (1-4, for raster formats)
  &svg_include_id=true (include node IDs in SVG)
```

---

## Auto Layout to CSS/Flexbox

Figma's Auto Layout maps directly to CSS Flexbox. Use this reference for 1:1 translation.

### Direction

| Figma | CSS |
|-------|-----|
| Horizontal | `flex-direction: row` |
| Vertical | `flex-direction: column` |
| Wrap | `flex-wrap: wrap` |

### Spacing

| Figma Property | CSS Property | Tailwind |
|---------------|-------------|----------|
| Item spacing | `gap` | `gap-N` |
| Padding (all) | `padding` | `p-N` |
| Padding (top) | `padding-top` | `pt-N` |
| Padding (right) | `padding-right` | `pr-N` |
| Padding (bottom) | `padding-bottom` | `pb-N` |
| Padding (left) | `padding-left` | `pl-N` |
| Padding (horizontal) | `padding-inline` | `px-N` |
| Padding (vertical) | `padding-block` | `py-N` |

### Alignment

| Figma (Primary Axis) | CSS | Tailwind |
|---------------------|-----|----------|
| Top / Left (packed start) | `justify-content: flex-start` | `justify-start` |
| Center | `justify-content: center` | `justify-center` |
| Bottom / Right (packed end) | `justify-content: flex-end` | `justify-end` |
| Space between | `justify-content: space-between` | `justify-between` |

| Figma (Cross Axis) | CSS | Tailwind |
|-------------------|-----|----------|
| Top / Left | `align-items: flex-start` | `items-start` |
| Center | `align-items: center` | `items-center` |
| Bottom / Right | `align-items: flex-end` | `items-end` |
| Stretch (fill) | `align-items: stretch` | `items-stretch` |
| Baseline | `align-items: baseline` | `items-baseline` |

### Sizing (Resizing Behavior)

| Figma | CSS | Tailwind |
|-------|-----|----------|
| Fixed width | `width: Npx` | `w-[Npx]` |
| Fill container | `flex: 1 1 0` | `flex-1` |
| Hug contents | `width: fit-content` | `w-fit` |
| Fixed height | `height: Npx` | `h-[Npx]` |
| Fill (height) | `flex: 1 1 0` (in column parent) | `flex-1` |
| Hug (height) | `height: fit-content` | `h-fit` |

### Min/Max Constraints

| Figma | CSS |
|-------|-----|
| Min width | `min-width: Npx` |
| Max width | `max-width: Npx` |
| Min height | `min-height: Npx` |
| Max height | `max-height: Npx` |

### Complete Auto Layout Example

```
Figma Frame:
  Direction: Vertical
  Gap: 16px
  Padding: 24px
  Primary Axis: Top (packed start)
  Cross Axis: Stretch
  Width: Fill container
  Min Width: 320px
  Max Width: 640px

CSS:
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  justify-content: flex-start;
  align-items: stretch;
  flex: 1 1 0;
  min-width: 20rem;
  max-width: 40rem;

Tailwind:
  flex flex-col gap-4 p-6 justify-start items-stretch flex-1 min-w-[20rem] max-w-[40rem]
```

---

## Design Tokens Export

### Token Taxonomy

Extract Figma variables and styles into a structured token system:

```
Primitives (raw values)
  ├── colors/         Color hex/rgb values
  ├── spacing/        Numeric spacing values
  ├── radii/          Border radius values
  ├── typography/     Font family, size, weight, line-height
  ├── shadows/        Box shadow definitions
  └── breakpoints/    Viewport widths

Semantic (contextual aliases)
  ├── surface/        background-primary, background-secondary
  ├── text/           text-primary, text-muted, text-inverse
  ├── border/         border-default, border-strong
  ├── interactive/    interactive-primary, interactive-hover
  └── feedback/       success, warning, error, info
```

### Figma Variables to CSS Custom Properties

```css
/* From Figma variable collection "Primitives" */
:root {
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

/* From Figma variable collection "Semantic / Light" */
:root {
  --surface-primary: var(--color-white);
  --surface-secondary: var(--color-gray-50);
  --text-primary: var(--color-gray-900);
  --text-muted: var(--color-gray-500);
  --interactive-primary: var(--color-blue-600);
  --interactive-hover: var(--color-blue-700);
}

/* From Figma variable collection "Semantic / Dark" */
[data-theme="dark"] {
  --surface-primary: var(--color-gray-950);
  --surface-secondary: var(--color-gray-900);
  --text-primary: var(--color-gray-100);
  --text-muted: var(--color-gray-400);
  --interactive-primary: var(--color-blue-500);
  --interactive-hover: var(--color-blue-400);
}
```

### Figma Variables to Tailwind Theme

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
        },
        content: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
        interactive: {
          DEFAULT: 'var(--interactive-primary)',
          hover: 'var(--interactive-hover)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
}
```

---

## Component Property to React Prop Mapping

Figma component properties map directly to React component props:

### Property Type Mapping

| Figma Property Type | React Prop Type | Example |
|-------------------|----------------|---------|
| Boolean | `boolean` (flag) | `showIcon: true` → `showIcon` |
| Text | `string` (children or prop) | `label: "Submit"` → `children="Submit"` |
| Instance swap | `ReactNode` | `icon: IconCheck` → `icon={<IconCheck />}` |
| Variant | `string` union | `size: "sm" \| "md" \| "lg"` → `size="md"` |

### Component Mapping Example

```
Figma Component: Button
  Properties:
    - Variant: size (sm, md, lg)
    - Variant: intent (primary, secondary, ghost)
    - Boolean: isDisabled
    - Boolean: showIcon
    - Text: label
    - Instance swap: leadingIcon

React Component:
  interface ButtonProps {
    size?: 'sm' | 'md' | 'lg';
    intent?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    icon?: ReactNode;
    children: ReactNode;
  }
```

### Variant to Prop Pattern

```tsx
// Figma has a variant set with "State" property: default, hover, active, disabled
// Don't create a "state" prop — these are CSS states, not props

// Figma has a variant set with "Type" property: filled, outlined, ghost
// This IS a prop:
type ButtonVariant = 'filled' | 'outlined' | 'ghost';
```

---

## Code-to-Design Reverse Translation

When given existing code (especially Tailwind), translate back to a Figma specification.

### Tailwind to Figma Auto Layout

| Tailwind | Figma Property |
|----------|---------------|
| `flex flex-col` | Auto Layout: Vertical |
| `flex flex-row` | Auto Layout: Horizontal |
| `gap-4` | Item spacing: 16 |
| `p-6` | Padding: 24 (all sides) |
| `px-4 py-3` | Padding: L12, R12, T12, B12 |
| `items-center` | Cross axis: Center |
| `justify-between` | Primary axis: Space between |
| `flex-1` | Sizing: Fill container |
| `w-fit` | Sizing: Hug contents |
| `w-[320px]` | Sizing: Fixed 320 |
| `min-w-0` | Min width: 0 |
| `max-w-md` | Max width: 448 |

### Tailwind to Figma Visual Properties

| Tailwind | Figma Property |
|----------|---------------|
| `rounded-lg` | Corner radius: 8 |
| `rounded-xl` | Corner radius: 12 |
| `rounded-full` | Corner radius: 9999 |
| `shadow-sm` | Drop shadow: 0 1 2 0 rgba(0,0,0,0.05) |
| `shadow-md` | Drop shadow: 0 4 6 -1 rgba(0,0,0,0.1) |
| `bg-gray-100` | Fill: #F3F4F6 |
| `text-gray-900` | Text color: #111827 |
| `text-sm` | Font size: 14, Line height: 20 |
| `font-medium` | Font weight: Medium (500) |
| `border border-gray-200` | Stroke: Inside, 1px, #E5E7EB |
| `opacity-50` | Opacity: 50% |

### Reverse Translation Workflow

```
1. Read the React component and extract all Tailwind classes
2. Group by purpose: layout, spacing, typography, color, effects
3. Map each group to Figma properties
4. Output a Figma spec document:

   Frame: "Card"
   Auto Layout: Vertical, Gap 16, Padding 24
   Fill: white
   Corner radius: 12
   Effects: Drop shadow (0, 1, 3, rgba(0,0,0,0.1))
   Width: Fill container
   Min width: 280

   Child: "Heading"
   Type: Text
   Font: Inter, 20/28, Semibold
   Fill: #111827

   Child: "Body"
   Type: Text
   Font: Inter, 16/24, Regular
   Fill: #6B7280
```

---

## Dev Mode Handoff Workflow

### Reading Dev Mode Output

When a developer inspects a frame in Figma Dev Mode:

1. **Properties panel** — Shows Auto Layout, sizing, constraints
2. **CSS tab** — Generates CSS (but don't copy blindly — it's verbose)
3. **Variables tab** — Shows which Figma variables are applied
4. **Assets tab** — Lists components and their properties

### Handoff Checklist

```
[ ] Extract variable names, not raw values (use tokens)
[ ] Map Auto Layout to Flexbox (use the mapping table above)
[ ] Check which properties are from component variants vs. overrides
[ ] Verify responsive behavior (check Figma's min/max constraints)
[ ] Export icons as SVG with svg_include_id for component matching
[ ] Note any prototype interactions that need JS implementation
[ ] Check for Figma comments / annotations from designers
```

### Common Handoff Mistakes

1. **Copying Figma CSS verbatim** — Figma generates absolute positioning and pixel values. Always translate to flex/grid with rem units.
2. **Ignoring constraints** — Figma min/max width constraints are often the responsive behavior spec. Don't skip them.
3. **Missing hover/focus states** — Check if the component has variant states. Figma often stores these as separate variants, not as CSS pseudo-classes.
4. **Hardcoding colors** — Always use design token variables, not the hex values from Figma's CSS output.

---

## Pitfalls

1. **Full file fetches** — Never fetch an entire Figma file without `depth` or `ids` constraints. Large files can be 50MB+ of JSON.
2. **Token sync drift** — Design tokens in code and Figma must stay in sync. Use automated token pipelines (Style Dictionary, Token Studio) rather than manual copy.
3. **Auto Layout !== CSS Grid** — Auto Layout is Flexbox only. For CSS Grid layouts, you need to interpret the design intent, not translate 1:1.
4. **Instance swap complexity** — Figma's instance swap creates implicit component hierarchies. Map carefully to React composition patterns (children, render props, slots).
5. **Responsive breakpoints** — Figma doesn't natively handle responsive breakpoints well. Designers often create separate frames per breakpoint. Combine them into a single responsive component in code.
6. **Figma's shadow model** — Figma uses separate inner shadow and drop shadow. CSS `box-shadow` can handle both but the syntax differs from Figma's visual representation.

