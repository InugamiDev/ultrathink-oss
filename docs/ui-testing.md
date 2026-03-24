# UI Testing

## Overview

UltraThink includes a UI testing workflow that captures screenshots across multiple viewports, evaluates visual quality, and generates detailed Markdown reports. The `test-ui` skill (triggered via `/test:ui`) uses browser automation to test web pages at configurable screen sizes.

## Architecture

```
User triggers /test:ui
    |
    v
test-ui skill loaded
    |
    v
For each viewport in ck.json:
    1. Resize browser to viewport dimensions
    2. Navigate to target URL/route
    3. Wait for page load
    4. Capture screenshot
    5. Analyze visual quality
    6. Log console errors/warnings
    7. Check network failures
    |
    v
Generate Markdown report
    |
    v
Save to reports/ui-tests/
```

## Configuration

UI test settings are defined in `.claude/ck.json`:

```json
{
  "uiTest": {
    "viewports": ["375x667", "768x1024", "1440x900"],
    "reportDir": "./reports/ui-tests"
  }
}
```

### Default Viewports

| Viewport | Resolution | Device Category |
|----------|-----------|-----------------|
| `375x667` | 375 x 667 | Mobile (iPhone SE/8) |
| `768x1024` | 768 x 1024 | Tablet (iPad) |
| `1440x900` | 1440 x 900 | Desktop (standard laptop) |

### Custom Viewports

Add viewports as `WIDTHxHEIGHT` strings:

```json
{
  "uiTest": {
    "viewports": [
      "320x568",   // iPhone SE (1st gen)
      "375x667",   // iPhone 8
      "390x844",   // iPhone 14
      "768x1024",  // iPad
      "1024x768",  // iPad landscape
      "1280x720",  // HD laptop
      "1440x900",  // Standard desktop
      "1920x1080", // Full HD
      "2560x1440"  // QHD monitor
    ]
  }
}
```

## Running UI Tests

### Basic Usage

```
/test:ui https://localhost:3000
```

Tests the given URL across all configured viewports.

### Testing Multiple Routes

```
/test:ui https://localhost:3000 --routes / /about /login /dashboard
```

Tests each route at each viewport, producing a comprehensive matrix.

### Testing Specific Viewport

```
/test:ui https://localhost:3000 --viewport 375x667
```

Tests only the mobile viewport.

## Test Report

The `test-ui` skill generates a Markdown report saved to the configured `reportDir`. Reports follow this structure:

### Report Format

```markdown
# UI Test Report

**URL**: https://localhost:3000
**Date**: 2026-03-02T14:30:00Z
**Viewports Tested**: 3

## Viewport Matrix

| Route | 375x667 | 768x1024 | 1440x900 |
|-------|---------|----------|----------|
| /     | Pass    | Pass     | Pass     |
| /about| Warning | Pass     | Pass     |
| /login| Pass    | Pass     | Pass     |

## Detailed Findings

### / (Homepage)

#### 375x667 (Mobile)
- **Status**: Pass
- **Screenshot**: screenshots/home-375x667.png
- **Load Time**: 1.2s
- **Console Errors**: 0
- **Observations**: Layout renders correctly, no overflow issues

#### 768x1024 (Tablet)
- **Status**: Pass
- **Screenshot**: screenshots/home-768x1024.png
- **Load Time**: 0.9s
- **Observations**: Grid transitions to 2 columns correctly

#### 1440x900 (Desktop)
- **Status**: Pass
- **Screenshot**: screenshots/home-1440x900.png
- **Load Time**: 0.8s
- **Observations**: Full layout with sidebar visible

### /about

#### 375x667 (Mobile)
- **Status**: Warning
- **Screenshot**: screenshots/about-375x667.png
- **Issues**:
  - Text overflow in hero section at narrow width
  - Image not responsive below 400px
- **Recommendations**:
  - Add `max-width: 100%` to hero image
  - Reduce heading font size at mobile breakpoint

## Console Issues

| Level | Count | Message |
|-------|-------|---------|
| Error | 0 | — |
| Warning | 2 | Mixed content warning on /about |

## Network Issues

| URL | Status | Issue |
|-----|--------|-------|
| /api/stats | 404 | Route not found |

## Recommendations

1. Fix text overflow on /about page at mobile viewport
2. Add responsive image handling for hero section
3. Investigate 404 on /api/stats endpoint
4. Consider adding loading states for slow connections
```

### Screenshot Storage

Screenshots are saved alongside the report:

```
reports/ui-tests/
  2026-03-02-143000/
    report.md
    screenshots/
      home-375x667.png
      home-768x1024.png
      home-1440x900.png
      about-375x667.png
      ...
```

## What Gets Tested

### Visual Checks

- **Layout integrity**: No overlapping elements, proper spacing
- **Text overflow**: No text clipping or horizontal scrolling
- **Image rendering**: Images load and are properly sized
- **Responsive behavior**: Correct breakpoint transitions
- **Color contrast**: Text readability (WCAG AA standard)

### Functional Checks

- **Console errors**: JavaScript errors that appear on page load
- **Console warnings**: Deprecation notices, mixed content warnings
- **Network failures**: Failed API calls, 404s, CORS issues
- **Load performance**: Page load time at each viewport

### Accessibility Quick Checks

- **Heading hierarchy**: Proper H1-H6 ordering
- **Alt text**: Images have descriptive alt attributes
- **Focus indicators**: Interactive elements have visible focus states
- **Touch targets**: Buttons are large enough on mobile (44x44px minimum)

## Persistent Sessions

The `test-ui` skill supports persistent browser sessions. This is useful for testing authenticated flows:

1. Navigate to the login page
2. Authenticate manually or via the test
3. Run subsequent page tests in the same session
4. The browser maintains cookies and authentication state

```
/test:ui https://myapp.com --persistent
# Manually log in when prompted
# Then continue with route testing
```

## Dashboard Integration

The Testing page at `localhost:3333/testing` shows:

- List of past test runs with dates and overall status
- Viewport matrix for each test run
- Screenshot gallery with comparison view
- Report Markdown rendering
- Trend tracking: are visual issues increasing or decreasing?

## Re-running Tests

You can re-run tests against the same route list:

```
/test:ui --rerun reports/ui-tests/2026-03-02-143000/report.md
```

This reads the routes from the previous report and runs the same test suite, enabling before/after comparison.

## Related Documentation

- [Command System](./command-system.md) -- `/test:ui` command
- [Skills Catalog](./skills-catalog.md) -- The `test-ui` and `test` skills
- [ck.json Config](./ck-json-config.md) -- UI test configuration
- [Dashboard Overview](./dashboard-overview.md) -- Testing page
- [Troubleshooting](./troubleshooting.md) -- Common test failures
