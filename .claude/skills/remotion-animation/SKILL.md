---
name: remotion-animation
description: Remotion animation patterns — spring physics, interpolate, Easing curves, timing, stagger, enter/exit, and complex motion sequences
layer: domain
category: frontend
triggers:
  - "remotion animation"
  - "remotion spring"
  - "remotion interpolate"
  - "remotion easing"
  - "remotion timing"
  - "interpolateColors"
  - "remotion motion"
  - "video animation"
  - "frame animation"
  - "remotion stagger"
  - "remotion entrance"
  - "remotion text animation"
  - "spring physics video"
  - "remotion noise"
inputs:
  - "Animation timing and motion requirements"
  - "Spring physics configuration"
  - "Complex interpolation chains"
  - "Text and element entrance animations"
outputs:
  - "Spring-based animation implementations"
  - "Interpolation chain patterns"
  - "Staggered entrance animations"
  - "Complex motion sequence compositions"
linksTo:
  - remotion-video
  - animation
  - motion-design
  - remotion
linkedFrom:
  - remotion
  - remotion-video
  - remotion-content
preferredNextSkills:
  - remotion-video
  - remotion-content
fallbackSkills:
  - animation
  - motion-design
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Remotion Animation Patterns

## Purpose

Master animation in Remotion using `interpolate`, `spring`, `Easing`, and `interpolateColors`. Covers timing patterns, staggered entrances, text animations, complex motion sequences, and performance-optimized animation techniques for programmatic video.

---

## Core: interpolate

Map frame numbers to any value range:

```tsx
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

export const BasicAnimation: React.FC = () => {
  const frame = useCurrentFrame();

  // Opacity: fade in over 1 second (30 frames)
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Position: slide up 40px
  const translateY = interpolate(frame, [0, 30], [40, 0], {
    extrapolateRight: "clamp",
  });

  // Scale: grow from 80% to 100%
  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Rotation: spin 360 degrees over 2 seconds
  const rotation = interpolate(frame, [0, 60], [0, 360]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        Hello
      </div>
    </AbsoluteFill>
  );
};
```

### Multi-Segment Interpolation

```tsx
// Multi-step animation: appear, hold, disappear
const opacity = interpolate(
  frame,
  [0, 20, 80, 100],   // 4 keyframes
  [0, 1, 1, 0],        // Fade in, hold, fade out
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

// Bounce-like: scale up, overshoot, settle
const scale = interpolate(
  frame,
  [0, 15, 25, 35],
  [0, 1.2, 0.95, 1],
  { extrapolateRight: "clamp" }
);
```

### interpolateColors

```tsx
import { interpolateColors, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// Smooth color transition
const color = interpolateColors(
  frame,
  [0, 30, 60],
  ["#3b82f6", "#8b5cf6", "#ec4899"]
);

// Use in styles
<div style={{ backgroundColor: color }}>Gradient over time</div>
```

---

## Core: spring

Physics-based animation with natural feel:

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Basic spring (0 → 1)
const progress = spring({ frame, fps });

// Custom spring config
const bouncy = spring({
  frame,
  fps,
  config: {
    damping: 8,       // Lower = more bouncy (default: 10)
    stiffness: 200,   // Higher = faster (default: 100)
    mass: 0.5,        // Lower = lighter, faster (default: 1)
  },
});

// Spring with custom range
const scale = spring({
  frame,
  fps,
  from: 0.5,    // Start value
  to: 1,        // End value
  config: { damping: 12, stiffness: 200 },
});

// Delayed spring (starts at frame 30)
const delayed = spring({
  frame: frame - 30,  // Negative frames return 0
  fps,
  config: { damping: 15 },
});
```

### Spring Configurations

| Feel | damping | stiffness | mass | Use Case |
|------|---------|-----------|------|----------|
| Snappy | 20 | 300 | 0.5 | UI elements, quick pops |
| Bouncy | 8 | 200 | 1 | Playful, attention-grabbing |
| Smooth | 15 | 100 | 1 | Gentle entrances |
| Stiff | 30 | 400 | 0.5 | Sharp, decisive motion |
| Heavy | 12 | 80 | 2 | Weighty, impactful |
| Elastic | 5 | 150 | 0.8 | Rubber-band, fun |

### Combining spring + interpolate

Map spring progress to custom ranges:

```tsx
const springProgress = spring({
  frame,
  fps,
  config: { damping: 12, stiffness: 200 },
});

