# Operator Console Style — "Audacious Engineer"

> Reference profile for the Paperclip-inspired aesthetic. Use when designing control planes, devtools, AI orchestration UIs, agent dashboards, infra tooling, or any operator-facing surface where the user is technical and the work is high-stakes.

## When to use

- Internal admin / control plane
- Developer tools (CI dashboards, deploy consoles, log explorers)
- AI agent management (orchestrators, routers, schedulers)
- Infrastructure tooling (k8s, observability, secrets)
- Any product where users want **density, clarity, and control** over polish and friendliness

**Skip when**: consumer-facing, marketing-led, or audiences include non-technical decision-makers as primary users.

---

## Visual Language

### Color
- **Dark mode default**, light optional (most operators leave it dark)
- Background: `oklch(10% 0.005 60)` — near-black with warm tint, never pure `#000`
- Foreground: `oklch(98% 0.005 60)` — bone, never pure `#FFF`
- **Single warm accent** (amber/orange family): `oklch(70% 0.18 35)` — used for primary CTAs and active states only
- **Status colors only** beyond accent: green (success), red (error), yellow (warn), blue (info). No decorative palette.
- Borders: `oklch(25% 0 0)` 1px, never thicker

### Typography
- **Mono for data**: JetBrains Mono / Berkeley Mono / IBM Plex Mono — for IDs, numerics, code, log lines, table data
- **Sans for prose**: Inter / Geist / system-ui — for headings, body copy, navigation
- **Tabular numerals**: `font-feature-settings: "tnum"` on every numeric column
- Sizes: tight scale, 12-14-16-20-24-32. No clamp/fluid type — operators use desktop.

### Layout
- **Tables, not cards**, for any list of >5 items
- Dense rows (32-40px height), monospace data columns
- 12-column grid with 16-24px gutters
- Generous left/right rails for nav + detail panes; content takes 60-70% center
- Mobile: collapse to single-column with table → stacked rows

### Motion
- **Functional only** — no decorative animation
- Transitions ≤100ms (state changes feel instant)
- Hover: subtle 1px ring or glow, never lift
- Loading: text-based spinners (`▰▰▰▱▱▱`) > graphical spinners
- Cursor blink on CTAs is acceptable; everything else static

### Iconography
- Outline icons only, 1.5px stroke, 16px or 20px
- Lucide / Phosphor / Heroicons (outline variants)
- ASCII diagrams over illustrated graphics for architecture explanations

---

## Brand Voice

### Tagline pattern
**"X for Y" with provocative noun choice**

Good: "Open-source orchestration for zero-human companies."
Good: "Persistent memory for stateless agents."
Bad: "AI-powered platform for modern teams." (generic)
Bad: "The future of work, today." (vague)

### Copy rules
1. **Declarative, never interrogative**
   - ✓ "Atomic execution."
   - ✗ "Need atomic execution?"

2. **Conditional flex**
   - ✓ "If it can receive a heartbeat, it's hired."
   - ✓ "If it has a tool call, it has memory."
   - Pattern: `If <subject can X>, <subject is Y>.`

3. **Problem-first comparison**
   - "Without Paperclip / With Paperclip" tables
   - Lead with the pain (twenty Claude tabs, manual context, token waste)
   - Solution column is concrete and short

4. **Concrete nouns + action verbs in headers**
   - ✓ "Atomic execution"
   - ✓ "Runtime skill injection"
   - ✓ "Persistent agent state"
   - ✗ "Powerful capabilities"
   - ✗ "Built for the future"

5. **Acknowledge real constraints**
   - Mention cost, coordination, failure modes
   - Don't paper over operational reality with marketing gloss

### Vibe calibration
- **Technical** (assumes the reader builds things)
- **Rebellious** (no enterprise hedging)
- **Grounded** (real problems, real tradeoffs)
- **Ambitious** (the work matters, urgency is real)

Avoid:
- Corporate hedging ("We believe...", "Our mission is...")
- Empty superlatives ("Powerful, scalable, beautiful")
- Forced friendliness ("Hey there!", "Welcome aboard!")
- Aspiration without substance ("Reimagine your workflow")

