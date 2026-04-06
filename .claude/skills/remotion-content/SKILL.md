---
name: remotion-content
description: Remotion content scripting — data-driven videos, dynamic templates, captions/subtitles, calculateMetadata, parameterized rendering, and batch video generation
layer: domain
category: frontend
triggers:
  - "remotion content"
  - "remotion template"
  - "remotion captions"
  - "remotion subtitles"
  - "data-driven video"
  - "dynamic video"
  - "video template"
  - "calculateMetadata"
  - "parameterized video"
  - "batch render"
  - "remotion data"
  - "tiktok captions"
  - "remotion srt"
  - "remotion whisper"
  - "video from data"
  - "video from api"
  - "remotion dataset"
  - "remotion prefetch"
  - "delayRender"
  - "continueRender"
inputs:
  - "Data-driven video template requirements"
  - "Caption/subtitle integration needs"
  - "Batch rendering from datasets"
  - "Dynamic prop and metadata configuration"
outputs:
  - "Data-driven composition templates"
  - "Caption rendering components"
  - "Batch rendering scripts"
  - "calculateMetadata implementations"
linksTo:
  - remotion-video
  - remotion-animation
  - remotion
linkedFrom:
  - remotion
  - remotion-video
preferredNextSkills:
  - remotion-video
  - remotion-animation
fallbackSkills:
  - remotion
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