// Map spring 0→1 to rotation 0→360
const rotation = interpolate(springProgress, [0, 1], [0, 360]);

// Map spring 0→1 to position
const translateX = interpolate(springProgress, [0, 1], [-200, 0]);

// Map spring 0→1 to scale with overshoot range
const scale = interpolate(springProgress, [0, 0.5, 1], [0, 1.15, 1]);
```

---

## Easing Functions

Custom easing curves for non-spring interpolations:

```tsx
import { Easing, interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// Built-in easings
const easeIn = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.in(Easing.ease),
  extrapolateRight: "clamp",
});

const easeOut = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.out(Easing.ease),
  extrapolateRight: "clamp",
});

const easeInOut = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.inOut(Easing.ease),
  extrapolateRight: "clamp",
});

// Cubic bezier (like CSS)
const custom = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.4, 0, 0.2, 1),  // Material Design standard
  extrapolateRight: "clamp",
});

// Elastic
const elastic = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.elastic(2),
  extrapolateRight: "clamp",
});

// Bounce
const bounce = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.bounce,
  extrapolateRight: "clamp",
});
```

### Easing Reference

| Easing | Effect | Use Case |
|--------|--------|----------|
| `Easing.linear` | Constant speed | Progress bars only |
| `Easing.ease` | Smooth acceleration/deceleration | General purpose |
| `Easing.in(Easing.ease)` | Slow start, fast end | Elements leaving |
| `Easing.out(Easing.ease)` | Fast start, slow end | Elements entering |
| `Easing.inOut(Easing.ease)` | Smooth both ends | Elements moving |
| `Easing.bezier(...)` | Custom curve | Precise control |
| `Easing.elastic(n)` | Spring-like overshoot | Playful entrances |
| `Easing.bounce` | Bouncing ball | Fun, attention-grabbing |
| `Easing.circle` | Circular curve | Subtle acceleration |
| `Easing.exp` | Exponential | Dramatic speed changes |

---

## Staggered Animations

### Stagger Array Items

```tsx
const items = ["Design", "Develop", "Deploy"];
const STAGGER_DELAY = 8; // Frames between each item

