---
name: ui-design
description: "Comprehensive UI design system: 230+ font pairings, 48 themes, 65 design systems, 23 design languages, 30 UX laws, 14 color systems, Swiss grid, Gestalt principles, Pencil.dev workflow. Inherits ui-ux-pro-max (99 UX rules) + impeccable-frontend-design (anti-AI-slop). Triggers on any design, UI, layout, typography, color, theme, or styling task."
layer: orchestrator
category: design
triggers:
  - "design"
  - "ui design"
  - "create a page"
  - "build a landing"
  - "make it look good"
  - "redesign"
  - "style this"
  - "typography"
  - "font pairing"
  - "color palette"
  - "color scheme"
  - "dark mode"
  - "theme"
  - "design system"
  - "spacing"
  - "grid"
  - "layout"
  - "visual design"
  - ".pen file"
  - "pencil.dev"
  - "web design"
  - "mobile design"
  - "dashboard design"
  - "component design"
inputs:
  - brief: What to design (page, component, app)
  - style: Design language preference (optional)
  - mood: Aesthetic direction (optional)
outputs:
  - design_system: Typography, colors, spacing, tokens
  - code: Production-ready implementation
linksTo:
  - ui-ux-pro-max
  - impeccable-frontend-design
  - ui-design-pipeline
  - tailwindcss
  - css-architecture
  - responsive-design
  - dark-mode
  - nextjs
  - react
linkedFrom:
  - gsd
  - cook
  - plan
  - brainstorm
preferredNextSkills:
  - impeccable-polish
  - test-ui
  - accessibility
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
---

# UI Design — Comprehensive Design Intelligence

The complete design skill. 230+ font pairings, 48 themes (with exact hex palettes), 65 real design systems, 23 design languages, 30 UX laws, 14 color systems, Swiss grid, Gestalt principles, and Pencil.dev .pen file workflow.

**Inherits**: `ui-ux-pro-max` (99 UX rules, 10 categories) + `impeccable-frontend-design` (anti-AI-slop philosophy) + `ui-design-pipeline` (INSPIRE→DEFINE→ILLUSTRATE→IMPLEMENT)

## Design Philosophy (from design expert feedback)

> "Designing is meant to be creative, not fixed."

1. **Functionality first** — Make it work before making it pretty
2. **Layout second** — Structure the content, establish hierarchy
3. **UI polish last** — Apply great styling, spacing, effects
4. **Anti-generic** — The #1 enemy is generic design. Every project should feel unique.
5. **Creative spacing** — Spacing should breathe and have rhythm, not be rigid everywhere
6. **Swiss-flexible grid** — Swiss grid for structure, but allow intentional offsets
7. **Grid for components** — Grid systems organize components and text, not "grid UI everywhere"

### Pipeline

```
pencil.dev → framer → code
```

Design in pencil.dev (.pen files), prototype in Framer, implement in code. UX elements like loaders must be ensured at every stage.

---

## Quick Decision: What to Read

| Need | Jump To |
|------|---------|
| Choose fonts | §1 Font Pairings |
| Choose colors | §4 Color Systems |
| Choose a visual style | §3 Design Languages |
| Reference a design system | §5 Design Systems |
| Choose a theme | §6 Themes |
| UX/usability rules | §2 UX Laws |
| Spacing/grid rules | §7 Spacing & Grid |
| Pencil.dev workflow | §8 .pen File Workflow |
| Full UX checklist | Load `ui-ux-pro-max` (99 rules) |
| Anti-AI-slop check | Load `impeccable-frontend-design` |

---

## §1. Font Pairings (230+)

Full reference: `docs/font-pairings.md` (378 lines, 10 categories)

### Quick Picks by Use Case

