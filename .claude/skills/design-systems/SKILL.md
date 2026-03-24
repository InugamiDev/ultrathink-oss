---
name: design-systems
description: Component library architecture, design tokens, Storybook, theming, documentation, and scalable design system patterns
layer: domain
category: frontend
triggers:
  - "design system"
  - "component library"
  - "design token"
  - "storybook"
  - "theme"
  - "token system"
  - "UI library"
  - "component architecture"
  - "variant"
  - "primitive component"
inputs:
  - "Design system architecture requirements"
  - "Token system design needs"
  - "Component API design questions"
  - "Storybook configuration needs"
outputs:
  - "Design token definitions and structures"
  - "Component library architecture patterns"
  - "Storybook story implementations"
  - "Theming and variant systems"
linksTo:
  - tailwindcss
  - css-architecture
  - react
  - typescript-frontend
linkedFrom:
  - architect
  - code-writer
  - ui-designer
preferredNextSkills:
  - tailwindcss
  - typescript-frontend
  - react
fallbackSkills:
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Design Systems & Component Libraries

## Purpose

Provide expert guidance on building scalable design systems: token architecture, component API design, variant systems, theming, Storybook documentation, and the organizational patterns that make component libraries maintainable across teams and products.

## Key Patterns

### Token Architecture

Tokens are the atomic design decisions that feed every component. Structure them in three tiers:

**Tier 1 — Primitive Tokens (raw values):**

```ts
// tokens/primitives.ts
export const primitives = {
  colors: {
    blue: {
      50: 'oklch(0.97 0.01 250)',
      100: 'oklch(0.93 0.03 250)',
      200: 'oklch(0.87 0.06 250)',
      300: 'oklch(0.77 0.10 250)',
      400: 'oklch(0.67 0.14 250)',
      500: 'oklch(0.55 0.18 250)',
      600: 'oklch(0.48 0.18 250)',
      700: 'oklch(0.40 0.16 250)',
      800: 'oklch(0.32 0.13 250)',
      900: 'oklch(0.25 0.10 250)',
      950: 'oklch(0.18 0.08 250)',
    },
    gray: {
      50: 'oklch(0.98 0.005 250)',
      100: 'oklch(0.95 0.008 250)',
      200: 'oklch(0.90 0.010 250)',
      300: 'oklch(0.83 0.012 250)',
      400: 'oklch(0.70 0.012 250)',
      500: 'oklch(0.55 0.012 250)',
      600: 'oklch(0.45 0.012 250)',
      700: 'oklch(0.37 0.012 250)',
      800: 'oklch(0.27 0.012 250)',
      900: 'oklch(0.20 0.012 250)',
      950: 'oklch(0.13 0.010 250)',
    },
  },
  spacing: {
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  radii: {
    none: '0',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.625rem',
    '3xl': '2rem',
    '4xl': '2.625rem',
    '5xl': '4.25rem',
  },
  shadows: {
    sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
    md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)',
  },
} as const;
```

**Tier 2 — Semantic Tokens (purpose-driven aliases):**

```ts
// tokens/semantic.ts
import { primitives } from './primitives';

export const lightTheme = {
  // Surfaces
  surface: {
    default: primitives.colors.gray[50],
    elevated: '#ffffff',
    overlay: 'oklch(0 0 0 / 0.5)',
    sunken: primitives.colors.gray[100],
  },

  // Text
  text: {
    primary: primitives.colors.gray[900],
    secondary: primitives.colors.gray[600],
    tertiary: primitives.colors.gray[400],
    inverse: '#ffffff',
    link: primitives.colors.blue[600],
    error: 'oklch(0.55 0.20 25)',
    success: 'oklch(0.55 0.17 145)',
  },

  // Borders
  border: {
    default: primitives.colors.gray[200],
    strong: primitives.colors.gray[300],
    focus: primitives.colors.blue[500],
    error: 'oklch(0.65 0.20 25)',
  },

  // Interactive
  interactive: {
    primary: primitives.colors.blue[600],
    primaryHover: primitives.colors.blue[700],
    primaryActive: primitives.colors.blue[800],
    secondary: 'transparent',
    secondaryHover: primitives.colors.gray[100],
  },
} as const;

export const darkTheme = {
  surface: {
    default: primitives.colors.gray[950],
    elevated: primitives.colors.gray[900],
    overlay: 'oklch(0 0 0 / 0.7)',
    sunken: 'oklch(0.10 0.01 250)',
  },
  text: {
    primary: primitives.colors.gray[50],
    secondary: primitives.colors.gray[400],
    tertiary: primitives.colors.gray[500],
    inverse: primitives.colors.gray[900],
    link: primitives.colors.blue[400],
    error: 'oklch(0.70 0.18 25)',
    success: 'oklch(0.70 0.15 145)',
  },
  // ... rest
} as const;
```

