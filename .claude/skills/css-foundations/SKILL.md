---
name: css-foundations
description: "Unified CSS/styling foundations — CSS architecture (modules, CSS-in-JS, cascade layers, container queries), CSS custom properties (design tokens, theming, runtime manipulation), CSS Grid (templates, auto-placement, subgrid), dark mode implementation, responsive design patterns (fluid typography, container queries, aspect ratios), general animation patterns, Framer Motion, Tailwind animate plugin."
layer: domain
category: frontend
triggers: ["--color", "@layer", "AnimatePresence", "CSS-in-JS", "GSAP", "animate-in", "animate-out", "animation", "auto-fill", "auto-fit", "breakpoint", "cascade layer", "color scheme", "container query", "css animation", "css architecture", "css custom properties", "css custom property", "css grid", "css module", "css nesting", "css scope", "css var", "css variable", "css variables", "dark mode", "dark theme", "design token", "fluid typography", "framer motion", "framer-motion", "grid area", "grid layout", "grid template", "keyframes", "layoutId", "light mode", "logical properties", "looks bad on mobile", "micro-interaction", "mobile first", "mobile layout", "mobile responsive", "motion", "motion.div", "page transition", "prefers-color-scheme", "responsive design", "responsive grid", "scroll animation", "spring animation", "styled-components", "subgrid", "tablet layout", "tailwind animate", "tailwind animation", "tailwind keyframes", "tailwindcss-animate", "theme switch", "theme toggle", "transition", "useAnimate", "whileHover", "whileTap"]
---

# css-foundations

Unified CSS/styling foundations — CSS architecture (modules, CSS-in-JS, cascade layers, container queries), CSS custom properties (design tokens, theming, runtime manipulation), CSS Grid (templates, auto-placement, subgrid), dark mode implementation, responsive design patterns (fluid typography, container queries, aspect ratios), general animation patterns, Framer Motion, Tailwind animate plugin.


## Absorbs

- `css-architecture`
- `css-variables`
- `css-grid`
- `dark-mode`
- `responsive-design`
- `animation`
- `framer-motion`
- `tailwind-animate`


---

## From `css-architecture`

> CSS architecture patterns — CSS modules, CSS-in-JS, cascade layers, container queries, logical properties, and scalable styling strategies

# CSS Architecture Patterns

## Purpose

Provide expert guidance on scalable CSS architecture using modern features: cascade layers, container queries, CSS nesting, logical properties, custom properties, and the tradeoffs between CSS modules, CSS-in-JS, and utility-first approaches. Focus on maintainability, specificity control, and progressive enhancement.

## Key Patterns

### Cascade Layers (`@layer`)

Layers give explicit control over specificity ordering, regardless of selector specificity or source order:

```css
/* Define layer order — first declared = lowest priority */
@layer reset, base, tokens, components, utilities, overrides;

/* Reset layer — lowest specificity */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
}

/* Base layer — element defaults */
@layer base {
  body {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--color-text-primary);
    background-color: var(--color-surface);
  }

  a {
    color: var(--color-link);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
  }

  img, video, svg {
    display: block;
    max-width: 100%;
    height: auto;
  }
}

/* Token layer — design tokens as custom properties */
@layer tokens {
  :root {
    --color-brand-500: oklch(0.55 0.18 250);
    --color-brand-600: oklch(0.48 0.18 250);
    --color-text-primary: oklch(0.15 0.02 250);
    --color-text-secondary: oklch(0.45 0.03 250);
    --color-surface: oklch(0.99 0.005 250);
    --color-border: oklch(0.85 0.02 250);
    --color-link: var(--color-brand-600);

    --font-sans: system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;

    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.625rem;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-12: 3rem;
    --space-16: 4rem;

    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;

    --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1);
  }

  /* Dark mode tokens */
  @media (prefers-color-scheme: dark) {
    :root {
      --color-text-primary: oklch(0.95 0.01 250);
      --color-text-secondary: oklch(0.70 0.02 250);
      --color-surface: oklch(0.13 0.02 250);
      --color-border: oklch(0.30 0.02 250);
    }
  }
}

/* Components layer — all component styles */
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4) var(--space-6);
    min-height: 2.625rem;
    font-size: var(--text-base);
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: all 200ms ease;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--color-brand-500);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}

/* Utilities layer — high specificity utility classes */
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Overrides layer — highest priority, escape hatch */
@layer overrides {
  /* Third-party library style fixes */
}
```

**Why layers matter:** Without layers, a `.btn` class with specificity `0-1-0` can be overridden by any element selector in a later stylesheet. With layers, component styles always beat base styles regardless of specificity.

### Container Queries

Style children based on parent size, not viewport:

```css
/* Define containment context */
.card-grid {
  container-type: inline-size;
  container-name: card-grid;
}

/* Respond to container width */
@container card-grid (min-width: 40rem) {
  .card {
    flex-direction: row;
    gap: var(--space-6);
  }

  .card-image {
    width: 40%;
    flex-shrink: 0;
  }
}

@container card-grid (min-width: 60rem) {
  .card {
    gap: var(--space-8);
  }

  .card-title {
    font-size: var(--text-xl);
  }
}

/* Container query units */
.card-title {
  font-size: clamp(var(--text-base), 3cqi, var(--text-xl));
  /* cqi = 1% of container inline size */
}
```

**When to use containers vs media queries:**
- **Container queries:** Component-level responsiveness (cards, widgets, sidebars)
- **Media queries:** Page-level layout changes (grid columns, section padding)

### CSS Nesting

Native nesting reduces repetition and improves readability:

```css
.card {
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: all 200ms ease;

  /* Hover state */
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  /* Focus-visible for keyboard navigation */
  &:focus-visible {
    outline: 2px solid var(--color-brand-500);
    outline-offset: 2px;
  }

  /* Child elements */
  & .card-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-primary);
    margin-block-end: var(--space-2);
  }

  & .card-body {
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  /* Modifier patterns */
  &.is-featured {
    border-left: 4px solid var(--color-brand-500);
  }

  /* Responsive via media query inside component */
  @media (min-width: 48rem) {
    padding: var(--space-8);
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
}
```

### Logical Properties