| Use Case | Heading | Body | # | Vibe |
|----------|---------|------|---|------|
| **SaaS / Product** | Inter | DM Sans | 45 | Minimal, modern |
| **SaaS / Product** | Plus Jakarta Sans | Inter | 53 | Clean, professional |
| **SaaS / Product** | Manrope | DM Sans | 50 | Dashboard, SaaS |
| **SaaS / Product** | Geist | Geist Mono | 119 | Next.js, Vercel |
| **Editorial / Blog** | Playfair Display | Inter | 1 | Editorial, premium |
| **Editorial / Blog** | Lora | Nunito | 7 | Warm, storytelling |
| **Editorial / Blog** | Fraunces | Inter | 97 | Retro-modern |
| **E-commerce / Luxury** | Cormorant Garamond | Montserrat | 17 | Luxury, fashion |
| **E-commerce / Luxury** | Bodoni Moda | Montserrat | 23 | High fashion |
| **E-commerce / Luxury** | Zodiak | General Sans | 35 | Fashion, editorial |
| **Developer / Tech** | JetBrains Mono | Space Grotesk | 104 | Developer, code |
| **Developer / Tech** | Space Mono | Space Grotesk | 110 | Retro-tech |
| **Developer / Tech** | Fira Code | Inter | 107 | Dev tools, SaaS |
| **Corporate** | Montserrat | Source Sans Pro | 38 | Professional |
| **Corporate** | Noto Serif | Noto Sans | 21 | Universal, multilingual |
| **Creative / Agency** | Apercu | Inter | 216 | Quirky, creative |
| **Creative / Agency** | Syne | Inter | 99 | Artistic, expressive |
| **Creative / Agency** | Neue Montreal | Editorial New | 213 | Contemporary |
| **Fintech / Dashboard** | Manrope | Inter | 49 | Geometric, fintech |
| **Fintech / Dashboard** | Sora | Inter | 51 | Wide, futuristic |

### Categories in docs/font-pairings.md

1. Classic Serif + Clean Sans (35 pairings)
2. Modern Sans + Sans (35 pairings)
3. Display/Decorative + Body (32 pairings)
4. Monospace + Sans for Tech (18 pairings)
5. Handwritten/Script + Sans (17 pairings)
6. Slab Serif + Sans (18 pairings)
7. Geometric + Humanist (18 pairings)
8. Variable Font Combos (17 pairings)
9. Bold/Condensed + Readable Body (22 pairings)
10. Mixed Foundry / Premium (18 pairings)

### Typography Rules

- **Max 2 fonts** (display + body), 3 if mono needed
- **Type scale**: Use fluid `clamp()` — xs through 3xl
- **Line height**: 1.5-1.75 for body
- **Line length**: 35-60 chars mobile, 60-75 desktop
- **Weight hierarchy**: Bold headings (600-700), Regular body (400), Medium labels (500)
- **No overused fonts**: Avoid Inter/Roboto/Arial as the ONLY choice — use them as body paired with distinctive display
- **Variable fonts preferred**: Better performance, fewer files, more flexibility
- **Font loading**: `font-display: swap` or `optional`, preload critical fonts only

---

## §2. UX Laws & Principles

### 30 Laws of UX (lawsofux.com)

| # | Law | One-Line | UI Application |
|---|-----|----------|----------------|
| 1 | Aesthetic-Usability | Beautiful = perceived as more usable | Invest in visual polish |
| 2 | Choice Overload | Too many options → paralysis | Limit choices, progressive disclosure |
| 3 | Chunking | Grouped info is easier to process | Group form fields, break content into sections |
| 4 | Cognitive Load | Mental effort to use the interface | Reduce extraneous load, simplify decisions |
| 5 | Doherty Threshold | Productivity soars when response <400ms | Skeleton screens, optimistic UI |
| 6 | Fitts's Law | Target time = f(distance, size) | Large CTAs, close to cursor, min 44px touch |
| 7 | Goal-Gradient Effect | Effort increases near completion | Progress bars, "80% done" motivators |
| 8 | Hick's Law | Decision time ∝ number of choices | Reduce options, categorize, defaults |
| 9 | Jakob's Law | Users expect your site works like others | Follow platform conventions |
| 10 | Law of Common Region | Shared boundary = perceived group | Cards, borders, background fills |
| 11 | Law of Proximity | Nearby objects = perceived group | Related items close, unrelated items far |
| 12 | Law of Pragnanz | Brain simplifies complex images | Simplify, use recognizable shapes |
| 13 | Law of Similarity | Similar elements = same group | Consistent styling for related actions |
| 14 | Law of Uniform Connectedness | Connected elements = related | Lines, arrows, shared visual properties |
| 15 | Mental Model | Internal model of how things work | Match users' existing models |
| 16 | Miller's Law | Working memory holds 7±2 items | Max ~7 nav items, chunk info |
| 17 | Occam's Razor | Simplest solution wins | Remove unnecessary complexity |
| 18 | Paradox of Active User | Users never read manuals | Design for exploration, obvious core actions |
| 19 | Pareto Principle (80/20) | 80% effects from 20% causes | Focus on the 20% used 80% of the time |
| 20 | Peak-End Rule | Judged by peak + ending | Design delightful peaks, satisfying completions |
| 21 | Postel's Law | Accept varied input, output clean data | Flexible inputs, predictable outputs |
| 22 | Serial Position Effect | Remember first and last items | Important items at start/end of lists |
| 23 | Tesler's Law | Irreducible complexity exists | System absorbs complexity, not user |
| 24 | Von Restorff Effect | Distinctive item is remembered | Make CTAs visually distinct |
| 25 | Zeigarnik Effect | Incomplete tasks remembered better | Progress indicators drive completion |
| 26 | Selective Attention | Focus on goal-relevant stimuli | One visually dominant primary action |
| 27 | Flow | Complete immersion in activity | Remove friction, immediate feedback |
| 28 | Cognitive Bias | Systematic thinking errors | Design for confirmation bias, anchoring, social proof |
| 29 | Working Memory | Temporary task-relevant info | Don't require memory across steps |
| 30 | Parkinson's Law | Work expands to fill time | Set reasonable constraints |

