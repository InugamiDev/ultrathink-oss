---
name: ui-ux-pro-max
description: "Advanced UI/UX design intelligence — InuVerse edition. 84 styles, 160 palettes, 73 font pairings, 161 product types, 98 UX guidelines, 25 chart types across 16 stacks. Absorbs ui, ui-design, ui-styling, ui-ux-pro, ui-design-pipeline, stitch, web-design-guidelines. Routes all UI structure/visual/interaction work."
layer: domain
category: design
triggers: ["/design-pipeline", "/ui-pipeline", "SaaS dashboard", "UI review", "UX improvement", "WCAG compliance", "accessibility audit", "add styles", "admin panel", "ai design", "award-winning", "beautify", "build UI", "build a dashboard", "build a form", "build a landing page", "build component", "color scheme", "complex layout", "component design", "create a website", "create dialog", "create screen", "create table", "create the UI for", "create ui", "css variables", "dark mode", "design a", "design a component", "design a page", "design card", "design from scratch", "design guidelines", "design modal", "design navigation", "design review", "design screen", "design sidebar", "design system", "design this screen", "design to code", "design with stitch", "elevate ui", "fix ui", "generate design", "generate ui", "improve ui", "interface design", "landing page design", "looks bad", "looks ugly", "make a page", "make it look better", "make it look good", "make it pretty", "mockup", "needs polish", "pen file", "pencil design", "pixel perfect", "polish the ui", "premium UI", "professional design", "redesign", "responsive design", "shadcn", "stitch", "style component", "style it", "style this", "tailwind", "theme", "ui", "ui components", "ui design", "ui guidelines", "user interface", "web design", "wireframe to code"]
---

# ui-ux-pro-max

Advanced UI/UX design intelligence — InuVerse edition. 84 styles, 160 palettes, 73 font pairings, 161 product types, 98 UX guidelines, 25 chart types across 16 stacks. Searchable database with priority-based recommendations.

Absorbs: `ui`, `ui-design`, `ui-styling`, `ui-ux-pro`, `ui-design-pipeline`, `stitch`, `web-design-guidelines`.

---

## Decision Tree

```
What does the user need?
│
├─ "Build / design a page or component"
│   ├─ From scratch, wants AI generation  → /stitch generate
│   ├─ From scratch, wants code           → /ui build
│   ├─ Has a .pen file to edit            → /stitch edit
│   └─ Wants full pipeline (inspire→code) → /design-pipeline
│
├─ "Choose style / color / font / theme"
│   └─ CLI search → --design-system, then --domain for details
│
├─ "Review / audit existing UI"
│   ├─ Quick check                        → Pre-Delivery Checklist (below)
│   ├─ Full audit                         → /ui fix or /ui ship
│   └─ Web Interface Guidelines           → Fetch vercel-labs guidelines
│
├─ "Fix / improve existing UI"
│   ├─ Broken or inconsistent             → /ui fix
│   ├─ Boring or generic                  → /ui elevate
│   ├─ Pre-launch quality pass            → /ui ship
│   └─ Brand identity                     → /ui brand
│
├─ "Match a real brand's style"
│   └─ design-kit Brand Reference → npx getdesign@latest add <brand>
│
└─ "Implement Stitch/Pencil design as code"
    └─ /stitch implement
```

---

## Data Assets

| Domain | Count | File | Example Keywords |
|--------|-------|------|------------------|
| Styles | 91 | `data/styles.csv` | glassmorphism, minimalism, bento grid, spatial design, calm UI |
| Color palettes | 160 | `data/colors.csv` | saas, ecommerce, healthcare, beauty, fintech |
| Font pairings | 73 | `data/typography.csv` | elegant, playful, professional, modern |
| Product types | 161 | `data/products.csv` | SaaS, e-commerce, portfolio, healthcare |
| UX guidelines | 105 | `data/ux-guidelines.csv` | animation, accessibility, view transitions, APCA, popover |
| Chart types | 25 | `data/charts.csv` | trend, comparison, timeline, funnel, pie |
| Google Fonts | 1,923 | `data/google-fonts.csv` | sans serif, monospace, japanese, variable |
| Stacks | 16 | `data/stacks/*.csv` | angular, astro, flutter, html-tailwind, jetpack-compose, laravel, nextjs, nuxt-ui, nuxtjs, react-native, react, shadcn, svelte, swiftui, threejs, vue |

