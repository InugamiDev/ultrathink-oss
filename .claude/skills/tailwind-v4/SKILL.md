---
name: tailwind-v4
description: Tailwind CSS v4 CSS-first configuration, @theme directive, cascade layers, Lightning CSS engine, and migration from v3
layer: domain
category: frontend
triggers:
  - "tailwind v4"
  - "tailwind css-first"
  - "@theme directive"
  - "cascade layers"
  - "lightning css"
  - "tailwind config"
  - "tailwind migration"
  - "@import tailwindcss"
inputs:
  - "Tailwind v4 configuration requirements"
  - "Migration from Tailwind v3 to v4"
  - "Custom theme setup with @theme"
  - "Cascade layer ordering questions"
outputs:
  - "CSS-first Tailwind v4 configuration files"
  - "Theme customization with @theme blocks"
  - "Cascade layer architecture"
  - "Migration plans from v3 config to v4 CSS"
linksTo:
  - css-architecture
  - design-systems
  - nextjs
  - react
linkedFrom:
  - tailwindcss
  - css-architecture
preferredNextSkills:
  - css-architecture
  - design-systems
fallbackSkills:
  - tailwindcss
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Tailwind CSS v4 — CSS-First Configuration

## Purpose

Provide expert guidance on Tailwind CSS v4's paradigm shift to CSS-first configuration, replacing `tailwind.config.js` with native CSS directives. Covers the `@theme` directive, cascade layers, the Lightning CSS engine, custom utilities, and migration strategies from v3.

## Key Patterns

### CSS-First Configuration

**No more `tailwind.config.js`** — All configuration lives in CSS:

```css
/* app.css — the single entry point */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --spacing-gutter: 1.5rem;
  --spacing-section: 4rem;
}
```

### The @theme Directive

**Define design tokens as CSS custom properties** — Tailwind v4 auto-generates utility classes from `@theme` variables:

```css
@theme {
  /* Colors: generates bg-brand, text-brand, border-brand, etc. */
  --color-brand: #6366f1;
  --color-brand-light: #818cf8;
  --color-brand-dark: #4f46e5;

  /* Spacing: generates p-18, m-18, gap-18, etc. */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;

  /* Font sizes: generates text-display, text-title, etc. */
  --font-size-display: 3rem;
  --font-size-title: 2rem;
  --line-height-display: 1.1;
  --line-height-title: 1.25;

  /* Breakpoints: generates sm:, md:, etc. */
  --breakpoint-xs: 30rem;
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;

  /* Animations: generates animate-fade-in, etc. */
  --animate-fade-in: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Cascade Layers

**Tailwind v4 uses native CSS cascade layers** for deterministic specificity:

```css
/* Layer order (lowest to highest priority):
   @layer theme, base, components, utilities; */

/* Override base styles */
@layer base {
  html {
    font-family: var(--font-sans);
    color: var(--color-foreground);
  }

  h1, h2, h3 {
    font-weight: 700;
    line-height: 1.2;
  }
}

/* Component-level styles */
@layer components {
  .btn-primary {
    @apply px-6 py-4 text-base font-medium rounded-lg
           bg-primary text-white
           transition-all duration-200
           hover:bg-primary-hover
           focus-visible:ring-2 focus-visible:ring-offset-2;
  }

  .card {
    @apply p-6 rounded-xl shadow-sm bg-surface;
  }
}

/* Custom utilities land here automatically */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### Custom Utilities and Variants

**Register custom utilities** directly in CSS:

```css
@utility text-shadow-sm {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
}

@utility text-shadow-md {
  text-shadow: 0 2px 4px rgb(0 0 0 / 0.15);
}

@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

/* Custom variant */
@variant hocus (&:hover, &:focus-visible);
@variant group-hocus (:merge(.group):hover &, :merge(.group):focus-visible &);
```

### Lightning CSS Engine

**Automatic transforms** — No PostCSS needed for most cases:

```css
/* Nesting works natively */
.nav {
  display: flex;
  gap: 1rem;

  & a {
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    transition: all 200ms;

    &:hover {
      background: var(--color-surface-alt);
    }
  }
}

/* Modern color functions auto-prefixed */
.element {
  color: oklch(0.7 0.15 250);
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
}
```

### Dark Mode with @theme

```css
@theme {
  --color-bg: #ffffff;
  --color-fg: #0f172a;
  --color-muted: #64748b;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
}

@theme dark {
  --color-bg: #0f172a;
  --color-fg: #f1f5f9;
  --color-muted: #94a3b8;
  --color-surface: #1e293b;
  --color-border: #334155;
}
```

### Migration from v3

**Before (v3 — `tailwind.config.js`):**

```js
// tailwind.config.js — DELETE THIS
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#6366f1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
```

**After (v4 — `app.css`):**

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-brand: #6366f1;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

## Best Practices

1. **Single CSS entry point** — Keep one `app.css` with all `@theme`, `@layer`, and `@import` directives. Avoid scattering config across files.
2. **Use semantic token names** — Name colors by purpose (`--color-surface`, `--color-primary`) not appearance (`--color-blue`, `--color-light-gray`).
3. **Lean on cascade layers** — Put reusable component styles in `@layer components`. Utilities always win due to layer ordering.
4. **Migrate incrementally** — v4 supports a compatibility mode. Move one section of `tailwind.config.js` at a time into `@theme`.
5. **Leverage Lightning CSS** — Remove PostCSS plugins for nesting, autoprefixer, and color functions. Lightning CSS handles them natively.
6. **Use `@utility` for project-specific helpers** — Instead of arbitrary values like `[text-shadow:...]`, register a named utility.
7. **Keep `@theme` tokens flat** — Avoid deeply nested naming. `--color-primary` not `--color-brand-primary-default`.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Keeping `tailwind.config.js` alongside v4 CSS | Conflicting configuration sources | Migrate fully to CSS `@theme` or use compat mode explicitly |
| Wrong layer ordering | Component styles override utility classes | Never put component styles in `@layer utilities`; use `@layer components` |
| Using PostCSS nesting plugin | Conflicts with Lightning CSS built-in nesting | Remove `postcss-nesting` and `postcss-nested` plugins |
| `@apply` in `@layer utilities` | Circular reference when applying utilities inside utility layer | Use `@apply` only in `@layer components` or `@layer base` |
| Hardcoded values instead of tokens | Loses theme consistency and dark mode support | Reference `var(--color-*)` or use generated utility classes |
| Missing `@import "tailwindcss"` | No utility classes generated at all | Must be the first import in your CSS entry point |
| Ignoring `@theme dark` | Manual dark mode selectors everywhere | Define dark overrides in `@theme dark` block for automatic support |
| Prefixing custom properties wrong | `--tw-color-brand` does not generate classes | Use the exact namespace: `--color-*`, `--spacing-*`, `--font-size-*` |
