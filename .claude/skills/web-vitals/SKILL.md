---
name: web-vitals
description: Core Web Vitals monitoring (LCP, FID, CLS, INP, TTFB), measurement with web-vitals library, reporting to analytics, and optimization strategies for Next.js
layer: domain
category: performance
triggers:
  - "web vitals"
  - "core web vitals"
  - "LCP"
  - "CLS"
  - "INP"
  - "TTFB"
  - "FID"
  - "page speed"
  - "lighthouse"
  - "performance score"
  - "largest contentful paint"
  - "cumulative layout shift"
  - "interaction to next paint"
inputs:
  - Application URL or codebase
  - Current performance metrics or Lighthouse scores
  - Target performance budgets
outputs:
  - Web Vitals measurement setup
  - Performance optimization recommendations
  - Reporting pipeline configuration
  - Next.js-specific optimizations
linksTo:
  - nextjs
  - performance-profiler
  - monitoring
  - image-optimization
  - chrome-devtools
linkedFrom:
  - optimize
  - audit
  - seo
preferredNextSkills:
  - performance-profiler
  - image-optimization
  - nextjs
fallbackSkills:
  - optimize
  - chrome-devtools
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add web-vitals dependency
  - May modify Next.js configuration
  - May add reporting endpoints
---

# Core Web Vitals Specialist

## Purpose

Measure, monitor, and optimize Core Web Vitals -- the user-centric performance metrics that Google uses for search ranking. This skill covers the `web-vitals` library, real-user monitoring (RUM), lab testing, and concrete optimization strategies for each metric.

## Key Metrics

### The Core Web Vitals (2024+)

| Metric | Full Name | Good | Needs Improvement | Poor | What It Measures |
|--------|-----------|------|-------------------|------|-----------------|
| **LCP** | Largest Contentful Paint | <= 2.5s | <= 4.0s | > 4.0s | Loading performance |
| **INP** | Interaction to Next Paint | <= 200ms | <= 500ms | > 500ms | Responsiveness (replaced FID) |
| **CLS** | Cumulative Layout Shift | <= 0.1 | <= 0.25 | > 0.25 | Visual stability |

### Supporting Metrics

| Metric | Full Name | Good | What It Measures |
|--------|-----------|------|-----------------|
| **TTFB** | Time to First Byte | <= 800ms | Server responsiveness |
| **FCP** | First Contentful Paint | <= 1.8s | Perceived load speed |
| **FID** | First Input Delay (deprecated) | <= 100ms | Legacy responsiveness metric |

## Key Patterns

### 1. Measuring with the web-vitals Library

```typescript
// lib/web-vitals.ts
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";

type ReportHandler = (metric: Metric) => void;

const sendToAnalytics: ReportHandler = (metric) => {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // "good" | "needs-improvement" | "poor"
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    entries: metric.entries.map((e) => ({
      name: e.name,
      startTime: e.startTime,
      duration: "duration" in e ? e.duration : undefined,
    })),
  };

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", JSON.stringify(body));
  } else {
    fetch("/api/vitals", {
      method: "POST",
      body: JSON.stringify(body),
      keepalive: true,
    });
  }
};

export function reportWebVitals() {
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

### 2. Next.js Integration

```typescript
// app/layout.tsx
import { WebVitalsReporter } from "@/components/web-vitals-reporter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <WebVitalsReporter />
      </body>
    </html>
  );
}
```

```typescript
// components/web-vitals-reporter.tsx
"use client";

import { useEffect } from "react";
import { reportWebVitals } from "@/lib/web-vitals";

export function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return null;
}
```

```typescript
// app/api/vitals/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const metric = await request.json();

  // Log for monitoring (replace with your analytics pipeline)
  console.log(`[Web Vital] ${metric.name}: ${metric.value} (${metric.rating})`);

  // Forward to your analytics service
  // await analytics.track("web_vital", metric);

  return NextResponse.json({ ok: true });
}
```

### 3. LCP Optimization

```typescript
// Priority hints for LCP element
// In Next.js, use priority prop on the LCP image
import Image from "next/image";

