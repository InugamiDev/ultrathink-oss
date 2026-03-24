---
name: accessibility-testing
description: Accessibility testing with axe-core, pa11y, Lighthouse, screen reader testing, and WCAG compliance verification
layer: domain
category: testing
triggers:
  - "accessibility testing"
  - "a11y testing"
  - "axe-core"
  - "pa11y"
  - "screen reader"
  - "WCAG compliance"
  - "lighthouse accessibility"
  - "aria testing"
inputs:
  - "Components or pages needing accessibility audit"
  - "WCAG compliance level requirements (A, AA, AAA)"
  - "Accessibility CI pipeline setup needs"
  - "Screen reader testing guidance"
outputs:
  - "Automated accessibility test configurations"
  - "axe-core integration with test frameworks"
  - "CI pipeline accessibility gates"
  - "Manual testing checklists for screen readers"
linksTo:
  - test
  - test-ui
  - cicd
  - design-systems
linkedFrom:
  - ui-ux-pro
  - testing-strategy
preferredNextSkills:
  - test-ui
  - design-systems
fallbackSkills:
  - test
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Accessibility Testing

## Purpose

Implement automated and manual accessibility testing to ensure WCAG 2.2 compliance. Covers integration of axe-core with testing frameworks, pa11y for page-level scanning, Lighthouse CI for performance and accessibility scoring, and manual screen reader testing protocols.

## Key Patterns

### axe-core with Vitest + Testing Library

**Component-level a11y testing:**

```typescript
// setup: npm install -D @axe-core/react vitest-axe
// vitest.setup.ts
import 'vitest-axe/extend-expect';

// components/button.test.tsx
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from './button';

describe('Button accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Submit</Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <Button disabled onClick={() => {}}>Submit</Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations as icon-only button', async () => {
    const { container } = render(
      <Button onClick={() => {}} aria-label="Close dialog">
        <CloseIcon className="w-4 h-4" />
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Custom axe configuration for specific rules:**

```typescript
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

// Test with specific WCAG level
it('meets WCAG AA color contrast', async () => {
  const { container } = render(<Card />);
  const results = await axe(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag22aa'],
    },
  });
  expect(results).toHaveNoViolations();
});

// Ignore specific rules when intentional
it('passes a11y (excluding color-contrast for themed components)', async () => {
  const { container } = render(<ThemedBanner />);
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  expect(results).toHaveNoViolations();
});
```

### axe-core with Playwright (E2E)

```typescript
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no a11y violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('login form is accessible', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .include('#login-form')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('modal dialog is accessible when open', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New project' }).click();

    // Wait for modal to be visible
    await page.getByRole('dialog').waitFor();

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(results.violations).toEqual([]);
  });

  // Scan all critical pages
  const pages = ['/', '/login', '/dashboard', '/settings', '/pricing'];

  for (const path of pages) {
    test(`${path} has no a11y violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
```

### pa11y -- Page-Level Scanning

**CLI usage:**

```bash
# Scan a single page
npx pa11y https://myapp.com --standard WCAG2AA --reporter json

# Scan with actions (interact before testing)
npx pa11y https://myapp.com/login \
  --standard WCAG2AA \
  --actions "set field #email to test@example.com" \
  --actions "click element #submit" \
  --actions "wait for url to be https://myapp.com/dashboard"
```

**pa11y-ci for multiple pages:**

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000,
    "wait": 1000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/dashboard",
    {
      "url": "http://localhost:3000/settings",
      "actions": [
        "navigate to http://localhost:3000/login",
        "set field #email to admin@test.com",
        "set field #password to testpass",
        "click element button[type=submit]",
        "wait for url to be http://localhost:3000/dashboard",
        "navigate to http://localhost:3000/settings"
      ]
    }
  ]
}
```

### Lighthouse CI

**lighthouserc.js:**

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/pricing',
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        // Specific a11y audits
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'meta-viewport': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Screen Reader Testing Checklist

```text
## Manual Screen Reader Test Protocol

### Setup
- macOS: VoiceOver (Cmd+F5)
- Windows: NVDA (free) or JAWS
- Mobile: TalkBack (Android) or VoiceOver (iOS)

### Test Checklist

[ ] Page title announced on navigation
[ ] Headings hierarchy makes sense (h1 > h2 > h3, no skips)
[ ] All images have descriptive alt text (or alt="" for decorative)
[ ] Form labels announced for every input
[ ] Error messages associated with inputs (aria-describedby)
[ ] Buttons and links have descriptive names
[ ] Modal focus trapped inside dialog
[ ] Focus returns to trigger element when modal closes
[ ] Skip-to-content link works
[ ] Dynamic content announced via aria-live regions
[ ] Tables have headers (th) and captions
[ ] Custom widgets have correct ARIA roles and states

### Keyboard Navigation
[ ] Tab order is logical (visual left-to-right, top-to-bottom)
[ ] Focus indicator visible on all interactive elements
[ ] Escape closes modals/dropdowns
[ ] Enter/Space activates buttons
[ ] Arrow keys navigate within composite widgets (tabs, menus)
[ ] No keyboard traps (can always Tab away)
```

### CI Pipeline Integration

```yaml
# .github/workflows/a11y.yml
name: Accessibility
on: [pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build

      # Component-level axe tests
      - run: npm run test -- --filter=a11y

      # Page-level pa11y scan
      - name: Start server
        run: npm run start &
      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: pa11y-ci
        run: npx pa11y-ci

      # Lighthouse CI
      - name: Lighthouse
        run: npx @lhci/cli autorun
```

## Best Practices

1. **Automate first, manual second** -- axe-core catches ~57% of WCAG issues automatically. Add it to every component test. Then do manual testing for the rest.
2. **Test at multiple levels** -- Component tests (axe + Testing Library), page tests (pa11y/Lighthouse), and manual screen reader testing.
3. **Fail CI on accessibility regressions** -- Treat a11y violations as blocking errors, not warnings.
4. **Use semantic HTML before ARIA** -- A `<button>` is always better than `<div role="button">`. ARIA is a patch, not a replacement.
5. **Test with real screen readers** -- Automated tools miss interaction patterns. Test with VoiceOver/NVDA quarterly.
6. **Include keyboard-only testing** -- Unplug the mouse and navigate your app. Every feature must be keyboard accessible.
7. **Test dynamic content** -- Modals, toasts, loading states, and live updates need aria-live and focus management testing.
8. **Track accessibility score over time** -- Use Lighthouse CI history to detect regressions before they ship.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Only testing with axe | Automated tools catch ~57% of issues; misses interaction patterns | Combine axe with manual screen reader testing |
| Missing focus management in modals | Screen reader users can interact with content behind modal | Trap focus inside dialog; return focus on close |
| Icon-only buttons without labels | Screen readers announce nothing useful | Add `aria-label` or visually hidden text |
| Color as sole indicator | Color-blind users miss status changes | Add icons, text, or patterns alongside color |
| Skipping heading levels | Screen reader navigation by headings is broken | Use sequential heading hierarchy: h1 > h2 > h3 |
| Auto-playing media | Disorienting for screen reader users | Never autoplay; provide play/pause controls |
| `aria-hidden="true"` on focusable elements | Focus lands on hidden element, confusing screen readers | Remove from tab order too: `tabindex="-1"` |
| Testing only desktop viewport | Mobile a11y issues missed (touch targets, zoom) | Test at mobile breakpoints; ensure touch targets are 44x44px minimum |
