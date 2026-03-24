---
name: chrome-devtools
description: Browser automation, debugging, performance profiling, and DevTools-driven diagnostics via Playwright
layer: utility
category: tooling
triggers:
  - "open browser"
  - "inspect page"
  - "debug in browser"
  - "performance profile"
  - "lighthouse audit"
  - "network requests"
  - "console errors"
  - "test in browser"
inputs:
  - url: Target URL to inspect or automate
  - action: inspect | profile | automate | debug | audit
  - selectors: CSS selectors for specific elements (optional)
outputs:
  - inspection_results: Page structure, accessibility tree, computed styles
  - performance_data: Load times, resource sizes, rendering metrics
  - console_logs: Captured browser console output
  - network_log: HTTP request/response log
  - screenshots: Visual captures of page state
  - automation_result: Result of browser automation scripts
linksTo:
  - ui-ux-pro
  - ai-multimodal
  - error-handling
linkedFrom:
  - orchestrator
  - planner
preferredNextSkills:
  - ui-ux-pro
  - error-handling
fallbackSkills:
  - ai-multimodal
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - browser_state: Opens and interacts with browser instances
  - network: Makes HTTP requests to target URLs
---

# Chrome DevTools

## Purpose

This skill provides browser-based debugging, inspection, performance profiling, and automation capabilities via Playwright MCP. It enables direct interaction with web pages — navigating, clicking, reading content, capturing screenshots, monitoring network requests, and evaluating JavaScript — all without requiring a manual browser session.

## Key Concepts

### Available Capabilities

Through Playwright MCP, this skill can:

| Capability | Tools | Use Case |
|------------|-------|----------|
| **Navigation** | browser_navigate, browser_navigate_back | Load pages, follow flows |
| **Inspection** | browser_snapshot, browser_take_screenshot | Read page structure, capture visual state |
| **Interaction** | browser_click, browser_type, browser_fill_form | Automate user actions |
| **Evaluation** | browser_evaluate | Run JavaScript in page context |
| **Monitoring** | browser_console_messages, browser_network_requests | Capture logs and network traffic |
| **Waiting** | browser_wait_for | Wait for content to appear/disappear |
| **Tabs** | browser_tabs | Manage multiple pages |

### Snapshot vs Screenshot

- **Snapshot** (`browser_snapshot`): Returns the accessibility tree as structured text. Best for understanding page structure, finding interactive elements, and getting element references for actions. Use this for most inspection tasks.
- **Screenshot** (`browser_take_screenshot`): Returns a visual image. Best for visual regression checking, capturing current state for review, and when the visual layout matters more than the DOM structure.

**Rule**: Use snapshot first to understand the page, screenshot to capture visual evidence.

## Workflows

### Workflow 1: Page Inspection

```
STEP 1: Navigate to the target URL
  → browser_navigate(url)

STEP 2: Capture the accessibility snapshot
  → browser_snapshot()
  → Analyze the page structure, identify key elements

STEP 3: Take a screenshot for visual reference
  → browser_take_screenshot(type: "png")

STEP 4: Check console for errors
  → browser_console_messages(level: "error")

STEP 5: Check network requests
  → browser_network_requests(includeStatic: false)

OUTPUT:
  PAGE STRUCTURE: [From snapshot]
  VISUAL STATE: [Screenshot reference]
  ERRORS: [Console errors found]
  FAILED REQUESTS: [4xx/5xx responses]
  RECOMMENDATIONS: [Based on findings]
```

### Workflow 2: Performance Profiling

```
STEP 1: Navigate with timing
  → browser_navigate(url)
  → Note: Playwright captures load timing automatically

STEP 2: Capture network waterfall
  → browser_network_requests(includeStatic: true)
  → Analyze: total requests, total transfer size, slow requests

STEP 3: Evaluate performance metrics via JavaScript
  → browser_evaluate:
    () => {
      const perf = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      return {
        dns: perf.domainLookupEnd - perf.domainLookupStart,
        tcp: perf.connectEnd - perf.connectStart,
        ttfb: perf.responseStart - perf.requestStart,
        domLoad: perf.domContentLoadedEventEnd - perf.navigationStart,
        fullLoad: perf.loadEventEnd - perf.navigationStart,
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        resources: performance.getEntriesByType('resource').length,
      };
    }

STEP 4: Check for layout shifts
  → browser_evaluate:
    () => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          resolve(list.getEntries().map(e => ({
            value: e.value,
            sources: e.sources?.map(s => s.node?.nodeName)
          })));
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve([]), 3000);
      });
    }

STEP 5: Analyze resource sizes
  → browser_evaluate:
    () => {
      return performance.getEntriesByType('resource')
        .map(r => ({ name: r.name.split('/').pop(), size: r.transferSize, duration: r.duration }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 20);
    }

OUTPUT:
  METRICS:
    TTFB: [value] ms [good < 200, needs work 200-600, poor > 600]
    FCP: [value] ms [good < 1800, needs work 1800-3000, poor > 3000]
    DOM Load: [value] ms
    Full Load: [value] ms
  TOP RESOURCES BY SIZE: [list]
  LAYOUT SHIFTS: [count and sources]
  RECOMMENDATIONS: [prioritized list]
```

### Workflow 3: Interactive Debugging

