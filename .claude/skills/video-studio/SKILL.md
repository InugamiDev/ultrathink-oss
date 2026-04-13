---
name: video-studio
description: "Unified video generation studio — Remotion framework (setup, compositions, Player, rendering), Remotion video production (scenes, transitions, OffthreadVideo, multi-scene), content scripting (data-driven, captions, CSV/JSON), animation (spring physics, interpolate, 12 Disney animation principles), and broader motion design patterns. Single entry point for any 'make a video' task."
layer: domain
category: frontend
triggers: ["AnimatePresence", "OffthreadVideo", "TransitionSeries", "batch render", "calculateMetadata", "continueRender", "create video programmatically", "data-driven video", "delayRender", "disney principles", "dynamic video", "easing curve", "embed remotion", "frame animation", "framer motion", "gesture animation", "interpolateColors", "layout animation", "motion design", "mp4 from react", "page transition", "parameterized video", "programmatic video", "react video", "reduced motion", "remotion", "remotion animation", "remotion audio", "remotion captions", "remotion cloud run", "remotion codec", "remotion content", "remotion data", "remotion dataset", "remotion easing", "remotion entrance", "remotion interpolate", "remotion lambda", "remotion motion", "remotion noise", "remotion overlay", "remotion player", "remotion prefetch", "remotion project", "remotion render", "remotion scene", "remotion sequence", "remotion series", "remotion setup", "remotion spring", "remotion srt", "remotion stagger", "remotion studio", "remotion subtitles", "remotion template", "remotion text animation", "remotion timing", "remotion transition", "remotion video", "remotion whisper", "render video", "scroll animation", "spring animation", "spring physics video", "tiktok captions", "video animation", "video composition", "video from api", "video from code", "video from data", "video rendering react", "video scene", "video template", "video timeline", "video transition effect", "webm render"]
---

# video-studio

Unified video generation studio — Remotion framework (setup, compositions, Player, rendering), Remotion video production (scenes, transitions, OffthreadVideo, multi-scene), content scripting (data-driven, captions, CSV/JSON), animation (spring physics, interpolate, 12 Disney animation principles), and broader motion design patterns. Single entry point for any 'make a video' task.


## Absorbs

- `remotion`
- `remotion-video`
- `remotion-content`
- `remotion-animation`
- `motion-design`


---

## From `remotion`

> Remotion framework hub — project setup, composition architecture, rendering pipeline, Player embedding, and deployment patterns

# Remotion — Framework Hub

## Purpose

Hub skill for the Remotion ecosystem. Covers project setup, composition architecture, the rendering pipeline (local, Lambda, Cloud Run), the `<Player>` component for web embedding, and orchestrates handoff to specialized Remotion skills for video production, content scripting, and animation.

## When to Chain

| Task | Chain To |
|------|----------|
| Scene transitions, visual effects, rendering output | `remotion-video` |
| Data-driven videos, captions, templates, dynamic props | `remotion-content` |
| Spring physics, interpolation, easing, timing | `remotion-animation` |
| Framer Motion for UI (not video) | `motion-design` |

---

## Project Setup

### New Project

```bash
# Create new Remotion project
npx create-video@latest my-video

# Or with a template
npx create-video@latest --template hello-world
npx create-video@latest --template tiktok
npx create-video@latest --template three
npx create-video@latest --template audiogram

# Start Remotion Studio (live preview)
npx remotion studio
```

### Add to Existing React Project

```bash
npm i remotion @remotion/cli @remotion/bundler
```

```ts
// remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

### Project Structure

```
my-video/
├── src/
│   ├── Root.tsx              # Register all compositions
│   ├── compositions/
│   │   ├── MyVideo.tsx       # Video component
│   │   └── schema.ts         # Zod props schema
│   ├── components/           # Reusable visual components
│   └── lib/                  # Utilities, data fetching
├── public/                   # Static assets (use staticFile())
├── remotion.config.ts        # CLI configuration
└── package.json
```

---

## Composition Architecture

### Root Registration

```tsx
// src/Root.tsx
import { Composition } from "remotion";
import { z } from "zod";
import { MyVideo } from "./compositions/MyVideo";
import { myVideoSchema, calcMyVideoMetadata } from "./compositions/schema";

