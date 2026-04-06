---
name: ui-design-pipeline
description: Inspiration-first UI design workflow — find real design references, define typography/color/spacing, generate illustrations via Gemini, then implement. Produces distinctive UI that avoids generic AI aesthetics.
layer: orchestrator
category: design
triggers:
  - "/design-pipeline"
  - "/ui-pipeline"
  - "design a page"
  - "design a component"
  - "build a landing page"
  - "create the UI for"
  - "make it look good"
  - "design this screen"
  - "redesign"
  - "build a dashboard"
  - "create a website"
inputs:
  - brief: What to design (page, component, app, landing page)
  - mood: Desired aesthetic direction (optional — will be derived from inspiration if not given)
  - inspirations: URLs or names of reference sites/designs (optional — will be found if not given)
  - illustrations: Whether to generate illustrations via Gemini (default: true if GEMINI_API_KEY set)
outputs:
  - design_system: Typography, colors, spacing, and component tokens
  - illustrations: Generated assets (paths)
  - code: Production-ready implementation
  - inspiration_board: Reference URLs and screenshots used
linksTo:
  - impeccable-frontend-design
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
fallbackSkills:
  - impeccable-frontend-design
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Web searches for design inspiration
  - Fetches reference websites
  - Calls Gemini API for illustration generation (if configured)
  - Creates image files in project
  - Creates/modifies component files
---

# UI Design Pipeline

## Why This Exists

AI-generated UI is bad because it skips the most critical step in design: **finding inspiration**.

Human designers don't start from nothing. They browse Dribbble, study Awwwards winners,
screenshot competitor sites, save typography pairings, collect color palettes. THEN they
design. AI skips all of this and goes straight to "generate a card with rounded corners
and a gradient" — producing the same generic slop every time.

This skill fixes that. The pipeline is:

```
INSPIRE → DEFINE → ILLUSTRATE → IMPLEMENT
```

Every phase must complete before the next begins. No shortcuts.

## Phase 1: INSPIRE — Find Real Design References

**This is the most important phase.** Do not skip it. Do not rush it.

### What to Search For

Based on the brief, search for 3-5 real-world design references:

1. **Direct competitors** — What do similar products look like?
2. **Aspirational designs** — What's the BEST version of this type of UI?
3. **Cross-domain inspiration** — What UNRELATED domains have interesting patterns?
   (e.g., a dashboard inspired by aviation cockpit UIs, a landing page inspired by magazine editorial layouts)

### Where to Find Inspiration

| Source | Best For | How to Search |
|--------|---------|---------------|
| Dribbble | UI components, micro-interactions | Web search: `site:dribbble.com [type] design` |
| Behance | Full project case studies | Web search: `site:behance.net [type] UI` |
| Awwwards | Cutting-edge web design | Web search: `site:awwwards.com [category]` |
| Mobbin | Mobile app patterns | Web search: `site:mobbin.com [pattern]` |
| Godly | Web design showcase | Web search: `site:godly.website [type]` |
| Land-book | Landing pages | Web search: `site:land-book.com [industry]` |
| Real products | Production-grade reference | Fetch the actual URL with WebFetch |
| SaaS sites | Dashboard/app inspiration | Search for `best [type] dashboard design 2026` |

### How to Extract Inspiration

For each reference found:

1. **Fetch the URL** using WebFetch or Playwright screenshot
2. **Extract design decisions**:
   - Typography: What fonts? What scale? What weights?
   - Colors: What's the palette? How many colors? Warm or cool?
   - Spacing: Tight or generous? Consistent or varied?
   - Layout: Grid-based? Asymmetric? Full-bleed? Contained?
   - Unique elements: What makes this design MEMORABLE?
3. **Record in the inspiration board**:

```markdown
## Inspiration Board

### Ref 1: [Name/URL]
- **What I like**: [specific element]
- **Typography**: [fonts observed]
- **Colors**: [palette description]
- **Layout**: [structure notes]
- **Steal this**: [the ONE thing to borrow]

### Ref 2: [Name/URL]
...
```

### Minimum Requirements

- At least **3 references** found and analyzed
- At least **1 cross-domain reference** (not a direct competitor)
- At least **3 specific design decisions** extracted from references
- If the user provides reference URLs, analyze those FIRST, then supplement

## Phase 2: DEFINE — Design System from Inspiration

Synthesize the inspiration into a concrete design system. Define everything BEFORE writing any component code.

### Typography

```markdown
## Typography

### Font Stack
- **Display**: [font name] — [why chosen, which reference inspired it]
- **Body**: [font name] — [why chosen]
- **Mono** (if needed): [font name]

### Type Scale (fluid)
- **xs**: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)
- **sm**: clamp(0.875rem, 0.8rem + 0.375vw, 1rem)
- **base**: clamp(1rem, 0.925rem + 0.375vw, 1.125rem)
- **lg**: clamp(1.125rem, 1rem + 0.625vw, 1.375rem)
- **xl**: clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem)
- **2xl**: clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem)
- **3xl**: clamp(2rem, 1.5rem + 2.5vw, 3.5rem)

### Font Loading
[Google Fonts import or next/font configuration]
```