### Nielsen's 10 Usability Heuristics

1. **Visibility of System Status** — Loading indicators, progress bars, save states
2. **Match System & Real World** — User language, natural order, real-world metaphors
3. **User Control & Freedom** — Undo/redo, cancel, back navigation, emergency exits
4. **Consistency & Standards** — Internal + external consistency, design systems enforce this
5. **Error Prevention** — Validation, constraints, confirmation, smart defaults
6. **Recognition Over Recall** — Autocomplete, recent items, visible navigation
7. **Flexibility & Efficiency** — Keyboard shortcuts, power user features, customization
8. **Aesthetic & Minimalist Design** — Only relevant info, progressive disclosure
9. **Help Users Recover from Errors** — Plain-language messages with solutions
10. **Help & Documentation** — Contextual help, searchable FAQs, step-by-step guides

### Gestalt Principles

| Principle | UI Application |
|-----------|----------------|
| **Proximity** | Space labels close to inputs, group related buttons |
| **Similarity** | Consistent button styles for same-type actions |
| **Continuity** | Horizontal scrolling carousels, progress steppers |
| **Closure** | Logos with negative space, partial progress indicators |
| **Figure/Ground** | Modal overlays darken background, cards float |
| **Common Region** | Cards, panels, bordered sections |
| **Symmetry & Order** | Symmetrical layouts where appropriate |
| **Common Fate** | Synchronized animations, grouped drag |
| **Uniform Connectedness** | Connecting lines in flowcharts, shared color themes |

### Don Norman's Principles

| Principle | Description |
|-----------|-------------|
| **Affordances** | Buttons look pressable, inputs look typeable |
| **Signifiers** | Placeholder text, icons, hover cursors, drag handles |
| **Mapping** | Controls spatially correspond to effects |
| **Feedback** | Immediate response to every action |
| **Conceptual Model** | Desktop metaphor, shopping cart metaphor |
| **Constraints** | Disabled buttons, date pickers, character limits |
| **Discoverability** | Users can figure out possible actions |

---

## §3. Design Languages (23)

### Quick Selection Guide

| Need | Recommended Language(s) |
|------|------------------------|
| Corporate / Enterprise SaaS | Swiss + Material/Fluent + Rams principles |
| Consumer Mobile | Apple HIG or Material + Glassmorphism |
| Creative / Portfolio | Brutalism, Memphis, or Art Deco |
| Luxury / Fashion | Wabi-Sabi minimalism, Art Deco, Scandinavian |
| Developer Tools | Brutalism + Swiss grid + Monochromatic |
| Playful / Children | Memphis, Claymorphism, Triadic colors |
| Sustainable / Natural | Scandinavian + Wabi-Sabi + Organic/Biophilic |
| Dashboard / Data | Swiss grid + Monochromatic + OKLCH palettes |
| Gaming / Entertainment | Cyberpunk, Retro-Futurism, Neon |
| Wellness / Meditation | Japandi, Wabi-Sabi, Minimalism |
| Gen Z / Youth | Y2K Revival, Memphis, Dopamine Design |
| Sci-fi / Tech | Retro-Futurism, Constructivism, Brutalism |
| Reading / Editorial | Swiss + Mid-Century Modern |
| E-commerce | Flat Design + Minimalism + Scandinavian |

### The 23 Languages

