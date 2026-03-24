---
name: tailwindcss
description: Tailwind CSS utilities, custom configuration, design tokens, responsive design, and component styling patterns
layer: domain
category: frontend
triggers:
  - "tailwind"
  - "tailwindcss"
  - "utility class"
  - "design token"
  - "responsive design"
  - "dark mode"
  - "tailwind config"
  - "cn() function"
  - "clsx"
  - "cva"
inputs:
  - "UI design requirements or mockups"
  - "Custom theme or brand configuration"
  - "Responsive layout needs"
  - "Component variant styling"
outputs:
  - "Tailwind utility class compositions"
  - "Custom tailwind.config.ts configurations"
  - "Design token systems"
  - "Variant-based component styles with CVA"
linksTo:
  - design-systems
  - css-architecture
  - animation
  - react
linkedFrom:
  - code-writer
  - ui-designer
preferredNextSkills:
  - design-systems
  - css-architecture
  - animation
fallbackSkills:
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Tailwind CSS Patterns & Configuration

## Purpose

Provide expert guidance on Tailwind CSS v4+ utility-first styling, custom configuration, design token systems, responsive patterns, and maintainable component styling using class variance authority (CVA) and utility composition.

## Key Patterns

### Tailwind v4 CSS-First Configuration

Tailwind v4 moves configuration from `tailwind.config.ts` to CSS using `@theme`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Colors using CSS custom properties */
  --color-brand-50: oklch(0.97 0.01 250);
  --color-brand-100: oklch(0.93 0.03 250);
  --color-brand-500: oklch(0.55 0.18 250);
  --color-brand-600: oklch(0.48 0.18 250);
  --color-brand-900: oklch(0.25 0.10 250);

  /* Semantic tokens */
  --color-surface: var(--color-brand-50);
  --color-surface-elevated: white;
  --color-text-primary: var(--color-brand-900);
  --color-text-secondary: oklch(0.45 0.03 250);
  --color-border: oklch(0.85 0.02 250);

  /* Typography scale (Golden Ratio) */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.625rem;
  --font-size-3xl: 2rem;
  --font-size-4xl: 2.625rem;
  --font-size-5xl: 4.25rem;

  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 oklch(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);

  /* Animations */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
}

