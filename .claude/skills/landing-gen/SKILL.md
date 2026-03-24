---
name: landing-gen
description: Full landing page generator. One prompt → hero, features, pricing, testimonials, FAQ, footer sections as production-quality HTML/CSS or Next.js components. Chains impeccable-frontend-design + seo + banner-design + animation. Includes OG image, meta tags, and mobile-first responsive layout.
argument-hint: "[product name] [tagline] [target audience]"
layer: orchestrator
category: design
triggers:
  - landing page
  - landing gen
  - generate landing
  - marketing page
  - product page
  - hero section
  - pricing page
  - saas landing
linksTo:
  - impeccable-frontend-design
  - seo
  - banner-design
  - animation
  - brand
  - design-system
inputs: |
  Product name, tagline (1-line pitch), target audience, tone
  (professional/friendly/bold/technical), primary CTA text, whether to include
  pricing section, and output stack (html or nextjs).
outputs: |
  landing/index.html — complete landing page (or Next.js component)
  landing/og-image.html — 1200×630 social share image
  landing/styles.css — design tokens + component styles
preferredNextSkills:
  - saas-bootstrap
  - brandkit-gen
  - seo
fallbackSkills:
  - impeccable-frontend-design
  - seo
memoryReadPolicy: selective
memoryWritePolicy: always
sideEffects: |
  Creates landing/ directory with index.html (or .tsx), styles.css, and
  og-image.html. May also generate a Next.js component tree if stack=nextjs.
---

# Landing Page Generator

> One prompt → full conversion-optimized landing page.

## What Gets Generated

| File | Content |
|---|---|
| `landing/index.html` | Complete landing page (or Next.js component) |
| `landing/og-image.html` | 1200×630 social share image |
| `landing/styles.css` | Design tokens + component styles |

---

## Phase 0 — Discovery

Parse `$ARGUMENTS` for:
- `productName` — what is it?
- `tagline` — 1-line pitch
- `audience` — who is it for?
- `tone` — professional / friendly / bold / technical
- `cta` — primary action (default: "Get started free")
- `hasPricing` — include pricing section? (default: yes)
- `stack` — "html" (default) or "nextjs"

If not enough info, ask 3 targeted questions.

---

## Phase 1 — Page Architecture

1. **Invoke `impeccable-frontend-design`** — Design the conversion funnel and section order based on product type. Apply hero rules (benefit-first headline, single CTA, no stock photos).

Design the conversion funnel — section order depends on product type:

**SaaS / Tool:**
```
Navbar → Hero → Social proof → Features (3-col) →
How it works → Testimonials → Pricing → FAQ → CTA banner → Footer
```

**Developer Tool / API:**
```
Navbar → Hero + code snippet → Features → Integration logos →
Docs preview → Pricing → Footer
```

**Consumer / B2C:**
```
Navbar → Hero (emotional) → Problem → Solution →
Features → Testimonials → CTA → Footer
```

### Hero Rules (from impeccable-frontend-design)
- Headline: max 8 words, benefit-first, not feature-first
- Subheadline: 1–2 sentences expanding the benefit
- CTA: single button, action verb + object ("Start building" not "Submit")
- Hero visual: mockup, screenshot, or abstract illustration — NO stock photos of people smiling
- Social proof line below CTA: "X companies use [product]" or star rating

---

## Phase 2 — Visual Design

2. **Invoke `impeccable-frontend-design`** — Select typefaces, define color strategy, and establish section rhythm.
3. **Invoke `design-system`** — Generate the 6-step neutral palette, semantic token assignments, and spacing scale.

**Typography** — pick from Google Fonts based on tone:
- Technical/precise → Inter + JetBrains Mono
- Bold/modern → Geist + Geist Mono
- Elegant/premium → Fraunces + Inter
- Friendly/human → Plus Jakarta Sans + DM Mono

**Color strategy:**
- Background: near-white (#fafafa) or near-black (#0a0a0f) depending on tone
- Primary: derive from brand or generate from tone
- Accent: optically distinct from primary, used sparingly (CTA, highlights)
- Gray scale: 6-step neutral palette

**Section rhythm:**
- Alternate bg: white ↔ gray-50 (light mode) or #0a0a0f ↔ #13131a (dark)
- Section padding: `py-24` (96px) min between sections
- Max content width: 1200px, centered

---

## Phase 3 — Sections Implementation

Build each section. Rules:

### Navbar
- Logo left, links center (3–5 max), CTA button right
- Sticky with backdrop blur on scroll
- Mobile: hamburger menu

### Hero
- Two-column (text left, visual right) on desktop
- Centered single-column on mobile
- Background: subtle grid, gradient, or particle effect — NOT solid flat color

### Features Grid
- 3-column cards with icon + title + 1-sentence description
- Icons: consistent style (all outline, all filled, or all duotone)
- Cards: 1px border, subtle shadow, hover lift

### Pricing
- 3 tiers: Free/Starter, Pro (highlighted as "most popular"), Enterprise
- Annual/monthly toggle
- Features list with checkmarks
- CTA per tier

### Testimonials
- Quote + name + title + company
- Avatar or company logo
- Card or carousel layout

### FAQ
- Accordion (expand/collapse)
- 6–8 questions covering common objections

### Footer
- Logo + tagline + social links
- 3–4 link columns
- Copyright + legal links

---

## Phase 4 — SEO & Meta

4. **Invoke `seo`** — Generate all `<head>` meta tags: title, description, Open Graph, Twitter card, and canonical URL.

Generate in `<head>`:
```html
<title>[Product] — [Tagline]</title>
<meta name="description" content="[150-char benefit-first description]">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="...">
```

---

## Phase 5 — Animations

5. **Invoke `animation`** — Add tasteful scroll and load animations, respecting `prefers-reduced-motion`.

Add tasteful motion (respect `prefers-reduced-motion`):
- Hero: fade-up + slight scale on load (200ms delay)
- Feature cards: stagger fade-in on scroll (intersection observer)
- Stats/numbers: count-up animation when in viewport
- CTA section: subtle pulse on primary button
- No parallax, no excessive movement

---

## Phase 6 — OG Image

6. **Invoke `banner-design`** — Generate the 1200×630 OG image HTML file using brand colors and landing page visual identity.

Generate `landing/og-image.html` (1200×630):
- Brand colors from Phase 2
- Product name + tagline
- Subtle visual element matching landing aesthetic

---

## Quality Gates

- [ ] Lighthouse score ≥ 90 (perf, a11y, SEO, best practices)
- [ ] All interactive elements have focus states
- [ ] CTA button contrast ≥ 4.5:1
- [ ] No horizontal scroll at 375px viewport
- [ ] No stock photos of smiling people
- [ ] Page loads in <3s on slow 3G (no heavy images)
- [ ] Pricing table readable on mobile

---

## Usage

```
/landing-gen Plano — AI proxy for enterprise teams. Bold, technical.
/landing-gen Meey — Find your dream home in Vietnam. Warm, trustworthy.
/landing-gen InuAuth — Auth that gets out of your way. Developer-first.
```
