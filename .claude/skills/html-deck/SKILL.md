---
name: html-deck
description: "Create polished HTML presentations — interactive fullscreen deck + print/PDF version + presenter script. Design system: Inter font, CSS variables, component classes, JS keyboard/click/touch navigation. Slide types: title, agenda, bullet, code, table, chart, comparison, flow, architecture, radar, timeline, staircase. Integrates with visual-render for custom assets. Actions: create presentation, make deck, build slides, design slideshow, generate presentation."
layer: domain
category: design
triggers:
  - "create presentation"
  - "make deck"
  - "build slides"
  - "design slideshow"
  - "generate presentation"
  - "html slides"
  - "slide deck"
  - "presentation deck"
  - "make presentation"
  - "create slides"
  - "build presentation"
  - "html presentation"
linksTo:
  - visual-render
  - ui-ux-pro-max
  - design
linkedFrom:
  - design
  - visual-render
riskLevel: low
memoryReadPolicy: on-demand
memoryWritePolicy: on-demand
---

# HTML Deck Skill

Create production-quality HTML presentations: interactive fullscreen deck + print/PDF version + presenter script.

## Outputs (always produce all 3)

| File | Purpose |
|------|---------|
| `<name>-deck.html` | Interactive fullscreen deck — JS navigation, progress bar |
| `<name>-print.html` | Print/PDF version — fixed 1280×720px slides, no JS |
| `<name>-script.txt` | Presenter script — per-slide notes with timing |

---

## Design System

### Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

### CSS Variables
```css
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --surface2: #1a1a26;
  --border: #2a2a3d;
  --accent: #7c3aed;        /* purple */
  --accent2: #06b6d4;       /* cyan */
  --accent3: #10b981;       /* green */
  --accent4: #f59e0b;       /* amber */
  --danger: #ef4444;
  --text: #f0f0f8;
  --muted: #8888aa;
  --dim: #4a4a6a;
  --font: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Component Classes
| Class | Element | Description |
|-------|---------|-------------|
| `.card` | div | Rounded panel: `background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:32px` |
| `.ca` | span/div | Accent highlight: `color:var(--accent)` |
| `.cs` | span/div | Secondary accent: `color:var(--accent2)` |
| `.pill` | span | Tag/badge: `background:rgba(124,58,237,.15); color:var(--accent); border:1px solid rgba(124,58,237,.3); padding:4px 14px; border-radius:99px; font-size:.8em` |
| `.wb` | span | Word break hint for long strings |
| `.codeblock` | pre | `font-family:var(--mono); background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:24px; font-size:.85em; overflow:auto` |
| `.g2` / `.g3` / `.g5` | div | CSS Grid: 2/3/5 equal columns |
| `.sl` / `.slb` / `.slg` / `.slr` | div | Stat label / blue / green / red accent |
| `.flow` | div | Flexbox row with centered items |

---

## Workflow

### Step 1: Plan the content
Outline slide sequence before writing HTML. Typical structure:
1. Title slide
2. Personal hook / "Why this matters"
3. Agenda
4. Problem statement / data
5. Core content (3-7 slides)
6. Architecture/diagram
7. Live demo / code
8. Results / case study
9. Key takeaways
10. Thank you / Q&A

### Step 2: Create visual assets (optional)
Use `visual-render` for custom diagrams, charts, logos:
```bash
# Generate a diagram
~/.local/share/ultrathink/venv/bin/python3 \
  ~/.claude/skills/visual-render/scripts/capture.py \
  /tmp/visual-render/arch.html \
  /tmp/visual-render/arch.png --bg white
```
Reference in slides as `<img src="/tmp/visual-render/arch.png">` or embed as base64.

### Step 3: Write the interactive deck
Use `templates/deck-shell.html` as the base. Each slide is:
```html
<section class="slide" id="s1">
  <!-- slide content here -->
</section>
```
The JS navigation, progress bar, and keyboard/touch handlers are in the shell.

### Step 4: Write the print version
Use `templates/print-shell.html`. Same CSS, but:
- Fixed `width:1280px; height:720px` per slide
- `page-break-after: always`
- No JS navigation
- `@media print { @page { size: 1280px 720px; margin: 0; } }`

### Step 5: Write the presenter script
Format:
```
[Slide N: Title] — Time: Xm Ys (cumulative: Xm Ys)
Opening line or hook.
Key talking points:
- Point 1
- Point 2
Transition: "And that brings us to..."
```

---

## Slide Type Templates

See `templates/slide-types.md` for complete HTML patterns for every slide type.

### Quick reference
| Type | Pattern |
|------|---------|
| Title | Full-bleed gradient + large text + subtitle |
| Agenda | `.g3` grid of numbered cards |
| Bullet/Points | Numbered or bulleted list with `.ca` highlights |
| Code | `.codeblock` with syntax via JS or plain `<pre>` |
| Data Table | `<table>` with thead accent row |
| Two-Column | `.g2` with `.card` in each cell |
| Flow/Steps | `.flow` with boxes and `→` separators |
| Architecture | Layered boxes with color-coded borders |
| Chart (SVG) | Inline SVG radar, bar, or donut |
| Staircase | Diagonal step layout for progression |
| Quote/Hook | Large italic quote with attribution |
| Comparison | Side-by-side `.card` with pros/cons |
| Timeline | Vertical or horizontal step sequence |
| Pricing | Feature-comparison grid with CTAs |

---

## Layout Constraints

| Property | Deck | Print |
|----------|------|-------|
| Slide size | 100vw × 100vh | 1280px × 720px fixed |
| Font base | `clamp(14px, 1.6vw, 18px)` | `16px` fixed |
| Title size | `clamp(36px, 5vw, 72px)` | `52px` fixed |
| Padding | `64px` horizontal, `48px` vertical | `60px` horizontal, `48px` vertical |
| Max content width | `1200px` centered | fill to 1280px |

---

## Anti-Patterns

- **Too many slides**: Keep to 15-25 for a 10-minute talk (rule: 30-45 sec per slide)
- **Wall of text**: Max 5-6 bullet points per slide; use sub-slides instead
- **Missing data-export**: If using visual-render for in-slide SVGs, always add `data-export`
- **Fixed px fonts**: Use `clamp()` in deck so text scales on different screen sizes
- **No presenter notes**: The script is as important as the deck; write it last when content is locked
- **No contrast**: Dark text on dark bg — always check `--text` on `--surface` contrast ≥ 4.5:1
