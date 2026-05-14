# Composition Rules & Visual Hierarchy

## Design Composition Rules

### Rule of Thirds
Divide the canvas into a 3x3 grid. Place key elements (CTAs, headlines, focal images) at intersection points or along grid lines — NOT dead center.
- Hero sections: headline at left-third, CTA at bottom-third intersection
- Cards: key metric at top-left third
- Images: subject at right-third for left-to-right reading flow

### Rule of Odds
Group visual elements in odd numbers (3, 5, 7) for natural visual interest.
- Feature cards: 3 columns, not 4
- Testimonials: show 3 or 5, not 2 or 4
- Icon grids: 3 or 5 per row
- Stats: display 3 key metrics
- **Exception**: Comparison layouts (2-column pricing) where symmetry is intentional

### Rule of Balance
Visual weight must balance across the layout:
- **Symmetrical**: Formal, trustworthy (pricing pages, legal, enterprise)
- **Asymmetrical**: Dynamic, modern (landing pages, portfolios, creative)
- **Radial**: Focus-drawing (hero sections, onboarding, single-action pages)

Balance heavy elements (images, dark blocks) with lighter ones (whitespace, text). A large element on the left? Balance with multiple smaller elements on the right.

### Rule of Scale & Emphasis
Size communicates importance. The most important element should be the largest.
- Headlines: 2.5-4x body text size
- Primary CTA: 1.5x secondary button size
- Hero image: 40-60% of viewport height
- Feature icons: consistent size, but hero icon 2x feature icons
- **Progressive disclosure**: Large → medium → small guides the eye through content

### Rule of Grid
Everything aligns to the grid. No exceptions.
- 12-column grid for desktop (max-width: 1280px centered)
- 4-column grid for tablet
- 1-2 column grid for mobile
- Gutters: 1.5rem (24px) desktop, 1rem (16px) mobile
- All elements snap to column boundaries
- Full-bleed sections break the grid intentionally (hero, CTA bands)

Tailwind: `container mx-auto` with `px-4 sm:px-6 lg:px-8`

---

## Visual Hierarchy (5 Levels)

### Level 1 — Primary
```
Size: 2.625rem+ (headings)
Weight: Bold (700)
Color: High contrast (primary text color)
Spacing: 2rem+ margin-bottom
Tailwind: text-4xl font-bold text-foreground mb-8
```

### Level 2 — Secondary
```
Size: 1.625rem (subheadings)
Weight: Semibold (600)
Color: Primary text color
Spacing: 1.5rem margin-bottom
Tailwind: text-2xl font-semibold text-foreground mb-6
```

### Level 3 — Body
```
Size: 1rem (16px minimum)
Weight: Regular (400)
Color: Primary or secondary text color
Line-height: 1.5-1.75
Tailwind: text-base font-normal text-foreground/80 leading-relaxed
```

### Level 4 — Supporting
```
Size: 0.875rem (minimum for body text)
Weight: Regular (400)
Color: Muted text color
Use: Timestamps, metadata, captions
Tailwind: text-sm font-normal text-muted-foreground
```

### Level 5 — Micro
```
Size: 0.75rem (ONLY for badges, labels)
Weight: Medium (500)
Color: Must meet 4.5:1 contrast
Use: Status badges, category tags
Tailwind: text-xs font-medium
```

---

## Color Usage

### Semantic Colors
| Token | Purpose |
|-------|---------|
| Primary | Brand actions (CTAs, links, active states) |
| Secondary | Supporting actions, alternative styles |
| Success | Confirmations, completions, positive states |
| Warning | Caution states, approaching limits |
| Error | Validation errors, destructive actions, failures |
| Info | Informational messages, tips, help text |

### Neutral Scale (50-950)
| Value | Use |
|-------|-----|
| 50 | Page background, subtle fills |
| 100 | Card backgrounds, input backgrounds |
| 200 | Borders, dividers |
| 300 | Disabled states, placeholder text |
| 400 | Muted text, secondary icons |
| 500 | Body text on light, icons |
| 600 | Emphasis text, heading secondary |
| 700 | Heading text, strong emphasis |
| 800 | Primary text on light backgrounds |
| 900 | Maximum contrast text |
| 950 | Near-black for highest contrast needs |
