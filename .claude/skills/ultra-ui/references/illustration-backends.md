# Illustration Generation Backends

## When to Generate

- Landing pages (hero illustrations, feature graphics)
- Empty states
- Error pages (404, 500)
- Onboarding flows
- Marketing sections
- Icons and spot illustrations

## Backends (Priority Order)

| # | Backend | Cost | Setup | Quality | Best For |
|---|---------|------|-------|---------|----------|
| 1 | Puter.js | Free | None | Good | OSS, zero friction |
| 2 | Gemini API | Free (limited) | API key | Great | Devs with Google account |
| 3 | gemini-webapi | Free | Cookie login | Great | Batch generation |
| 4 | TinyFish | 500 free steps | API key | Great | Complex multi-step |
| 5 | Playwright | Free | Browser install | Good | Local fallback |

---

### Backend 1: Puter.js (Recommended — Zero Setup)

No API key. No account. No rate limits.

**Browser/frontend:**
```html
<script src="https://js.puter.com/v2/"></script>
<script>
  puter.ai.txt2img(
    "Minimal isometric illustration of data nodes, navy and amber palette, clean vector, 1024x1024",
    { model: "gemini-3.1-flash-image-preview" }
  ).then(img => document.body.appendChild(img));
</script>
```

**Node.js:**
```typescript
const response = await fetch("https://api.puter.com/ai/txt2img", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "...",
    model: "gemini-3.1-flash-image-preview"
  }),
});
const blob = await response.blob();
```

**Models**: `gemini-3.1-flash-image-preview` (fast), `gemini-3-pro-image-preview` (best quality), `gemini-2.5-flash-image` (original)

---

### Backend 2: Gemini API (Official — Free Tier)

Free API key from Google AI Studio (no credit card). ~20 image requests/day via API.

```typescript
import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview-image-generation",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: { responseModalities: ["TEXT", "IMAGE"] },
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    writeFileSync(`public/illustrations/${name}.png`, buffer);
  }
}
```

Install: `npm install @google/genai`

---

### Backend 3: gemini-webapi (Cookie-Based — Unlimited Free)

Reverse-engineered Gemini web API via Python. Requires Google account cookies.

```python
from gemini_webapi import GeminiClient

client = GeminiClient(cookies={
    "__Secure-1PSID": "...",
    "__Secure-1PSIDTS": "..."
})
await client.init()
response = await client.generate_content(prompt)
# Extract image from response
```

Install: `pip install gemini-webapi`

---

### Backend 4: TinyFish (Web Agent — 500 Free Steps)

Uses TinyFish's web automation to drive Gemini's web UI. Good for complex generation workflows (edit, refine, iterate).

---

### Backend 5: Playwright (Local Browser — Free)

Automates Gemini web UI directly with Playwright.

Requires: `npx playwright install chromium`
Uses saved Google session at `/tmp/ultrathink-assets/auth/gemini-profile`.

---

## Prompt Engineering

**Bad**: "A dashboard illustration"

**Good**: "Minimal line illustration of data flowing between connected nodes, isometric perspective, using only 3 colors: deep navy (#1a1a2e), amber (#f59e0b), and white. Clean vector style, no gradients, thick consistent stroke weight. Suitable as a hero illustration for a developer tool landing page. 1024x1024."

### Rules
1. Specify the EXACT style (line art, isometric, flat, 3D, watercolor, etc.)
2. Include the color palette — use EXACT hex values from the design system
3. Describe composition and perspective
4. State intended use (hero, feature section, empty state)
5. Specify dimensions (1024x1024 default, or aspect ratio like 16:9)
6. Say what NOT to include ("no text", "no gradients", "no photorealism")
7. Reference a real art style if helpful ("in the style of Kurzgesagt", "like Stripe's illustrations")

### Prompt Template
```
[STYLE] illustration of [SUBJECT], [PERSPECTIVE] perspective,
using only [N] colors: [COLOR1 with hex], [COLOR2 with hex], and [COLOR3 with hex].
[TEXTURE/TECHNIQUE] style, [NEGATIVE CONSTRAINTS].
Suitable as [INTENDED USE] for [CONTEXT].
[DIMENSIONS].
```

---

## Static Asset Alternatives

| Source | Type | Notes |
|--------|------|-------|
| Heroicons / Lucide | Icons | Already in most projects |
| unDraw | Illustrations | Open-source, customizable colors |
| Storyset | Illustrations | Free animated/static by Freepik |
| Rive / Lottie | Interactive animations | Stateful, GPU-accelerated |
| Humaaans | People illustrations | Modular, mix-and-match |
| Open Peeps | People illustrations | Hand-drawn style |
| 3dicons | 3D icons | Open-source, perfect for claymorphism |
