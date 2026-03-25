---
name: puter-illustration
description: AI illustration generation via Puter.js SDK — Gemini-powered, free tier with rate limits. Generate project illustrations from the CLI or dashboard.
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
  - Calls Puter.js API via SDK (https://api.puter.com/drivers/call)
  - Creates image files in project directory
---

# Puter.js Illustration Generator

AI image generation powered by Gemini models via [Puter.js](https://github.com/HeyPuter/puter).
Free tier available — no Google account needed. Requires one-time browser auth for Node.js usage.

## Important: How Puter.js Actually Works

- **Browser**: Zero-setup. Include `<script src="https://js.puter.com/v2/">` and call `puter.ai.txt2img()`. Auth is automatic.
- **Node.js / CLI**: Requires the `@heyputer/puter.js` npm package + a one-time browser login to get an auth token. The direct REST API (`/ai/txt2img`) returns 403 from server-side — you **must** use the SDK.
- **Rate limits**: Free tier has credit limits. Pro model (`gemini-3-pro-image-preview`) costs more credits and may exhaust the free tier after 1-2 images. Flash model (`gemini-3.1-flash-image-preview`) is cheaper but lower quality.

## When to Use

- Generate hero illustrations, feature graphics, icons for landing pages
- Create empty state illustrations, error page art, onboarding visuals
- Produce spot illustrations for documentation or blog posts
- Quick mockup assets during design iterations
- Any time a user needs images and has no paid API keys configured

## Available Models

| Model ID | Quality | Speed | Free Tier Cost |
|----------|---------|-------|----------------|
| `gemini-3.1-flash-image-preview` | Good | Fast | Low (many images) |
| `gemini-3-pro-image-preview` | Best | Slower | High (1-2 images) |
| `gemini-2.5-flash-image` | Good | Fast | Low (many images) |

Default: `gemini-3.1-flash-image-preview`

## Method 1: Node.js SDK (CLI / Scripts) — Recommended

The `@heyputer/puter.js` npm package handles auth and API calls correctly in Node.js.

### One-time setup

```bash
npm install @heyputer/puter.js
```

### One-time auth (opens browser)

```javascript
const { getAuthToken } = require("@heyputer/puter.js/src/init.cjs");
const token = await getAuthToken(); // Opens browser → log in → redirects back with token
console.log(token); // Save this JWT for reuse
```

Or manually: start a local HTTP server, open `https://puter.com/?action=authme&redirectURL=http://localhost:<port>`, and extract `?token=` from the redirect.

### Generate images

```javascript
const { init } = require("@heyputer/puter.js/src/init.cjs");
const { writeFileSync, mkdirSync } = require("fs");
const { join } = require("path");

const puter = init(process.env.PUTER_TOKEN); // Your saved auth token

async function generateIllustrations(requests, outputDir = "public/illustrations") {
  mkdirSync(outputDir, { recursive: true });

  for (const req of requests) {
    console.log(`Generating: ${req.name}...`);
    try {
      const result = await puter.ai.txt2img(req.prompt, {
        model: req.model || "gemini-3.1-flash-image-preview",
      });

      if (result?.src?.startsWith("data:image")) {
        const base64 = result.src.split(",")[1];
        const buffer = Buffer.from(base64, "base64");
        const path = join(outputDir, `${req.name}.png`);
        writeFileSync(path, buffer);
        console.log(`Saved: ${path} (${buffer.length} bytes)`);
      }
    } catch (err) {
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes("insufficient_funds")) {
        console.error(`Rate limited on ${req.name} — free tier credits exhausted. Wait or use Flash model.`);
      } else {
        console.error(`Failed ${req.name}: ${msg}`);
      }
    }
  }
}

// Usage:
await generateIllustrations([
  {
    name: "hero",
    prompt: "Minimal flat illustration of an AI brain with circuit patterns, deep navy (#0f172a) and amber (#f59e0b), white background, NO TEXT, NO WORDS, NO LETTERS, 1024x1024",
  },
  {
    name: "empty-state",
    prompt: "Simple line drawing of an empty inbox, light gray lines, centered composition, NO TEXT, 512x512",
  },
]);
```

### How the SDK works internally

The SDK calls `POST https://api.puter.com/drivers/call` with:
```json
{
  "interface": "puter-image-generation",
  "driver": "ai-image",
  "method": "generate",
  "args": { "prompt": "..." },
  "auth_token": "<your-jwt>"
}
```

The response is processed through an XHR polyfill and returns an object with a `.src` property containing a `data:image/png;base64,...` data URL. In Node.js, `globalThis.Image` is undefined so it returns a plain `Object` with `.src` set — not an `HTMLImageElement`.

## Method 2: Browser/Frontend (Puter.js CDN)

For generating images in client-side code or dashboards. Truly zero-setup — no auth needed.

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
Clean vector style, no gradients, thick consistent stroke weight, NO TEXT, NO WORDS, NO LETTERS.
Suitable as a hero illustration for a developer tool landing page. 1024x1024.
```

```
Flat geometric pattern of interlocking hexagons with subtle depth,
using 2 colors: slate (#334155) and emerald (#10b981).
Minimal line art, no fills, NO TEXT, NO WORDS, no photorealism.
Suitable as a section background for a SaaS dashboard. 1920x400.
```

### Prompt Rules

1. **Specify exact style**: isometric, flat, line art, 3D, watercolor, etc.
2. **Include hex colors** from your design system — don't let the model guess
3. **State dimensions**: 1024x1024 (square), 1920x1080 (hero), 512x512 (icon)
4. **Say what NOT to include**: Use ALL CAPS for "NO TEXT, NO WORDS, NO LETTERS" — the model ignores lowercase "no text" frequently
5. **Describe composition**: centered, asymmetric, full-bleed, contained
6. **Use Pro model for logos**: Flash model often adds unwanted text artifacts. Pro model (`gemini-3-pro-image-preview`) follows "no text" constraints much better but costs more credits.

## Rate Limits & Costs

| Tier | Flash Model | Pro Model |
|------|------------|-----------|
| Free (temp account) | ~10-20 images | ~1-2 images |
| Free (registered) | Higher limits | ~5-10 images |
| Puter Plus | Unlimited | High limits |

When you hit `insufficient_funds`:
- Switch from Pro to Flash model
- Wait for credit refresh (typically resets daily)
- Register a Puter account for higher limits (free)
- Consider Puter Plus for heavy usage

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| Success (result.src exists) | Image returned as data URL | Decode base64, save to file |
| `insufficient_funds` | Free tier credits exhausted | Switch to Flash model or wait |
| `auth_canceled` | No auth token | Run `getAuthToken()` to authenticate |
| 403 Forbidden | Direct API call without SDK | Use the SDK, not raw fetch |
| Network error | Puter API down | Use visual-render skill as fallback |

## Integration with UI Design Pipeline

When the `/design-pipeline` skill reaches Phase 3 (ILLUSTRATE), it automatically
uses Puter.js as the **first backend** to try. The prompt should include:

- The exact hex colors from Phase 2's color palette
- The style direction from Phase 1's inspiration board
- Dimensions appropriate for the intended use (hero, icon, empty state)

## Credits

Puter.js is an open-source project by [HeyPuter](https://github.com/HeyPuter/puter) — MIT License.
Image generation is powered by Google Gemini models accessed through Puter's API.
Free tier has rate limits — not unlimited. See [Puter pricing](https://puter.com) for details.
