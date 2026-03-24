---
name: puter-illustration
description: Zero-setup AI illustration generation via Puter.js — Gemini-powered, free, no API key needed. Generate project illustrations from the CLI or dashboard.
layer: domain
category: ai-ml
triggers:
  - puter
  - puter illustration
  - puter image
  - free image
  - free illustration
  - generate illustration free
  - zero setup image
  - puter.js
  - illustration no api key
inputs:
  - prompt: What to generate (subject, style, colors, dimensions)
  - output: Where to save (default: public/illustrations/ or project root)
  - model: Puter model to use (default: gemini-3.1-flash-image-preview)
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
  - Calls Puter.js REST API (https://api.puter.com/ai/txt2img)
  - Creates image files in project directory
---

# Puter.js Illustration Generator

Zero-setup, free AI image generation powered by Gemini models via [Puter.js](https://github.com/HeyPuter/puter).
No API key. No Google account. No cookies. Just works.

## When to Use

- Generate hero illustrations, feature graphics, icons for landing pages
- Create empty state illustrations, error page art, onboarding visuals
- Produce spot illustrations for documentation or blog posts
- Quick mockup assets during design iterations
- Any time a user needs images and has no API keys configured

## Available Models

| Model ID | Name | Quality | Speed |
|----------|------|---------|-------|
| `gemini-3.1-flash-image-preview` | Nano Banana 2 | Good | Fast |
| `gemini-3-pro-image-preview` | Nano Banana Pro | Best | Slower |
| `gemini-2.5-flash-image` | Nano Banana (original) | Good | Fast |

Default: `gemini-3.1-flash-image-preview`

## Method 1: Direct API Call (CLI / Scripts)

For quick, one-off generation from within Claude Code or any Node.js script:

```typescript
// Generate a single illustration
const response = await fetch("https://api.puter.com/ai/txt2img", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Minimal isometric illustration of data nodes connected by glowing lines, navy and amber palette, clean vector style, no text, 1024x1024",
    model: "gemini-3.1-flash-image-preview",
  }),
});

const buffer = Buffer.from(await response.arrayBuffer());
writeFileSync("public/illustrations/hero.png", buffer);
```

### Quick Generation Script

Create a one-off generation script when the user needs illustrations:

```typescript
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface GenerationRequest {
  name: string;
  prompt: string;
  model?: string;
}

async function generateIllustrations(
  requests: GenerationRequest[],
  outputDir: string = "public/illustrations"
) {
  mkdirSync(outputDir, { recursive: true });

  for (const req of requests) {
    console.log(`Generating: ${req.name}...`);
    const res = await fetch("https://api.puter.com/ai/txt2img", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        model: req.model || "gemini-3.1-flash-image-preview",
      }),
    });

    if (!res.ok) {
      console.error(`Failed ${req.name}: ${res.status} ${res.statusText}`);
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const path = join(outputDir, `${req.name}.png`);
    writeFileSync(path, buffer);
    console.log(`Saved: ${path} (${buffer.length} bytes)`);
  }
}

// Usage:
await generateIllustrations([
  {
    name: "hero",
    prompt: "Minimal flat illustration of an AI brain with circuit patterns, deep navy (#1a1a2e) and amber (#f59e0b), white background, no text, 1024x1024",
  },
  {
    name: "empty-state",
    prompt: "Simple line drawing of an empty inbox, light gray lines, centered composition, 512x512",
  },
  {
    name: "error-404",
    prompt: "Playful isometric illustration of a broken link chain, purple and orange palette, clean vector, no text, 800x600",
  },
]);
```

## Method 2: Browser/Frontend (Puter.js SDK)

For generating images in client-side code or dashboards:

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

## Method 3: Dashboard Asset Pipeline

For batch generation with status tracking, use the dashboard at `/assets`:

1. Navigate to `http://localhost:3333/assets`
2. Click **New Manifest**
3. Enter prompts (one per line)
4. Backend is automatically set to **Puter.js**
5. Click **Create Manifest** then hit the **Play** button to generate

The dashboard polls for completion and shows progress per-asset.

### API Endpoints

```bash
# Create a manifest
curl -X POST http://localhost:3333/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-manifest",
    "name": "Landing Page Assets",
    "backend": "puter",
    "assets": [
      { "prompt": "Hero illustration...", "dimensions": "1024x1024" },
      { "prompt": "Feature icon...", "dimensions": "512x512" }
    ]
  }'

# Start generation
curl -X POST http://localhost:3333/api/assets/generate \
  -H "Content-Type: application/json" \
  -d '{ "manifestId": "<id-from-above>" }'

# Check status
curl http://localhost:3333/api/assets?id=<manifest-id>
```

## Prompt Engineering

### Bad Prompts
- "A dashboard" (too vague)
- "Logo for my app" (no style direction)
- "Beautiful illustration" (meaningless)

### Good Prompts

Follow this template:
```
[STYLE] illustration of [SUBJECT], [PERSPECTIVE] perspective,
using [N] colors: [COLOR1 hex], [COLOR2 hex], [COLOR3 hex].
[TECHNIQUE] style, [NEGATIVE CONSTRAINTS].
Suitable as [USE CASE] for [CONTEXT]. [DIMENSIONS].
```

**Examples:**

```
Minimal isometric illustration of a workflow engine with connected nodes and data streams,
using 3 colors: deep navy (#1a1a2e), amber (#f59e0b), and white (#ffffff).
Clean vector style, no gradients, thick consistent stroke weight, no text.
Suitable as a hero illustration for a developer tool landing page. 1024x1024.
```

```
Flat geometric pattern of interlocking hexagons with subtle depth,
using 2 colors: slate (#334155) and emerald (#10b981).
Minimal line art, no fills, no text, no photorealism.
Suitable as a section background for a SaaS dashboard. 1920x400.
```

### Prompt Rules

1. **Specify exact style**: isometric, flat, line art, 3D, watercolor, etc.
2. **Include hex colors** from your design system — don't let the model guess
3. **State dimensions**: 1024x1024 (square), 1920x1080 (hero), 512x512 (icon)
4. **Say what NOT to include**: "no text", "no gradients", "no photorealism"
5. **Describe composition**: centered, asymmetric, full-bleed, contained
6. **Reference real styles** if helpful: "in the style of Kurzgesagt", "like Stripe's illustrations"

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Image returned as binary |
| 400 | Bad request | Check prompt format |
| 429 | Rate limited | Wait 30s and retry |
| 500 | Server error | Retry once, then fallback |
| Network error | Puter API down | Use visual-render skill as fallback |

### Retry Logic

```typescript
async function generateWithRetry(prompt: string, maxRetries = 2): Promise<Buffer> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch("https://api.puter.com/ai/txt2img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "gemini-3.1-flash-image-preview" }),
      });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 30_000));
        continue;
      }
      if (!res.ok) throw new Error(`Puter API ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Integration with UI Design Pipeline

When the `/design-pipeline` skill reaches Phase 3 (ILLUSTRATE), it automatically
uses Puter.js as the **first backend** to try. The prompt should include:

- The exact hex colors from Phase 2's color palette
- The style direction from Phase 1's inspiration board
- Dimensions appropriate for the intended use (hero, icon, empty state)

## Credits

Puter.js is an open-source project by [HeyPuter](https://github.com/HeyPuter/puter) — MIT License.
Image generation is powered by Google Gemini models accessed through Puter's free API.