Use logical properties for internationalization-ready layouts:

```css
.component {
  /* Instead of directional properties */
  margin-block-start: var(--space-4);    /* margin-top */
  margin-block-end: var(--space-4);      /* margin-bottom */
  margin-inline-start: var(--space-6);   /* margin-left in LTR */
  margin-inline-end: var(--space-6);     /* margin-right in LTR */

  padding-block: var(--space-4);         /* top + bottom */
  padding-inline: var(--space-6);        /* left + right (LTR) */

  border-inline-start: 3px solid var(--color-brand-500);  /* border-left in LTR */

  /* Sizing */
  inline-size: 100%;         /* width */
  max-inline-size: 40rem;    /* max-width */
  block-size: auto;          /* height */
  min-block-size: 2.625rem;  /* min-height */

  /* Positioning */
  inset-block-start: 0;      /* top */
  inset-inline-end: 0;       /* right in LTR */
}
```

### CSS Modules

Scoped class names without runtime cost:

```css
/* components/card.module.css */
.root {
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: all 200ms ease;
}

.root:hover {
  box-shadow: var(--shadow-md);
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  composes: truncate from './utils.module.css';
}

.body {
  color: var(--color-text-secondary);
}
```

```tsx
// components/card.tsx
import styles from './card.module.css';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: CardProps) {
  return (
    <div className={cn(styles.root, className)} {...props}>
      <h3 className={styles.title}>{props.title}</h3>
      <div className={styles.body}>{props.children}</div>
    </div>
  );
}
```

### Custom Properties (Advanced)

**Dynamic theming with custom properties:**

```css
/* Component-scoped custom properties */
.btn {
  --btn-bg: var(--color-brand-600);
  --btn-color: white;
  --btn-border: transparent;
  --btn-hover-bg: var(--color-brand-700);

  background: var(--btn-bg);
  color: var(--btn-color);
  border: 1px solid var(--btn-border);

  &:hover {
    background: var(--btn-hover-bg);
  }

  /* Variants override the custom properties */
  &.btn-secondary {
    --btn-bg: transparent;
    --btn-color: var(--color-text-primary);
    --btn-border: var(--color-border);
    --btn-hover-bg: oklch(0 0 0 / 0.05);
  }

  &.btn-ghost {
    --btn-bg: transparent;
    --btn-color: var(--color-text-secondary);
    --btn-border: transparent;
    --btn-hover-bg: oklch(0 0 0 / 0.05);
  }
}
```

**Responsive tokens with clamp:**

```css
:root {
  /* Fluid typography */
  --text-fluid-base: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
  --text-fluid-xl: clamp(1.25rem, 1.5vw + 0.875rem, 2rem);
  --text-fluid-3xl: clamp(2rem, 3vw + 1rem, 3.5rem);

  /* Fluid spacing */
  --space-fluid-section: clamp(3rem, 5vw + 1rem, 6rem);
}
```

### `@scope` (CSS Scoping)

Limit style reach to a specific DOM subtree:

```css
@scope (.card) to (.card-actions) {
  /* Styles only apply inside .card but stop before .card-actions */
  p {
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  a {
    color: var(--color-brand-600);
  }
}
```

## Choosing a CSS Strategy

| Approach | Best For | Tradeoffs |
|----------|----------|-----------|
| **Tailwind CSS** | Rapid development, consistent design | Large class strings, learning curve |
| **CSS Modules** | Scoped styles, zero runtime, SSR | No dynamic styles, verbose imports |
| **Vanilla CSS (layers)** | Full control, modern features | Manual scoping, larger teams need conventions |
| **CSS-in-JS (Panda/Vanilla Extract)** | Type-safe styles, design systems | Build complexity, zero-runtime options limited |

**Recommendation for most projects:** Tailwind CSS + CSS Modules for edge cases (third-party styling, complex selectors).

## Best Practices

1. **Use cascade layers** — Control specificity explicitly rather than fighting it with `!important`.
2. **Custom properties for theming** — Define tokens as CSS custom properties for runtime theming and dark mode.
3. **Container queries for components** — Components should respond to their container, not the viewport.
4. **Logical properties** — Use `block`/`inline` terminology for RTL/LTR support.
5. **`clamp()` for fluid design** — Replace breakpoint-based font/spacing jumps with smooth scaling.
6. **Minimize nesting depth** — Keep CSS nesting to 3 levels max for readability.
7. **Prefer `:where()` for low-specificity defaults** — `:where(.btn)` has zero specificity, easy to override.
8. **Use `:is()` for grouping** — `:is(h1, h2, h3) { ... }` instead of repeating selectors.
9. **`prefers-reduced-motion`** — Always provide reduced-motion alternatives for animations.
10. **No `!important`** — If you need it, your layer architecture needs fixing.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Specificity wars | `!important` chains, fragile overrides | Use `@layer` for explicit ordering |
| Global styles leaking | Components affected by unrelated styles | CSS Modules, `@scope`, or Tailwind |
| Fixed viewport breakpoints | Components break when placed in sidebars | Container queries for component styles |
| Directional properties | Broken in RTL languages | Logical properties (`margin-inline-start`) |
| Overusing nesting | Deep selectors, high specificity | Max 3 levels, use flat class names |
| Forgetting dark mode | Variables reset unexpectedly | Test both themes, use semantic tokens |
| `calc()` units mismatch | `calc(100% - 16px)` mixed units | Consistent units, test edge cases |
| Missing fallbacks for new features | Broken in older browsers | `@supports` queries for progressive enhancement |


---

## From `css-variables`

> CSS custom properties for design tokens, theming, dynamic styles, dark mode, and runtime theme switching without JavaScript

# CSS Variables Specialist

## Purpose

CSS custom properties (variables) are the foundation of modern theming, design token systems, and dynamic styling. Unlike preprocessor variables (Sass/Less), CSS variables are live in the browser — they cascade, inherit, can be scoped to any selector, and can be changed at runtime without JavaScript. This skill covers architecture, theming patterns, performance, and integration with frameworks.

## Key Concepts

### Custom Properties vs Preprocessor Variables