1. **Swiss / International Typographic** — Mathematical grids, sans-serif, minimal color. Corporate DNA.
2. **Material Design (Google)** — Surface metaphor, HCT dynamic color, 8dp grid. M3 Expressive (2025).
3. **Human Interface Guidelines (Apple)** — Clarity, deference, depth. Liquid Glass (2025).
4. **Fluent Design (Microsoft)** — Acrylic/Mica materials, 4px base, reveal effects.
5. **Bauhaus** — Form follows function. Primary shapes + primary colors. Geometric.
6. **De Stijl (Neoplasticism)** — Only horizontal/vertical lines, only primary colors. Mondrian grids.
7. **Art Nouveau** — Flowing organic curves, nature forms, muted colors (sage, gold, mauve).
8. **Art Deco** — Bold geometry, zigzags, sunbursts. Black+gold, jewel tones. Glamour.
9. **Memphis** — Anti-rationalist. Clashing colors, terrazzo, squiggles. Fun, irreverent.
10. **Dieter Rams / Braun** — "Less, but better." 10 principles. White/black/gray, geometric precision.
11. **Scandinavian / Nordic** — Warm minimalism, organic curves, nature colors, democratic design.
12. **Wabi-Sabi** — Imperfection, impermanence. Asymmetry, earth tones, ma (emptiness).
13. **Brutalism** — Raw materials, monochrome, dense text. Web: system fonts, minimal CSS.
14. **Constructivism** — Strong diagonals, photomontage, red+black+white.
15. **Mid-Century Modern** — Clean lines + organic curves, bold accents (mustard, teal, tangerine).
16. **Neomorphism / Glassmorphism / Claymorphism** — Soft extrusions, frosted glass, playful 3D clay.
17. **Flat Design** — No shadows/gradients/textures. Bold colors, simple shapes, clean typography. iOS 7+.
18. **Minimalism** — "Less is more." Maximum white space, limited palette, essential elements only.
19. **Y2K Revival** — Early 2000s nostalgia. Bubble shapes, chrome, neon gradients, pixel elements.
20. **Japandi** — Japanese minimalism + Scandinavian warmth. Neutral tones, natural materials, clean lines, wabi-sabi touches.
21. **Retro-Futurism** — Past visions of future. 3 sub-styles: Raygun Gothic (50s space age), Synthwave (80s neon), Cassette Futurism (lo-fi tech).
22. **Cyberpunk** — Neon on dark, glitch effects, high-tech low-life. Cyan/magenta/yellow accents on deep blacks.
23. **Organic / Biophilic** — Nature-integrated. Flowing curves, natural textures, earth tones, plant-inspired patterns.

Full details with origins, typography, color, grid/spacing: see `docs/design-languages-ux-laws.md`

---

## §4. Color Systems (14 Approaches)

### 1. 60-30-10 Rule
- 60% dominant (background) → 30% secondary (cards, nav) → 10% accent (CTAs, active states)

### 2. Monochromatic
- Single hue, varied lightness/saturation. Elegant, guaranteed harmony. Use for dashboards, minimal interfaces.

### 3. Complementary
- Opposites on color wheel (blue + orange). Maximum contrast. One dominant, one accent.

### 4. Analogous
- 3 adjacent colors. Naturally harmonious, low tension. Needs distant accent for CTAs.

### 5. Triadic
- 3 equally spaced colors. Vibrant, balanced. One dominant, two accents.

### 6. Split-Complementary
- Base + two adjacent to complement. High contrast without tension.

### 7. Tetradic (Double Complementary)
- Two complementary pairs (e.g., blue+orange + red+green). Very rich, hard to balance. Best for complex dashboards needing many distinct categories.

### 8. Neutral + Accent
- Predominantly neutral palette (grays, whites) with a single bold accent. Clean, professional. The accent drives all attention.

### 9. Semantic Color Mapping
- Colors assigned by meaning, not aesthetics: red=error, green=success, yellow=warning, blue=info. Consistent across product regardless of theme.

### 10. OKLCH-Based Systems (Modern Standard)
- Perceptually uniform color space (Lightness, Chroma, Hue)
- Same L value = same perceived brightness across all hues (HSL lies)
- Native CSS: `oklch(70% 0.15 250)`
- Generate tonal scales by varying L, keeping C and H constant

```css
--brand-50:  oklch(97% 0.02 250);
--brand-500: oklch(55% 0.20 250); /* base */
--brand-900: oklch(22% 0.08 250);
```

