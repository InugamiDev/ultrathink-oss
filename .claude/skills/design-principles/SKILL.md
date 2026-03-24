---
name: design-principles
description: Visual design fundamentals — golden ratio, visual hierarchy, spacing systems, typography scale, color theory, Gestalt principles, and layout patterns
layer: domain
category: design
triggers:
  - "design principles"
  - "visual hierarchy"
  - "spacing system"
  - "color theory"
  - "typography scale"
  - "golden ratio"
  - "layout pattern"
  - "gestalt"
  - "grid system"
  - "60-30-10"
  - "type scale"
  - "whitespace"
inputs:
  - "Design system foundation requirements"
  - "Typography or spacing scale needs"
  - "Color palette generation requests"
  - "Layout structure decisions"
outputs:
  - "Spacing and typography scales"
  - "Color palette with contrast ratios"
  - "Layout grid definitions"
  - "Visual hierarchy audit results"
linksTo:
  - ui-ux-pro
  - figma
  - design-systems
  - css-architecture
linkedFrom:
  - ui-ux-pro
  - figma
  - bootstrap
preferredNextSkills:
  - design-systems
  - tailwindcss
  - figma
fallbackSkills:
  - ui-ux-pro
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
