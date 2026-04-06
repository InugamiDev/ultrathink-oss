---
name: illustration-generator
description: Auto-triggered illustration generator. Builds structured JSON prompts from user intent, then generates images via Gemini browser automation (Nano Banana 2).
layer: domain
category: ai-ml
triggers:
  - generate illustration
  - generate image
  - create illustration
  - create image
  - make illustration
  - hero image
  - logo image
  - banner image
  - icon illustration
  - empty state illustration
  - landing page illustration
  - feature graphic
  - gemini image
  - gemini illustration
inputs:
  - intent: What the user needs (e.g., "logo for ultrathink", "hero image for landing page")
  - style: Optional style direction (flat, isometric, line art, 3D, watercolor)
  - colors: Optional hex colors from design system
  - output: Where to save (default: public/illustrations/)
outputs:
  - manifest: JSON generation manifest with structured prompts
  - files: Generated PNG files at full resolution
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
  - Automates gemini.google.com via Playwright
  - Creates image files in project directory
---

# Illustration Generator

Auto-triggered skill that converts user intent into structured prompts and generates
images via Gemini browser automation (Nano Banana 2 model).

## How This Skill Works

When triggered, follow this exact pipeline:

### Phase 1: ANALYZE — Understand the request

Extract from the user's message:
- **Subject**: What to illustrate (brain, workflow, data nodes, etc.)
- **Use case**: Where it will be used (hero, icon, empty state, logo, banner)
- **Style preference**: If mentioned (flat, isometric, line art, etc.)
- **Colors**: If the project has a design system, use those hex colors
- **Count**: How many variations/assets needed

If the user's intent is vague, pick sensible defaults based on the use case.

### Phase 2: PROMPT — Build the generation manifest

Create a JSON manifest with structured prompts. Each prompt MUST follow this formula:

```
Generate an image: [STYLE] illustration of [SUBJECT], [COMPOSITION],
using [N] colors: [HEX1], [HEX2], [HEX3].
[TECHNIQUE] style, [DIMENSIONS].
NO TEXT, NO WORDS, NO LETTERS.
```

**Manifest format:**

```json
{
  "name": "Project Asset Batch",
  "model": "gemini-3.1-flash-image-preview",
  "outputDir": "public/illustrations",
  "assets": [
    {
      "name": "hero",
      "prompt": "Generate an image: Minimal isometric illustration of a workflow engine with connected nodes and data streams, centered composition, using 3 colors: deep navy (#0f172a), amber (#f59e0b), white (#ffffff). Clean vector style, 1024x1024. NO TEXT, NO WORDS, NO LETTERS.",
      "use": "Landing page hero"
    },
    {
      "name": "empty-state",
      "prompt": "Generate an image: Simple line drawing of an empty inbox with a small sparkle, centered, using 2 colors: slate (#94a3b8), white (#ffffff). Thin line art style, 512x512. NO TEXT, NO WORDS, NO LETTERS.",
      "use": "Dashboard empty state"
    }
  ]
}
```

### Phase 3: GENERATE — Execute via Gemini browser automation

**Backend priority order:**

1. **Gemini Browser Automation** (primary) — Uses saved Google session via Playwright
2. **Gemini API** (fallback 1) — Requires `GEMINI_API_KEY` in `.env`
3. **Puter.js** (fallback 2) — Free, no auth, rate-limited

#### Primary: Gemini Browser Automation

For each asset in the manifest, run:

```bash
npx tsx scripts/gemini-browser/generate.ts \
  --prompt "<prompt from manifest>" \
  --output "<outputDir>/<name>.png"
```

**Important execution rules:**
- Run assets **sequentially** (one at a time) — Gemini needs a fresh chat per image
- Use `--visible` flag if the user wants to watch the generation
- Default model is `gemini-3.1-flash-image-preview` (Nano Banana 2) — fast, good quality
- For logos or text-sensitive images, recommend Pro model but warn about limits
- If generation fails, show the debug screenshot and suggest prompt adjustments
- After each image, show the result to the user before continuing

#### Fallback 1: Gemini API

If no browser session exists and `GEMINI_API_KEY` is set:

```typescript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "<prompt from manifest>",
  config: { responseModalities: ["TEXT", "IMAGE"] },
});
```

#### Fallback 2: Puter.js (free, no auth)