### 11. Semantic Token Architecture (3-Tier)
- **Tier 1 — Primitives**: Raw values (`color.blue.500`)
- **Tier 2 — Semantic**: Purpose-based (`color.bg.primary`, `color.text.secondary`)
- **Tier 3 — Component**: Specific usage (`button.primary.bg`, `input.border.focus`)
- Components → Tier 3 → Tier 2 → Tier 1. Components never know raw values.

### 12. Dark Mode Strategies
- NOT inverted light mode — design a dedicated dark palette
- Reduce saturation of accents (they glow on dark backgrounds)
- Use elevated surfaces (lighter grays) for hierarchy instead of shadows
- Text opacity: primary ~87%, secondary ~60%, disabled ~38%
- Avoid pure #000 — use `oklch(13% 0.01 hue)` for depth perception

```
bg/base:            oklch(10% 0.005 hue)
bg/surface:         oklch(15% 0.005 hue)
bg/surface-raised:  oklch(20% 0.005 hue)
bg/surface-overlay: oklch(25% 0.008 hue)
```

### 13. Accessible Color Patterns
- WCAG 2.2: Normal text 4.5:1, large text 3:1, UI components 3:1
- Never color alone — add icons, patterns, labels
- Design for color blindness (~8% of men): avoid red/green only
- OKLCH delta-L > 40% is usually safe for text contrast
- Focus outlines: 2px min, 3:1 contrast

### 14. Perceptual Color Spaces

| Space | Perceptually Uniform? | CSS Native? | Best For |
|-------|----------------------|-------------|----------|
| sRGB/hex | No | Yes | Legacy |
| HSL | No | Yes | Quick prototyping |
| OKLCH | Yes | Yes (93%+) | Modern palettes, a11y, theming |
| HCT (Google) | Yes | No | Material Design 3 |
| P3 Display | Wider gamut | Yes | HDR screens |

---

## §5. Design Systems (65)

Full reference with descriptions: `docs/design-themes-and-systems.md`

### Tier 1 — Platform Foundations (3)

| System | Company | Key Characteristics |
|--------|---------|-------------------|
| Material Design 3 | Google | HCT dynamic color, 8dp grid, Roboto Flex, M3 Expressive |
| Human Interface Guidelines | Apple | SF Pro/Symbols, Dynamic Type, Liquid Glass, semantic colors |
| Fluent 2 | Microsoft | Acrylic/Mica, Segoe UI Variable, 4px grid, reveal effects |

### Tier 2 — Major Open Source (19)

| System | Company | Stack |
|--------|---------|-------|
| Carbon | IBM | React, Web Components, Svelte |
| Polaris | Shopify | React |
| Primer | GitHub | React, CSS, Figma |
| Atlassian Design | Atlassian | React |
| Spectrum | Adobe | React Spectrum, Web Components |
| Lightning | Salesforce | Web Components, React |
| Pajamas | GitLab | Vue |
| Base Web | Uber | React |
| Gestalt | Pinterest | React |
| Ring UI | JetBrains | React |
| Garden | Zendesk | React |
| Protocol | Mozilla | CSS/HTML |
| Orbit | Kiwi.com | React |
| Paste | Twilio | React |
| Evergreen | Segment | React |
| Grommet | HPE | React |
| Braid | SEEK | React |
| PatternFly | Red Hat | React, Web Components |
| Elastic UI | Elastic | React |

### Tier 3 — Component Libraries (10)

| Library | Key Traits |
|---------|------------|
| shadcn/ui | Copy-paste, Radix + Tailwind, customizable |
| Radix UI | Unstyled, accessible primitives, composable |
| Chakra UI | Styled, accessible, theme-able |
| Mantine | Full-featured, 100+ components, hooks |
| Ant Design | Enterprise-grade, Chinese ecosystem |
| NextUI | Beautiful defaults, Tailwind-based |
| DaisyUI | Tailwind component classes, theme system |
| Headless UI | Unstyled, accessible, by Tailwind Labs |
| Ark UI | Framework-agnostic, state machines |
| Park UI | Ark UI + styled, multiple themes |

### Tier 4 — Industry-Specific (8)

Mineral UI (CA Technologies), Thumbprint (Thumbtack), Canvas (Workday), Spark (Adevinta), Seeds (Sprout Social), Forma 36 (Contentful), Lunar (Nordea), Mesh (Midtrans)

### Tier 5 — Government/Public (4)

USWDS (US), GOV.UK (UK), Aurora (Canada), NSW Design System (Australia)