---

## CLI Search Workflow

### Prerequisites

Python 3 must be installed (`python3 --version`).

### Step 1: Generate Design System (start here for new projects)

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

Searches domains in parallel (product, style, color, landing, typography), applies reasoning rules, returns complete design system with pattern, style, colors, typography, effects, and anti-patterns.

**Persist for cross-session use:**
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" [--page "dashboard"]
```
Creates `design-system/MASTER.md` + optional `design-system/pages/{page}.md` overrides.

### Step 2: Deep-Dive with Domain Searches

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| Product type patterns | `product` | `--domain product "entertainment social"` |
| Style options | `style` | `--domain style "glassmorphism dark"` |
| Color palettes | `color` | `--domain color "entertainment vibrant"` |
| Font pairings | `typography` | `--domain typography "playful modern"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Individual Google Fonts | `google-fonts` | `--domain google-fonts "sans serif popular variable"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |
| AI prompt / CSS keywords | `prompt` | `--domain prompt "minimalism"` |

### Step 3: Stack Guidelines

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack-name>
```

16 stacks available: angular, astro, flutter, html-tailwind, jetpack-compose, laravel, nextjs, nuxt-ui, nuxtjs, react-native, react, shadcn, svelte, swiftui, threejs, vue.

### Output Formats

```bash
# ASCII box (default, best for terminal)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown (best for docs)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

### Query Tips

- **Multi-dimensional keywords**: combine product + industry + tone — `"entertainment social vibrant content-dense"` not just `"app"`
- **Try different angles**: `"playful neon"` → `"vibrant dark"` → `"content-first minimal"`
- Use `--design-system` first, then `--domain` to deep-dive any dimension

---

## /ui — Orchestrator Modes

```
/ui fix [target]       — Fix broken or inconsistent UI
/ui elevate [target]   — Make good UI exceptional
/ui build [target]     — Create new UI from scratch
/ui ship [target]      — Pre-launch quality pass
/ui brand [target]     — Apply/strengthen brand identity
/ui full [target]      — Everything, maximum quality
/ui [target]           — Auto-detect mode from context
```

`[target]` = file path, page name, URL, or component name. If omitted, targets cwd.

### Always Audit First

Every mode starts with `impeccable-audit`. Report findings, confirm mode, then execute.

### Mode Chains

| Mode | Chain |
|------|-------|
| **fix** | audit → normalize → harden → clarify → polish |
| **elevate** | audit → critique → bolder → colorize → animate → delight → polish |
| **build** | audit → frontend-design → design-system → normalize → accessibility → polish |
| **ship** | audit → harden → adapt → optimize → accessibility → polish |
| **brand** | audit → colorize → normalize → bolder → delight → polish |
| **full** | audit → critique → frontend-design → normalize → colorize → bolder → animate → delight → harden → adapt → optimize → clarify → polish |

### Auto-Detection

| Signal | Mode |
|--------|------|
| "broken", "bug", "wrong", "fix" | fix |
| "boring", "generic", "bland", "better" | elevate |
| "new", "create", "build", "from scratch" | build |
| "launch", "deploy", "ship", "ready" | ship |
| "brand", "identity", "colors", "logo" | brand |
| No signal / "everything" | elevate (default) |

### Execution Rules

1. Always audit first — never skip `impeccable-audit`
2. Report before acting — show findings, confirm mode
3. Sequential, not parallel — each skill's output informs the next
4. Stop on critical blocker — fix critical a11y/security issues first
5. One file at a time

---

## /stitch — AI Design Pipeline

```
/stitch generate "modern SaaS dashboard with sidebar nav"
/stitch edit path/to/design.pen
/stitch implement [stitch-screen-id or .pen file]
/stitch extract [screenshot or URL]
/stitch full "e-commerce product page with reviews"
```

### Mode: generate (Stitch AI)

1. List/create project → `mcp__stitch__list_projects` / `create_project`
2. Optional: create design system → `create_design_system` + `update_design_system`
3. Generate screen → `generate_screen_from_text` (can take minutes — DO NOT RETRY on timeout)
4. Retrieve details → `get_screen`
5. Optional: variants → `generate_variants` / edits → `edit_screens`

Full Stitch MCP reference (12 tools): `references/stitch-workflow.md`

### Mode: edit (Pencil .pen files)

1. Open: `mcp__pencil__open_document(filePathOrNew)`
2. State: `mcp__pencil__get_editor_state()`
3. Guidelines: `mcp__pencil__get_guidelines(category)`
4. Read: `mcp__pencil__batch_get(patterns, nodeIds)`
5. Design: `mcp__pencil__batch_design(operations)` — max 25 ops per call
6. Validate: `mcp__pencil__get_screenshot()` — always validate visually
7. Export: `mcp__pencil__export_nodes()`

**Rules**: NEVER read .pen files with Read/Grep — contents are encrypted. Only use `mcp__pencil__*` tools.

### Mode: implement

Extract design reference (Stitch HTML/CSS or Pencil exports) → route to `/ui build`.

### Mode: extract

Extract design DNA from Stitch screens (`get_screen`), Pencil files (`get_variables`, `search_all_unique_properties`), or screenshots → output as Tailwind config / CSS custom properties.

### Mode: full

Generate (Stitch) → Refine (Pencil, optional) → Implement (UI skill chain) → Verify (screenshot comparison).

### Auto-Detection

| Signal | Mode |
|--------|------|
| "generate", "create", "design me", "make a" | generate |
| ".pen file", "pencil", "edit design" | edit |
| "implement", "code", "build", "convert" | implement |
| "extract", "DNA", "tokens from" | extract |
| "full", "end to end", prompt text | full |

---

## /design-pipeline — INSPIRE → DEFINE → ILLUSTRATE → IMPLEMENT

For distinctive UI that avoids generic AI aesthetics. Every phase must complete before the next.

### Phase 1: INSPIRE

Find 3-5 real-world design references. At least 1 cross-domain reference.

| Source | Best For |
|--------|---------|
| Dribbble | UI components, micro-interactions |
| Behance | Full project case studies |
| Awwwards | Cutting-edge web design |
| Mobbin | Mobile app patterns |
| Godly | Web design showcase |
| Land-book | Landing pages |

For each reference: extract typography, colors, spacing, layout, unique elements.

### Phase 2: DEFINE

Synthesize inspiration into concrete design system BEFORE writing code:
- **Typography**: Font stack + fluid `clamp()` type scale + loading strategy
- **Colors**: Background, surface, primary, text, muted, border, accent, semantic (success/error/warning)
- **Spacing**: 4px base unit scale, container widths, grid columns, rhythm rules
- **Components**: Button/card/input tokens (radius, padding, shadow, states)

### Phase 3: ILLUSTRATE

Generate custom assets for hero, empty states, error pages, marketing.

Backends (priority order): Puter.js (free, zero setup) → Gemini API (free tier) → gemini-webapi (cookie-based) → TinyFish (500 free steps) → Playwright (local).

Prompt rules: specify exact style, include hex values from Phase 2, describe composition, state intended use, specify dimensions, say what NOT to include.

### Phase 4: IMPLEMENT

Every decision was made in Phases 1-3. Now code it.

Implementation order: CSS tokens → layout → typography → color → spacing → components → composition → polish → validation.

---

## Design Philosophy

1. **Functionality first** — Make it work before making it pretty
2. **Layout second** — Structure content, establish hierarchy
3. **UI polish last** — Apply styling, spacing, effects
4. **Anti-generic** — The #1 enemy is generic design. Every project should feel unique.
5. **Creative spacing** — Spacing should breathe and have rhythm, not be rigid everywhere
6. **Swiss-flexible grid** — Swiss grid for structure, allow intentional offsets for emphasis
7. **Grid for components** — Grid systems organize components and text, not "grid UI everywhere"

### Pipeline

```
pencil.dev → framer → code
```

Design in pencil.dev (.pen files), prototype in Framer, implement in code.

---

## Quick Reference — UX Rules by Priority

*98 rules across 10 categories. Use `--domain ux` for details. Rule names below for quick lookup.*

### 1. Accessibility (CRITICAL)

`color-contrast` · `focus-states` · `alt-text` · `aria-labels` · `keyboard-nav` · `form-labels` · `skip-links` · `heading-hierarchy` · `color-not-only` · `dynamic-type` · `reduced-motion` · `voiceover-sr` · `escape-routes` · `keyboard-shortcuts`

### 2. Touch & Interaction (CRITICAL)

`touch-target-size` (44×44pt / 48×48dp) · `touch-spacing` (8px+) · `hover-vs-tap` · `loading-buttons` · `error-feedback` · `cursor-pointer` · `gesture-conflicts` · `tap-delay` · `standard-gestures` · `system-gestures` · `press-feedback` · `haptic-feedback` · `gesture-alternative` · `safe-area-awareness` · `no-precision-required` · `swipe-clarity` · `drag-threshold`

### 3. Performance (HIGH)

`image-optimization` · `image-dimension` · `font-loading` · `font-preload` · `critical-css` · `lazy-loading` · `bundle-splitting` · `third-party-scripts` · `reduce-reflows` · `content-jumping` · `lazy-load-below-fold` · `virtualize-lists` · `main-thread-budget` · `progressive-loading` · `input-latency` · `tap-feedback-speed` · `debounce-throttle` · `offline-support` · `network-fallback`

### 4. Style Selection (HIGH)

`style-match` · `consistency` · `no-emoji-icons` · `color-palette-from-product` · `effects-match-style` · `platform-adaptive` · `state-clarity` · `elevation-consistent` · `dark-mode-pairing` · `icon-style-consistent` · `system-controls` · `blur-purpose` · `primary-action`

### 5. Layout & Responsive (HIGH)

`viewport-meta` · `mobile-first` · `breakpoint-consistency` · `readable-font-size` (16px+ mobile) · `line-length-control` · `horizontal-scroll` · `spacing-scale` (4pt/8dp) · `touch-density` · `container-width` · `z-index-management` · `fixed-element-offset` · `scroll-behavior` · `viewport-units` (dvh) · `orientation-support` · `content-priority` · `visual-hierarchy`

### 6. Typography & Color (MEDIUM)

`line-height` (1.5-1.75) · `line-length` (65-75 chars) · `font-pairing` · `font-scale` · `contrast-readability` · `text-styles-system` · `weight-hierarchy` · `color-semantic` · `color-dark-mode` · `color-accessible-pairs` · `color-not-decorative-only` · `truncation-strategy` · `letter-spacing` · `number-tabular` · `whitespace-balance`

### 7. Animation (MEDIUM)

`duration-timing` (150-300ms) · `transform-performance` · `loading-states` · `excessive-motion` · `easing` · `motion-meaning` · `state-transition` · `continuity` · `parallax-subtle` · `spring-physics` · `exit-faster-than-enter` · `stagger-sequence` · `shared-element-transition` · `interruptible` · `no-blocking-animation` · `fade-crossfade` · `scale-feedback` · `gesture-feedback` · `hierarchy-motion` · `motion-consistency` · `opacity-threshold` · `modal-motion` · `navigation-direction` · `layout-shift-avoid`

### 8. Forms & Feedback (MEDIUM)

`input-labels` · `error-placement` · `submit-feedback` · `required-indicators` · `empty-states` · `toast-dismiss` (3-5s) · `confirmation-dialogs` · `input-helper-text` · `disabled-states` · `progressive-disclosure` · `inline-validation` · `input-type-keyboard` · `password-toggle` · `autofill-support` · `undo-support` · `success-feedback` · `error-recovery` · `multi-step-progress` · `form-autosave` · `sheet-dismiss-confirm` · `error-clarity` · `field-grouping` · `read-only-distinction` · `focus-management` · `error-summary` · `touch-friendly-input` · `destructive-emphasis` · `toast-accessibility` · `aria-live-errors` · `contrast-feedback` · `timeout-feedback`

### 9. Navigation (HIGH)

`bottom-nav-limit` (max 5) · `drawer-usage` · `back-behavior` · `deep-linking` · `tab-bar-ios` · `top-app-bar-android` · `nav-label-icon` · `nav-state-active` · `nav-hierarchy` · `modal-escape` · `search-accessible` · `breadcrumb-web` · `state-preservation` · `gesture-nav-support` · `tab-badge` · `overflow-menu` · `bottom-nav-top-level` · `adaptive-navigation` · `back-stack-integrity` · `navigation-consistency` · `avoid-mixed-patterns` · `modal-vs-navigation` · `focus-on-route-change` · `persistent-nav` · `destructive-nav-separation` · `empty-nav-state`

### 10. Charts & Data (LOW)

`chart-type` · `color-guidance` · `data-table` · `pattern-texture` · `legend-visible` · `tooltip-on-interact` · `axis-labels` · `responsive-chart` · `empty-data-state` · `loading-chart` · `animation-optional` · `large-dataset` · `number-formatting` · `touch-target-chart` · `no-pie-overuse` · `contrast-data` · `legend-interactive` · `direct-labeling` · `tooltip-keyboard` · `sortable-table` · `axis-readability` · `data-density` · `trend-emphasis` · `gridline-subtle` · `focusable-elements` · `screen-reader-summary` · `error-state-chart` · `export-option` · `drill-down-consistency` · `time-scale-clarity`

---

## Breakpoints (ONE system — Tailwind-aligned)

```
375px    — small phone (test minimum)
640px    — large phone / small tablet (sm:)
768px    — tablet (md:)
1024px   — laptop / small desktop (lg:)
1280px   — desktop (xl:)
1440px   — large desktop (2xl:)
```

Design mobile-first, add complexity at larger breakpoints. Never hide critical content — rearrange, don't remove. Prefer `min-h-dvh` over `100vh` on mobile.

---

## Spacing & Grid

**Base unit**: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.

| Level | Spacing |
|-------|---------|
| Within component | 8-16px (tight grouping) |
| Between components | 24-32px (clear separation) |
| Between sections | 64-96px desktop, 48-64px mobile |

**Grid**: 12-column desktop, 4-column mobile. Gutters: 24px desktop, 16px mobile. Allow full-bleed for hero/impact sections.

**Container**: `max-w-7xl mx-auto` with `px-4 sm:px-6 lg:px-8`. Responsive padding: `clamp(1rem, 5vw, 3rem)`.

---

## Component Minimums

| Element | Padding | Min Height | Text | Radius | Tailwind |
|---------|---------|------------|------|--------|----------|
| Button | px-6 py-3 | 2.75rem | 1rem | rounded-lg | `px-6 py-3 text-base rounded-lg` |
| Card | p-6 | - | 1rem | rounded-xl | `p-6 rounded-xl shadow-sm` |
| Input | px-4 py-3 | 2.75rem | 1rem | rounded-lg | `px-4 py-3 rounded-lg` |
| Section | py-16 | - | - | - | `py-16` |
| Modal | p-8 | - | - | rounded-2xl | `p-8 rounded-2xl` |
| Badge | px-2 py-1 | 1.5rem | 0.75rem | rounded-full | `px-2 py-1 text-xs rounded-full` |

Component code patterns: `references/component-patterns.md`

---

## Absolute Rules

**NEVER**:
- Padding < 1rem on buttons/cards
- Text < 14px (0.875rem) for body content
- Icons < 1rem (w-4 h-4 minimum)
- Flat cards without shadow-sm or border
- Skip hover/focus states on interactive elements
- Border-radius < 0.5rem on components
- Use px for sizing (use rem for accessibility)
- Use emojis as structural icons (use SVG: Lucide, Heroicons)

**MUST**:
- `transition-all duration-200` on interactive elements
- `focus-visible:ring-2 focus-visible:ring-offset-2` on interactive elements
- `motion-reduce:transition-none` on all transitions
- WCAG AA contrast: 4.5:1 text, 3:1 UI elements
- rem units for all sizing

---

## Anti-Patterns ("AI Slop" Checklist)

Before delivering ANY design, verify none of these are present:

### Visual
- No cyan-on-dark color scheme (unless explicitly chosen)
- No purple-to-blue gradients as default accent
- No gradient text on headings or metrics
- No floating blobs or abstract shapes as decoration
- No identical card grids (same-sized cards repeated endlessly)
- No hero metric layout (big number + small label + gradient)
- No glassmorphism everywhere — use purposefully, not decoratively
- No generic shadows on every element

### Structural
- No cards-in-cards — flatten visual hierarchy
- No center-everything — left-aligned with asymmetric layouts feels more designed
- No same-spacing-everywhere — vary spacing for rhythm
- No monospace-as-"tech-vibe" — pick a real display font
- No modals for navigation — modals are for interruptions, not primary flows

### Code
- No pixel values (use rem)
- No missing states (hover, focus, disabled, loading, error, empty)
- No color-only indicators (pair with icons/text)
- No `outline: none` without alternative focus indicator
- No animations without `prefers-reduced-motion` support
- No placeholder-only labels on form inputs
- No raw hex values in components (use semantic tokens)
- No inconsistent spacing (define a scale and use it)
- No 4+ fonts (max 2 display+body, maybe 3 with mono)

> Test: "If someone said 'AI made this,' would they believe it immediately? If yes, redesign."

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (SVG only)
- [ ] Consistent icon family and style (one stroke width, one corner radius)
- [ ] Typography matches defined scale — no ad-hoc sizes
- [ ] Colors match defined palette — no random grays
- [ ] Spacing follows defined rhythm — no ad-hoc values
- [ ] Cards have visual depth (shadow-sm or border)
- [ ] Pressed states don't shift layout bounds
- [ ] Semantic theme tokens used consistently (no hardcoded per-screen colors)

### Interaction
- [ ] All interactive elements have hover + focus-visible + active + disabled states
- [ ] Touch targets >= 44x44pt (iOS) / 48x48dp (Android)
- [ ] Transitions: 150-300ms with platform-native easing
- [ ] Screen reader focus order matches visual order
- [ ] No gesture conflicts (tap/drag/back-swipe)

### Responsive
- [ ] Works at 375px, 768px, 1024px, 1440px
- [ ] Landscape orientation readable
- [ ] Safe areas respected (notch, Dynamic Island, gesture bar)
- [ ] Content not hidden behind fixed/sticky bars
- [ ] Horizontal insets adapt by device size

### Accessibility
- [ ] Text contrast >= 4.5:1, UI components >= 3:1
- [ ] All images/icons have accessibility labels
- [ ] Form fields have visible labels + error messages
- [ ] Color is not the only indicator
- [ ] Reduced motion and dynamic text size supported
- [ ] Keyboard-navigable (Tab order, no traps)

### Dark Mode
- [ ] Tested separately (not inferred from light mode)
- [ ] Primary text >= 4.5:1, secondary text >= 3:1
- [ ] Dividers/borders visible in both themes
- [ ] Modal scrim strong enough (40-60% black)

### Final
- [ ] At least ONE distinctive design element that makes this memorable
- [ ] No AI slop indicators (see Anti-Patterns above)
- [ ] Motion respects `prefers-reduced-motion`

---

## Web Interface Guidelines Review

For compliance review against Vercel's Web Interface Guidelines:

1. Fetch latest guidelines: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
2. Read specified files
3. Check against all rules
4. Output findings in `file:line` format

---

## UI Skill Ecosystem

### Orchestrators
`ui` (master orchestrator), `design-router`

### Quality Chain (impeccable-*)
audit → normalize → colorize → bolder → animate → delight → harden → adapt → optimize → clarify → polish

Additional: `critique`, `distill`, `quieter`, `extract`, `onboard`, `teach-impeccable`

### Architecture
`impeccable-frontend-design`, `css-architecture`, `design-system`, `design-principles`

### Frameworks
`shadcn-ui`, `radix-ui`, `tailwindcss`, `framer-motion`

### Specialized
`responsive-design`, `animation`, `accessibility`, `landing-gen`, `brand`

---

## References

### Core Design Knowledge (load on demand)
| Document | Content |
|----------|---------|
| `references/ux-laws.md` | 30 UX Laws, Nielsen's 10 Heuristics, Gestalt Principles, Don Norman's Principles |
| `references/design-languages.md` | 23 design languages with quick selection guide |
| `references/color-systems.md` | 14 color system approaches (OKLCH, semantic tokens, dark mode strategies) |
| `references/themes.md` | 45 themes with exact hex palettes (12 dark, 6 light, 12 UI/UX, 8 nature, 7 brand) |
| `references/component-patterns.md` | Button/Card/Input/Form code patterns, design styles (Glass/Clay/Minimal/Liquid), component minimums |
| `references/stitch-workflow.md` | Stitch MCP (12 tools) + Pencil MCP (13 tools), workflow steps, parameters, batch_design operations |
| `references/font-pairings.md` | Curated font pairings by use case from typography.csv data |
| `references/design-systems.md` | 65 design systems across 5 tiers with implementation notes |
| `references/composition-rules.md` | Rule of Thirds/Odds/Balance/Scale/Grid + 5-level visual hierarchy |
| `references/illustration-backends.md` | Puter.js, Gemini API, TinyFish, Playwright illustration code examples |
| `references/modern-techniques.md` | Scroll-driven animation, View Transitions API, new CSS 2025-2026, design tokens, APCA |
| `references/modern-patterns.md` | Bento grids, kinetic typography, AI chat UI, generative UI, command palettes, spatial design |
| `references/operator-console-style.md` | Paperclip-inspired Operator Console — control plane aesthetic, audacious-engineer voice, ASCII diagrams, mono numerics |

### UI Styling (shadcn/ui + Tailwind)
| Document | Content |
|----------|---------|
| `references/ui-styling/shadcn-components.md` | Complete component catalog with usage patterns |
| `references/ui-styling/shadcn-theming.md` | Theme configuration, CSS variables, dark mode |
| `references/ui-styling/shadcn-accessibility.md` | ARIA patterns, keyboard nav, focus management |
| `references/ui-styling/tailwind-utilities.md` | Core utility classes (layout, spacing, typography) |
| `references/ui-styling/tailwind-responsive.md` | Mobile-first breakpoints, container queries |
| `references/ui-styling/tailwind-customization.md` | @theme directive, custom tokens, plugins |
| `references/ui-styling/canvas-design-system.md` | Canvas-based visual design philosophy |

### Scripts
| Script | Purpose |
|--------|---------|
| `scripts/search.py` | CLI search — design system generation, domain search, stack guidelines |
| `scripts/design_system.py` | Design system persistence (MASTER.md + page overrides) |
| `scripts/core.py` | Core utilities for search and scoring |
| `scripts/ui-styling/shadcn_add.py` | Add shadcn/ui components with dependency handling |
| `scripts/ui-styling/tailwind_config_gen.py` | Generate tailwind.config.js with custom theme |

### External
| Resource | URL | Best For |
|----------|-----|----------|
| Awwwards | awwwards.com | Award-winning web design |
| Dark.design | dark.design | Dark mode UI patterns |
| Mobbin | mobbin.com | Mobile app design patterns |
| Godly | godly.website | Landing page inspiration |
| 3dicons | 3dicons.co | Open-source 3D icons (claymorphism) |
| Dribbble | dribbble.com | Visual concepts, color palettes |
| Behance | behance.net | Full case studies, brand systems |
