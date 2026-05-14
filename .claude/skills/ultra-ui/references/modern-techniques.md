# Modern UI/UX Techniques (2025-2026)

## Scroll-Driven Animation

### Apple-Style Image Sequence (Canvas)

Extract video to frames (60-300 JPEG/AVIF), draw to `<canvas>` based on scroll position. Used by Apple for AirPods, iPhone, MacBook product pages.

**GSAP ScrollTrigger approach:**
```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const frameCount = 148;
const images = [];

// Preload frames
for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = `/frames/frame-${String(i).padStart(4, "0")}.avif`;
  images.push(img);
}

// Scrub on scroll
gsap.to({ frame: 0 }, {
  frame: frameCount - 1,
  snap: "frame",
  ease: "none",
  scrollTrigger: {
    trigger: ".sequence-section",
    start: "top top",
    end: "+=3000",  // 3000px of scroll = full sequence
    pin: true,
    scrub: 0.5,     // 0.5s smoothing
  },
  onUpdate: function () {
    const img = images[Math.round(this.targets()[0].frame)];
    if (img.complete) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  },
});
```

**Performance rules:**
- Compress frames to AVIF/JPEG (not PNG), ~50-100KB each
- Serve from CDN, cache aggressively
- Show static fallback on mobile/slow connections
- First frame must load fast (LCP)
- Use `loading="eager"` for first 5 frames, lazy for rest

**Pair with:** Lenis for smooth momentum scrolling (`npm install lenis`)

### CSS scroll-timeline / view-timeline (Native, Zero JS)

Drive CSS animations by scroll position. Compositor-thread performance. No library needed.

```css
/* Animate based on scroll position of nearest scroller */
.hero-image {
  animation: reveal linear both;
  animation-timeline: scroll();
  animation-range: 0% 50%;
}

@keyframes reveal {
  from { opacity: 0; scale: 0.8; }
  to   { opacity: 1; scale: 1; }
}

/* Animate when element enters/exits viewport */
.card {
  animation: slide-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes slide-in {
  from { opacity: 0; translate: 0 100px; }
  to   { opacity: 1; translate: 0 0; }
}
```

**Browser support:** Chrome 115+, Safari 18+, Firefox behind flag. Use `@supports (animation-timeline: scroll())` for progressive enhancement.

### When to Use Which

| Technique | Best For | JS Required | Performance |
|-----------|----------|-------------|-------------|
| Canvas + GSAP | Complex sequences, Apple-style product reveals | Yes | Good (GPU canvas) |
| CSS scroll-timeline | Simple reveals, parallax, progress bars | No | Best (compositor) |
| CSS view-timeline | Entrance animations, in-view triggers | No | Best (compositor) |
| Lottie + scroll | Vector animations synced to scroll | Yes | Good |

---

## View Transitions API

Native browser API for smooth page/route transitions. No library needed.

```css
/* Define which elements should transition between pages */
.hero-image { view-transition-name: hero; }
.page-title { view-transition-name: title; }

/* Customize the transition animation */
::view-transition-old(hero) {
  animation: fade-out 0.3s ease-out;
}
::view-transition-new(hero) {
  animation: fade-in 0.3s ease-in;
}
```

**React (Next.js App Router):**
```tsx
import { useViewTransition } from "react";

function NavigationLink({ href, children }) {
  const [isPending, startTransition] = useViewTransition();
  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        startTransition(() => router.push(href));
      }}
    >
      {children}
    </Link>
  );
}
```

**Browser support:** Chrome 111+, Firefox 133+, Safari 18+. Progressive enhancement — falls back to instant navigation.

---

## Animation Tool Decision Tree

```
What kind of animation?
│
├─ Micro-interaction (hover, focus, toggle)
│   └─ CSS transitions/animations (no library)
│
├─ Page/route transition
│   └─ View Transitions API (native)
│
├─ Scroll-linked (parallax, reveal, sequence)
│   ├─ Simple → CSS scroll-timeline
│   └─ Complex → GSAP ScrollTrigger
│
├─ Designer-created playback (icons, illustrations)
│   ├─ Simple loop/trigger → Lottie / dotLottie
│   └─ Interactive + stateful → Rive
│
├─ Complex orchestrated (stagger, spring, layout)
│   └─ Motion.dev (React) or GSAP (vanilla)
│
└─ 3D / WebGL
    └─ React Three Fiber / Three.js / Spline
```