export function HeroSection() {
  return (
    <section>
      {/* priority prop adds fetchpriority="high" and preloads the image */}
      <Image
        src="/hero.webp"
        alt="Hero banner"
        width={1200}
        height={600}
        priority
        sizes="100vw"
      />
      <h1>Welcome</h1>
    </section>
  );
}
```

```html
<!-- Manual preload for critical resources -->
<head>
  <!-- Preload LCP image -->
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />

  <!-- Preload critical fonts -->
  <link rel="preload" as="font" href="/fonts/inter-var.woff2"
        type="font/woff2" crossorigin="anonymous" />

  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://cdn.example.com" />
  <link rel="dns-prefetch" href="https://api.example.com" />
</head>
```

```typescript
// next.config.ts -- optimize images for LCP
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 31536000, // 1 year
  },
  experimental: {
    optimizeCss: true,       // Minimize CSS for faster rendering
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
```

### 4. CLS Prevention

```typescript
// Always set explicit dimensions on images and videos
// BAD: causes layout shift
<img src="/photo.jpg" alt="Photo" />

// GOOD: reserves space
<img src="/photo.jpg" alt="Photo" width={800} height={600} />

// Next.js Image handles this automatically
<Image src="/photo.jpg" alt="Photo" width={800} height={600} />
```

```css
/* Reserve space for dynamic content with aspect-ratio */
.video-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  background-color: #f0f0f0; /* placeholder color */
}

/* Prevent font swap layout shifts */
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: optional; /* or "swap" with size-adjust */
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

/* Prevent ad/embed CLS */
.ad-slot {
  min-height: 250px; /* reserve minimum space */
  contain: layout;   /* CSS containment */
}
```

```typescript
// Prevent CLS from dynamically loaded content
"use client";

import { useState, useTransition } from "react";

