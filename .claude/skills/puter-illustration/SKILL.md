---
name: puter-illustration
description: AI illustration generation via Gemini (browser automation primary, API secondary, Puter.js fallback). Generate project illustrations from CLI.
layer: domain
category: ai-ml
triggers:
  - puter
  - puter illustration
  - puter image
  - free image
  - free illustration
  - generate illustration
  - generate image
  - gemini image
  - gemini illustration
  - zero setup image
  - puter.js
  - illustration no api key
inputs:
  - prompt: What to generate (subject, style, colors, dimensions)
  - output: Where to save (default: public/illustrations/ or project root)
  - model: Model to use (default: auto)
  - count: Number of variations (default: 1)
outputs:
  - files: Generated PNG files at the specified output path
  - manifest: Asset manifest JSON (if using dashboard pipeline)
linksTo:
  - image-pipeline
  - visual-render
  - ui-design-pipeline
  - impeccable-frontend-design
linkedFrom:
  - image-pipeline
  - ui-design-pipeline
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
sideEffects:
  - Automates gemini.google.com via Playwright (Method 1)
  - Calls Google Gemini API (Method 2)
  - Calls Puter.js API via SDK (Method 3 fallback)
  - Creates image files in project directory
---

# Illustration Generator

AI image generation powered by Google Gemini models.

**Priority order**:
1. **Gemini Browser** — Playwright automation of gemini.google.com (uses your Google account, Premium = unlimited)
2. **Gemini API** — Direct API with `@google/genai` SDK (requires API key, pay-per-image or limited free tier)
3. **Puter.js** — Free proxy to Gemini (no account needed, rate-limited fallback)

## When to Use

- Generate hero illustrations, feature graphics, icons for landing pages
- Create empty state illustrations, error page art, onboarding visuals
- Produce spot illustrations for documentation or blog posts
- Quick mockup assets during design iterations

## Method 1: Gemini Browser Automation (Primary)

Automates gemini.google.com with Playwright using your own Google account session.
**Premium/Google One users get unlimited image generation.** Free accounts get ~20-50/day.

### One-time setup

```bash
npx playwright install chromium
npm run gemini:auth
```

This opens a visible browser. Log into your Google account, wait for the Gemini chat to load, then press Enter in the terminal to save the session.

### Generate images

```bash
# Single image
npm run gemini:generate -- --prompt "A logo of a brain with circuit patterns, navy and amber" --output hero.png

# Multiple images to a directory
npm run gemini:generate -- --prompt "Isometric data nodes..." --output public/illustrations/ --count 3

# Debug mode (visible browser)
npm run gemini:generate -- --prompt "..." --output out.png --visible

# Choose model
npm run gemini:generate -- --prompt "..." --model pro --output logo.png
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--prompt, -p` | Image generation prompt | (required) |
| `--output, -o` | Output file or directory | `.` |
| `--count, -n` | Number of images | `1` |
| `--model, -m` | `auto`, `flash`, or `pro` | `auto` |
| `--visible` | Show browser for debugging | `false` |
| `--timeout, -t` | Max wait per image (ms) | `120000` |

### How it works

1. Loads saved Google session cookies (from `gemini:auth`)
2. Opens headless Chromium → navigates to `gemini.google.com/app`
3. Types the prompt into the chat input and presses Enter
4. Waits for Gemini to finish generating (monitors stop button)
5. Extracts generated images from the response DOM
6. Downloads and saves them to the output path
7. Refreshes session cookies for next run

### Account tiers

| Account | Image Limits | Cost |
|---------|-------------|------|
| Free Google account | ~20-50/day | Free |
| Google One / Gemini Premium | Unlimited | Subscription |

### Session expired?

```bash
rm scripts/gemini-browser/.state/gemini-session.json
npm run gemini:auth
```

## Method 2: Gemini API (Direct)

For users with a Google API key. Pay-per-image or limited free tier.

### Setup

1. Get an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free, no credit card)
2. Add to `.env`:
   ```bash
   GEMINI_API_KEY=your-key-here
   ```
3. Install the SDK:
   ```bash
   npm install @google/genai
   ```

### Generate images (Node.js)

```javascript
import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "Generate an image: A futuristic brain with circuit patterns, navy and amber",
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "1:1",
      imageSize: "1K",  // "1K", "2K", or "4K"
    },
  },
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    writeFileSync("output.png", Buffer.from(part.inlineData.data, "base64"));
  }
}
```

### Generate images (Python)

```python
from google import genai
from google.genai import types

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="Generate an image: A futuristic brain with circuit patterns",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="1:1",
            image_size="1K",
        ),
    ),
)

for part in response.parts:
    if part.inline_data:
        part.as_image().save("output.png")
```

