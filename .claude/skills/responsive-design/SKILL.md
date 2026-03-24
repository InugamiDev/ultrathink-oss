---
name: responsive-design
description: Responsive design — fluid typography, container queries, aspect ratios, mobile-first CSS, clamp(), modern layout patterns, and accessibility across viewports
layer: utility
category: frontend
triggers:
  - "responsive design"
  - "mobile first"
  - "fluid typography"
  - "container queries"
  - "responsive layout"
  - "clamp css"
  - "breakpoints"
  - "adaptive design"
  - "aspect ratio"
  - "responsive images"
inputs:
  - Design specs or mockups (desktop + mobile)
  - Breakpoint requirements
  - Typography scale
  - Target devices/viewports
outputs:
  - Responsive layout implementation
  - Fluid typography system
  - Container query components
  - Responsive image strategy
  - Breakpoint architecture
linksTo:
  - tailwindcss
  - css-variables
  - css-architecture
  - design-systems
linkedFrom:
  - ui-ux-pro
  - d3
preferredNextSkills:
  - css-variables
  - design-systems
fallbackSkills:
  - tailwindcss
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Modifies CSS/layout code
  - May add container query polyfills for older browsers
---

# Responsive Design Skill

## Purpose

Responsive design ensures interfaces work across all viewport sizes. Modern CSS provides powerful tools (clamp, container queries, fluid grids) that replace brittle breakpoint-only approaches. This skill covers fluid typography, container queries, modern layout patterns, responsive images, and mobile-first architecture.

## Key Concepts

### Mobile-First vs Desktop-First

```css
/* Mobile-First (recommended): Base styles = mobile, enhance upward */
.card {
  padding: 1rem;            /* Mobile default */
  font-size: 1rem;
}

@media (min-width: 48rem) { /* Tablet+ */
  .card {
    padding: 1.5rem;
  }
}

@media (min-width: 64rem) { /* Desktop+ */
  .card {
    padding: 2rem;
  }
}

/* Desktop-First (avoid): Base styles = desktop, override downward */
/* Results in more overrides, larger CSS, harder to maintain */
```

### Common Breakpoints

| Name | Width | Target | Tailwind |
|------|-------|--------|----------|
| **sm** | 40rem (640px) | Large phones landscape | `sm:` |
| **md** | 48rem (768px) | Tablets | `md:` |
| **lg** | 64rem (1024px) | Small laptops | `lg:` |
| **xl** | 80rem (1280px) | Desktops | `xl:` |
| **2xl** | 96rem (1536px) | Large desktops | `2xl:` |

**Use rem, not px** — Respects user's font size preference.

## Workflow

### Step 1: Fluid Typography with clamp()

Instead of breakpoints for font sizes, use `clamp()` for smooth scaling:

```css
/* clamp(minimum, preferred, maximum) */
/* preferred = viewport-relative value that scales smoothly */

:root {
  /* Formula: clamp(min, vw-calc, max)
     vw-calc = minSize + (maxSize - minSize) * ((100vw - minViewport) / (maxViewport - minViewport))
     Simplified: use a vw value that produces the right range */

  --text-sm: clamp(0.875rem, 0.8rem + 0.2vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.3vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.4vw, 1.375rem);
  --text-xl: clamp(1.25rem, 1rem + 0.75vw, 1.75rem);
  --text-2xl: clamp(1.5rem, 1rem + 1.5vw, 2.5rem);
  --text-3xl: clamp(1.875rem, 1rem + 2.5vw, 3.5rem);
  --text-4xl: clamp(2.25rem, 1rem + 3.5vw, 4.5rem);

  /* Fluid spacing */
  --space-sm: clamp(0.5rem, 0.4rem + 0.3vw, 0.75rem);
  --space-md: clamp(1rem, 0.8rem + 0.6vw, 1.5rem);
  --space-lg: clamp(1.5rem, 1rem + 1.5vw, 3rem);
  --space-xl: clamp(2rem, 1rem + 3vw, 5rem);
  --space-section: clamp(3rem, 2rem + 4vw, 8rem);
}

/* Usage */
h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
p  { font-size: var(--text-base); }

section { padding-block: var(--space-section); }
```

**Tailwind v4 equivalent:**