export function DynamicList() {
  const [items, setItems] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const newItems = await fetchItems();
      setItems((prev) => [...prev, ...newItems]);
    });
  };

  return (
    <div>
      {/* Fixed-height container prevents CLS */}
      <div style={{ minHeight: items.length > 0 ? "auto" : "400px" }}>
        {items.map((item) => (
          <div key={item.id} className="h-20"> {/* fixed item height */}
            {item.name}
          </div>
        ))}
      </div>
      <button onClick={loadMore} disabled={isPending}>
        {isPending ? "Loading..." : "Load More"}
      </button>
    </div>
  );
}
```

### 5. INP Optimization

```typescript
// Break up long tasks with yield-to-main patterns
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    // scheduler.yield() is the modern API (Chrome 129+)
    if ("scheduler" in globalThis && "yield" in (globalThis as any).scheduler) {
      (globalThis as any).scheduler.yield().then(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Use in long-running event handlers
async function handleExpensiveClick(items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield every 50 items to keep INP low
    if (i % 50 === 0 && i > 0) {
      await yieldToMain();
    }
  }
}
```

```typescript
// Use React transitions for non-urgent updates
"use client";

import { useState, useTransition, useDeferredValue } from "react";

export function SearchWithResults() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Urgent: update input value immediately
    setQuery(e.target.value);
    // Results will re-render with deferred value (non-blocking)
  };

  return (
    <div>
      <input value={query} onChange={handleInput} />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <SearchResults query={deferredQuery} />
      </div>
    </div>
  );
}
```

### 6. TTFB Optimization

```typescript
// next.config.ts -- enable streaming and edge rendering where appropriate
const nextConfig: NextConfig = {
  // Use PPR (Partial Prerendering) for optimal TTFB
  experimental: {
    ppr: true,
  },
};
```

```typescript
// app/products/page.tsx -- streaming with Suspense
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <div>
      {/* Shell renders immediately (fast TTFB) */}
      <h1>Products</h1>
      <SearchBar />

      {/* Data streams in as it resolves */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

### 7. Performance Budget Monitoring

```typescript
// performance-budget.config.ts
export const performanceBudget = {
  lcp: 2500,    // ms
  inp: 200,     // ms
  cls: 0.1,     // score
  ttfb: 800,    // ms
  fcp: 1800,    // ms
  // Bundle budgets
  jsBundle: 150_000,  // 150KB compressed
  cssBundle: 50_000,  // 50KB compressed
  totalTransfer: 500_000, // 500KB total
} as const;

// CI check with Lighthouse
// .github/workflows/lighthouse.yml
/*
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/products
          budgetPath: ./budget.json
          uploadArtifacts: true
*/
```

```json
// budget.json (Lighthouse CI budget)
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "interactive", "budget": 3500 },
      { "metric": "first-contentful-paint", "budget": 1800 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 150 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "total", "budget": 500 }
    ]
  }
]
```

## Best Practices

1. **Measure in the field, not just in the lab** -- Lighthouse (lab) gives a starting point, but RUM data from `web-vitals` reflects real user experience
2. **Use the 75th percentile** -- Google evaluates Web Vitals at the 75th percentile of page loads, not the average
3. **Prioritize the LCP resource** -- Use `fetchpriority="high"`, preload, and avoid lazy-loading the LCP element
4. **Avoid layout shifts from web fonts** -- Use `font-display: optional` or `swap` with proper fallback metrics
5. **Defer non-critical JavaScript** -- Use dynamic imports, `next/dynamic`, or `<script defer>` for non-essential code
6. **Use CSS containment** -- `contain: layout` prevents layout recalculations from propagating
7. **Minimize main-thread work** -- Offload heavy computation to Web Workers, and yield to main between tasks
8. **Optimize server response time** -- Use edge rendering, streaming SSR, and CDN caching to reduce TTFB
9. **Set explicit sizes** on all images, videos, iframes, and ad slots to prevent CLS
10. **Test on real devices** -- Use Chrome DevTools throttling or real mobile devices, not just fast desktops

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Lazy-loading the LCP image | LCP delayed by intersection observer | Use `priority` prop or `fetchpriority="high"` |
| Injecting content above the fold after load | CLS spike | Reserve space or use CSS `contain` |
| Large synchronous event handlers | Poor INP | Break up work, use `startTransition`, yield to main |
| Third-party scripts blocking render | LCP and INP degradation | Load with `async`/`defer`, use Partytown for heavy scripts |
| No font fallback metrics | CLS on font swap | Use `size-adjust`, `ascent-override` in `@font-face` |
| Measuring only in lab (Lighthouse) | Misses real-world variation | Set up RUM with `web-vitals` library |
| Not segmenting by page type | Aggregate data hides problems | Report vitals per route/page template |
| Render-blocking CSS | Slow FCP and LCP | Inline critical CSS, defer non-critical stylesheets |

## Examples

### Example 1: Full Next.js Web Vitals Pipeline

```
1. Install: npm install web-vitals
2. Create lib/web-vitals.ts with measurement + sendBeacon reporting
3. Create WebVitalsReporter client component, mount in root layout
4. Create /api/vitals endpoint to receive and forward metrics
5. Set up Lighthouse CI in GitHub Actions for PR checks
6. Configure performance budgets in budget.json
7. Monitor field data in analytics dashboard
```

### Example 2: Optimizing a Slow Product Page

```
Problem: LCP = 4.2s, CLS = 0.35, INP = 450ms

LCP Fix:
  - Move hero image from lazy to priority loading
  - Preconnect to image CDN origin
  - Convert from PNG to AVIF/WebP

CLS Fix:
  - Add width/height to all product images
  - Reserve space for price badge that loads async
  - Set font-display: optional on custom font

INP Fix:
  - Wrap filter state update in startTransition
  - Virtualize product grid (only render visible items)
  - Move sort computation to Web Worker

Result: LCP = 1.8s, CLS = 0.02, INP = 120ms
```
