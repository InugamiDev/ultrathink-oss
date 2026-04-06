---
name: pitch-deck
description: Investor pitch deck generator. One prompt → 10-12 slide HTML deck with problem/solution/market/traction/team/ask narrative. Chains slides + design-system + brand + research + mermaid. Outputs a standalone HTML file with keyboard navigation, animations, and speaker notes.
argument-hint: "[company] [stage] [ask amount]"
layer: orchestrator
category: design
triggers:
  - pitch deck
  - investor deck
  - pitch presentation
  - fundraising deck
  - investor pitch
  - seed deck
  - series a deck
  - demo day
linksTo:
  - slides
  - design-system
  - brand
  - research
  - mermaid
  - html-deck
inputs: |
  Company name + 1-line description, funding stage (pre-seed/seed/Series A/B),
  ask amount, vertical/industry, traction metrics (users, revenue, growth),
  and tone (bold/confident, understated/premium, or technical/data-driven).
outputs: |
  pitch/deck.html — full interactive pitch deck with keyboard navigation
  pitch/speaker-notes.md — per-slide speaker notes
  pitch/leave-behind.html — printable 1-pager PDF summary
preferredNextSkills:
  - brandkit-gen
  - landing-gen
  - research
fallbackSkills:
  - slides
  - html-deck
memoryReadPolicy: selective
memoryWritePolicy: always
sideEffects: |
  Creates pitch/ directory with deck.html (self-contained, no external deps),
  speaker-notes.md, and leave-behind.html (print-friendly A4/Letter layout).
---

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