| Feature | CSS Custom Properties | Sass Variables |
|---------|----------------------|---------------|
| Runtime changes | Yes (live in DOM) | No (compiled away) |
| Cascade/inheritance | Yes | No |
| Scoped to selectors | Yes | Scoped to blocks |
| Media query responsive | Yes | No |
| JavaScript access | `getComputedStyle` / `setProperty` | Not possible |
| Fallback values | `var(--x, fallback)` | Default params |

### The Variable Cascade

```css
/* Variables cascade and inherit just like any CSS property */
:root {
  --color-primary: #2563eb;     /* Global default */
}

.card {
  --color-primary: #7c3aed;     /* Scoped override — only .card and children */
}

.card .button {
  background: var(--color-primary);  /* Gets #7c3aed, not #2563eb */
}
```

## Workflow

### Step 1: Define Design Token Layers

Organize variables in semantic layers — primitive tokens feed semantic tokens which feed component tokens:

```css
/* === Layer 1: Primitive Tokens (raw values) === */
:root {
  /* Colors — scale */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --blue-900: #1e3a8a;
  --blue-950: #172554;

  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #030712;

  /* Spacing — based on 4px grid */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

```css
/* === Layer 2: Semantic Tokens (purpose-driven) === */
:root {
  /* Surfaces */
  --color-bg: var(--gray-50);
  --color-bg-elevated: #ffffff;
  --color-bg-sunken: var(--gray-100);
  --color-bg-overlay: rgb(0 0 0 / 0.5);

  /* Text */
  --color-text: var(--gray-900);
  --color-text-secondary: var(--gray-600);
  --color-text-tertiary: var(--gray-400);
  --color-text-inverse: #ffffff;

  /* Interactive */
  --color-primary: var(--blue-600);
  --color-primary-hover: var(--blue-700);
  --color-primary-active: var(--blue-800);
  --color-primary-subtle: var(--blue-50);

  /* Feedback */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: var(--blue-500);

  /* Borders */
  --color-border: var(--gray-200);
  --color-border-strong: var(--gray-300);
  --color-border-focus: var(--blue-500);

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

```css
/* === Layer 3: Component Tokens (optional, for complex systems) === */
:root {
  --button-bg: var(--color-primary);
  --button-bg-hover: var(--color-primary-hover);
  --button-text: var(--color-text-inverse);
  --button-radius: var(--radius-md);
  --button-padding: var(--space-4) var(--space-6);

  --card-bg: var(--color-bg-elevated);
  --card-border: var(--color-border);
  --card-radius: var(--radius-xl);
  --card-padding: var(--space-6);
  --card-shadow: var(--shadow-sm);

  --input-bg: var(--color-bg-elevated);
  --input-border: var(--color-border);
  --input-border-focus: var(--color-border-focus);
  --input-radius: var(--radius-md);
  --input-padding: var(--space-3) var(--space-4);
}
```

### Step 2: Implement Dark Mode

```css
/* Dark theme via data attribute (preferred — no FOUC) */
[data-theme="dark"] {
  --color-bg: var(--gray-950);
  --color-bg-elevated: var(--gray-900);
  --color-bg-sunken: var(--gray-800);

  --color-text: var(--gray-50);
  --color-text-secondary: var(--gray-400);
  --color-text-tertiary: var(--gray-600);

  --color-primary: var(--blue-400);
  --color-primary-hover: var(--blue-300);
  --color-primary-active: var(--blue-200);
  --color-primary-subtle: rgb(59 130 246 / 0.15);

  --color-border: var(--gray-800);
  --color-border-strong: var(--gray-700);

  --card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
}

/* Respect system preference as fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: var(--gray-950);
    --color-bg-elevated: var(--gray-900);
    /* ...same overrides... */
  }
}
```

### Step 3: Theme Switching with JavaScript

```typescript
type Theme = 'light' | 'dark' | 'system';

function setTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
    localStorage.removeItem('theme');
  } else {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}

// Initialize on page load (put in <head> to prevent FOUC)
function initTheme(): void {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored && stored !== 'system') {
    document.documentElement.setAttribute('data-theme', stored);
  }
}
```

```html
<!-- Anti-FOUC script — place in <head> before any CSS -->
<script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
  })();
</script>
```

### Step 4: Dynamic Values at Runtime

```typescript
// Read a CSS variable value
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary')
  .trim();

// Set a CSS variable dynamically
document.documentElement.style.setProperty('--color-primary', '#e11d48');

// Scoped to a specific element
const card = document.querySelector('.card');
card.style.setProperty('--card-bg', 'linear-gradient(135deg, #667eea, #764ba2)');
```

```css
/* Use dynamic values from JavaScript for animations */
.progress-bar {
  width: var(--progress, 0%);
  transition: width var(--duration-normal) var(--ease-default);
}
```

```typescript
// Animate progress
element.style.setProperty('--progress', '75%');
```

### Step 5: Integration with Tailwind CSS v4

```css
/* Tailwind v4 uses CSS variables natively */
@theme {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-surface: #ffffff;
  --color-surface-elevated: #f9fafb;
  --radius-card: 0.75rem;
}
```

```html
<!-- Use directly in Tailwind classes -->
<div class="bg-(--color-surface) rounded-(--radius-card) shadow-sm">
  <button class="bg-(--color-primary) hover:bg-(--color-primary-hover)">
    Click
  </button>
</div>
```

### Step 6: Responsive Variables with Media Queries

```css
:root {
  --content-width: 90vw;
  --section-padding: var(--space-8);
  --heading-size: var(--text-2xl);
}

@media (min-width: 768px) {
  :root {
    --content-width: 80vw;
    --section-padding: var(--space-12);
    --heading-size: var(--text-3xl);
  }
}

@media (min-width: 1280px) {
  :root {
    --content-width: min(70vw, 80rem);
    --section-padding: var(--space-16);
  }
}
```

## Best Practices

- Use the three-layer token architecture: primitive, semantic, component
- Name semantic tokens by purpose, not value (`--color-text`, not `--dark-gray`)
- Always provide fallback values for critical variables: `var(--color-bg, #ffffff)`
- Use `data-theme` attribute instead of class for theme switching (cleaner specificity)
- Put the anti-FOUC script in `<head>` before stylesheets
- Avoid deeply nested `var()` references (max 3 levels deep for readability)
- Use CSS variables for anything that changes between themes, breakpoints, or states
- Keep primitive tokens private (prefix with `--_` if convention helps) and expose only semantic tokens

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Flash of unstyled content (FOUC) on theme switch | Add inline `<script>` in `<head>` to set `data-theme` before CSS loads |
| Variables not inheriting across Shadow DOM | Pass variables through `:host` or use `::part()` selectors |
| Performance issues with thousands of variables | Only define variables you use; avoid generating unused scales |
| Fallback value not working as expected | `var(--x, red)` uses fallback only when `--x` is not set — not when it is `invalid` |
| Dark mode contrast failures | Test with WCAG contrast checker; dark themes often need lighter text than expected |
| Circular references causing silent failure | CSS silently ignores circular `var()` references — browser DevTools will show `invalid` |
| Using variables inside `url()` | `url(var(--bg-image))` does NOT work — use background shorthand or JS instead |

## Examples

### Multi-Brand Theming

```css
/* Brand A */
[data-brand="alpha"] {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --font-sans: 'Inter', sans-serif;
  --radius-md: 0.5rem;
}

/* Brand B */
[data-brand="beta"] {
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --radius-md: 1rem;
}

/* Components use semantic tokens — zero brand-specific code */
.button {
  background: var(--color-primary);
  font-family: var(--font-sans);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-6);
  color: var(--color-text-inverse);
  transition: background var(--duration-fast) var(--ease-default);
}

.button:hover {
  background: var(--color-primary-hover);
}
```

### Color with Opacity Using Modern CSS

```css
:root {
  /* Store as raw channels for opacity flexibility */
  --primary-rgb: 37 99 235;
  --error-rgb: 220 38 38;
}

.overlay {
  /* Use with modern color functions */
  background: rgb(var(--primary-rgb) / 0.1);
  border: 1px solid rgb(var(--primary-rgb) / 0.3);
}

/* Or use oklch for perceptually uniform colors */
:root {
  --primary-oklch: 0.55 0.2 260;
}

.button {
  background: oklch(var(--primary-oklch));
}

.button:hover {
  background: oklch(var(--primary-oklch) / 0.9);
}
```

### React Component with CSS Variables

```tsx
interface ProgressProps {
  value: number;
  color?: string;
}

function Progress({ value, color }: ProgressProps) {
  return (
    <div
      className="progress"
      style={{
        '--progress-value': `${Math.min(100, Math.max(0, value))}%`,
        '--progress-color': color,
      } as React.CSSProperties}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-bar" />
    </div>
  );
}
```

```css
.progress {
  height: 0.5rem;
  background: var(--color-bg-sunken);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  width: var(--progress-value, 0%);
  background: var(--progress-color, var(--color-primary));
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-default);
}
```


---

## From `css-grid`

> CSS Grid layout patterns — grid templates, auto-placement, subgrid, named areas, and responsive grids.

# CSS Grid Layout Patterns

## Purpose

Provide expert guidance on CSS Grid layout for building complex, responsive page layouts. Covers grid templates, auto-placement, subgrid, named areas, and intrinsic sizing patterns. Focuses on modern CSS Grid (including subgrid) with Tailwind CSS equivalents.

## Key Patterns

### Responsive Grid Without Media Queries

**Auto-fit with minmax — the most useful pattern:**

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1.5rem;
}
```

The `min(100%, 18rem)` prevents overflow on small screens where `18rem` exceeds container width.

**Tailwind equivalent:**

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6">
  <!-- cards -->
</div>
```