---

## §6. Themes (45 with exact hex palettes)

Full reference with all hex values: `docs/design-themes-and-systems.md`

### Dark Themes (12)

| Theme | BG | FG | Key Accents | Mood |
|-------|----|----|-------------|------|
| **Dracula** | `#282A36` | `#F8F8F2` | Purple `#BD93F9`, Pink `#FF79C6`, Green `#50FA7B` | Gothic-elegant, vibrant |
| **Nord** | `#2E3440` | `#ECEFF4` | Frost `#88C0D0`, Aurora `#BF616A`-`#B48EAD` | Arctic, calm |
| **Tokyo Night** | `#1A1B26` | `#A9B1D6` | Blue `#7AA2F7`, Purple `#BB9AF7`, Pink `#F7768E` | Neon city, vibrant pastels |
| **Catppuccin Mocha** | `#1E1E2E` | `#CDD6F4` | Mauve `#CBA6F7`, Peach `#FAB387`, Teal `#94E2D5` | Warm pastels, cozy |
| **Solarized Dark** | `#002B36` | `#839496` | Yellow `#B58900`, Blue `#268BD2`, Cyan `#2AA198` | Scientific, precise |
| **Gruvbox Dark** | `#282828` | `#EBDBB2` | Orange `#D65D0E`, Green `#98971A`, Aqua `#689D6A` | Retro, warm, earthy |
| **One Dark** | `#282C34` | `#ABB2BF` | Red `#E06C75`, Blue `#61AFEF`, Green `#98C379` | Balanced, professional |
| **Monokai** | `#272822` | `#F8F8F2` | Pink `#F92672`, Green `#A6E22E`, Orange `#FD971F` | High-contrast, iconic |
| **GitHub Dark** | `#0D1117` | `#C9D1D9` | Blue `#58A6FF`, Green `#3FB950`, Red `#F85149` | Clean, utilitarian |
| **Nightfox** | `#192330` | `#CDCECF` | Blue `#719CD6`, Cyan `#63CDCF`, Green `#81B29A` | Forest-at-night |
| **Rose Pine** | `#191724` | `#E0DEF4` | Rose `#EBBCBA`, Pine `#31748F`, Gold `#F6C177` | Botanical, calming |
| **Catppuccin Macchiato** | `#24273A` | `#CAD3F5` | Mauve `#C6A0F6`, Blue `#8AADF4`, Green `#A6DA95` | Warmer dark variant |

### Light Themes (6)

| Theme | BG | FG | Key Accents | Mood |
|-------|----|----|-------------|------|
| **Solarized Light** | `#FDF6E3` | `#657B83` | Same accents as dark | Warm cream, ergonomic |
| **Catppuccin Latte** | `#EFF1F5` | `#4C4F69` | Mauve `#8839EF`, Red `#D20F39`, Blue `#1E66F5` | Bright, warm pastels |
| **GitHub Light** | `#FFFFFF` | `#24292F` | Blue `#0969DA`, Green `#1A7F37`, Red `#CF222E` | Clean, professional |
| **One Light** | `#FAFAFA` | `#383A42` | Red `#E45649`, Blue `#4078F2`, Green `#50A14F` | Crisp, comfortable |
| **Gruvbox Light** | `#FBF1C7` | `#3C3836` | Same accents as dark | Warm parchment |
| **Rose Pine Dawn** | `#FAF4ED` | `#575279` | Rose `#D7827E`, Pine `#286983`, Gold `#EA9D34` | Botanical, gentle |

### UI/UX Themes (12)

| Theme | Characteristics | Mood |
|-------|----------------|------|
| **Glassmorphism** | Frosted blur, translucent cards, subtle borders | Modern, layered |
| **Neomorphism** | Soft dual shadows, monochromatic, embossed | Soft, tactile |
| **Claymorphism** | Rounded 3D blobs, pastel colors, playful shadows | Fun, approachable |
| **Gradient Mesh** | Multi-color gradient backgrounds, clean foreground | Creative, vibrant |
| **Aurora** | Northern-lights gradient, dark base | Ethereal, premium |
| **Neon / Cyberpunk** | Dark bg, neon glow accents (cyan/magenta/yellow) | Gaming, futuristic |
| **Retro / Synthwave** | Purple-pink gradients, grid lines, sunset palette | 80s nostalgia |
| **Brutalist** | Monochrome, raw borders, system fonts, dense | Raw, honest |
| **Vaporwave** | Pastel pink/blue/purple, gradients, retro | Nostalgic, surreal |
| **High Contrast** | Pure black/white, no gray, bold typography | Accessible, bold |
| **Monochrome** | Single hue, varied lightness, elegant | Minimal, focused |
| **Pastel** | Soft muted colors, low saturation, gentle | Calm, friendly |

