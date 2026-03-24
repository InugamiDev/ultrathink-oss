---
name: image-pipeline
description: Autonomous image generation pipeline — TinyFish, Gemini-API, Playwright backends
layer: domain
category: ai-ml
triggers:
  - image pipeline
  - generate image
  - generate illustration
  - asset pipeline
  - create illustration
  - create asset
  - tinyfish
  - gemini image
  - batch image
  - image generation
  - nano banana
linksTo:
  - agora
  - ai-agents
  - nextjs
  - api-designer
linkedFrom:
  - ai-multimodal
riskLevel: medium
---

# Image Pipeline — Autonomous Asset Generation

Generate illustrations and assets through Google Gemini via three configurable backends:
**TinyFish** (primary) → **Gemini-API** (Option C) → **Playwright** (fallback).

## Architecture

```
Claude Code (user describes assets)
       ↓
JSON Manifest: [{id, prompt, style, dimensions}, ...]
       ↓
Backend Selection (configurable in dashboard)
       ↓
┌─────────────┬──────────────────┬────────────────────┐
│  TinyFish   │   Gemini-API     │    Playwright       │
│  (primary)  │   (Option C)     │    (fallback)       │
│             │                  │                     │
│ Cloud agent │ Python webapi    │ Local browser       │
│ SSE stream  │ Cookie auth      │ Chromium automation │
│ $0.015/step │ Free (fragile)   │ Free (local)        │
└─────────────┴──────────────────┴────────────────────┘
       ↓
Generated assets → /tmp/ultrathink-assets/output/
```

## Pipeline Flow

### 1. Create Manifest (CLI or Dashboard)

**Via Claude Code** — describe assets naturally:
```
"Create a manifest called 'App Icons' with:
- A futuristic brain icon with circuit patterns
- An abstract wave pattern in amber and black
- A minimalist rocket ship logo"
```

The skill converts this to a JSON manifest and calls the API.

**Via Dashboard** — navigate to `/assets`, click "New Manifest":
- Enter name, description, select backend
- Type one prompt per line or paste JSON array
- Click Create

### 2. Configure Backend (Dashboard → /assets → Configure)

**TinyFish** (recommended for reliability):
- API Key: Get from https://agent.tinyfish.ai/api-keys
- Browser Profile: `stealth` (default) or `lite`
- Target URL: `https://gemini.google.com`

**Gemini-API** (free, Python-based):
- Requires `pip install gemini_webapi`
- Cookie auth: Copy `__Secure-1PSID` and `__Secure-1PSIDTS` from gemini.google.com dev tools
- Model: `gemini-3-flash` (default), `gemini-3-pro`, `gemini-3-flash-thinking`

**Playwright** (local fallback):
- Requires `npx playwright install chromium`
- Headless mode toggle
- Configurable timeout

### 3. Generate

**Via Dashboard**: Click play button on manifest → pipeline processes each asset sequentially.

**Via API**:
```bash
# Create manifest
curl -X POST http://localhost:3333/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-manifest",
    "name": "My Assets",
    "backend": "tinyfish",
    "assets": [
      {"prompt": "A cyberpunk cityscape", "style": "illustration", "dimensions": "1024x1024"},
      {"prompt": "Abstract geometric logo", "style": "minimalist"}
    ]
  }'

# Start generation
curl -X POST http://localhost:3333/api/assets/generate \
  -H "Content-Type: application/json" \
  -d '{"manifestId": "ast_xxx"}'

# Check status
curl http://localhost:3333/api/assets?id=ast_xxx
```

### 4. Monitor

Dashboard auto-polls every 3s during generation. Each asset shows:
- Status: pending → generating → completed/failed
- Progress bar per manifest
- Error messages with retry count
- Output file paths

## Backend Details

### TinyFish API

```
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers: X-API-Key: $TINYFISH_API_KEY
Body: { url, goal, browser_profile }
Response: SSE stream → { type: "COMPLETE", result: {...} }
```

Pricing: 500 free steps, then $0.015/step or $15/mo starter plan.

### Gemini-API (Python)

```python
from gemini_webapi import GeminiClient

client = GeminiClient(secure_1psid, secure_1psidts)
await client.init(timeout=60)
response = await client.generate_content("Generate an image: ...")
# response.images[0].url or response.images[0].data (base64)
```

Requires Python 3.10+. Cookies auto-refresh. Model selection via `model` param.

### Playwright

Automates Chromium browser to interact with gemini.google.com directly.
Finds prompt input, types, waits for generation, extracts image from DOM.
Most resilient to API changes but slowest.

## Manifest JSON Schema

```typescript
interface AssetManifest {
  id: string;           // auto-generated: ast_<ts>_<rand>
  name: string;         // human-readable name
  description?: string;
  backend: "tinyfish" | "gemini-api" | "playwright";
  assets: AssetEntry[];
  createdAt: string;    // ISO timestamp
  updatedAt: string;
}

interface AssetEntry {
  id: string;
  prompt: string;           // image description
  negativePrompt?: string;  // what to avoid
  style?: string;           // illustration, minimalist, etc.
  dimensions?: string;      // 1024x1024
  status: "pending" | "generating" | "completed" | "failed";
  outputPath?: string;      // file path when completed
  error?: string;           // error message when failed
  retries: number;
  generatedAt?: string;
}
```

## Storage

- Manifests: `/tmp/ultrathink-assets/manifests/<id>.json`
- Output: `/tmp/ultrathink-assets/output/<asset-id>.png`
- Config: `/tmp/ultrathink-assets/config.json`

## Dashboard

Page: `http://localhost:3333/assets`
- Stats overview (manifests, total assets, completed, generating)
- Backend configuration panel (tabbed: TinyFish / Gemini-API / Playwright)
- Manifest list with expand/collapse, progress bars, status pills
- Create manifest modal (text or JSON input)
- Per-asset status with error details

## Error Handling

- Failed assets can be retried (click Generate again — only pending/failed assets are processed)
- Each backend has its own timeout (TinyFish: server-side, Gemini-API: 120s, Playwright: configurable)
- Temp script files cleaned up after execution
- All subprocess calls use `execFileSync` (no shell injection)
