---
name: animation
description: Frontend animation patterns — Framer Motion, CSS animations, GSAP, scroll-driven animations, and motion design principles
layer: domain
category: frontend
triggers:
  - "animation"
  - "framer motion"
  - "GSAP"
  - "css animation"
  - "transition"
  - "scroll animation"
  - "motion"
  - "keyframes"
  - "spring animation"
  - "page transition"
  - "micro-interaction"
inputs:
  - "Animation requirements or motion design specs"
  - "Performance concerns with animations"
  - "Scroll-driven animation needs"
  - "Page transition or layout animation questions"
outputs:
  - "Framer Motion component implementations"
  - "CSS animation and keyframe definitions"
  - "GSAP timeline configurations"
  - "Scroll-driven animation patterns"
  - "Accessible motion patterns with reduced-motion support"
linksTo:
  - react
  - css-architecture
  - threejs
  - tailwindcss
linkedFrom:
  - code-writer
  - ui-designer
preferredNextSkills:
  - react
  - css-architecture
  - threejs
fallbackSkills:
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