### API models & pricing

| Model | Quality | Price/image |
|-------|---------|-------------|
| `gemini-3.1-flash-image-preview` | Good (up to 4K) | $0.04-0.15 |
| `gemini-3-pro-image-preview` | Best (up to 4K) | $0.13-0.24 |
| `gemini-2.5-flash-image` | Good (1K only) | $0.04 |
| `imagen-4.0-fast-generate-001` | Good | $0.02 |
| `imagen-4.0-generate-001` | Better | $0.04 |
| `imagen-4.0-ultra-generate-001` | Best | $0.06 |

**Important**: Use `/v1beta/` endpoint (not `/v1/`). Must include `responseModalities: ["TEXT", "IMAGE"]` — image-only mode is not supported.

## Method 3: Puter.js (Free Fallback)

No Google account needed. Uses Puter as a free proxy to Gemini models. Rate-limited.

### Browser (zero-setup)

```html
<script src="https://js.puter.com/v2/"></script>
<script>
  puter.ai.txt2img(
    "Minimal isometric illustration of connected data nodes, navy and amber palette, 1024x1024",
    { model: "gemini-3.1-flash-image-preview" }
  ).then(img => {
    document.getElementById("preview").appendChild(img);
  });
</script>
```

### Node.js (requires one-time auth)

```bash
npm install @heyputer/puter.js
```

One-time auth:
```javascript
const { getAuthToken } = require("@heyputer/puter.js/src/init.cjs");
const token = await getAuthToken(); // Opens browser → log in → redirects back
// Save token as PUTER_TOKEN in .env
```

Generate:
```javascript
const { init } = require("@heyputer/puter.js/src/init.cjs");
const { writeFileSync } = require("fs");

const puter = init(process.env.PUTER_TOKEN);

const result = await puter.ai.txt2img(
  "Minimal flat illustration of an AI brain, navy and amber, NO TEXT, 1024x1024",
  { model: "gemini-3.1-flash-image-preview" }
);

if (result?.src?.startsWith("data:image")) {
  const buffer = Buffer.from(result.src.split(",")[1], "base64");
  writeFileSync("output.png", buffer);
}
```

### Puter rate limits

| Tier | Flash Model | Pro Model |
|------|------------|-----------|
| Anonymous | ~10-20 images | ~1-2 images |
| Free registered | Higher limits | ~5-10 images |
| Puter Plus | Unlimited | High limits |

When you hit `insufficient_funds`, switch to Method 1 (browser) or Method 2 (API).

## Dashboard Asset Pipeline

For batch generation with status tracking, use the dashboard at `/assets`:

1. Navigate to `http://localhost:3333/assets`
2. Click **New Manifest** → enter prompts
3. Click **Create Manifest** → hit **Play** to generate

## Prompt Engineering

### Template

```
[STYLE] illustration of [SUBJECT], [PERSPECTIVE] perspective,
using [N] colors: [COLOR1 hex], [COLOR2 hex], [COLOR3 hex].
[TECHNIQUE] style, [NEGATIVE CONSTRAINTS].
Suitable as [USE CASE] for [CONTEXT]. [DIMENSIONS].
```

### Examples

```
Minimal isometric illustration of a workflow engine with connected nodes and data streams,
using 3 colors: deep navy (#1a1a2e), amber (#f59e0b), and white (#ffffff).
Clean vector style, no gradients, thick consistent stroke weight, NO TEXT, NO WORDS, NO LETTERS.
Suitable as a hero illustration for a developer tool landing page. 1024x1024.
```

### Prompt Rules

1. **Specify exact style**: isometric, flat, line art, 3D, watercolor, etc.
2. **Include hex colors** from your design system
3. **State dimensions**: 1024x1024 (square), 1920x1080 (hero), 512x512 (icon)
4. **Use ALL CAPS for negatives**: "NO TEXT, NO WORDS, NO LETTERS" — models ignore lowercase
5. **Describe composition**: centered, asymmetric, full-bleed, contained
6. **Use Pro model for logos**: Flash adds unwanted text artifacts

## Error Handling

| Error | Method | Action |
|-------|--------|--------|
| Session expired | Browser | `rm .state/gemini-session.json` → `npm run gemini:auth` |
| No images in response | Browser | Add `--visible` flag to debug, check prompt |
| API 403 | API | Check API key, use `/v1beta/` endpoint |
| `insufficient_funds` | Puter | Switch to Browser method or API |
| Network error | All | Try next method in priority order |

## Credits

- [Puter.js](https://github.com/HeyPuter/puter) — MIT License, free proxy to Gemini
- [Google Gemini](https://ai.google.dev) — Image generation models
- [Playwright](https://playwright.dev) — Browser automation
