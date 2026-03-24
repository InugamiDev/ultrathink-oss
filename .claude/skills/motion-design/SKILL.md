---
name: motion-design
description: Motion design for web — Framer Motion patterns, Remotion video composition, 12 Disney animation principles applied to UI, easing curves, and accessible motion
layer: domain
category: frontend
triggers:
  - "motion design"
  - "framer motion"
  - "remotion"
  - "video composition"
  - "programmatic video"
  - "AnimatePresence"
  - "layout animation"
  - "spring animation"
  - "scroll animation"
  - "page transition"
  - "gesture animation"
  - "disney principles"
  - "easing curve"
  - "reduced motion"
inputs:
  - "Animation or motion design requirements"
  - "Video composition specifications"
  - "Transition or interaction patterns"
  - "Accessibility motion concerns"
outputs:
  - "Framer Motion component implementations"
  - "Remotion composition code"
  - "Motion-safe animation patterns with reduced-motion fallbacks"
  - "Easing function recommendations"
linksTo:
  - react
  - animation
  - css-architecture
  - remotion
  - remotion-video
  - remotion-animation
linkedFrom:
  - ui-ux-pro
  - figma
  - design-principles
  - remotion
  - remotion-animation
preferredNextSkills:
  - react
  - animation
fallbackSkills:
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Motion Design

## Purpose

Expert guidance on motion design for web applications: Framer Motion for UI animation, Remotion for programmatic video, the 12 Disney animation principles mapped to digital interfaces, easing curve selection, and accessible motion that respects `prefers-reduced-motion`.

---

## Framer Motion

### Core API Patterns

#### Basic Animation

```tsx
import { motion } from "framer-motion";

// Animate on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>

// Hover + tap
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
/>
```

#### Variants (Declarative Animation States)

```tsx
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  transition={{ duration: 0.3 }}
/>
```

#### Stagger Children

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
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants} />
  ))}
</motion.ul>
```

#### AnimatePresence (Enter/Exit Animations)

```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="content"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    />
  )}
</AnimatePresence>
```

`mode` options:
- `"sync"` (default) — Enter and exit animate simultaneously
- `"wait"` — Exit completes before enter starts
- `"popLayout"` — Exiting elements removed from layout flow immediately

#### Layout Animations

```tsx
// Automatic layout animation when position/size changes
<motion.div layout />

// Shared layout animation between components
<motion.div layoutId="shared-element" />

// Layout with transition control
<motion.div
  layout
  transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
/>
```

#### Scroll Animations

```tsx
import { motion, useScroll, useTransform } from "framer-motion";

function ParallaxHero() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.div style={{ y, opacity }}>
      Hero content
    </motion.div>
  );
}
```

Scroll-linked with element ref:

```tsx
function ScrollReveal({ children }: { children: ReactNode }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.3], [40, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}
```

#### Gesture Handlers

```tsx
<motion.div
  drag                           // Enable drag on both axes
  drag="x"                       // Constrain to x-axis
  dragConstraints={{ left: -100, right: 100 }}
  dragElastic={0.2}              // Rubber-band past constraints (0-1)
  dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
  onDragEnd={(event, info) => {
    if (info.offset.x > 100) handleSwipeRight();
    if (info.offset.x < -100) handleSwipeLeft();
  }}
  whileDrag={{ scale: 1.05, cursor: "grabbing" }}
/>
```

#### Shared Layout (Cross-Component)

```tsx
import { LayoutGroup, motion } from "framer-motion";

// Wrap related components
<LayoutGroup>
  {tabs.map((tab) => (
    <button key={tab.id} onClick={() => setActive(tab.id)}>
      {tab.label}
      {active === tab.id && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
        />
      )}
    </button>
  ))}
</LayoutGroup>
```

### Framer Motion Performance Tips

```
1. Use `transform` and `opacity` only — these are GPU-accelerated
2. Avoid animating `width`, `height`, `padding`, `margin` directly
3. Use `layout` prop for size/position changes instead
4. Set `layoutScroll` on scrollable containers to fix layout calc
5. Use `will-change: transform` sparingly (Framer adds it automatically)
6. Prefer `spring` over `tween` — springs feel more natural and don't need duration
7. Memoize variants objects outside components to prevent re-renders
8. Use `useReducedMotion()` hook to conditionally disable animations
```

---

## Remotion

### Core Concepts

Remotion renders React components as video frames. Each frame is a render at a specific `frame` number.

#### Composition Setup

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot = () => (
  <Composition
    id="MyVideo"
    component={MyVideo}
    durationInFrames={300}     // 10 seconds at 30fps
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ title: "Hello" }}
  />
);
```

