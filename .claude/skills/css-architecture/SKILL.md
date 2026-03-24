---
name: css-architecture
description: CSS architecture patterns — CSS modules, CSS-in-JS, cascade layers, container queries, logical properties, and scalable styling strategies
layer: domain
category: frontend
triggers:
  - "css module"
  - "css architecture"
  - "cascade layer"
  - "container query"
  - "CSS-in-JS"
  - "styled-components"
  - "css custom properties"
  - "css variables"
  - "css scope"
  - "css nesting"
  - "logical properties"
  - "@layer"
inputs:
  - "Styling architecture decisions"
  - "CSS scoping and specificity problems"
  - "Modern CSS feature guidance"
  - "CSS-in-JS vs CSS modules comparisons"
outputs:
  - "CSS architecture patterns and file structures"
  - "Cascade layer configurations"
  - "Container query implementations"
  - "Scoping and specificity strategies"
linksTo:
  - tailwindcss
  - design-systems
  - animation
linkedFrom:
  - code-writer
  - architect
preferredNextSkills:
  - tailwindcss
  - design-systems
  - animation
fallbackSkills:
  - tailwindcss
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