**auto-fit vs auto-fill:**

| Property | Behavior | Use When |
|----------|----------|----------|
| `auto-fit` | Collapses empty tracks, items stretch to fill | Few items, want them to fill width |
| `auto-fill` | Keeps empty tracks, items stay at min size | Many items, consistent column width |

```css
/* auto-fit: 2 items stretch to fill 4-column space */
.stretch { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

/* auto-fill: 2 items stay at 200px, empty tracks preserved */
.fixed { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
```

### Named Grid Areas

**Classic page layout:**

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar content aside"
    "footer  footer  footer";
  grid-template-columns: 16rem 1fr 14rem;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  gap: 0;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* Collapse sidebar on mobile */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "content"
      "footer";
    grid-template-columns: 1fr;
  }
  .sidebar, .aside { display: none; }
}
```

### Subgrid

Subgrid allows child grids to inherit the parent's track sizing, ensuring alignment across nested components:

```css
/* Parent grid defines columns */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 1.5rem;
}

/* Each card aligns its internal rows to siblings */
.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;  /* card takes 3 rows: image, title, description */
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
}

.card img    { grid-row: 1; object-fit: cover; border-radius: 0.5rem; }
.card h3     { grid-row: 2; align-self: start; }
.card p      { grid-row: 3; align-self: start; }
```

**Subgrid for form alignment:**

```css
.form {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem 1.5rem;
}

.form-field {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
}

.form-field label { grid-column: 1; }
.form-field input { grid-column: 2; padding: 0.75rem 1rem; border-radius: 0.5rem; }
```

### Explicit Grid Placement

**Dashboard with mixed-size widgets:**

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(10rem, auto);
  gap: 1.5rem;
  padding: 2rem;
}

.widget-large  { grid-column: span 2; grid-row: span 2; }
.widget-wide   { grid-column: span 2; }
.widget-tall   { grid-row: span 2; }
.widget-full   { grid-column: 1 / -1; }

@media (max-width: 768px) {
  .dashboard { grid-template-columns: repeat(2, 1fr); }
  .widget-large { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
  .dashboard { grid-template-columns: 1fr; }
  .widget-large,
  .widget-wide { grid-column: 1 / -1; grid-row: span 1; }
}
```

### Overlapping Grid Items

Grid items can occupy the same cells for layered effects:

```css
.hero {
  display: grid;
  grid-template: 1fr / 1fr;
  min-height: 60vh;
}

.hero > * {
  grid-area: 1 / 1;  /* all children overlap */
}

.hero-image {
  object-fit: cover;
  width: 100%;
  height: 100%;
}

.hero-overlay {
  background: linear-gradient(to top, rgb(0 0 0 / 0.7), transparent);
  z-index: 1;
}

.hero-content {
  z-index: 2;
  align-self: end;
  padding: 4rem;
  color: white;
}
```