### Nature / Seasonal Themes (8)

| Theme | Palette Keywords | Mood |
|-------|-----------------|------|
| **Forest** | Deep greens, bark browns, moss | Grounding, organic |
| **Ocean** | Deep blues, teal, seafoam, sand | Calm, expansive |
| **Desert** | Terracotta, sand, sage, amber | Warm, earthy |
| **Sunrise** | Warm yellows, peach, soft orange | Optimistic, fresh |
| **Sunset** | Deep orange, magenta, purple, navy | Dramatic, warm |
| **Autumn** | Burnt orange, gold, burgundy, forest green | Rich, seasonal |
| **Cherry Blossom** | Soft pink, white, light green | Delicate, Japanese |
| **Mountain** | Slate gray, stone, sky blue, snow | Sturdy, elevated |

### Brand-Specific Themes (7)

| Theme | Characteristics |
|-------|----------------|
| **Stripe** | Clean white, indigo accent, purple gradients, Inter font |
| **Linear** | Dark gray bg, subtle purple accent, precision spacing |
| **Vercel** | Deep black, white text, minimal accent, Geist font |
| **Notion** | Warm off-white, serif headings, muted accents |
| **Figma** | White bg, colorful multi-hue accents, playful |
| **Supabase** | Dark green-tinted bg, emerald accent, modern |
| **Tailwind** | Sky blue accent, clean white, utility-first feel |

---

## §7. Spacing & Grid Philosophy

### Swiss Grid (Flexible, Not Rigid)

The Swiss grid provides **structure**, not a cage. Allow intentional offsets for emphasis.