export const StaggeredList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 80 }}>
      {items.map((item, index) => {
        const delay = index * STAGGER_DELAY;

        const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateX = spring({
          frame: frame - delay,
          fps,
          config: { damping: 15, stiffness: 200 },
        });

        return (
          <div
            key={item}
            style={{
              fontSize: 64,
              fontWeight: 700,
              opacity,
              transform: `translateX(${interpolate(translateX, [0, 1], [-60, 0])}px)`,
              marginBottom: 20,
            }}
          >
            {item}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
```

### Stagger with Exit

```tsx
const ENTER_DELAY = 8;
const EXIT_START = 80; // Frame when exit begins
const EXIT_DELAY = 5;

items.map((item, index) => {
  // Enter
  const enterOffset = index * ENTER_DELAY;
  const enterOpacity = interpolate(frame - enterOffset, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit (reverse stagger — last item exits first)
  const exitOffset = (items.length - 1 - index) * EXIT_DELAY;
  const exitFrame = EXIT_START + exitOffset;
  const exitOpacity = interpolate(frame, [exitFrame, exitFrame + 15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enterOpacity, exitOpacity);
  // ...
});
```

---

## Text Animations

### Character-by-Character Reveal

```tsx
export const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor(
    interpolate(frame, [0, text.length * 2], [0, text.length], {
      extrapolateRight: "clamp",
    })
  );

  return (
    <div style={{ fontSize: 48, fontFamily: "monospace" }}>
      {text.slice(0, charsToShow)}
      {charsToShow < text.length && (
        <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
      )}
    </div>
  );
};
```

### Word-by-Word Spring Entrance

```tsx
export const WordSpring: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 64, fontWeight: 700 }}>
      {words.map((word, i) => {
        const delay = i * 5;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 200 },
        });

        return (
          <span
            key={i}
            style={{
              opacity: interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

### Counter Animation

```tsx
export const Counter: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();

  const value = interpolate(frame, [0, 60], [from, to], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div style={{ fontSize: 120, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
      {Math.round(value).toLocaleString()}
    </div>
  );
};
```

---

## Complex Motion Sequences

### Chained Animations (Sequential)

```tsx
export const ChainedMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Logo enters (frames 0-30)
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  // Phase 2: Title slides in (frames 20-50)
  const titleProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15, stiffness: 150 },
  });
  const titleX = interpolate(titleProgress, [0, 1], [-100, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Phase 3: Subtitle fades in (frames 40-60)
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 4: CTA bounces in (frames 55-85)
  const ctaScale = spring({
    frame: frame - 55,
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 20 }}>
      <div style={{ transform: `scale(${logoScale})` }}>Logo</div>
      <h1 style={{ transform: `translateX(${titleX}px)`, opacity: titleOpacity }}>
        Title
      </h1>
      <p style={{ opacity: subtitleOpacity }}>Subtitle text here</p>
      <button style={{ transform: `scale(${ctaScale})` }}>Call to Action</button>
    </AbsoluteFill>
  );
};
```

### Looping Animation

```tsx
// Continuous rotation (loops every 2 seconds)
const rotation = interpolate(frame % 60, [0, 60], [0, 360]);

// Pulsing scale
const pulse = interpolate(
  Math.sin((frame / 30) * Math.PI),
  [-1, 1],
  [0.95, 1.05]
);

// Floating (smooth up/down)
const float = Math.sin((frame / fps) * Math.PI * 0.5) * 10;
```

### Path Animation

```tsx
// Move along a circular path
const angle = interpolate(frame, [0, 120], [0, Math.PI * 2]);
const radius = 150;
const x = Math.cos(angle) * radius;
const y = Math.sin(angle) * radius;

<div style={{ transform: `translate(${x}px, ${y}px)` }}>
  Moving in a circle
</div>

// Move along a bezier-like path
const t = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
const bezierX = interpolate(t, [0, 0.5, 1], [0, 200, 400]);
const bezierY = interpolate(t, [0, 0.5, 1], [0, -100, 0]); // Arc
```

---

## Noise & Organic Motion

```tsx
import { random } from "remotion";

// Deterministic random (same for every render)
const wobbleX = random(`wobble-x-${frame}`) * 4 - 2; // -2 to 2
const wobbleY = random(`wobble-y-${frame}`) * 4 - 2;

// Smooth noise via sin combination
const smoothNoise = (
  Math.sin(frame * 0.1) * 3 +
  Math.sin(frame * 0.23) * 2 +
  Math.sin(frame * 0.37) * 1
);

// Handheld camera shake
const shakeX = Math.sin(frame * 0.5) * 2 + Math.cos(frame * 0.7) * 1.5;
const shakeY = Math.cos(frame * 0.4) * 2 + Math.sin(frame * 0.9) * 1;
const shakeRotation = Math.sin(frame * 0.3) * 0.5;
```

---

## Best Practices

1. **Always clamp extrapolation** — Use `extrapolateRight: "clamp"` to prevent values overshooting beyond the target range.
2. **Spring for organic, interpolate for precise** — Springs feel natural; interpolate gives exact timing control.
3. **Stagger at 5-10 frame intervals** — Too fast looks simultaneous, too slow loses cohesion.
4. **Chain with frame offsets** — Start phase 2 before phase 1 ends for overlapping, fluid sequences.
5. **Use `random(seed)` not `Math.random()`** — Deterministic rendering requires deterministic randomness.
6. **Test at 1x speed** — Don't judge animation timing in slow-motion preview.
7. **Reuse spring configs** — Define configs as constants for consistent animation language across the video.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `extrapolateRight: "clamp"` | Values go beyond intended range (opacity > 1, negative positions) |
| `Math.random()` in render | Different frame = different random value = flickering. Use `random(seed)` |
| Spring with negative frame | Returns `from` value — this is correct behavior, not a bug |
| Over-complicated interpolation | Break complex animations into multiple simple interpolations |
| No easing on interpolate | Linear motion looks robotic — add `easing: Easing.out(Easing.ease)` |
| Stagger delay too small | Items animate simultaneously — use at least 5 frames between items |