```
STEP 1: Navigate to the page with the issue
  → browser_navigate(url)

STEP 2: Capture initial state
  → browser_snapshot() — get element references
  → browser_console_messages(level: "error") — check for existing errors

STEP 3: Reproduce the issue
  → browser_click(ref: "element_ref") — interact with elements
  → browser_type(ref: "input_ref", text: "test data") — fill inputs
  → browser_wait_for(text: "expected text") — wait for results

STEP 4: Capture post-action state
  → browser_console_messages(level: "error") — new errors
  → browser_network_requests(includeStatic: false) — failed requests
  → browser_snapshot() — updated page structure

STEP 5: Evaluate application state
  → browser_evaluate:
    () => {
      // Inspect React state (if React app)
      const fiber = document.querySelector('#root')?._reactRootContainer;
      // Or check global state
      return window.__STORE__?.getState();
    }

STEP 6: Diagnose
  → Correlate console errors with network failures and state changes
  → Identify the root cause
  → Suggest fixes
```

### Workflow 4: Automated Testing Flow

```
STEP 1: Navigate to starting page
  → browser_navigate(url)
  → browser_snapshot()

STEP 2: Execute user flow
  → browser_click(ref: "login_button")
  → browser_fill_form(fields: [
      { name: "email", type: "textbox", ref: "email_input", value: "test@example.com" },
      { name: "password", type: "textbox", ref: "password_input", value: "testpass123" }
    ])
  → browser_click(ref: "submit_button")
  → browser_wait_for(text: "Dashboard")

STEP 3: Verify results
  → browser_snapshot() — confirm expected page loaded
  → browser_take_screenshot(type: "png") — visual evidence
  → browser_console_messages(level: "error") — no errors

STEP 4: Report
  FLOW: [description of what was tested]
  RESULT: [pass/fail]
  EVIDENCE: [screenshots, console output, network log]
  ISSUES: [any problems encountered]
```

## Diagnostic Patterns

### Pattern: Broken Layout Diagnosis

```
1. browser_snapshot() — check accessibility tree for structural issues
2. browser_evaluate(() => {
     // Find overflow issues
     return [...document.querySelectorAll('*')].filter(el => {
       const r = el.getBoundingClientRect();
       return r.right > window.innerWidth || r.bottom > window.innerHeight;
     }).map(el => ({ tag: el.tagName, class: el.className, width: el.scrollWidth }));
   })
3. browser_resize(width: 375, height: 812) — test mobile viewport
4. browser_take_screenshot(type: "png") — capture mobile rendering
5. browser_resize(width: 1280, height: 720) — restore desktop
```

### Pattern: API Error Investigation

```
1. browser_navigate(url)
2. browser_network_requests(includeStatic: false)
3. Filter for failed requests (4xx, 5xx)
4. For each failed request:
   - Note the URL, method, status code
   - browser_evaluate to inspect request/response headers
   - Check if CORS errors appear in console
5. Report: endpoint, error type, likely cause, fix
```

### Pattern: Memory Leak Detection

```
1. browser_navigate(url)
2. browser_evaluate(() => performance.memory) — initial memory
3. Perform the suspected leaking action N times:
   → browser_click / browser_navigate / browser_type
4. browser_evaluate(() => performance.memory) — final memory
5. Compare: if usedJSHeapSize grows proportionally, leak confirmed
6. browser_evaluate(() => {
     // Check for detached DOM nodes
     return performance.getEntriesByType('resource').length;
   })
```

## JavaScript Evaluation Recipes

### Get All Links on Page

```javascript
() => [...document.querySelectorAll('a')].map(a => ({
  text: a.textContent.trim(),
  href: a.href,
  external: a.hostname !== location.hostname
}))
```

### Check Image Loading

```javascript
() => [...document.querySelectorAll('img')].map(img => ({
  src: img.src,
  alt: img.alt || 'MISSING ALT',
  loaded: img.complete && img.naturalWidth > 0,
  size: `${img.naturalWidth}x${img.naturalHeight}`,
  lazy: img.loading === 'lazy'
}))
```

### Extract Meta Tags

```javascript
() => [...document.querySelectorAll('meta')].map(m => ({
  name: m.name || m.getAttribute('property'),
  content: m.content
})).filter(m => m.name)
```

### Check Accessibility Basics

```javascript
() => ({
  title: document.title,
  lang: document.documentElement.lang,
  h1Count: document.querySelectorAll('h1').length,
  imagesWithoutAlt: [...document.querySelectorAll('img:not([alt])')].length,
  buttonsWithoutLabel: [...document.querySelectorAll('button')].filter(
    b => !b.textContent.trim() && !b.getAttribute('aria-label')
  ).length,
  formInputsWithoutLabel: [...document.querySelectorAll('input:not([type="hidden"])')].filter(
    i => !i.labels?.length && !i.getAttribute('aria-label')
  ).length,
  focusableElements: document.querySelectorAll('a, button, input, select, textarea, [tabindex]').length
})
```

## Anti-Patterns

1. **Screenshot-first**: Taking screenshots before snapshots. Snapshots are more information-dense and provide element references for interaction. Always snapshot first.
2. **Missing wait states**: Clicking a button and immediately reading the page. Always use `browser_wait_for` after actions that trigger async operations.
3. **Hardcoded selectors**: Using brittle CSS selectors that break with minor DOM changes. Prefer element references from snapshots.
4. **Ignoring console**: Not checking console messages after interactions. Many client-side errors only appear in the console.
5. **Not closing browsers**: Leaving browser instances open after completing tasks. Always use `browser_close` when finished.

## Integration Notes

- Hand off visual findings to **ui-ux-pro** for design system recommendations.
- Hand off screenshots to **ai-multimodal** for detailed visual analysis.
- Hand off error patterns to **error-handling** for systematic resolution strategies.
- When performance issues are found, link to **media-processing** for asset optimization recommendations.
