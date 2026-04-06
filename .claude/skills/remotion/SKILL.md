---
name: remotion
description: Remotion framework hub — project setup, composition architecture, rendering pipeline, Player embedding, and deployment patterns
layer: hub
category: frontend
triggers:
  - "remotion"
  - "remotion project"
  - "remotion setup"
  - "programmatic video"
  - "react video"
  - "video from code"
  - "remotion studio"
  - "remotion render"
  - "remotion lambda"
  - "remotion cloud run"
  - "video rendering react"
  - "create video programmatically"
  - "remotion player"
  - "embed remotion"
inputs:
  - "Remotion project setup or architecture questions"
  - "Rendering pipeline configuration"
  - "Player component embedding"
  - "Deployment and serverless rendering"
outputs:
  - "Remotion project scaffolding"
  - "Composition architecture patterns"
  - "Rendering pipeline configuration"
  - "Player integration code"
  - "Lambda/Cloud Run deployment setup"
linksTo:
  - remotion-video
  - remotion-content
  - remotion-animation
  - motion-design
  - react
  - typescript-frontend
linkedFrom:
  - cook
  - plan
  - media-processing
  - motion-design
preferredNextSkills:
  - remotion-video
  - remotion-content
  - remotion-animation
fallbackSkills:
  - motion-design
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - filesystem: Project scaffolding and configuration files
---

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