### Intrinsic Sizing Patterns

```css
/* Content-sized sidebar, flexible main */
.layout {
  display: grid;
  grid-template-columns: fit-content(20rem) 1fr;
}

/* Minimum content size, then flexible */
.layout-2 {
  display: grid;
  grid-template-columns: minmax(min-content, 20rem) 1fr;
}

/* Auto tracks size to content, fr takes remaining space */
.header-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
}
```

### Masonry Layout (CSS Grid approach)

True CSS masonry is still experimental, but you can approximate it:

```css
/* Approximation using grid-auto-rows */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  grid-auto-rows: 1rem; /* small row unit */
  gap: 1rem;
}

/* Each item spans a calculated number of rows */
.masonry-item-sm { grid-row: span 10; }
.masonry-item-md { grid-row: span 15; }
.masonry-item-lg { grid-row: span 22; }
```

### Tailwind CSS Grid Utilities

```html
<!-- Responsive card grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div class="p-6 rounded-xl shadow-sm border">Card</div>
</div>

<!-- Dashboard layout with named areas (requires arbitrary values) -->
<div class="grid grid-cols-[16rem_1fr_14rem] grid-rows-[auto_1fr_auto] min-h-dvh">
  <header class="col-span-full">Header</header>
  <aside>Sidebar</aside>
  <main>Content</main>
  <aside>Right panel</aside>
  <footer class="col-span-full">Footer</footer>
</div>

<!-- Spanning items -->
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2 row-span-2">Large widget</div>
  <div>Small widget</div>
  <div>Small widget</div>
</div>
```

## Best Practices

1. **Use `auto-fit` with `minmax()` for responsive grids** — Eliminates the need for most media queries in card layouts.
2. **Use `min(100%, Xrem)` inside `minmax()`** — Prevents items from overflowing on very narrow containers.
3. **Use named grid areas for page layouts** — More readable than line-number placement for complex layouts.
4. **Use subgrid for aligned card content** — Ensures titles, descriptions, and CTAs align across cards in a row.
5. **Prefer `gap` over margins** — Grid gap only applies between items, not at edges. Simpler than managing margins.
6. **Use `dvh` for full-height layouts** — `100dvh` accounts for mobile browser chrome, unlike `100vh`.
7. **Combine Grid and Flexbox** — Use Grid for 2D layouts, Flexbox for 1D alignment within grid items.
8. **Use `fr` units, not percentages** — `fr` respects `gap` automatically; percentages don't.
9. **Set `min-width: 0` on grid children when needed** — Grid items default to `min-width: auto`, which can cause overflow with long text.
10. **Test with Grid DevTools** — Firefox and Chrome both have Grid overlay inspectors that show tracks and gaps.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `minmax(200px, 1fr)` overflow | On screens < 200px, items overflow | Use `minmax(min(100%, 200px), 1fr)` |
| Percentage gaps | Gaps calculated from container, not track | Use `rem` or `px` for gap values |
| `auto` vs `1fr` confusion | `auto` sizes to content; `1fr` shares remaining space | Use `1fr` when columns should be equal |
| Missing `min-width: 0` | Long words or images overflow grid cells | Add `min-width: 0` or `overflow: hidden` to children |
| Subgrid without `span` | Child grid doesn't span enough parent rows | Set `grid-row: span N` to match subgrid row count |
| `auto-fill` when wanting stretch | Items don't fill container width | Use `auto-fit` to collapse empty tracks |
| Fixed column count on mobile | Grid doesn't adapt to small screens | Use `auto-fit`/`auto-fill` or responsive breakpoints |
| Forgetting `grid-template-rows` | Only columns defined, rows auto-sized unexpectedly | Define explicit row templates for complex layouts |


---

## From `dark-mode`

> Dark mode implementation with CSS custom properties, prefers-color-scheme, Tailwind dark variant, theme persistence in localStorage, class vs media strategy, and smooth transitions

# Dark Mode Skill

## Purpose

Implement a flicker-free, accessible dark mode that respects user system preferences, persists choice across sessions, and transitions smoothly between themes.

## Key Concepts

### Strategy: Class vs Media

| Strategy | Tailwind Config | Control | Best For |
|----------|----------------|---------|----------|
| `class` | `darkMode: "class"` | Manual toggle + system fallback | Most apps (recommended) |
| `media` | `darkMode: "media"` | System preference only | Blogs, simple sites |

### CSS Custom Properties (Design Tokens)

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --border: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 7%;
  --card-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
}

/* Smooth transition between themes */
html.transitioning,
html.transitioning *,
html.transitioning *::before,
html.transitioning *::after {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease !important;
}
```

### Anti-Flash Script (Critical)

Inject an inline `<script>` in `<head>` before the body renders. This prevents a white flash
when a dark-mode user loads the page. Use React's `dangerouslySetInnerHTML` on a `<script>` tag
inside `app/layout.tsx`:

```javascript
// Inline script content (runs before paint):
(function() {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme:dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch(e) {}
})()
```

Add `suppressHydrationWarning` on the `<html>` element to avoid React hydration mismatches
caused by the class being added before hydration.

### Theme Provider (React)

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.add("transitioning");
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "dark" : "light");
      localStorage.removeItem("theme");
    } else {
      root.classList.add(newTheme);
    }

    setTimeout(() => root.classList.remove("transitioning"), 250);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Toggle Component

```tsx
"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-lg px-4 py-3 text-base transition-all duration-200
                 hover:bg-black/10 dark:hover:bg-white/10
                 focus-visible:ring-2 focus-visible:ring-offset-2
                 motion-reduce:transition-none"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="dark:hidden">Moon Icon</span>
      <span className="hidden dark:inline">Sun Icon</span>
    </button>
  );
}
```

### Tailwind Usage

```tsx
{/* Tailwind dark: prefix applies when .dark class is on <html> */}
<div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
  <p className="text-gray-600 dark:text-gray-400">Adapts to theme</p>
