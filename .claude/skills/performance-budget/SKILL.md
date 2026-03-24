---
name: performance-budget
description: Performance budgets — bundle size limits, LCP/FID/CLS targets, lighthouse CI, size-limit, bundlephobia
layer: domain
category: performance
triggers:
  - "performance budget"
  - "bundle budget"
  - "size limit"
  - "lighthouse ci"
  - "performance target"
  - "bundle limit"
inputs:
  - "Application performance requirements"
  - "Bundle size concerns"
  - "Core Web Vitals targets"
  - "CI performance enforcement needs"
outputs:
  - "Performance budget configuration files"
  - "CI pipeline with budget enforcement"
  - "Bundle analysis and optimization recommendations"
  - "Core Web Vitals monitoring setup"
linksTo:
  - web-vitals
  - code-splitting
  - image-optimization
linkedFrom:
  - optimize
  - web-vitals
preferredNextSkills:
  - web-vitals
  - code-splitting
fallbackSkills:
  - image-optimization
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Performance Budgets

## Purpose

Provide expert guidance on defining, measuring, and enforcing performance budgets for web applications. Covers bundle size limits with size-limit, Core Web Vitals targets, Lighthouse CI integration, and CI pipeline enforcement to prevent performance regressions before they reach production.

## Key Patterns

### Defining Performance Budgets

Start with targets based on user impact, not arbitrary numbers.

**Core Web Vitals targets (Good threshold):**

| Metric | Target | What It Measures |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Loading performance |
| INP (Interaction to Next Paint) | < 200ms | Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | Visual stability |
| FCP (First Contentful Paint) | < 1.8s | Perceived load speed |
| TTFB (Time to First Byte) | < 800ms | Server responsiveness |

**Bundle size budgets (recommended starting points):**

| Resource | Budget | Rationale |
|----------|--------|-----------|
| Initial JS (compressed) | < 150 KB | Parse/execute time on mobile |
| Initial CSS | < 50 KB | Render-blocking resource |
| Total page weight | < 500 KB | 3G load time under 5s |
| Largest single chunk | < 100 KB | Avoid dominating the bundle |
| Images per page | < 500 KB | Largest weight contributor |

### size-limit Configuration

Enforce bundle size budgets in CI with `size-limit`.

```json
// package.json
{
  "scripts": {
    "size": "size-limit",
    "size:check": "size-limit --json"
  },
  "devDependencies": {
    "size-limit": "^11.0.0",
    "@size-limit/preset-app": "^11.0.0"
  }
}
```

```javascript
// .size-limit.js
module.exports = [
  {
    name: "Initial JS",
    path: ".next/static/chunks/**/*.js",
    limit: "150 KB",
    gzip: true,
  },
  {
    name: "Shared UI package",
    path: "packages/ui/dist/index.js",
    limit: "30 KB",
    gzip: true,
    import: "{ Button, Card, Input }",
  },
  {
    name: "Utils package",
    path: "packages/utils/dist/index.js",
    limit: "10 KB",
    gzip: true,
  },
  {
    name: "CSS bundle",
    path: ".next/static/css/**/*.css",
    limit: "50 KB",
    gzip: true,
  },
];
```

**For library packages (tree-shaking verification):**

```javascript
// .size-limit.js for a UI library
module.exports = [
  {
    name: "Full bundle",
    path: "dist/index.js",
    limit: "45 KB",
  },
  {
    name: "Button only (tree-shaking)",
    path: "dist/index.js",
    import: "{ Button }",
    limit: "5 KB",
  },
  {
    name: "Card only (tree-shaking)",
    path: "dist/index.js",
    import: "{ Card }",
    limit: "3 KB",
  },
];
```

### Lighthouse CI

Automate Lighthouse audits in CI to catch performance regressions.

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/products",
        "http://localhost:3000/checkout"
      ],
      "startServerCommand": "pnpm start",
      "startServerReadyPattern": "ready on",
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "cpuSlowdownMultiplier": 2
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**GitHub Actions integration:**

```yaml
name: Performance Budget

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Check bundle size
        run: pnpm size

      - name: Bundle size report
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_script: ""
          skip_step: build

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

      - name: Comment results on PR
        if: github.event_name == 'pull_request'
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

### Next.js Bundle Analysis

```bash
# Install the analyzer
pnpm add -D @next/bundle-analyzer
```

```javascript
// next.config.js
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "lodash-es",
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
```

### Custom Budget Enforcement Script

For more granular control than size-limit provides:

```typescript
// scripts/check-budget.ts
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { gzipSync } from "zlib";

interface Budget {
  name: string;
  pattern: RegExp;
  maxSize: number; // bytes, gzipped
}

const budgets: Budget[] = [
  { name: "Framework JS", pattern: /framework-.*\.js$/, maxSize: 50_000 },
  { name: "App JS", pattern: /app\/.*\.js$/, maxSize: 100_000 },
  { name: "CSS total", pattern: /\.css$/, maxSize: 50_000 },
];

function getGzipSize(filePath: string): number {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const buildDir = ".next/static";
const allFiles = walkDir(buildDir);
let failed = false;

for (const budget of budgets) {
  const matchingFiles = allFiles.filter((f) => budget.pattern.test(f));
  const totalSize = matchingFiles.reduce((sum, f) => sum + getGzipSize(f), 0);

  const status = totalSize > budget.maxSize ? "FAIL" : "PASS";
  const sizeKB = (totalSize / 1024).toFixed(1);
  const limitKB = (budget.maxSize / 1024).toFixed(1);

  console.log(`${status}: ${budget.name} - ${sizeKB} KB / ${limitKB} KB`);

  if (totalSize > budget.maxSize) {
    failed = true;
  }
}

if (failed) {
  console.error("\nBundle budget exceeded. Run `pnpm analyze` to investigate.");
  process.exit(1);
}
```

### Monitoring in Production

```typescript
// Report Core Web Vitals to your analytics endpoint
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  navigator.sendBeacon(
    "/api/vitals",
    JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      url: location.href,
      timestamp: Date.now(),
    })
  );
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

## Best Practices

- **Set budgets based on user scenarios** -- a 3G connection in an emerging market needs stricter budgets than desktop broadband.
- **Enforce budgets in CI as blocking checks** -- performance regressions are much harder to fix after merging.
- **Use gzip size for budget comparisons** -- raw size is misleading because compression varies by content type.
- **Run Lighthouse on multiple pages** -- the homepage is often light; product pages and checkout may be heavy.
- **Track budgets over time** -- use Lighthouse CI server or a dashboard to spot trends before they breach limits.
- **Audit npm dependencies regularly** -- a single dependency update can add 50KB+ to your bundle.
- **Use `optimizePackageImports`** in Next.js for barrel-file-heavy libraries to ensure tree shaking works.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Budget on raw size, not gzip | Misleading numbers; 500KB raw may be 80KB gzipped | Always measure and budget gzip (or brotli) size |
| No budget on per-route bundles | Home page is fine but product page loads 500KB of charts | Add per-route or per-chunk budgets |
| Lighthouse on localhost only | No network latency or real-world conditions | Use throttling profiles or test against deployed preview URLs |
| Ignoring third-party scripts | Analytics, chat widgets, ads add 200KB+ | Include third-party scripts in budget; lazy-load non-essential ones |
| Setting budgets too loose | Budget never fails, regressions accumulate | Start tight and adjust -- a budget that never triggers is useless |
| Not analyzing what changed | Budget fails but no context on why | Use `size-limit-action` PR comments or `@next/bundle-analyzer` |