export const RemotionRoot = () => (
  <>
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      schema={myVideoSchema}
      defaultProps={{
        title: "Hello World",
        data: null,
      }}
      calculateMetadata={calcMyVideoMetadata}
    />

    {/* Multiple compositions in one project */}
    <Composition
      id="Shorts"
      component={MyVideo}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ title: "Short Video", data: null }}
    />
  </>
);
```

### Composition with Zod Schema

```tsx
// src/compositions/schema.ts
import { z } from "zod";
import { CalculateMetadataFunction } from "remotion";

export const myVideoSchema = z.object({
  title: z.string(),
  data: z.nullable(z.object({
    items: z.array(z.object({
      name: z.string(),
      value: z.number(),
    })),
    duration: z.number().optional(),
  })),
});

type Props = z.infer<typeof myVideoSchema>;

export const calcMyVideoMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const response = await fetch(`https://api.example.com/video-data`);
  const data = await response.json();

  return {
    props: { ...props, data },
    // Dynamic duration based on data
    durationInFrames: data.duration ? data.duration * 30 : 300,
  };
};
```

### Core Hooks

```tsx
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  staticFile,
} from "remotion";

export const MyVideo: React.FC = () => {
  const frame = useCurrentFrame();           // Current frame number
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const currentTimeSeconds = frame / fps;    // Convert to seconds

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <h1>Frame {frame} of {durationInFrames}</h1>
      <p>Time: {currentTimeSeconds.toFixed(2)}s</p>
    </AbsoluteFill>
  );
};
```

---

## Rendering Pipeline

### Local Rendering

```bash
# Render to MP4 (H.264)
npx remotion render MyVideo out/video.mp4

# Render specific frames
npx remotion render MyVideo out/video.mp4 --frames=0-90

# Custom resolution
npx remotion render MyVideo out/video.mp4 --width=1080 --height=1080

# Render as GIF
npx remotion render MyVideo out/video.gif --codec=gif

# Render as WebM (VP8)
npx remotion render MyVideo out/video.webm --codec=vp8

# Render with props
npx remotion render MyVideo out/video.mp4 --props='{"title":"Custom"}'

# Render still image (single frame)
npx remotion still MyVideo out/thumbnail.png --frame=60

# Parallel rendering with concurrency
npx remotion render MyVideo out/video.mp4 --concurrency=4
```

### Programmatic Rendering (Node.js)

```ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

async function render() {
  const bundled = await bundle({
    entryPoint: "./src/index.ts",
    webpackOverride: (config) => config,
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "MyVideo",
    inputProps: { title: "Programmatic" },
  });

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: "out/video.mp4",
    inputProps: { title: "Programmatic" },
  });
}
```

### Lambda Rendering (Serverless)

```bash
# Setup
npx remotion lambda policies role
npx remotion lambda sites create src/index.ts --site-name=my-video

# Render
npx remotion lambda render my-video-site MyVideo

# Programmatic
import { renderMediaOnLambda } from "@remotion/lambda/client";

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render",
  serveUrl: siteUrl,
  composition: "MyVideo",
  inputProps: { title: "Lambda Render" },
  codec: "h264",
});
```

---

## Player Component (Web Embedding)

Embed Remotion compositions in any React app for interactive playback without rendering to file.

```bash
npm i @remotion/player
```

```tsx
import { Player } from "@remotion/player";
import { MyVideo } from "./compositions/MyVideo";

function VideoPreview() {
  return (
    <Player
      component={MyVideo}
      inputProps={{ title: "Preview" }}
      durationInFrames={300}
      fps={30}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: "100%", borderRadius: "0.75rem" }}
      controls
      autoPlay
      loop
      clickToPlay
      // Responsive
      renderLoading={() => <div>Loading...</div>}
    />
  );
}
```

### Player with Ref (Programmatic Control)

```tsx
import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback } from "react";

function ControlledPlayer() {
  const playerRef = useRef<PlayerRef>(null);

  const seekTo = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
  }, []);

  return (
    <>
      <Player
        ref={playerRef}
        component={MyVideo}
        inputProps={{ title: "Controlled" }}
        durationInFrames={300}
        fps={30}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{ width: "100%" }}
      />
      <div className="flex gap-4 mt-4">
        <button onClick={() => playerRef.current?.play()}>Play</button>
        <button onClick={() => playerRef.current?.pause()}>Pause</button>
        <button onClick={() => seekTo(0)}>Restart</button>
        <button onClick={() => seekTo(150)}>Jump to 5s</button>
      </div>
    </>
  );
}
```

---

## Static Assets

```tsx
import { staticFile, Img } from "remotion";

