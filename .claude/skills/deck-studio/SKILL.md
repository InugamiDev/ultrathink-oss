---
name: deck-studio
description: "Unified HTML presentation generator — strategic slides with Chart.js and design tokens, polished HTML decks with print/PDF versions and speaker notes, investor pitch decks with problem/solution/market/ask structure. Single entry point for 'make a slide deck' / 'create a presentation' / 'pitch deck'."
layer: orchestrator
category: design
triggers: ["HTML presentation", "build presentation", "build slides", "chart slides", "create presentation", "create slides", "demo day", "design slideshow", "fundraising deck", "generate presentation", "html presentation", "html slides", "investor deck", "investor pitch", "make deck", "make presentation", "pitch deck", "pitch presentation", "presentation", "presentation deck", "seed deck", "series a deck", "slide deck", "slide design", "slides"]
---

# deck-studio

Unified HTML presentation generator — strategic slides with Chart.js and design tokens, polished HTML decks with print/PDF versions and speaker notes, investor pitch decks with problem/solution/market/ask structure. Single entry point for 'make a slide deck' / 'create a presentation' / 'pitch deck'.


## Absorbs

- `slides`
- `html-deck`
- `pitch-deck`


---

## From `ckm:slides`

> Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies.

# Slides

Strategic HTML presentation design with data visualization.

<args>$ARGUMENTS</args>

## When to Use

- Marketing presentations and pitch decks
- Data-driven slides with Chart.js
- Strategic slide design with layout patterns
- Copywriting-optimized presentation content

## Subcommands

| Subcommand | Description | Reference |
|------------|-------------|-----------|
| `create` | Create strategic presentation slides | `references/create.md` |

## References (Knowledge Base)

| Topic | File |
|-------|------|
| Layout Patterns | `references/layout-patterns.md` |
| HTML Template | `references/html-template.md` |
| Copywriting Formulas | `references/copywriting-formulas.md` |
| Slide Strategies | `references/slide-strategies.md` |

## Routing

1. Parse subcommand from `$ARGUMENTS` (first word)
2. Load corresponding `references/{subcommand}.md`
3. Execute with remaining arguments


---

## From `html-deck`

> Create polished HTML presentations — interactive fullscreen deck + print/PDF version + presenter script. Design system: Inter font, CSS variables, component classes, JS keyboard/click/touch navigation. Slide types: title, agenda, bullet, code, table, chart, comparison, flow, architecture, radar, timeline, staircase. Integrates with visual-render for custom assets. Actions: create presentation, make deck, build slides, design slideshow, generate presentation.

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
# Generate a diagram (run from the repo root)
python3 .claude/skills/visual-render/scripts/capture.py \
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


---

## From `pitch-deck`

> Investor pitch deck generator. One prompt → 10-12 slide HTML deck with problem/solution/market/traction/team/ask narrative. Chains slides + design-system + brand + research + mermaid. Outputs a standalone HTML file with keyboard navigation, animations, and speaker notes.

# Pitch Deck Generator

> One prompt → investor-ready 10-12 slide HTML presentation.

## What Gets Generated

| File | Content |
|---|---|
| `pitch/deck.html` | Full interactive pitch deck |
| `pitch/speaker-notes.md` | Speaker notes for each slide |
| `pitch/leave-behind.html` | 1-pager PDF-printable summary |

---

## Phase 0 — Discovery

Parse `$ARGUMENTS` for:
- `company` — name + 1-line description
- `stage` — pre-seed / seed / Series A / Series B
- `ask` — how much raising
- `vertical` — industry
- `traction` — any numbers (users, revenue, growth)
- `tone` — bold/confident, understated/premium, technical/data-driven

Missing info → ask for: company description, stage, ask amount, top 1-2 traction metrics.

---

## Phase 1 — Narrative Architecture

1. **Invoke `research`** — Look up market sizing data, competitive landscape, and relevant industry benchmarks to ground the deck content.
2. **Invoke `slides`** — Structure the 10-12 slide narrative arc using the Guy Kawasaki / YC pattern and the Duarte Sparkline emotion arc.

### Deck Structure (Guy Kawasaki / YC pattern, adapted)

| Slide | Title | Purpose | Max time |
|---|---|---|---|
| 1 | Cover | Company name + tagline + logo | 10s |
| 2 | Problem | The pain, made visceral | 90s |
| 3 | Solution | "What if..." — the insight | 60s |
| 4 | Product | Show, don't tell (screenshot/demo) | 90s |
| 5 | Market | TAM / SAM / SOM, bottom-up | 60s |
| 6 | Business Model | How you make money | 45s |
| 7 | Traction | The only slide VCs actually read | 90s |
| 8 | Competition | 2×2 matrix, you win on 2 axes | 45s |
| 9 | Go-to-Market | First 1000 customers, channel | 60s |
| 10 | Team | Why you + why now | 60s |
| 11 | Financials | 3-year projection + key assumptions | 60s |
| 12 | The Ask | Amount, use of funds, milestones | 45s |