---

## Components

### Buttons
- Primary: solid accent fill, mono font, uppercase, tight letter-spacing
- Secondary: 1px border, no fill, hover adds 1px ring
- Tertiary: text-only, accent color, underline on hover
- All buttons: 32px height, 12px horizontal padding, 4px radius

### Tables
- Header: 11px uppercase mono, slightly muted (`oklch(70% 0 0)`)
- Rows: 32px tall, alternating bg with `oklch(12% 0.005 60)` for even rows (subtle)
- Sortable headers: caret icon to right, accent on active sort
- Sticky header on scroll
- Right-align all numeric columns

### Cards (when used)
- 1px border, no shadow, 4px radius
- Header bar with 1px bottom border
- Padding: 16px internal
- Used sparingly — only when entity is conceptually a unit

### Navigation
- Left rail, 240px wide, dense
- Section headers in 10px uppercase mono
- Item: 32px height, 12px padding, hover bg `oklch(15% 0 0)`
- Active: left 2px accent border, accent text

### Badges / Status
- Pill shape, 18-22px height, mono font
- Status only: success (green tint), error (red tint), warning (amber), info (blue), muted (gray)
- Never used decoratively

### ASCII Diagrams
```
┌──────────────┐
│   Director   │  Top-level coordinator
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼
[Worker] [Worker]
```
- Use box-drawing chars: `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼`
- Arrows: `→ ← ↑ ↓ ▼ ▲ ◀ ▶`
- Render in `<pre>` with mono font
- Annotate to right of boxes, not inside them

---

## Tailwind Quick Reference

```css
/* Theme tokens */
@theme {
  --color-bg: oklch(10% 0.005 60);
  --color-fg: oklch(98% 0.005 60);
  --color-accent: oklch(70% 0.18 35);
  --color-border: oklch(25% 0 0);
  --color-muted: oklch(70% 0 0);
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-sans: "Inter", ui-sans-serif, system-ui;
  --radius: 4px;
}
```

```html
<!-- Primary button -->
<button class="h-8 px-3 bg-accent text-bg font-mono uppercase text-xs tracking-tight rounded">
  Deploy
</button>

<!-- Data table row -->
<tr class="h-8 border-b border-border hover:bg-[oklch(15%_0_0)]">
  <td class="font-mono text-sm tabular-nums">ag_01H8X...</td>
  <td class="text-sm">Worker</td>
  <td class="text-right font-mono text-sm tabular-nums">$0.42</td>
</tr>

<!-- Status badge -->
<span class="inline-flex items-center h-5 px-2 rounded-full bg-green-500/10 text-green-400 font-mono text-xs">
  active
</span>
```

---

## Anti-patterns (do NOT do these in this style)

- ✗ Gradient backgrounds (subtle tints OK, gradients no)
- ✗ Glassmorphism / frosted blur (this isn't visionOS)
- ✗ Rounded-3xl / pill cards
- ✗ Drop shadows beyond 1px
- ✗ Stock photography or 3D illustrations
- ✗ Animated SVG decorations
- ✗ Customer testimonials in product UI
- ✗ Emoji in copy (unless explicitly invoked as data)
- ✗ Marketing-style hero sections inside the product
- ✗ Onboarding wizards with cartoon mascots

---

## Reference: Real-world implementations

| Product | What to study |
|---------|---------------|
| Paperclip | Tagline + comparison tables + ASCII diagrams |
| Linear | Dense tables + keyboard shortcuts + status pills |
| Vercel Dashboard | Mono numerics + dark default + accent restraint |
| Railway | Single warm accent (purple) + dense logs UI |
| Tailscale Admin | Operator-first IA + technical copy without dumbing down |
| Fly.io Dashboard | Terminal-output panels + minimal chrome |
| Sourcegraph | Code-first surfaces + monospace everywhere data |

When in doubt, ask: *"Would a senior infra engineer find this UI clear at 11pm during an incident?"* — if no, you're styling for the wrong audience.