**Tier 3 — Component Tokens (component-specific):**

```ts
// tokens/components/button.ts
export const buttonTokens = {
  minHeight: {
    sm: '2rem',
    md: '2.625rem',
    lg: '3rem',
  },
  padding: {
    sm: `${primitives.spacing[2]} ${primitives.spacing[4]}`,
    md: `${primitives.spacing[4]} ${primitives.spacing[6]}`,
    lg: `${primitives.spacing[4]} ${primitives.spacing[8]}`,
  },
  fontSize: {
    sm: primitives.fontSizes.sm,
    md: primitives.fontSizes.base,
    lg: primitives.fontSizes.lg,
  },
  borderRadius: primitives.radii.lg,
} as const;
```

### Component API Design

**Principles:**
1. **Composition over configuration** — Prefer smaller composable pieces over massive prop APIs.
2. **Sensible defaults** — Every prop should have a reasonable default.
3. **HTML forwarding** — Components should accept and forward native HTML attributes.
4. **Accessible by default** — ARIA roles, labels, and keyboard navigation built in.

**Component Anatomy Pattern:**

```tsx
// components/ui/card/index.ts — Barrel export
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

// components/ui/card/card.tsx
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-surface-elevated shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-text-primary', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

**Usage (Composable API):**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Settings</CardTitle>
    <CardDescription>Manage your project configuration.</CardDescription>
  </CardHeader>
  <CardContent>
    <form>...</form>
  </CardContent>
  <CardFooter className="justify-end gap-3">
    <Button variant="secondary">Cancel</Button>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

### Variant System

Use CVA (Class Variance Authority) for structured, type-safe variants:

```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-all duration-200',
  {
    variants: {
      intent: {
        default: 'bg-gray-100 text-gray-700 border border-gray-200',
        primary: 'bg-blue-100 text-blue-700 border border-blue-200',
        success: 'bg-green-100 text-green-700 border border-green-200',
        warning: 'bg-amber-100 text-amber-700 border border-amber-200',
        danger: 'bg-red-100 text-red-700 border border-red-200',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80',
        false: '',
      },
    },
    defaultVariants: {
      intent: 'default',
      interactive: false,
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, intent, interactive, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ intent, interactive }), className)} {...props} />;
}
```

### Storybook Stories

```tsx
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

### Theme Provider

```tsx
// providers/theme-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function resolve() {
      const resolved = theme === 'system'
        ? (mq.matches ? 'dark' : 'light')
        : theme;
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }

    resolve();
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

### Component Library File Structure

```
packages/ui/
  src/
    tokens/
      primitives.ts       # Raw values
      semantic.ts          # Theme-aware aliases
      components/          # Component-specific tokens
    components/
      ui/
        button/
          button.tsx       # Component implementation
          button.stories.tsx
          button.test.tsx
          index.ts         # Public exports
        card/
        input/
        badge/
        dialog/
        dropdown/
        tooltip/
    hooks/
      use-theme.ts
      use-media-query.ts
    lib/
      utils.ts            # cn(), cva helpers
    index.ts              # Package entry point
  package.json
  tsconfig.json
```

## Best Practices

1. **Three-tier tokens** — Primitives, semantic, component-specific. Never reference primitives directly in components.
2. **Composition API** — Build `Card + CardHeader + CardContent` not `Card` with 20 props.
3. **HTML forwarding** — Every component extends its base HTML element props and forwards `className` and `...rest`.
4. **CVA for variants** — Type-safe, composable, and easily extendable variant definitions.
5. **Storybook for every component** — Document all variants, states, and edge cases.
6. **Accessible defaults** — ARIA attributes, keyboard navigation, focus management baked in.
7. **`cn()` for class merging** — Consumer can always override styles via `className` prop.
8. **Semantic color naming** — `text-primary`, `surface-elevated`, not `gray-900`, `white`.
9. **Test visual regression** — Use Chromatic or Percy for screenshot-based testing.
10. **Version and changelog** — Changesets for semantic versioning, auto-generated changelogs.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Primitive tokens in components | Theme changes require touching every component | Use semantic tokens that map to primitives |
| Monolithic components | `<Card showHeader showFooter variant={...}` grows unbounded | Composable sub-components |
| Missing dark mode tokens | Components break in dark theme | Define both light and dark semantic tokens |
| Inconsistent prop naming | `onPress` vs `onClick` vs `onTap` | Standardize: follow HTML convention (`onClick`) |
| No `className` forwarding | Consumers cannot customize styles | Always merge consumer `className` with `cn()` |
| Hardcoded spacing | Inconsistent whitespace across components | Use token-based spacing scale |
| Missing loading states | Components have no loading UI | Design skeleton/placeholder states for every component |
| No keyboard support | Inaccessible for keyboard users | Implement `onKeyDown` handlers for Enter, Space, Escape, Arrow keys |