// Files in public/ folder
const logoUrl = staticFile("logo.png");
const fontUrl = staticFile("fonts/Inter.woff2");
const audioUrl = staticFile("bgm.mp3");

// Use <Img> instead of <img> for proper preloading
<Img src={staticFile("photo.jpg")} style={{ width: "100%" }} />
```

### Font Loading

```tsx
import { staticFile } from "remotion";

const fontFamily = "Inter";
const fontUrl = staticFile("fonts/Inter-Bold.woff2");

// Load font
const style = `
  @font-face {
    font-family: '${fontFamily}';
    src: url('${fontUrl}') format('woff2');
    font-weight: 700;
  }
`;

export const WithFont: React.FC = () => (
  <>
    <style>{style}</style>
    <div style={{ fontFamily }}>Hello with custom font</div>
  </>
);
```

---

## Best Practices

1. **Use `<OffthreadVideo>` over `<Video>`** — Better rendering performance, extracts frames without blocking.
2. **Schema with Zod** — Validate all composition props with Zod schemas for type safety and Remotion Studio UI.
3. **`calculateMetadata` for data fetching** — Fetch data before render starts, not inside components.
4. **`staticFile()` for assets** — Always use `staticFile()` for files in `public/`, never relative paths.
5. **`<Img>` over `<img>`** — Remotion's `<Img>` delays rendering until loaded, preventing blank frames.
6. **`AbsoluteFill` as root** — Use `<AbsoluteFill>` as the root of every scene for proper positioning.
7. **Deterministic renders** — No `Math.random()`, no `Date.now()`. Use `frame` and props for all values.
8. **Keep compositions pure** — No side effects, no async operations inside render. Use `delayRender`/`continueRender` for async.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `<img>` instead of `<Img>` | Blank frames — `<Img>` waits for load |
| `Math.random()` in render | Non-deterministic frames — use `random(seed)` from `remotion` |
| Importing Remotion in production app | Bundle bloat — Remotion is for video rendering only |
| Missing `extrapolateRight: "clamp"` | Values overshoot beyond input range |
| No Zod schema | Remotion Studio can't generate prop UI |
| Fetching data in component render | Use `calculateMetadata` or `delayRender` instead |


---

## From `remotion-video`

> Remotion video production — scenes, transitions, OffthreadVideo, audio mixing, multi-scene timelines, and rendering output

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


---

## From `remotion-content`

> Remotion content scripting — data-driven videos, dynamic templates, captions/subtitles, calculateMetadata, parameterized rendering, and batch video generation

# Remotion Content Scripting

## Purpose

Build data-driven video templates with Remotion. Covers parameterized rendering, `calculateMetadata` for dynamic props, caption/subtitle systems (SRT, TikTok-style), async data fetching with `delayRender`/`continueRender`, batch rendering from datasets, and reusable video template patterns.

---

## Data-Driven Videos

### calculateMetadata (Recommended)

Fetch data and compute dynamic metadata before rendering starts:

```tsx
// schema.ts
import { z } from "zod";
import { CalculateMetadataFunction } from "remotion";

export const videoSchema = z.object({
  productId: z.string(),
  product: z.nullable(z.object({
    name: z.string(),
    price: z.number(),
    images: z.array(z.string()),
    description: z.string(),
  })),
});

type Props = z.infer<typeof videoSchema>;

export const calcMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const res = await fetch(`https://api.store.com/products/${props.productId}`);
  const product = await res.json();

  // Dynamic duration: 3 seconds per image + 2 second intro/outro
  const durationInFrames = (product.images.length * 3 + 4) * 30;

  return {
    props: { ...props, product },
    durationInFrames,
    // Can also override fps, width, height
  };
};
```

```tsx
// Root.tsx
<Composition
  id="ProductVideo"
  component={ProductVideo}
  schema={videoSchema}
  calculateMetadata={calcMetadata}
  durationInFrames={300}  // Default, overridden by calculateMetadata
  fps={30}
  width={1080}
  height={1080}
  defaultProps={{ productId: "abc123", product: null }}
/>
```

### delayRender / continueRender (In-Component Async)

For async operations inside the component itself:

```tsx
import { useState, useEffect, useCallback } from "react";
import { AbsoluteFill, useDelayRender } from "remotion";

