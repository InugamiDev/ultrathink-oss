---
name: css-variables
description: CSS custom properties for design tokens, theming, dynamic styles, dark mode, and runtime theme switching without JavaScript
layer: domain
category: frontend
triggers:
  - "css variables"
  - "custom properties"
  - "css var"
  - "design tokens css"
  - "css theming"
  - "dark mode css"
  - "dynamic styles"
inputs:
  - Design tokens or brand colors
  - Theme requirements (light/dark, multi-brand)
  - Component library or framework in use
  - Accessibility contrast requirements
outputs:
  - CSS custom property architecture
  - Theme switching implementation
  - Design token to CSS variable mapping
  - Dark mode strategy
linksTo: [tailwindcss, design-systems, animation, css-architecture]
linkedFrom: [ui-ux-pro, react, nextjs]
preferredNextSkills: [design-systems, tailwindcss]
fallbackSkills: [css-architecture]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [modifies global CSS, may change visual appearance across the app]
---

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
