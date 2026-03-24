---
name: remotion-video
description: Remotion video production — scenes, transitions, OffthreadVideo, audio mixing, multi-scene timelines, and rendering output
layer: domain
category: frontend
triggers:
  - "remotion video"
  - "remotion scene"
  - "remotion transition"
  - "TransitionSeries"
  - "OffthreadVideo"
  - "remotion audio"
  - "remotion sequence"
  - "remotion series"
  - "video scene"
  - "video timeline"
  - "video transition effect"
  - "remotion overlay"
  - "remotion codec"
  - "render video"
  - "mp4 from react"
  - "webm render"
inputs:
  - "Multi-scene video composition requirements"
  - "Transition effects between scenes"
  - "Audio mixing and synchronization needs"
  - "Video rendering and codec configuration"
outputs:
  - "Multi-scene timeline compositions"
  - "Transition effect implementations"
  - "Audio-synchronized video components"
  - "Optimized rendering configurations"
linksTo:
  - remotion-content
  - remotion-animation
  - media-processing
  - remotion
linkedFrom:
  - remotion
  - remotion-content
  - remotion-animation
preferredNextSkills:
  - remotion-animation
  - remotion-content
fallbackSkills:
  - motion-design
  - media-processing
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Remotion Video Production

## Purpose

Expert guidance on building multi-scene video compositions with Remotion. Covers scene organization with `Sequence`/`Series`/`TransitionSeries`, transition effects, `OffthreadVideo` for embedding video files, audio mixing and synchronization, and rendering output configuration.

---

## Scene Organization

### Sequence (Manual Timing)

Position scenes manually with frame offsets:

```tsx
import { Sequence, AbsoluteFill } from "remotion";

export const MyVideo: React.FC = () => (
  <AbsoluteFill>
    {/* Intro: frames 0-89 (3 seconds at 30fps) */}
    <Sequence from={0} durationInFrames={90}>
      <IntroScene />
    </Sequence>

    {/* Main: frames 90-269 (6 seconds) */}
    <Sequence from={90} durationInFrames={180}>
      <MainScene />
    </Sequence>

    {/* Outro: frames 270-359 (3 seconds) */}
    <Sequence from={270} durationInFrames={90}>
      <OutroScene />
    </Sequence>

    {/* Background music spans entire video */}
    <Sequence from={0}>
      <BackgroundMusic />
    </Sequence>
  </AbsoluteFill>
);
```

### Series (Sequential, No Overlap)

Scenes play back-to-back automatically:

```tsx
import { Series, AbsoluteFill } from "remotion";

export const MyVideo: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence durationInFrames={90}>
        <IntroScene />
      </Series.Sequence>

      {/* Optional gap between scenes */}
      <Series.Sequence offset={15} durationInFrames={180}>
        <MainScene />
      </Series.Sequence>

      <Series.Sequence durationInFrames={90}>
        <OutroScene />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

### TransitionSeries (Crossfades & Wipes)

Scenes overlap during transitions:

```tsx
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