If neither browser session nor API key is available:

```typescript
const response = await fetch("https://api.puter.com/ai/txt2img", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "<prompt from manifest>",
    model: "gemini-3.1-flash-image-preview",
  }),
});
const buffer = Buffer.from(await response.arrayBuffer());
```

### Phase 4: DELIVER — Present results

After generation:
1. Show each generated image to the user
2. List file paths and sizes
3. Ask if they want variations, adjustments, or are happy with the results
4. If the user wants changes, go back to Phase 2 with refined prompts

## Prompt Rules (Critical)

1. **Always prefix with "Generate an image:"** — this triggers Gemini's image mode
2. **Always end with "NO TEXT, NO WORDS, NO LETTERS"** in ALL CAPS — models ignore lowercase
3. **Specify exact hex colors** — never let the model guess colors
4. **State dimensions explicitly** — 1024x1024 (square), 1920x1080 (hero), 512x512 (icon)
5. **Describe composition** — centered, asymmetric, full-bleed, contained
6. **Specify style precisely** — isometric, flat, line art, 3D, watercolor, geometric
7. **One subject per prompt** — don't combine unrelated elements

## Dimension Guide

| Use Case | Dimensions | Aspect Ratio |
|----------|-----------|--------------|
| Logo / Icon | 512x512 | 1:1 |
| Square illustration | 1024x1024 | 1:1 |
| Hero banner | 1920x1080 | 16:9 |
| Wide banner | 1920x400 | ~5:1 |
| Feature card | 800x600 | 4:3 |
| Social media | 1200x630 | ~2:1 |
| Mobile splash | 1080x1920 | 9:16 |

## Style Presets

When the user doesn't specify a style, pick based on context:

| Context | Recommended Style |
|---------|------------------|
| Developer tool / SaaS | Isometric, clean vector, navy/amber palette |
| Documentation | Line art, minimal, single accent color |
| Landing page hero | Flat illustration, bold colors, centered subject |
| Empty state | Thin line drawing, muted colors, simple composition |
| Error page | Playful isometric, warm colors, humorous subject |
| Blog / content | Watercolor or editorial style, rich colors |
| Logo | Geometric, strong silhouette, 2-3 colors max |

## Setup: Gemini Browser Automation

### Quick setup

```bash
npx playwright install chromium
```

### Auth via cookie import (recommended)

1. Install a cookie export extension:
   - **Chrome**: [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - **Firefox**: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
   - **Edge**: [Get cookies.txt LOCALLY](https://microsoftedge.microsoft.com/addons/detail/get-cookiestxt-locally/helldoamhjnbmnlgfcecllfkahkobhgc)

2. Go to [gemini.google.com](https://gemini.google.com) (must be logged in)
3. Click the extension icon → Export cookies → saves `cookies.txt`
4. Import:
   ```bash
   npm run gemini:auth -- --cookies path/to/cookies.txt
   ```

### Auth via interactive login (alternative)

```bash
npm run gemini:auth
```

Opens a browser → log in to Google → press Enter to save session.

### Session expired?

```bash
npm run gemini:auth -- --cookies cookies.txt --force
```

## Image Quality

- Images are downloaded at **full resolution** from Google's CDN (`=s0` suffix)
- The preview in Gemini's UI is compressed — saved files are original quality
- Typical output: 400-800 KB per image at 1024x1024

## Example Trigger Flows

**User says**: "generate a logo for ultrathink"

→ Phase 1: Subject=brain+circuits, Use=logo, Style=geometric, Colors=navy+amber
→ Phase 2: Creates manifest with 2-3 logo variations (different compositions)
→ Phase 3: Runs `gemini:generate` for each
→ Phase 4: Shows results, asks for preference

**User says**: "I need hero images for the landing page"

→ Phase 1: Subject=from project context, Use=hero, Style=isometric, Dimensions=1920x1080
→ Phase 2: Creates manifest with hero + supporting illustrations
→ Phase 3: Generates sequentially
→ Phase 4: Presents full set

**User says**: "make empty state illustrations for the dashboard"

→ Phase 1: Subject=empty inbox/chart/list, Use=empty-state, Style=line-art, Dimensions=512x512
→ Phase 2: Creates 3-4 context-appropriate empty states
→ Phase 3: Generates each
→ Phase 4: Shows results