/* Dark mode tokens */
@media (prefers-color-scheme: dark) {
  @theme {
    --color-surface: oklch(0.15 0.02 250);
    --color-surface-elevated: oklch(0.20 0.02 250);
    --color-text-primary: oklch(0.95 0.01 250);
    --color-text-secondary: oklch(0.70 0.02 250);
    --color-border: oklch(0.30 0.02 250);
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(0.5rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Class Merging with `cn()`

Always use a `cn()` utility for conditional class merging:

```tsx
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  'p-6 rounded-xl shadow-sm transition-all duration-200',
  isActive && 'ring-2 ring-brand-500',
  className // allow parent override
)} />
```

### Component Variants with CVA

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles (always applied)
  [
    'inline-flex items-center justify-center',
    'font-medium text-base rounded-lg',
    'transition-all duration-200',
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    'disabled:opacity-50 disabled:pointer-events-none',
    'motion-reduce:transition-none',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
        secondary: 'bg-white border border-border text-text-primary hover:bg-gray-50 focus-visible:ring-brand-500',
        ghost: 'text-text-secondary hover:bg-gray-100 hover:text-text-primary',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      },
      size: {
        sm: 'px-4 py-2 text-sm min-h-[2rem]',
        md: 'px-6 py-4 text-base min-h-[2.625rem]',
        lg: 'px-8 py-4 text-lg min-h-[3rem]',
        icon: 'p-3 min-h-[2.625rem] min-w-[2.625rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
```

### Responsive Design

**Mobile-first breakpoints:**

```tsx
// Tailwind default breakpoints
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

// GOOD: Mobile-first, progressive enhancement
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => (
    <Card key={item.id} className="p-6 rounded-xl shadow-sm" />
  ))}
</div>

// Responsive typography
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>

// Responsive spacing
<section className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
  {/* Section content */}
</section>
```

**Container queries (v4):**

```tsx
// Parent declares containment
<div className="@container">
  {/* Children respond to parent width, not viewport */}
  <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-4">
    {/* ... */}
  </div>
</div>
```

### Dark Mode

```tsx
// Class-based dark mode (recommended for toggle support)
// tailwind.config: darkMode: 'class'

<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm dark:shadow-none">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
      Card Title
    </h2>
    <p className="text-gray-600 dark:text-gray-400">
      Card description text.
    </p>
  </div>
</div>

// Prefer semantic tokens over explicit dark: variants
// With token system:
<div className="bg-surface text-text-primary border-border">
  {/* Automatically adapts to dark mode via CSS variables */}
</div>
```

### Layout Patterns

**Sticky Header:**

```tsx
<header className="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-sm">
  <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
    {/* ... */}
  </div>
</header>
```

**Sidebar Layout:**

```tsx
<div className="flex min-h-screen">
  <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-border">
    <nav className="flex-1 overflow-y-auto p-4">
      {/* Sidebar nav */}
    </nav>
  </aside>
  <main className="flex-1 overflow-y-auto">
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Main content */}
    </div>
  </main>
</div>
```

**Center Content:**

```tsx
// Horizontal center with max-width
<div className="mx-auto max-w-2xl px-4 sm:px-6">

// Full center (e.g., login page)
<div className="min-h-screen flex items-center justify-center px-4">
  <div className="w-full max-w-md p-8 rounded-2xl shadow-lg">
    {/* Form */}
  </div>
</div>
```

### Animation Utilities

```tsx
// Entrance animation
<div className="animate-fade-in">Content</div>

// Hover effects
<div className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
  Card with lift effect
</div>

// Group hover
<div className="group p-6 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md">
  <h3 className="font-semibold group-hover:text-brand-600 transition-colors duration-200">
    Title
  </h3>
  <span className="inline-flex items-center text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    Learn more &rarr;
  </span>
</div>

// Respect reduced motion
<div className="transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:transform-none">
```

## Best Practices

1. **Mobile-first** — Always write base styles for mobile, then `sm:`, `md:`, `lg:` for larger screens.
2. **Use semantic tokens** — Define colors as semantic variables (`surface`, `text-primary`) not raw values.
3. **`cn()` for all conditional classes** — Never manually concatenate class strings.
4. **CVA for component variants** — Structured, type-safe variant management.
5. **Avoid `@apply` in v4** — Use component abstractions (React/Vue/Svelte) instead of `@apply` for reuse.
6. **Consistent spacing scale** — Use the defined spacing tokens, avoid arbitrary values like `p-[13px]`.
7. **Always add `transition-all duration-200`** on interactive elements.
8. **Include focus-visible states** — `focus-visible:ring-2 focus-visible:ring-offset-2` on all interactive elements.
9. **Respect `prefers-reduced-motion`** — Add `motion-reduce:transition-none` alongside transitions.
10. **Use `oklch` for colors** — Perceptually uniform, better for generating scales.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Arbitrary values everywhere | Inconsistent design, hard to maintain | Use design tokens and spacing scale |
| Missing dark mode | Unusable in dark environments | Use semantic tokens or explicit `dark:` variants |
| `@apply` overuse | Defeats utility-first purpose, bloats CSS | Use component abstractions for reuse |
| No `sr-only` for icon buttons | Inaccessible to screen readers | Add `<span className="sr-only">Label</span>` |
| Conflicting classes | `p-4 p-6` leads to unpredictable results | Use `cn()` with `tailwind-merge` |
| Missing responsive images | Layout shift, oversized images | Always set `w-full` and container sizing |
| Forgetting `min-h-screen` | Page shorter than viewport | Add to root layout container |
| Not using `group`/`peer` | Complex hover states require JavaScript | Use Tailwind's `group-hover:` and `peer-checked:` |
| No truncation on text | Long text breaks layout | Use `truncate` or `line-clamp-*` |
| Fixed widths on responsive layouts | Broken on different screens | Use `max-w-*` with `w-full` |