```css
@import "tailwindcss";

@theme {
  --text-fluid-sm: clamp(0.875rem, 0.8rem + 0.2vw, 1rem);
  --text-fluid-base: clamp(1rem, 0.9rem + 0.3vw, 1.125rem);
  --text-fluid-xl: clamp(1.25rem, 1rem + 0.75vw, 1.75rem);
  --text-fluid-3xl: clamp(1.875rem, 1rem + 2.5vw, 3.5rem);
}
```

### Step 2: Container Queries

Container queries let components respond to their container's size, not the viewport. This makes truly reusable components:

```css
/* Define a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Respond to container width */
.card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

@container card (min-width: 30rem) {
  .card {
    grid-template-columns: 200px 1fr;
    padding: 1.5rem;
  }
}

@container card (min-width: 50rem) {
  .card {
    grid-template-columns: 300px 1fr auto;
    padding: 2rem;
  }
}
```

```tsx
// React component with container query
function ProductCard({ product }: { product: Product }) {
  return (
    // The wrapper establishes the container context
    <div className="@container">
      {/* Tailwind container query syntax */}
      <article className="flex flex-col gap-4 p-4
                          @md:flex-row @md:gap-6 @md:p-6
                          @lg:gap-8 @lg:p-8">
        <img
          src={product.image}
          alt={product.name}
          className="w-full aspect-square object-cover rounded-lg
                     @md:w-48 @md:aspect-auto @md:h-full
                     @lg:w-64"
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold @lg:text-xl">{product.name}</h3>
          <p className="text-sm text-gray-600 @md:text-base">{product.description}</p>
          <span className="text-lg font-bold @lg:text-xl">${product.price}</span>
        </div>
      </article>
    </div>
  );
}
```

### Step 3: Modern Layout Patterns

#### Auto-Fit Grid (No Breakpoints)

```css
/* Cards automatically wrap based on available space */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--space-md);
}

/* min(100%, 18rem) prevents overflow on small screens */
```

#### Sidebar Layout (Responsive Without Media Query)

```css
.sidebar-layout {
  display: grid;
  grid-template-columns: fit-content(20rem) minmax(0, 1fr);
  gap: var(--space-lg);
}

/* On narrow viewports, stack with a media query */
@media (max-width: 48rem) {
  .sidebar-layout {
    grid-template-columns: 1fr;
  }
}
```

#### Holy Grail Layout

```css
.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh; /* dvh = dynamic viewport height (accounts for mobile browser chrome) */
}

.page-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: min(100% - 2rem, 75rem); /* Max-width with padding, no media query */
  margin-inline: auto;
}
```

#### Flexible Spacing with margin-inline: auto

```css
/* Content wrapper that centers and constrains width */
.content-wrapper {
  width: min(100% - var(--space-md) * 2, 75rem);
  margin-inline: auto;
}
/* This single rule replaces: max-width + padding-left + padding-right + margin auto */
```

### Step 4: Responsive Images

```html
<!-- srcset + sizes: browser picks the best image -->
<img
  src="/images/hero-800.jpg"
  srcset="
    /images/hero-400.jpg 400w,
    /images/hero-800.jpg 800w,
    /images/hero-1200.jpg 1200w,
    /images/hero-1600.jpg 1600w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
  alt="Hero image"
  loading="lazy"
  decoding="async"
  fetchpriority="high"
/>

<!-- <picture> for art direction (different crops per viewport) -->
<picture>
  <source media="(max-width: 640px)" srcset="/images/hero-mobile.jpg" />
  <source media="(max-width: 1024px)" srcset="/images/hero-tablet.jpg" />
  <img src="/images/hero-desktop.jpg" alt="Hero image" />
</picture>
```

```tsx
// Next.js Image (handles srcset, WebP/AVIF, lazy loading automatically)
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={1200}
  height={675}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
  priority  // Above the fold — skip lazy loading
  className="w-full h-auto object-cover rounded-xl"
/>
```

### Step 5: Aspect Ratios