</div>
```

## Best Practices

- **Inline the anti-flash script**: Must run before first paint. Never load it as an external file.
- **Use `suppressHydrationWarning`**: On `<html>` to prevent React hydration mismatch from the class.
- **Respect system preference**: Default to `system`, then allow manual override.
- **Use HSL tokens**: Store colors as HSL channels so opacity modifiers work: `bg-background/50`.
- **Test both modes**: Every page, every component. Dark mode is not an afterthought.
- **Accessible contrast**: Verify WCAG AA (4.5:1 text, 3:1 UI) in both themes.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| White flash on dark-mode page load | Add inline script to `<head>` before body renders |
| Hydration mismatch warning | Add `suppressHydrationWarning` to `<html>` |
| Images look wrong in dark mode | Use `dark:invert` or provide dark variants |
| Hardcoded colors ignore theme | Use CSS variables or Tailwind `dark:` prefix everywhere |
| Transition flicker on first load | Only add transition class during intentional toggles |


---

## From `responsive-design`

> Responsive design — fluid typography, container queries, aspect ratios, mobile-first CSS, clamp(), modern layout patterns, and accessibility across viewports

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


---

## From `animation`

> Frontend animation patterns — Framer Motion, CSS animations, GSAP, scroll-driven animations, and motion design principles

# Animation & Motion Design

## Purpose

Provide expert guidance on frontend animation implementation using Framer Motion, CSS animations, GSAP, and native scroll-driven animations. Focus on performant, accessible motion that enhances user experience without degrading performance or excluding users who prefer reduced motion.

## Core Principles

1. **Purpose over decoration** — Every animation should serve a purpose: guide attention, provide feedback, show relationships, or smooth transitions.
2. **60fps or nothing** — Animate only `transform` and `opacity` for GPU-accelerated performance. Avoid animating `width`, `height`, `top`, `left`, `margin`, or `padding`.
3. **Respect user preferences** — Always implement `prefers-reduced-motion` alternatives.
4. **Duration guidelines** — Micro-interactions: 100-200ms. Transitions: 200-400ms. Complex sequences: 400-800ms. Never exceed 1s for UI animations.

## Key Patterns

### Framer Motion Fundamentals

**Basic animations:**

```tsx
import { motion } from 'framer-motion';

// Simple entrance animation
function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// Exit animation
function Toast({ message, onClose }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="p-6 rounded-xl shadow-lg bg-white"
    >
      {message}
      <button onClick={onClose}>Dismiss</button>
    </motion.div>
  );
}
```

**AnimatePresence for exit animations:**

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function NotificationList({ notifications }: { notifications: Notification[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {notifications.map(n => (
        <motion.div
          key={n.id}
          layout
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="overflow-hidden"
        >
          <div className="p-6 rounded-xl shadow-sm border mb-3">
            {n.message}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

**Layout animations:**

```tsx
function ExpandableCard({ isExpanded, onClick, title, content }: Props) {
  return (
    <motion.div
      layout
      onClick={onClick}
      className="p-6 rounded-xl shadow-sm cursor-pointer"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.h3 layout="position" className="text-lg font-semibold">
        {title}
      </motion.h3>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-base text-gray-600"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Stagger children:**

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

function StaggerList({ items }: { items: Item[] }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {items.map(item => (
        <motion.li
          key={item.id}
          variants={itemVariants}
          className="p-6 rounded-xl shadow-sm"
        >
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

**Scroll-triggered with `whileInView`:**

```tsx
function ScrollReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### CSS Animations

**Keyframe animations:**

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fade-in-up {
  animation: fade-in-up 0.3s ease-out forwards;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Skeleton loading shimmer */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 25%,
    oklch(0 0 0 / 0.05) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .animate-pulse {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .skeleton {
    animation: none;
  }
}
```

**CSS transitions for micro-interactions:**

```css
.btn {
  transition: all 200ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  &:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }
}

.card {
  transition: box-shadow 200ms ease, transform 200ms ease;

  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
}

.link {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--color-brand-600);
    transition: width 200ms ease;
  }

  &:hover::after {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn, .card, .link::after {
    transition: none;
  }

  .btn:hover, .card:hover {
    transform: none;
  }
}
```

### Scroll-Driven Animations (CSS)

Native CSS scroll-driven animations (no JavaScript):

```css
/* Progress bar that fills as user scrolls */
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--color-brand-500);
  transform-origin: left;
  animation: grow-width linear;
  animation-timeline: scroll();
}

@keyframes grow-width {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Element reveals on scroll into view */
.scroll-reveal {
  animation: fade-in-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Parallax-like effect */
.parallax-element {
  animation: parallax linear;
  animation-timeline: scroll();
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .parallax-element {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

### GSAP Patterns

**Basic timeline:**

```tsx
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero-title', { y: 60, opacity: 0, duration: 0.8 })
      .from('.hero-subtitle', { y: 40, opacity: 0, duration: 0.6 }, '-=0.4')
      .from('.hero-cta', { y: 30, opacity: 0, duration: 0.5 }, '-=0.3');

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tl.progress(1).kill();
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="py-16">
      <h1 className="hero-title text-4xl font-bold">Welcome</h1>
      <p className="hero-subtitle text-xl text-gray-600 mt-4">Subtitle here</p>
      <button className="hero-cta mt-8 px-6 py-4 text-base rounded-lg bg-brand-600 text-white">
        Get Started
      </button>
    </div>
  );
}
```

**Scroll-triggered sections:**

```tsx
function ScrollSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>('.reveal-card');

    cards.forEach((card, i) => {
      gsap.from(card, {
        y: 60,
        opacity: 0,
        duration: 0.6,
        delay: i * 0.1,
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          end: 'top 20%',
          toggleActions: 'play none none reverse',
        },
      });
    });
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="py-16">
      {items.map(item => (
        <div key={item.id} className="reveal-card p-6 rounded-xl shadow-sm mb-6">
          {item.content}
        </div>
      ))}
    </section>
  );
}
```

### Reduced Motion Pattern

Always provide a comprehensive reduced-motion strategy:

```tsx
// Hook for checking reduced motion preference
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Usage with Framer Motion
function AnimatedComponent({ children }: { children: React.ReactNode }) {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced
        ? { duration: 0 }
        : { type: 'spring', stiffness: 300, damping: 25 }
      }
    >
      {children}
    </motion.div>
  );
}
```

### Page Transitions (Next.js)

```tsx
// app/template.tsx — runs on every navigation
'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