| Library | Size | Framework | Strengths |
|---------|------|-----------|-----------|
| CSS native | 0KB | Any | Micro-interactions, scroll-driven |
| Motion.dev | 8KB | React | Spring physics, layout animations, gestures |
| GSAP | 25KB | Any | ScrollTrigger, timelines, complex orchestration. 100% free (2024+) |
| Lottie | 40KB | Any | After Effects workflow, designer handoff |
| Rive | 60KB | Any | Interactive state machines, GPU-accelerated, data binding |
| Lenis | 5KB | Any | Smooth scroll momentum, pairs with GSAP |

---

## New CSS Features (Shipped 2025-2026)

### @starting-style (Entry Animations)

Animate elements appearing from `display: none`. No JS needed.

```css
dialog {
  opacity: 1;
  scale: 1;
  transition: opacity 0.3s, scale 0.3s, display 0.3s allow-discrete;

  @starting-style {
    opacity: 0;
    scale: 0.95;
  }
}

dialog:not([open]) {
  opacity: 0;
  scale: 0.95;
}
```

### Anchor Positioning

Position elements relative to any anchor — tooltips, popovers, floating labels.

```css
.tooltip {
  position: fixed;
  position-anchor: --my-button;
  top: anchor(bottom);
  left: anchor(center);
  position-try-fallbacks: flip-block, flip-inline;  /* auto-reposition on overflow */
}

.my-button {
  anchor-name: --my-button;
}
```

### Popover API (Native)

No JS popovers with light-dismiss (click outside to close).

```html
<button popovertarget="menu">Open Menu</button>
<div id="menu" popover>
  <p>This closes when you click outside or press Escape.</p>
</div>
```

`popover="hint"` for tooltips (auto-dismisses, only one visible at a time).

### interpolate-size (Animate to Auto)

Finally — animate height/width to `auto`.

```css
:root {
  interpolate-size: allow-keywords;
}

.accordion-content {
  height: 0;
  overflow: hidden;
  transition: height 0.3s ease;
}

.accordion-content.open {
  height: auto;  /* animates smoothly! */
}
```

### @scope (Scoped CSS)

Scope styles to a subtree without BEM or CSS Modules.

```css
@scope (.card) to (.card-footer) {
  p { color: gray; }       /* Only paragraphs inside .card but not in .card-footer */
  h2 { font-size: 1.5rem; }
}
```

### CSS Nesting (Baseline)

Native nesting, no Sass needed.

```css
.card {
  padding: 1.5rem;

  & h2 {
    font-size: 1.5rem;
  }

  &:hover {
    box-shadow: 0 4px 12px oklch(0% 0 0 / 0.1);
  }

  @media (width >= 768px) {
    padding: 2rem;
  }
}
```

---

## W3C Design Tokens Specification

First stable version released October 2025. Vendor-neutral JSON format (`application/design-tokens+json`).

```json
{
  "color": {
    "primary": {
      "$value": "#0969DA",
      "$type": "color",
      "$description": "Brand primary"
    },
    "surface": {
      "$value": "{color.neutral.50}",
      "$type": "color"
    }
  }
}
```

**Tooling:** Style Dictionary v4 (first-class DTCG support), Tokens Studio (Figma plugin), 10+ tools implementing the spec.

**Workflow:** Figma (Tokens Studio) → `.tokens.json` → Style Dictionary → CSS custom properties + Tailwind config + iOS/Android themes.

---

## APCA Contrast Algorithm

Proposed replacement for WCAG 2.x contrast ratio in WCAG 3.0 (timeline: 2027-2028).

**Why it matters:** Current 4.5:1 ratio doesn't account for font weight or size. APCA uses perceptual lightness contrast (Lc value) with lookup tables per font size/weight.

**Current guidance:** Use WCAG 2.2 AA for compliance today. Test against APCA for perceptual quality. Tool: [apcacontrast.com](https://apcacontrast.com).

| Lc Value | Minimum Use |
|----------|-------------|
| 90+ | Body text (any weight) |
| 75+ | 18px+ bold text |
| 60+ | Large headings (24px+) |
| 45+ | UI components, non-text |
| 30+ | Decorative, disabled states |
