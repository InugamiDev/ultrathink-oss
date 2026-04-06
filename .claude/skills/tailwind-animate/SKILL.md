---
name: tailwind-animate
description: Tailwind CSS animation utilities, tailwindcss-animate plugin, enter/exit/loop animations, and motion-safe patterns
layer: domain
category: animation
triggers:
  - "tailwind animate"
  - "tailwindcss-animate"
  - "animate-in"
  - "animate-out"
  - "tailwind animation"
inputs:
  - "Animation requirements for UI components"
  - "Enter/exit transition specifications"
  - "Looping animation needs"
outputs:
  - "Tailwind animation utility classes"
  - "Custom keyframe definitions"
  - "tailwindcss-animate plugin configuration"
linksTo:
  - tailwindcss
  - framer-motion
  - animation
  - shadcn-ui
linkedFrom: []
preferredNextSkills:
  - animation
  - framer-motion
  - tailwindcss
fallbackSkills:
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
