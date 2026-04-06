---
name: playwright
description: End-to-end testing framework for modern web apps -- browser automation, visual regression, and cross-browser testing
layer: domain
category: testing
triggers:
  - "playwright test"
  - "e2e test"
  - "browser test"
  - "visual regression"
  - "cross-browser test"
inputs:
  - target: Page, component, or user flow to test
  - browsers: chromium | firefox | webkit | all (default: chromium)
outputs:
  - testFiles: Playwright test specs
  - testResults: Pass/fail with traces and screenshots
linksTo: [test, test-ui, testing-patterns, chrome-devtools]
linkedFrom: [test, ship]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates test files and generates screenshots/trace files
  - Launches browser processes
---

# Playwright

End-to-end testing framework for modern web apps. Supports Chromium, Firefox, and WebKit with a single API. Auto-waits for elements, intercepts network, and captures traces for debugging.

## When to Use

- Testing critical user flows across real browsers
- Visual regression testing with screenshot comparison
- Network mocking for deterministic API responses
- Component testing with `@playwright/experimental-ct-react`

## Key Patterns

### Page Object Model
Encapsulate page interactions in classes. Tests call `loginPage.signIn(user)` instead of raw selectors. Keeps tests readable and selectors maintainable in one place.

### Locator Strategies
Prefer resilient locators: `getByRole` > `getByLabel` > `getByText` > `getByTestId`. Avoid CSS/XPath -- they break on DOM changes.

### Assertions with Auto-Retry
Use `expect(locator)` assertions -- they auto-retry until timeout. `await expect(page.getByText('Success')).toBeVisible()`. Never use `waitForTimeout`.

### Visual Comparison
`await expect(page).toHaveScreenshot('name.png')` captures and diffs screenshots. Use `maxDiffPixelRatio` for tolerance. Update baselines with `--update-snapshots`.

### Network Mocking
`await page.route('**/api/users', route => route.fulfill({ json: mockData }))` intercepts requests. Use `route.abort()` to simulate failures.

### Multi-Browser Testing
Configure `projects` in `playwright.config.ts` to run across browsers. Each project specifies a browser and viewport. CI runs all; local dev targets one.

### Fixtures and Hooks
Use `test.beforeEach` for shared setup. Custom fixtures extend `test` for reusable context like authenticated pages or seeded databases.

### Parallel Execution
Tests run in parallel by default. Use `test.describe.serial` only when order matters. Isolate state to avoid flakes.

### Trace Viewer
`npx playwright show-trace trace.zip` replays execution with DOM snapshots, network log, and console. Enable with `trace: 'on-first-retry'`.

### Component Testing
`@playwright/experimental-ct-react` mounts components in a real browser for testing interactive elements needing real DOM, CSS, and browser APIs.

## Anti-Patterns

1. **`waitForTimeout` over locator assertions** -- Flaky. Use auto-retrying `expect`.
2. **CSS/XPath over semantic locators** -- Brittle. Prefer `getByRole`, `getByTestId`.
3. **Shared mutable state** -- Tests must be independent. Use `beforeEach` for setup.
4. **Testing third-party UI** -- Mock OAuth popups and captchas at the network layer.
5. **Skipping `webServer` config** -- Let Playwright manage your dev server for reliable CI.
6. **Giant test files** -- Split by feature. One `describe` per user flow.