## Best Practices

1. **GPU-only properties** — Animate only `transform` (`translate`, `scale`, `rotate`) and `opacity`. Everything else triggers layout/paint.
2. **`will-change` sparingly** — Only apply to elements about to animate, remove after.
3. **Spring physics for UI** — Springs feel natural. Use `type: 'spring'` in Framer Motion with `stiffness: 200-400`, `damping: 20-30`.
4. **`layout` prop for FLIP** — Framer Motion's `layout` prop handles layout animations automatically.
5. **`AnimatePresence` for exit** — Required for exit animations; wrap lists and conditionally rendered elements.
6. **Stagger delays: 50-100ms** — Keep stagger intervals short for perceptual grouping.
7. **`ease-out` for entrances, `ease-in` for exits** — Match motion to real-world physics.
8. **Avoid simultaneous animations** — Stagger or sequence related animations to reduce cognitive load.
9. **Test on low-end devices** — Animations that are smooth on M-series Macs may jank on budget phones.
10. **`prefers-reduced-motion` is mandatory** — Never ship animations without reduced motion support.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Animating `width`/`height` | Triggers layout recalculation every frame | Animate `transform: scale()` instead, or use `layout` prop |
| Missing `AnimatePresence` | Exit animations don't play | Wrap parent with `AnimatePresence` |
| `layout` on too many elements | Performance degrades with many layout animations | Apply only to elements that actually change position |
| Long durations | UI feels sluggish | 200-400ms for transitions, 100-200ms for micro-interactions |
| No reduced motion fallback | Excludes users with vestibular disorders | Always check `prefers-reduced-motion` |
| Animating on mount in lists | All items animate at once on page load | Use `whileInView` or stagger with viewport detection |
| GSAP without cleanup | Memory leaks, zombie animations | Use `useGSAP` hook or kill timelines in cleanup |
| `will-change` on everything | Excessive GPU memory usage | Apply just before animation, remove after |


---

## From `framer-motion`

> Production-ready animation library for React — motion components, variants, AnimatePresence, layout animations, gestures, scroll-triggered

# Framer Motion

- **layer**: domain
- **category**: animation
- **riskLevel**: low
- **triggers**: animate, motion, framer, transition, gesture, spring, stagger, AnimatePresence

## Overview

Production-ready animation library for React. Declarative API with spring physics, layout animations, gesture support, and scroll-driven effects. Pairs with React's component model for composable, performant motion.

## When to Use

- Adding enter/exit/layout transitions to React components
- Gesture-driven interactions (hover, tap, drag, pan)
- Scroll-triggered reveals or parallax effects
- Shared-layout animations across routes or states
- Orchestrating staggered or sequenced animations

## Key Patterns

### Motion Components
Use `motion.div`, `motion.span`, etc. — drop-in replacements that accept animation props.

### Animate Prop & Variants
Define `initial`, `animate`, and `exit` states inline or via named `variants` for reuse across children.

### AnimatePresence
Wrap conditional elements to animate mount/unmount. Use `mode="wait"` for sequential transitions and always provide a unique `key`.

### Layout Animations
Add `layout` prop for automatic size/position transitions. Use `layoutId` for shared-element animations across components.

### Gesture Animations
`whileHover`, `whileTap`, `whileFocus`, `whileDrag` — declarative gesture states. Combine `drag` with `dragConstraints` and `dragElastic`.

### Scroll-Triggered Animations
`useScroll()` returns `scrollYProgress`. Pair with `useTransform` or `useMotionValueEvent` to drive animations from scroll position.

### Spring Physics
Default transition uses springs. Tune with `type: "spring"`, `stiffness`, `damping`, `mass`. Use `type: "tween"` with `duration` for linear/eased motion.

### Stagger Children
In parent variants, set `transition: { staggerChildren: 0.05 }`. Children inherit variant names and animate in sequence.

### useAnimate (Imperative)
`const [scope, animate] = useAnimate()` — run sequenced or conditional animations outside the declarative model. Useful for complex orchestration.

## Anti-Patterns

- **Animating layout-triggering properties** (width, height) without `layout` prop — causes jank; use `layout` or transform-based animations instead.
- **Missing `key` on AnimatePresence children** — exit animations silently break.
- **Over-stiff springs** — `stiffness > 500` without proportional `damping` causes oscillation. Test with `damping: 2 * Math.sqrt(stiffness)` for critical damping.
- **Animating unmeasured elements** — `layout` requires the element to be in the DOM before measuring; avoid combining with `display: none`.
- **Ignoring `prefers-reduced-motion`** — wrap animations with `useReducedMotion()` and provide static fallbacks.
- **Re-creating variants on every render** — define variants outside the component or memoize them.

## Related Skills

`react` | `animation` | `css-architecture` | `design-systems`


---

## From `tailwind-animate`

> Tailwind CSS animation utilities, tailwindcss-animate plugin, enter/exit/loop animations, and motion-safe patterns

# Tailwind Animate Patterns

## Purpose

Provide expert guidance on CSS animations using Tailwind CSS and the `tailwindcss-animate` plugin, including enter/exit animations, looping animations, staggered sequences, and accessibility-compliant motion patterns.

## Core Patterns

### 1. Plugin Installation & Configuration

```bash
npm install tailwindcss-animate
```

**Tailwind v4 (CSS-first):**

```css
/* globals.css */
@import "tailwindcss";
@plugin "tailwindcss-animate";

@theme {
  /* Custom animation durations */
  --animate-duration: 200ms;
  --animate-delay: 0ms;

  /* Custom keyframes */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-fade-out: fade-out 0.2s ease-out;
  --animate-slide-in-from-top: slide-in-from-top 0.3s ease-out;
  --animate-slide-in-from-bottom: slide-in-from-bottom 0.3s ease-out;
  --animate-slide-in-from-left: slide-in-from-left 0.3s ease-out;
  --animate-slide-in-from-right: slide-in-from-right 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;
  --animate-spin-slow: spin 3s linear infinite;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slide-in-from-top {
  from { opacity: 0; transform: translateY(-1rem); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-from-bottom {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-from-left {
  from { opacity: 0; transform: translateX(-1rem); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slide-in-from-right {
  from { opacity: 0; transform: translateX(1rem); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

**Tailwind v3 (config-based):**

```js
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  plugins: [animate],
} satisfies Config;
```

### 2. Enter/Exit Animations with tailwindcss-animate

The plugin provides `animate-in` and `animate-out` base classes combined with directional modifiers:

```tsx
// Fade in
<div className="animate-in fade-in duration-200">
  Fades in