export const MyVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <IntroScene />
      </TransitionSeries.Sequence>

      {/* Fade transition (30 frames = 1 second) */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 30 })}
      />

      <TransitionSeries.Sequence durationInFrames={180}>
        <MainScene />
      </TransitionSeries.Sequence>

      {/* Slide transition with spring physics */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: 30,
          durationRestThreshold: 0.001,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={90}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
```

### Transition Types

```tsx
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { none } from "@remotion/transitions/none";

// Fade (crossfade)
fade()

// Slide (from direction)
slide({ direction: "from-left" })   // "from-left" | "from-right" | "from-top" | "from-bottom"

// Wipe (directional reveal)
wipe({ direction: "from-left" })

// Flip (3D card flip)
flip({ direction: "from-left" })

// Clock wipe (circular reveal)
clockWipe({ width: 1920, height: 1080 })

// None (cut, useful for conditional transitions)
none()
```

### Overlay Effects (No Timing Impact)

```tsx
<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={90}>
    <SceneA />
  </TransitionSeries.Sequence>

  {/* Overlay renders on top without shortening timeline */}
  <TransitionSeries.Overlay durationInFrames={20}>
    <LightLeakEffect />
  </TransitionSeries.Overlay>

  <TransitionSeries.Sequence durationInFrames={90}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### Custom Transitions

```tsx
import { TransitionPresentation } from "@remotion/transitions";

const customSlideUp: TransitionPresentation = {
  component: ({ progress, presenting, children }) => (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        transform: presenting
          ? `translateY(${(1 - progress) * 100}%)`
          : `translateY(${progress * -30}%)`,
        opacity: presenting ? 1 : 1 - progress * 0.3,
      }}
    >
      {children}
    </div>
  ),
};

// Usage
<TransitionSeries.Transition
  presentation={customSlideUp}
  timing={springTiming({ config: { damping: 200 }, durationInFrames: 30 })}
/>
```

---

## OffthreadVideo

Use `<OffthreadVideo>` instead of `<Video>` for better rendering performance. It extracts frames as images during render (no video decoding in the browser).

```tsx
import { OffthreadVideo, staticFile, AbsoluteFill } from "remotion";

export const VideoScene: React.FC = () => (
  <AbsoluteFill>
    {/* Background video */}
    <OffthreadVideo
      src={staticFile("background.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />

    {/* Overlay content */}
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 80, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
        Title Over Video
      </h1>
    </AbsoluteFill>
  </AbsoluteFill>
);
```

### OffthreadVideo with Timing

```tsx
import { OffthreadVideo, Sequence } from "remotion";

// Play from 5 seconds into the source video
<OffthreadVideo
  src={staticFile("footage.mp4")}
  startFrom={150}              // Frame 150 = 5 seconds at 30fps
/>

// Mute video audio
<OffthreadVideo
  src={staticFile("footage.mp4")}
  volume={0}
/>

// Fade volume
<OffthreadVideo
  src={staticFile("footage.mp4")}
  volume={(f) => interpolate(f, [0, 30], [0, 1], { extrapolateRight: "clamp" })}
/>
```

---

## Audio

### Basic Audio

```tsx
import { Audio, staticFile, useCurrentFrame, interpolate } from "remotion";

export const WithAudio: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in over 1 second
  const volume = interpolate(frame, [0, 30], [0, 0.8], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      <Audio src={staticFile("bgm.mp3")} volume={volume} />
      <Audio src={staticFile("sfx-whoosh.mp3")} volume={0.5} startFrom={0} />
    </>
  );
};
```

### Audio with Fade Out

```tsx
export const FadeOutAudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const volume = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 0.8, 0.8, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return <Audio src={staticFile("music.mp3")} volume={volume} />;
};
```

### Audio Visualization

```tsx
import { getAudioData, useAudioData, visualizeAudio } from "@remotion/media-utils";

export const AudioVisualization: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile("music.mp3"));

  if (!audioData) return null;

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 256,
  });

  return (
    <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 200 }}>
        {visualization.map((v, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: v * 200,
              backgroundColor: `hsl(${(i / visualization.length) * 360}, 80%, 60%)`,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Rendering Configuration

### Codec Comparison

| Codec | Format | Quality | Speed | Use Case |
|-------|--------|---------|-------|----------|
| `h264` | MP4 | Good | Fast | Universal playback, social media |
| `h265` | MP4 | Better | Slower | Smaller files, modern devices |
| `vp8` | WebM | Good | Medium | Web embedding |
| `vp9` | WebM | Better | Slow | High quality web |
| `prores` | MOV | Lossless | Fast | Post-production, editing |
| `gif` | GIF | Low | Fast | Short loops, previews |

### Render Settings

```bash
# High quality MP4
npx remotion render MyVideo out/video.mp4 \
  --codec=h264 \
  --crf=18 \
  --concurrency=4

# ProRes for editing
npx remotion render MyVideo out/video.mov \
  --codec=prores \
  --prores-profile=4444

# Social media vertical (9:16)
npx remotion render Shorts out/short.mp4 \
  --width=1080 --height=1920

# Thumbnail / still frame
npx remotion still MyVideo out/thumb.png --frame=60
```

---

## Multi-Scene Patterns

### Scene Component Pattern

```tsx
// Reusable scene wrapper
const Scene: React.FC<{
  bg: string;
  children: React.ReactNode;
}> = ({ bg, children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: bg,
      justifyContent: "center",
      alignItems: "center",
      padding: 80,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Compose scenes
export const MyVideo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={90}>
      <Scene bg="#1a1a2e">
        <FadeInTitle text="Welcome" />
      </Scene>
    </TransitionSeries.Sequence>

    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: 20 })}
    />

    <TransitionSeries.Sequence durationInFrames={150}>
      <Scene bg="#16213e">
        <ContentSlide items={data.items} />
      </Scene>
    </TransitionSeries.Sequence>

    <TransitionSeries.Transition
      presentation={slide({ direction: "from-right" })}
      timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
    />

    <TransitionSeries.Sequence durationInFrames={90}>
      <Scene bg="#0f3460">
        <OutroWithCTA />
      </Scene>
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
```

## Best Practices

1. **`<OffthreadVideo>` over `<Video>`** — Always prefer `OffthreadVideo` for rendering; use `<Video>` only when you need `loop`.
2. **Organize scenes as components** — Each scene is a self-contained React component with its own internal animation.
3. **Use `TransitionSeries` for professional feel** — Cuts between scenes feel amateur; crossfades and slides feel polished.
4. **Audio fade in/out** — Never start or stop audio abruptly. Always fade over 0.5-1 second.
5. **CRF 18-23 for H.264** — Lower CRF = higher quality. 18 is visually lossless, 23 is default.
6. **Test with `npx remotion studio`** — Always preview in Studio before rendering. Catches timing issues early.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Audio cuts off abruptly | Add fade-out with `interpolate` near `durationInFrames` |
| Transitions don't work with `Series` | Use `TransitionSeries` from `@remotion/transitions` |
| Video freezes during render | Use `<OffthreadVideo>` instead of `<Video>` |
| Overlapping scenes visible | Check `Sequence` `from` + `durationInFrames` don't overlap unintentionally |
| Huge file size | Lower CRF, use H.265, or reduce resolution |
| Audio out of sync | Match audio file sample rate to composition fps timing |