#### Using Frame and Time

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const MyVideo = ({ title }: { title: string }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 30],           // Input range (frames 0-30)
    [0, 1],            // Output range (opacity 0-1)
    { extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame,
    [0, 30],
    [40, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
      <h1>{title}</h1>
    </div>
  );
};
```

#### Sequences (Timeline Segments)

```tsx
import { Sequence } from "remotion";

export const Timeline = () => (
  <>
    <Sequence from={0} durationInFrames={90}>
      <IntroScene />
    </Sequence>
    <Sequence from={90} durationInFrames={120}>
      <MainContent />
    </Sequence>
    <Sequence from={210} durationInFrames={90}>
      <OutroScene />
    </Sequence>
  </>
);
```

#### Audio

```tsx
import { Audio, staticFile, interpolate, useCurrentFrame } from "remotion";

export const WithAudio = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      <Audio src={staticFile("bgm.mp3")} volume={volume} />
      <VideoContent />
    </>
  );
};
```

#### Spring Animations in Remotion

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SpringAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  return <div style={{ transform: `scale(${scale})` }}>Bouncy!</div>;
};
```

### Rendering Pipeline

```bash
# Preview in browser
npx remotion studio

# Render to MP4
npx remotion render MyVideo out/video.mp4

# Render specific frames
npx remotion render MyVideo out/video.mp4 --frames=0-90

# Render as GIF
npx remotion render MyVideo out/video.gif --codec=gif

# Render at custom resolution
npx remotion render MyVideo out/video.mp4 --width=1080 --height=1080

# Server-side rendering (Lambda)
npx remotion lambda render MyVideo
```

### Remotion Best Practices

```
1. Keep compositions pure — no side effects, no async in render
2. Use `staticFile()` for assets in the `public/` folder
3. Use `<Img>` component instead of `<img>` for preloading
4. Prefetch large assets with `prefetch()` or `delayRender()` / `continueRender()`
5. Use `interpolate()` with `extrapolateRight: "clamp"` to prevent value overflow
6. Keep fps consistent (30 for social media, 60 for presentations)
7. Use `<Series>` for sequential, non-overlapping scenes (simpler than manual offsets)
```

---

## 12 Disney Animation Principles (Web-Mapped)

The 12 principles of animation, mapped to practical web interactions:

### 1. Squash and Stretch

Conveys weight and flexibility. In web: scale transforms on interaction.

```tsx
whileTap={{ scaleX: 1.05, scaleY: 0.95 }}   // Button press
whileHover={{ scaleY: 1.02 }}                 // Card lift
```

### 2. Anticipation

Prepare the user for an action. In web: brief reverse movement before primary motion.

```tsx
// Slight dip before jump
animate={{ y: [0, 4, -20, 0] }}
transition={{ duration: 0.5, times: [0, 0.15, 0.6, 1] }}
```

### 3. Staging

Direct attention to the important element. In web: dim surroundings, spotlight focal point.

```tsx
// Overlay dims background, modal is staged
<motion.div className="bg-black/50" animate={{ opacity: 1 }} />
<motion.div animate={{ scale: 1 }} initial={{ scale: 0.95 }} />
```

### 4. Straight Ahead vs. Pose to Pose

In web: keyframe animations (pose-to-pose) vs. physics-based springs (straight ahead).

```tsx
// Pose to pose (keyframes)
animate={{ x: [0, 100, 200] }}
transition={{ duration: 0.6, times: [0, 0.4, 1] }}

// Straight ahead (spring physics)
transition={{ type: "spring", stiffness: 300, damping: 20 }}
```

### 5. Follow-Through and Overlapping Action

Elements don't stop at the same time. In web: stagger children, spring overshoot.

```tsx
// Spring with overshoot (follow-through)
transition={{ type: "spring", stiffness: 200, damping: 15 }}  // Low damping = overshoot

// Overlapping with stagger
staggerChildren: 0.05  // Children offset in time
```

### 6. Slow In, Slow Out (Easing)

Natural motion accelerates and decelerates. In web: ease-in-out, never linear for UI.

```tsx
transition={{ ease: "easeInOut" }}    // Standard
transition={{ ease: [0.4, 0, 0.2, 1] }}  // Material Design standard
```

### 7. Arcs

Natural motion follows curved paths. In web: use CSS offset-path or animate both x and y.

```tsx
animate={{ x: 100, y: [0, -30, 0] }}  // Parabolic arc
```

### 8. Secondary Action

Supporting animations that enhance the primary. In web: icon spin inside button, shimmer on card hover.

```tsx
// Primary: card lifts. Secondary: shadow deepens
whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.15)" }}
```

### 9. Timing

Duration defines the feel. Fast = snappy/urgent. Slow = graceful/calm.

```
Micro-interactions:  100-200ms  (button clicks, toggles)
Transitions:         200-400ms  (page transitions, modals)
Emphasis:            400-800ms  (hero animations, onboarding)
Never exceed 1s for UI animations
```