export const AsyncComponent: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
  const [data, setData] = useState<any>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Fetching data..."));

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      const json = await response.json();
      setData(json);
      continueRender(handle);
    } catch (err) {
      cancelRender(err);
    }
  }, [apiUrl, continueRender, cancelRender, handle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!data) return null;

  return (
    <AbsoluteFill>
      <h1>{data.title}</h1>
    </AbsoluteFill>
  );
};
```

### Prefetching Assets

```tsx
import { prefetch } from "remotion";

// Prefetch a video/image URL before it's needed
const { free, waitUntilDone } = prefetch("https://cdn.example.com/video.mp4", {
  method: "blob-url",  // or "base64"
});

// Wait for prefetch to complete
await waitUntilDone();

// Free memory when done
free();
```

---

## Captions & Subtitles

### Parse SRT Files

```tsx
import { parseSrt } from "@remotion/captions";
import type { Caption } from "@remotion/captions";

// In calculateMetadata or with delayRender
const response = await fetch(staticFile("subtitles.srt"));
const text = await response.text();
const { captions } = parseSrt({ input: text });
// captions: Caption[] — array of { text, startMs, endMs, confidence? }
```

### Simple Caption Display

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";
import type { Caption } from "@remotion/captions";

const CaptionOverlay: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;

  // Find active caption
  const activeCaption = captions.find(
    (c) => c.startMs <= currentTimeMs && c.endMs > currentTimeMs
  );

  if (!activeCaption) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: 40 }}>
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          color: "white",
          fontSize: 48,
          fontWeight: 700,
          padding: "12px 24px",
          borderRadius: 12,
          textAlign: "center",
          maxWidth: "80%",
          alignSelf: "center",
        }}
      >
        {activeCaption.text}
      </div>
    </AbsoluteFill>
  );
};
```

### TikTok-Style Captions (Word Highlighting)

```tsx
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Caption, TikTokPage } from "@remotion/captions";
import { Sequence, useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";

const SWITCH_EVERY_MS = 1200;
const HIGHLIGHT_COLOR = "#39E508";

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeMs = (frame / fps) * 1000;
  const absoluteTimeMs = page.startMs + currentTimeMs;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontSize: 80, fontWeight: "bold", textAlign: "center" }}>
        {page.tokens.map((token) => {
          const isActive =
            token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
          return (
            <span
              key={token.fromMs}
              style={{ color: isActive ? HIGHLIGHT_COLOR : "white" }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const TikTokCaptions: React.FC<{ captions: Caption[] }> = ({
  captions,
}) => {
  const { fps } = useVideoConfig();

  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: SWITCH_EVERY_MS,
  });

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const nextPage = pages[i + 1] ?? null;
        const startFrame = (page.startMs / 1000) * fps;
        const endFrame = nextPage
          ? (nextPage.startMs / 1000) * fps
          : startFrame + (SWITCH_EVERY_MS / 1000) * fps;
        const durationInFrames = Math.max(1, Math.round(endFrame - startFrame));

        return (
          <Sequence
            key={i}
            from={Math.round(startFrame)}
            durationInFrames={durationInFrames}
          >
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

### Whisper Integration (AI Transcription)

```bash
npm i @remotion/install-whisper-cpp @remotion/whisper
```

```ts
import { installWhisperCpp } from "@remotion/install-whisper-cpp";
import { transcribe } from "@remotion/whisper";

// Install Whisper.cpp (one-time)
await installWhisperCpp({ version: "1.5.5" });

// Transcribe audio to captions
const result = await transcribe({
  inputPath: "public/audio.mp3",
  whisperPath: ".whisper",
  model: "medium",
  tokenLevelTimestamps: true,
});

// result.captions: Caption[] — ready to use with createTikTokStyleCaptions
```

---

## Parameterized Rendering

### Props via CLI

```bash
# Pass props as JSON
npx remotion render ProductVideo out/video.mp4 \
  --props='{"productId":"abc123","product":null}'

# Props from file
npx remotion render ProductVideo out/video.mp4 \
  --props=./props.json
```

### Props via API

```ts
import { renderMedia, selectComposition } from "@remotion/renderer";