</div>

// Slide in from bottom with fade
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
  Slides up and fades in
</div>

// Slide in from left
<div className="animate-in fade-in slide-in-from-left-8 duration-300">
  Slides from left
</div>

// Scale in (zoom)
<div className="animate-in fade-in zoom-in-95 duration-200">
  Scales up from 95% with fade
</div>

// Exit animations
<div className="animate-out fade-out slide-out-to-bottom-4 duration-200">
  Slides down and fades out
</div>

// Spin out
<div className="animate-out fade-out spin-out-180 duration-300">
  Spins and fades out
</div>

// Combine with fill-mode to persist end state
<div className="animate-in fade-in duration-300 fill-mode-forwards">
  Stays visible after animation
</div>
```

### 3. Staggered List Animations

```tsx
// Staggered children using animation-delay
function StaggeredList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={item}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="p-4 rounded-lg border border-border shadow-sm">
            {item}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Using CSS custom properties for delay
function StaggeredGrid({ cards }: { cards: CardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <div
          key={card.id}
          className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 fill-mode-both"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Card card={card} />
        </div>
      ))}
    </div>
  );
}
```

### 4. Dialog/Modal Animations

```tsx
// Dialog with overlay + content animation
function AnimatedDialog({ open, onClose, children }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Backdrop */}
      <DialogOverlay
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          'duration-200'
        )}
      />

      {/* Content */}
      <DialogContent
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-lg p-8 rounded-2xl bg-white shadow-lg',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'duration-200'
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Dropdown/Popover Animations

```tsx
// Dropdown with origin-aware animation
<DropdownMenuContent
  className={cn(
    'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-white p-1 shadow-md',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'data-[side=bottom]:slide-in-from-top-2',
    'data-[side=left]:slide-in-from-right-2',
    'data-[side=right]:slide-in-from-left-2',
    'data-[side=top]:slide-in-from-bottom-2',
    'duration-200'
  )}
/>
```

### 6. Looping / Continuous Animations

```css
/* globals.css */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes bounce-gentle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-0.25rem); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@theme {
  --animate-pulse-soft: pulse-soft 2s ease-in-out infinite;
  --animate-bounce-gentle: bounce-gentle 1s ease-in-out infinite;
  --animate-shimmer: shimmer 1.5s ease-in-out infinite;
}
```

```tsx
// Skeleton loading with shimmer
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        'bg-[length:200%_100%] animate-shimmer',
        'motion-reduce:animate-none motion-reduce:bg-gray-200',
        className
      )}
    />
  );
}

// Notification badge pulse
<span className="relative flex h-3 w-3">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
</span>

// Loading spinner
<svg className="animate-spin h-5 w-5 text-brand-600 motion-reduce:animate-none" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
</svg>
```

### 7. Scroll-Triggered Animations

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element); // Only animate once
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

function AnimateOnScroll({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 motion-reduce:transition-none',
        isInView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
```

## Best Practices

1. **Always respect `prefers-reduced-motion`** -- use `motion-reduce:animate-none` or `motion-reduce:transition-none` on every animation.
2. **Keep durations short** -- 150-300ms for micro-interactions, 300-500ms for entrance animations. Never exceed 1s for UI transitions.
3. **Use `fill-mode-both`** for staggered animations so elements stay invisible before their delay starts and visible after they finish.
4. **Combine `animate-in` with directional classes** -- `fade-in` alone is subtle; pair with `slide-in-from-*` or `zoom-in-*` for impact.
5. **Use `data-[state=*]` selectors** with Radix UI / shadcn/ui for enter/exit animations tied to component state.
6. **Limit simultaneous animations** -- stagger items by 50-100ms to create a natural flow rather than animating everything at once.
7. **Use CSS animations over JS** where possible -- GPU-accelerated `transform` and `opacity` are the cheapest properties to animate.
8. **Add `will-change-transform`** only when needed for complex animations, remove after animation completes to free GPU memory.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Animating `width`/`height`/`margin` | Triggers expensive layout recalculations | Use `transform: scale()` or `translate()` instead |
| No `motion-reduce` fallback | Causes motion sickness for vestibular disorders | Always add `motion-reduce:animate-none` |
| Animation duration > 1s for UI | Feels sluggish, blocks interaction | Keep UI transitions 150-500ms |
| Animating everything on page load | Overwhelming, slows perceived performance | Animate only above-fold hero elements |
| Using `animate-bounce` for loading | Distracting, not semantically meaningful | Use `animate-spin` or `animate-pulse` for loading |
| `animation-delay` without `opacity: 0` initial | Content flashes then animates | Use `fill-mode-both` or set initial `opacity-0` |
| Staggering 20+ items | Long wait before last items appear | Cap staggered items at 8-10, load rest instantly |

## Decision Guide

| Scenario | Approach |
|----------|----------|
| Simple fade/slide entrance | `animate-in fade-in slide-in-from-bottom-4 duration-300` |
| Dialog open/close | `data-[state=open]:animate-in` + `data-[state=closed]:animate-out` |
| Staggered list items | `animate-in` with `style={{ animationDelay }}` + `fill-mode-both` |
| Loading skeleton | Custom `shimmer` keyframe with `animate-shimmer` |
| Notification badge | `animate-ping` on pseudo-element |
| Hover micro-interaction | `transition-all duration-200` (not keyframe animation) |
| Complex choreographed sequences | Use Framer Motion instead of pure CSS |
| Scroll-triggered reveal | IntersectionObserver + Tailwind transition classes |
| Exit animations | `animate-out fade-out slide-out-to-*` with `tailwindcss-animate` |

