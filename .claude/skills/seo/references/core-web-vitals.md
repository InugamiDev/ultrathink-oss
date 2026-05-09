# Core Web Vitals

Three metrics Google uses for page experience ranking. Hit the green threshold or expect the rank drag.

| Metric | Green | Needs improvement | Poor | What it measures |
|---|---|---|---|---|
| **LCP** Largest Contentful Paint | ≤2.5s | 2.5–4.0s | >4.0s | When the biggest above-fold element renders |
| **INP** Interaction to Next Paint | ≤200ms | 200–500ms | >500ms | Worst-case interaction latency across the visit |
| **CLS** Cumulative Layout Shift | ≤0.1 | 0.1–0.25 | >0.25 | Visual stability while loading |

## LCP playbook

1. **Identify the LCP element.** Open Chrome DevTools → Performance → record. Look for the green `LCP` marker.
2. **If it's an image:**
   - Use `next/image` with `priority` and explicit `width/height`
   - Convert to AVIF or WebP
   - Serve responsive sizes via `srcset`
   - Preload it: `<link rel="preload" as="image" href="..." fetchpriority="high">`
3. **If it's text:**
   - Self-host the font with `font-display: swap`
   - Preload the font: `<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>`
   - Subset the font (latin only if you don't need cyrillic etc.)
4. **Cut the critical path:**
   - Inline above-fold CSS, defer the rest
   - Move analytics + chat widgets to `next/script` with `strategy="lazyOnload"`
   - Cache HTML at the edge (Vercel/CF) so server work doesn't gate first byte

## INP playbook

1. **Find the slow handler.** DevTools → Performance Insights tab → "Slow interactions".
2. **Common offenders:**
   - Synchronous JSON.parse on a 1MB blob → use a Web Worker
   - useState batched into a 200ms render → wrap mutation in `startTransition`
   - Inline event handlers re-creating objects → memoise, hoist
3. **Patterns:**
   ```typescript
   import { startTransition } from "react";
   const handleClick = () => {
     startTransition(() => setHeavyState(...));
   };
   ```
4. **Run heavy work in idle time:**
   ```typescript
   requestIdleCallback(() => doExpensiveThing());
   ```

## CLS playbook

1. **Reserve space for images / videos:** always set `width` + `height` (or `aspectRatio`).
2. **Reserve space for ads / embeds:** wrap them in a fixed-size container.
3. **Don't insert content above existing content** after first paint. If you must, prefer skeleton placeholders the same size as the eventual content.
4. **Avoid layout-thrash from web fonts:** use `font-display: optional` or preload to make swap synchronous.
5. **Tracking dynamic banners:** check for the existence of cookies before render so the consent banner doesn't pop after 200ms.

## Measuring

- **Lab:** PageSpeed Insights (`https://pagespeed.web.dev/`), Lighthouse CI in GitHub Actions
- **Field:** CrUX dataset (28-day rolling), Vercel Analytics, RUM via `web-vitals` npm

```typescript
// Report field metrics yourself
import { onLCP, onINP, onCLS } from "web-vitals";
onLCP((m) => sendBeacon("/vitals", { name: "LCP", value: m.value }));
onINP((m) => sendBeacon("/vitals", { name: "INP", value: m.value }));
onCLS((m) => sendBeacon("/vitals", { name: "CLS", value: m.value }));
```

## Quick wins (highest leverage first)

1. Move all `<script>` tags to `next/script` with `strategy="lazyOnload"` — except critical ones
2. Add `priority` to the hero `<Image>`
3. Self-host fonts + preload them
4. Cache HTML at the edge
5. Remove unused JS (run `next build` and inspect the route bundle sizes)
6. Drop heavy dependencies: replace `moment` with `date-fns`, `lodash` with stdlib, etc.