### Narrative Emotion Arc (Duarte Sparkline)
```
Status quo (frustration) → Insight (hope) → Reality check (concern) →
Traction (excitement) → Vision (inspiration) → Ask (urgency)
```

---

## Phase 2 — Content Generation

For each slide, generate:

**Problem slide:**
- Lead with a story or shocking stat, not a list
- "X people suffer from Y every Z" format
- 1 hero stat, large typography
- Source the stat

**Solution slide:**
- Single clear sentence: "[Product] is [category] that [benefit] by [mechanism]"
- 3 bullets max — benefits, not features

**Traction slide (most important):**
- Lead metric in 72px type: MRR / ARR / users / growth %
- Timeline chart showing trajectory (use Chart.js)
- Notable logos if any (even free users / pilot customers)
- "We've grown X% MoM for Y months"

**Market slide:**
- Bottom-up TAM calculation, not "our market is $50B"
- Format: "X customers × $Y ARPU × Z% penetration = $Z SAM"

**Competition slide:**
- 2×2 matrix: you win on the 2 most important axes
- Don't put "No solution" as a competitor — adds no credibility
- 1-line differentiation statement: "Unlike X, we Y because Z"

---

## Phase 3 — Visual Design

3. **Invoke `design-system`** — Generate the slide color palette, typography pairing, and layout grid tokens.
4. **Invoke `brand`** — Apply brand identity (colors, typefaces, logo) consistently across all slide templates.

**Slide design principles:**
- Dark background default (more gravitas in VC meetings)
- One accent color (brand primary)
- Max 2 typefaces: display + body
- Rule of thirds for layout
- 1 idea per slide — if you need 2, make 2 slides
- All data visualized (no tables in slides)

**Slide template variants:**
```
full-bleed    — edge-to-edge visual, headline overlay
stat-hero     — single metric, 96px type, centered
split         — left text, right visual (50/50)
grid          — 2×2 or 3-col feature/team layout
timeline      — horizontal journey with milestones
chart         — full-width Chart.js visualization
```

---

## Phase 4 — Charts & Data

5. **Invoke `mermaid`** — Generate inline SVG org charts, flow diagrams, and architecture visuals for relevant slides.
6. **Invoke `slides`** — Wire up Chart.js growth/market/financial charts with draw-in animations.

For traction/market/financial slides, generate Chart.js charts:

```javascript
// Growth chart
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [/* traction numbers */],
      borderColor: 'var(--accent)',
      backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
      fill: true, tension: 0.4
    }]
  },
  options: { plugins: { legend: { display: false } } }
})
```

For org charts and flow diagrams, use inline SVG via `mermaid` skill.

---

## Phase 5 — Deck Mechanics

**Navigation:**
```javascript
// Keyboard: ← → arrows, Space to advance
// Click anywhere to advance
// Progress bar at bottom
// Slide number: "7 / 12"
// ESC = overview mode (grid of all slides)
```

**Animations:**
- Slide transition: fade (300ms) — no flashy wipes
- Content: stagger-in (elements appear 100ms apart)
- Charts: draw-in animation on enter
- All: `prefers-reduced-motion` respected

---

## Phase 6 — Speaker Notes

Generate `pitch/speaker-notes.md`:

```markdown
## Slide 2: Problem
**Hook**: Open with the story of [persona] who...
**Key point**: The stat that lands hardest is...
**Anticipate**: VCs will ask "why hasn't X solved this?"
**Answer**: Because [incumbent insight]...
**Time**: 90 seconds
```

---

## Phase 7 — Leave Behind

Generate `pitch/leave-behind.html` — printable 1-pager:
- A4/Letter format
- All key info: problem, solution, traction, ask, team, contact
- QR code to full deck URL
- No animations (print-friendly CSS)

---

## Quality Gates

- [ ] Traction slide has at least 1 real metric (no "projected")
- [ ] Market sizing is bottom-up, not "% of giant market"
- [ ] Competition slide shows clear differentiation on 2 axes
- [ ] Ask slide specifies use of funds (% breakdown)
- [ ] Team slide explains "why you" not just credentials
- [ ] All charts load without errors
- [ ] Keyboard navigation works
- [ ] No slide has more than 40 words of body text

---

## Usage

```
/pitch-deck Plano — AI proxy infra, Seed, raising $2M, 50 enterprise pilots
/pitch-deck Meey — Vietnam RE platform, Series A, raising $5M, $120k MRR
/pitch-deck InuAuth — Auth library, pre-seed, raising $500k, 2k developers
```