### Colors

```markdown
## Colors

### Palette
- **Background**: [hex] — [reasoning]
- **Surface**: [hex] — [for cards/elevated elements]
- **Primary**: [hex] — [brand/accent color, from which reference]
- **Text**: [hex] — [main text]
- **Text Muted**: [hex] — [secondary text]
- **Border**: [hex]
- **Accent**: [hex] — [interactive elements]
- **Success/Error/Warning**: [hex each]

### Rules
- [e.g., "No pure black — use off-black tinted toward primary"]
- [e.g., "Borders at 8% opacity of text color"]
- [e.g., "Primary only for CTAs and key interactive elements"]
```

### Spacing & Layout

```markdown
## Spacing

### Scale
4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128

### Container
- Max width: [e.g., 1280px]
- Padding: [e.g., clamp(1rem, 5vw, 3rem)]

### Grid
- Columns: [e.g., 12-column on desktop, 4 on mobile]
- Gap: [e.g., 24px desktop, 16px mobile]

### Rhythm Rules
- [e.g., "Section spacing: 96px desktop, 64px mobile"]
- [e.g., "Component internal padding: 24px"]
- [e.g., "Tight groupings for related items: 8px gap"]
```

### Component Tokens

```markdown
## Components

### Buttons
- Border radius: [e.g., 8px | pill | sharp]
- Padding: [e.g., 12px 24px]
- Font: [weight, size, tracking]
- States: hover, active, disabled, focus-visible

### Cards
- Border radius: [value]
- Shadow: [value or none]
- Border: [value or none]
- Padding: [value]

### Inputs
- Height: [value]
- Border radius: [value]
- Border: [value]
- Focus ring: [style]
```

## Phase 3: ILLUSTRATE — Generate Custom Assets

### When to Generate Illustrations

- Landing pages (hero illustrations, feature graphics)
- Empty states
- Error pages (404, 500)
- Onboarding flows
- Marketing sections
- Icons and spot illustrations

### Generation Backends (Priority Order)

Try each backend in order. Use the first one that works.

| # | Backend | Cost | Setup | Quality | Best For |
|---|---------|------|-------|---------|----------|
| 1 | **Puter.js** | Free | None | Good | OSS, zero friction |
| 2 | **Gemini API** | Free (limited) | API key | Great | Devs with Google account |
| 3 | **gemini-webapi** | Free | Cookie login | Great | Batch generation |
| 4 | **TinyFish** | 500 free steps | API key | Great | Complex multi-step |
| 5 | **Playwright** | Free | Browser install | Good | Local fallback |

---

### Backend 1: Puter.js (Recommended — Zero Setup)

No API key. No account. No rate limits. Works immediately.

**Browser/frontend usage:**
```html
<script src="https://js.puter.com/v2/"></script>
<script>
  puter.ai.txt2img(
    "Minimal isometric illustration of data nodes, navy and amber palette, clean vector, 1024x1024",
    { model: "gemini-3.1-flash-image-preview" }
  ).then(img => document.body.appendChild(img));
</script>
```

**Node.js usage** (via the dashboard API or a generation script):
```typescript
// Generate via Puter's REST endpoint
const response = await fetch("https://api.puter.com/ai/txt2img", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "...",
    model: "gemini-3.1-flash-image-preview"
  }),
});
const blob = await response.blob();
```

**Models available via Puter:**
- `gemini-3.1-flash-image-preview` — Nano Banana 2 (fast, good quality)
- `gemini-3-pro-image-preview` — Nano Banana Pro (best quality)
- `gemini-2.5-flash-image` — Original Nano Banana

### Backend 2: Gemini API (Official — Free Tier)

Requires a free API key from Google AI Studio (no credit card).
~20 image requests/day via API, 500-1000 via AI Studio web.

```typescript
import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview-image-generation",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: { responseModalities: ["TEXT", "IMAGE"] },
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    writeFileSync(`public/illustrations/${name}.png`, buffer);
  }
}
```

Install: `npm install @google/genai`

### Backend 3: gemini-webapi (Cookie-Based — Unlimited Free)

Uses reverse-engineered Gemini web API via Python. Requires Google account cookies.
Already integrated in the core dashboard asset pipeline.

```python
from gemini_webapi import GeminiClient

client = GeminiClient(cookies={
    "__Secure-1PSID": "...",
    "__Secure-1PSIDTS": "..."
})
await client.init()
response = await client.generate_content(prompt)
# Extract image from response
```

Install: `pip install gemini-webapi`

### Backend 4: TinyFish (Web Agent — 500 Free Steps)

Uses TinyFish's web automation to drive Gemini's web UI.
Good for complex generation workflows (edit, refine, iterate).

### Backend 5: Playwright (Local Browser — Free)

Automates Gemini web UI directly with Playwright.
Requires: `npx playwright install chromium`
Uses saved Google session at `/tmp/ultrathink-assets/auth/gemini-profile`.

