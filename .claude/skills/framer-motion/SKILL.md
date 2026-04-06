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