const composition = await selectComposition({
  serveUrl: bundled,
  id: "ProductVideo",
  inputProps: {
    productId: "abc123",
    product: null,  // calculateMetadata will fetch
  },
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "out/product-abc123.mp4",
});
```

---

## Batch Rendering from Dataset

### Render Multiple Videos

```ts
// render-all.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const products = [
  { id: "abc123", name: "Widget A" },
  { id: "def456", name: "Widget B" },
  { id: "ghi789", name: "Widget C" },
];

async function renderAll() {
  const bundled = await bundle({ entryPoint: "./src/index.ts" });

  for (const product of products) {
    console.log(`Rendering ${product.name}...`);

    const composition = await selectComposition({
      serveUrl: bundled,
      id: "ProductVideo",
      inputProps: { productId: product.id, product: null },
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: `out/${product.id}.mp4`,
    });

    console.log(`Done: ${product.name}`);
  }
}

renderAll();
```

```bash
npx tsx render-all.ts
```

### Parallel Batch Rendering

```ts
import pLimit from "p-limit";

const limit = pLimit(3); // Max 3 concurrent renders

await Promise.all(
  products.map((product) =>
    limit(async () => {
      const composition = await selectComposition({
        serveUrl: bundled,
        id: "ProductVideo",
        inputProps: { productId: product.id, product: null },
      });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h264",
        outputLocation: `out/${product.id}.mp4`,
        concurrency: 2,  // Per-render thread count
      });
    })
  )
);
```

---

## Template Patterns

### Reusable Video Template

```tsx
// templates/SocialPost.tsx
import { z } from "zod";

export const socialPostSchema = z.object({
  headline: z.string(),
  body: z.string(),
  imageUrl: z.string().url(),
  brandColor: z.string().default("#3b82f6"),
  ctaText: z.string().default("Learn More"),
  format: z.enum(["square", "story", "landscape"]).default("square"),
});

type Props = z.infer<typeof socialPostSchema>;

const FORMATS = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

export const calcSocialPostMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => ({
  ...FORMATS[props.format],
  durationInFrames: 150, // 5 seconds
});

export const SocialPost: React.FC<Props> = ({
  headline,
  body,
  imageUrl,
  brandColor,
  ctaText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate headline entrance
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headlineY = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      <Img src={imageUrl} style={{ width: "100%", height: "60%", objectFit: "cover" }} />
      <div style={{ padding: 40, color: "white" }}>
        <h1
          style={{
            fontSize: 56,
            opacity: headlineOpacity,
            transform: `translateY(${interpolate(headlineY, [0, 1], [30, 0])}px)`,
          }}
        >
          {headline}
        </h1>
        <p style={{ fontSize: 28, marginTop: 16, opacity: headlineOpacity }}>{body}</p>
      </div>
    </AbsoluteFill>
  );
};
```

---

## Best Practices

1. **`calculateMetadata` over `delayRender`** — Prefer `calculateMetadata` for data fetching; it runs once before render and can set dynamic duration/resolution.
2. **Zod schemas for all templates** — Enables Remotion Studio prop editor UI and type safety.
3. **Separate data from presentation** — Keep fetching logic in `calculateMetadata`, rendering logic in components.
4. **Batch with concurrency limits** — Don't render too many videos in parallel; 2-4 concurrent renders is optimal.
5. **Cache API responses** — If rendering multiple videos from the same API, cache responses to avoid rate limits.
6. **TikTok captions: 1-2 second grouping** — `combineTokensWithinMilliseconds: 1200` reads naturally.
7. **Test templates with edge cases** — Long text, missing images, empty arrays. Templates must handle all valid inputs.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `calculateMetadata` data not serializable | All data must be JSON-serializable (no Date objects, functions) |
| `delayRender` timeout | Default 30s timeout; increase with `delayRender("msg", { timeoutInMilliseconds: 60000 })` |
| Captions out of sync | Verify SRT timestamps match actual audio timing |
| Batch render OOM | Limit concurrency with `p-limit`, reduce per-render `concurrency` |
| Template breaks on edge case | Validate props with Zod, add fallback defaults |
| `continueRender` never called | Always wrap in try-catch; use `cancelRender` on error |


---

## From `remotion-animation`

> Remotion animation patterns — spring physics, interpolate, Easing curves, timing, stagger, enter/exit, and complex motion sequences

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


---

## From `motion-design`

> Motion design for web — Framer Motion patterns, Remotion video composition, 12 Disney animation principles applied to UI, easing curves, and accessible motion

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