---

### Prompt Engineering for UI Illustrations

Bad prompt: "A dashboard illustration"

Good prompt: "Minimal line illustration of data flowing between connected nodes, isometric perspective, using only 3 colors: deep navy (#1a1a2e), amber (#f59e0b), and white. Clean vector style, no gradients, thick consistent stroke weight. Suitable as a hero illustration for a developer tool landing page. 1024x1024."

**Rules for illustration prompts**:
1. Specify the EXACT style (line art, isometric, flat, 3D, watercolor, etc.)
2. Include the color palette from Phase 2 — use the EXACT hex values
3. Describe the composition and perspective
4. State the intended use (hero, feature section, empty state)
5. Specify dimensions (1024x1024 default, or aspect ratio like 16:9)
6. Say what NOT to include ("no text", "no gradients", "no photorealism")
7. Reference a real art style if helpful ("in the style of Kurzgesagt", "like Stripe's illustrations")

### Prompt Template

```
[STYLE] illustration of [SUBJECT], [PERSPECTIVE] perspective,
using only [N] colors: [COLOR1 with hex], [COLOR2 with hex], and [COLOR3 with hex].
[TEXTURE/TECHNIQUE] style, [NEGATIVE CONSTRAINTS].
Suitable as [INTENDED USE] for [CONTEXT].
[DIMENSIONS].
```

### Alternative: Static Asset Sources

If generation isn't available or appropriate:
- **Heroicons/Lucide**: For icons (already in most projects)
- **unDraw**: Open-source customizable illustrations
- **Storyset**: Free animated/static illustrations by Freepik
- **Rive/Lottie**: For interactive animations
- **Humaaans**: Modular people illustrations
- **Open Peeps**: Hand-drawn people illustrations

## Phase 4: IMPLEMENT — Code with the Design System

NOW — and only now — write code. Every decision was already made in Phases 1-3.

### Implementation Order

1. **CSS variables / theme tokens** — Translate the design system into code
2. **Layout structure** — Grid, containers, responsive breakpoints
3. **Typography components** — Headings, body, labels
4. **Core components** — Buttons, inputs, cards per the token spec
5. **Page composition** — Assemble components into the final layout
6. **Responsive refinement** — Test at mobile, tablet, desktop
7. **Dark mode** (if needed) — Using the defined dark palette
8. **Illustrations/assets** — Drop in generated images
9. **Micro-interactions** — Hover states, transitions, focus rings
10. **Final polish** — Spacing tweaks, alignment, visual rhythm

### Code Standards

- Use CSS custom properties for ALL design tokens (colors, spacing, typography)
- Use `clamp()` for fluid typography and spacing
- Use `container queries` where appropriate
- Every interactive element needs: hover, focus-visible, active, disabled states
- Motion: `transition-all duration-200`, respect `prefers-reduced-motion`
- Images: proper `alt` text, `loading="lazy"`, appropriate formats

### Quality Check

Before declaring done, verify:

- [ ] Typography matches the defined type scale exactly
- [ ] Colors match the defined palette — no random grays or blacks
- [ ] Spacing follows the defined rhythm — no ad-hoc values
- [ ] At least ONE distinctive element from the inspiration board is present
- [ ] Responsive: works at 375px, 768px, 1024px, 1440px
- [ ] Accessibility: sufficient contrast, focus indicators, semantic HTML
- [ ] No "AI slop" indicators:
  - No cyan-on-dark color scheme (unless explicitly in the design system)
  - No generic card grids with identical spacing
  - No gradient text on headings
  - No floating blobs or abstract shapes as decoration
  - No "built with AI" aesthetic — should look human-designed

## Usage

### Full pipeline
```
/design-pipeline
brief: Landing page for an open-source developer tool
mood: Technical but approachable, like Linear meets Vercel
```

### With provided inspiration
```
/design-pipeline
brief: Dashboard for monitoring AI agent sessions
inspirations: https://linear.app, https://vercel.com/dashboard, https://raycast.com
```

### Component-level
```
/design-pipeline
brief: Pricing table component with 3 tiers
mood: Clean, minimal, high contrast
illustrations: false
```

### With Gemini illustrations
```
/design-pipeline
brief: 404 error page with custom illustration
mood: Playful, colorful, memorable
illustrations: true
```

## Anti-Patterns

- **Skipping Phase 1**: "I'll just start coding" — NO. Find inspiration first.
- **Generic inspiration**: "I looked at Tailwind UI" — that's a component library, not inspiration. Find REAL products.
- **Undefined tokens**: Writing `text-gray-500` without first defining what gray-500 means in your design system.
- **Too many colors**: Using 8+ colors. Pick 3-5 and stick to them.
- **Inconsistent spacing**: Mixing `p-4`, `p-5`, `p-6` randomly. Define a scale and use it.
- **Font soup**: Using 4 different fonts. Max 2 (display + body), maybe 3 with mono.
- **Illustration mismatch**: Generating illustrations that don't match the defined color palette.