### 10. Exaggeration

Amplify motion for clarity. In web: slightly larger scale changes than physically realistic.

```tsx
// Slightly exaggerated hover lift (more than real physics)
whileHover={{ y: -6, scale: 1.02 }}   // Not y: -1 (too subtle)
```

### 11. Solid Drawing (Consistency)

Maintain consistent visual weight and style. In web: consistent animation language.

```
All cards animate the same way
All modals enter/exit the same way
All buttons have the same press feel
Define variants once, reuse everywhere
```

### 12. Appeal

Animation should be pleasing, not annoying. In web: purposeful, restrained, delightful.

```
Don't animate everything — animate the moments that matter
Subtlety > spectacle for professional interfaces
Reserve bold animation for celebrations (confetti, success states)
```

---

## Easing Reference

### Named Easings

| Name | Curve | Use Case |
|------|-------|----------|
| `linear` | `cubic-bezier(0, 0, 1, 1)` | Progress bars, continuous rotation only |
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | General purpose (CSS default) |
| `ease-in` | `cubic-bezier(0.42, 0, 1, 1)` | Elements leaving the screen |
| `ease-out` | `cubic-bezier(0, 0, 0.58, 1)` | Elements entering the screen |
| `ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)` | Elements moving within the screen |

### Material Design Easings

| Name | Curve | Use Case |
|------|-------|----------|
| Standard | `cubic-bezier(0.4, 0, 0.2, 1)` | General movement |
| Deceleration | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements |
| Acceleration | `cubic-bezier(0.4, 0, 1, 1)` | Leaving elements |
| Sharp | `cubic-bezier(0.4, 0, 0.6, 1)` | Elements that may return |

### Spring Configurations

| Feel | Stiffness | Damping | Mass | Use Case |
|------|-----------|---------|------|----------|
| Snappy | 400 | 25 | 0.5 | Button press, toggle |
| Bouncy | 200 | 15 | 1 | Playful interactions |
| Smooth | 100 | 20 | 1 | Page transitions |
| Gentle | 50 | 10 | 1 | Slow reveals |
| Stiff | 600 | 30 | 0.5 | Quick snaps |

### Choosing Easing

```
Entering screen → ease-out (decelerate into view)
Leaving screen  → ease-in (accelerate out of view)
Moving on screen → ease-in-out (smooth transition)
Interactive feedback → spring (natural, responsive feel)
Progress/loading → linear (constant rate)
```

---

## Accessibility: prefers-reduced-motion

### The Requirement

Users who experience motion sickness, vestibular disorders, or simply prefer less animation set `prefers-reduced-motion: reduce` in their OS settings. All motion must respect this preference.

### CSS Approach

```css
/* Default: full animation */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

/* Reduced motion: instant or opacity-only */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
  .card:hover {
    transform: none;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);  /* Subtle, no motion */
  }
}
```

### Tailwind Approach

```html
<div class="transition-all duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
  Content
</div>
```

### Framer Motion Approach

```tsx
import { useReducedMotion } from "framer-motion";

function AnimatedCard({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### Vestibular-Safe Alternatives

When reducing motion, don't just remove it — provide alternatives:

| Full Motion | Reduced Alternative |
|------------|-------------------|
| Slide in from side | Fade in (opacity only) |
| Scale up/bounce | Fade in (opacity only) |
| Parallax scrolling | Static positioning |
| Auto-playing animation | User-triggered only |
| Page transition slide | Instant cut or crossfade |
| Continuous rotation | Static icon |

### What's Always Safe

These effects don't trigger vestibular issues and can remain:
- Color changes (hover state color shifts)
- Opacity transitions (fades)
- Border/outline changes
- Box-shadow changes (without position shift)
- Very short, very small transforms (< 5px, < 100ms)

---

## Pitfalls

1. **Animating layout properties** — Never directly animate `width`, `height`, `padding`, `margin`. Use `transform: scale()` or Framer Motion's `layout` prop.
2. **Linear easing for UI** — Linear motion looks robotic. Always use easing or springs for UI interactions.
3. **Missing exit animations** — Abrupt disappearance is jarring. Use `AnimatePresence` for all conditional renders.
4. **Over-animating** — If everything moves, nothing stands out. Animate the moments that matter.
5. **Ignoring prefers-reduced-motion** — This is not optional. It's an accessibility requirement.
6. **Too-long durations** — UI animations > 500ms feel sluggish. Keep under 400ms for most interactions.
7. **Remotion in production apps** — Remotion is for video rendering, not runtime UI. Don't import it into your web app bundle.
8. **Spring without damping** — Underdamped springs oscillate forever. Always set a reasonable damping value (15-30 for most cases).