```
Base unit: 4px
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

### Grid Usage

| Level | Grid Application | Flexibility |
|-------|-----------------|-------------|
| **Page** | 12-column (desktop), 4-column (mobile) | Standard columns, responsive gutters |
| **Section** | Consistent max-width + padding | Allow full-bleed for hero/impact sections |
| **Component** | Internal spacing from scale | Components follow rhythm, not rigid placement |
| **Text** | Baseline grid alignment (optional) | Prose can flow naturally |

### Container System

```css
--container-sm: 640px;    /* single-column content */
--container-md: 768px;    /* articles, forms */
--container-lg: 1024px;   /* multi-column */
--container-xl: 1280px;   /* dashboards */
--container-2xl: 1536px;  /* wide layouts */
--padding: clamp(1rem, 5vw, 3rem);  /* responsive padding */
```

### Spacing Rhythm Rules

- **Within component**: 8-16px gaps (tight grouping)
- **Between components**: 24-32px (clear separation)
- **Between sections**: 64-96px (breathing room)
- **Section spacing scales down on mobile**: 48-64px
- **Asymmetric spacing is OK**: Use varied spacing to create visual interest
- **Dense ≠ cramped**: Information-dense dashboards use tight spacing with clear hierarchy

### Responsive Breakpoints

```css
375px   /* small phone */
640px   /* large phone / small tablet */
768px   /* tablet */
1024px  /* laptop / small desktop */
1280px  /* desktop */
1440px  /* large desktop */
1920px  /* ultra-wide */
```

---

## §8. Pencil.dev .pen File Workflow

### Overview

Pencil.dev uses `.pen` files edited via MCP tools. **Never use `Read`/`Grep` on .pen files** — they're encrypted. Only use pencil MCP tools.

### Workflow Steps

1. **Get editor state**: `get_editor_state()` — Check what's currently open
2. **Open/create**: `open_document(filePathOrNew)` — Pass `'new'` or a file path
3. **Get guidelines**: `get_guidelines(topic)` — Topics: `code`, `table`, `tailwind`, `landing-page`, `slides`, `design-system`, `mobile-app`, `web-app`
4. **Get style guide**: First `get_style_guide_tags()`, then `get_style_guide(tags, name)`
5. **Discover structure**: `batch_get(patterns, nodeIds)` — Search/read nodes
6. **Design**: `batch_design(operations)` — Insert/Copy/Update/Replace/Move/Delete (max 25 ops per call)
7. **Check layout**: `snapshot_layout()` — See computed layout rectangles
8. **Visual validation**: `get_screenshot()` — Periodically verify visually
9. **Export**: `export_nodes()` — Export to PNG/JPEG/WEBP/PDF

### batch_design Operations

```
foo=I("parent", { ... })           # Insert
baz=C("nodeid", "parent", { ... }) # Copy
foo2=R("nodeid1/nodeid2", { ... }) # Replace
U(foo+"/nodeid", { ... })          # Update
D("dfFAeg2")                       # Delete
M("nodeid3", "parent", 2)          # Move
G("baz", "ai", "...")              # Generate image
```

### Design Validation Loop

```
Design → snapshot_layout() → get_screenshot() → adjust → repeat
```

Always validate visually after significant changes. The screenshot reveals spacing, alignment, and visual hierarchy issues that node data alone cannot show.

---

## §9. Anti-Patterns (The "AI Slop" Checklist)

Before delivering ANY design work, verify none of these are present:

### Visual
- [ ] **No cyan-on-dark** color scheme (unless explicitly chosen)
- [ ] **No purple-to-blue gradients** as default accent
- [ ] **No gradient text** on headings or metrics
- [ ] **No floating blobs** or abstract shapes as decoration
- [ ] **No identical card grids** (same-sized cards repeated endlessly)
- [ ] **No hero metric layout** (big number + small label + gradient)
- [ ] **No glassmorphism everywhere** — use purposefully, not decoratively
- [ ] **No emojis as icons** — use SVG icon libraries (Lucide, Heroicons)
- [ ] **No generic shadows** on every element

### Structural
- [ ] **No cards-in-cards** — flatten visual hierarchy
- [ ] **No center-everything** — left-aligned with asymmetric layouts feels more designed
- [ ] **No same-spacing-everywhere** — vary spacing for rhythm
- [ ] **No monospace-as-"tech-vibe"** — pick a real display font
- [ ] **No modals for navigation** — modals are for interruptions, not primary flows

### Test

> "If someone said 'AI made this,' would they believe it immediately? If yes, redesign."

---

## §10. Implementation Order

When building any UI:

```
1. FUNCTIONALITY — Make it work (logic, data, routing)
2. LAYOUT — Structure (grid, containers, responsive breakpoints)
3. TYPOGRAPHY — Font loading, type scale, heading/body hierarchy
4. COLOR — Semantic tokens, light/dark mode, accent system
5. SPACING — Apply rhythm scale, section spacing, component gaps
6. COMPONENTS — Buttons, inputs, cards per token spec
7. COMPOSITION — Assemble into pages, test at all breakpoints
8. POLISH — Hover states, focus rings, transitions, micro-interactions
9. VALIDATION — a11y check, contrast ratios, touch targets, dark mode
```

### Pre-Delivery Checklist

- [ ] Typography matches defined scale — no ad-hoc sizes
- [ ] Colors match defined palette — no random grays
- [ ] Spacing follows defined rhythm — no ad-hoc values
- [ ] Responsive: works at 375px, 768px, 1024px, 1440px
- [ ] Accessibility: 4.5:1 contrast, focus indicators, semantic HTML
- [ ] Touch targets: min 44x44px with 8px spacing
- [ ] Dark mode: tested separately (not assumed from light)
- [ ] Motion: 150-300ms, respects `prefers-reduced-motion`
- [ ] No AI slop indicators (see §9)
- [ ] At least ONE distinctive design element that makes this memorable

---

## References

| Document | Path | Content |
|----------|------|---------|
| Font pairings (230+) | `docs/font-pairings.md` | 10 categories, use-case quick picks, sources |
| Design languages + UX laws | `docs/design-languages-ux-laws.md` | 23 languages, 30 UX laws, Nielsen, Gestalt, Norman, 14 color systems |
| Themes + Design systems (45+55) | `docs/design-themes-and-systems.md` | Exact hex palettes, component libraries, gov systems |
| UX rules (99 guidelines) | Load `ui-ux-pro-max` skill | 10 categories, priority-based, checklist |
| Anti-AI-slop philosophy | Load `impeccable-frontend-design` skill | Bold direction, DO/DON'T rules |
| Design pipeline | Load `ui-design-pipeline` skill | INSPIRE→DEFINE→ILLUSTRATE→IMPLEMENT |
| Python CLI | `skills/ui-ux-pro-max/scripts/search.py` | Query design system, domains, stacks |