```css
/* Native aspect-ratio property */
.video-embed {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.avatar {
  aspect-ratio: 1 / 1;
  width: 3rem;
  border-radius: 50%;
  object-fit: cover;
}

.card-image {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
  border-radius: 0.75rem;
}

/* Responsive aspect ratio (change per breakpoint) */
.hero {
  aspect-ratio: 1 / 1; /* Square on mobile */
}

@media (min-width: 48rem) {
  .hero {
    aspect-ratio: 16 / 9; /* Widescreen on tablet+ */
  }
}
```

### Step 6: Dynamic Viewport Units

```css
/* Modern viewport units account for mobile browser chrome (address bar, toolbar) */
.full-height {
  height: 100dvh;  /* dvh = dynamic viewport height (changes as chrome shows/hides) */
}

.hero-section {
  min-height: 100svh; /* svh = small viewport height (chrome visible — safe minimum) */
}

.modal-overlay {
  height: 100lvh; /* lvh = large viewport height (chrome hidden — maximum) */
}

/*
  dvh: Changes dynamically as mobile browser chrome appears/disappears
  svh: Smallest possible viewport (when address bar is showing)
  lvh: Largest possible viewport (when address bar is hidden)

  For most cases, use dvh. For hero sections, use svh (prevents content jump).
*/
```

### Step 7: Responsive Text Truncation

```css
/* Single line truncation */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line truncation (works in all modern browsers) */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Step 8: Touch Target Sizing

```css
/* WCAG 2.2 requires 24x24px minimum, recommends 44x44px */
.touch-target {
  min-height: 2.75rem; /* 44px — Apple HIG recommendation */
  min-width: 2.75rem;
  padding: 0.75rem 1rem;
}

/* Invisible touch area expansion */
.icon-button {
  position: relative;
  width: 1.5rem;
  height: 1.5rem;
}

.icon-button::before {
  content: '';
  position: absolute;
  inset: -0.5rem; /* Expand touch area by 8px in each direction */
}
```

## Common Pitfalls

1. **Using `px` for breakpoints and font sizes** — Use `rem`. Users who increase their browser's base font size get properly scaled text and breakpoints.
2. **Forgetting `min-width: 0` in flex/grid children** — Flex and grid children have an implicit `min-width: auto`, causing overflow. Add `min-width: 0` or `overflow: hidden` to prevent horizontal scroll.
3. **Using `100vh` on mobile** — The address bar causes `100vh` to be taller than the visible viewport. Use `100dvh` or `100svh` instead.
4. **Media queries only** — Over-relying on breakpoints instead of intrinsic sizing (`min()`, `clamp()`, `auto-fit`). Modern CSS can handle most responsive behavior without breakpoints.
5. **Not testing with real content** — Designs that work with "Lorem ipsum" break with real variable-length content. Test with short and long content.
6. **Ignoring landscape orientation** — Mobile landscape creates a wide, short viewport. Test with `@media (orientation: landscape) and (max-height: 500px)`.
7. **Fixed-width elements** — Any `width: 500px` without `max-width: 100%` will overflow on mobile. Always use relative or constrained widths.

## Quick Reference

```css
/* Fluid typography */
font-size: clamp(1rem, 0.9rem + 0.3vw, 1.25rem);

/* Fluid spacing */
padding: clamp(1rem, 0.5rem + 2vw, 3rem);

/* Max-width container (no media query) */
width: min(100% - 2rem, 75rem);
margin-inline: auto;

/* Auto-fit grid (no media query) */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));

/* Full viewport height (mobile-safe) */
min-height: 100dvh;

/* Responsive aspect ratio */
aspect-ratio: 16 / 9;

/* Container query */
container-type: inline-size;
@container (min-width: 30rem) { ... }
```

## Best Practices

- **Mobile-first**: Write base styles for mobile, enhance with `min-width` queries
- **Intrinsic sizing first**: Use `clamp()`, `min()`, `max()`, `auto-fit` before reaching for media queries
- **Container queries for components**: Components should respond to their container, not the viewport
- **Test at every width**: Drag the browser edge — the layout should be usable at every single pixel width, not just breakpoint snaps
- **Use `rem` everywhere**: Respects user font size preferences for accessibility
- **`dvh` over `vh`**: Always use dynamic viewport units on mobile
- **Prefers-reduced-motion**: Wrap animations in `@media (prefers-reduced-motion: no-preference)` or use `motion-reduce:` in Tailwind
