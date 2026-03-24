---
name: test-ui
description: Multi-viewport UI testing with screenshots, visual regression detection, and accessibility audits
layer: hub
category: workflow
triggers:
  - "/test-ui"
  - "test the UI"
  - "check the interface"
  - "visual test"
  - "screenshot test"
  - "check responsive"
  - "accessibility audit"
inputs:
  - target: URL, page, or component to test
  - viewports: Viewport sizes to test (optional, defaults to mobile/tablet/desktop)
  - checks: Specific checks to run -- visual | accessibility | responsive | interaction | all (optional, defaults to all)
outputs:
  - screenshots: Screenshots at each viewport with annotations
  - accessibilityReport: WCAG compliance findings
  - responsiveReport: Layout issues across viewports
  - interactionReport: Results of interaction testing (hover, focus, click states)
  - issueList: Prioritized list of UI issues found
linksTo:
  - fix
  - code-review
  - scout
linkedFrom:
  - cook
  - team
  - ship
preferredNextSkills:
  - fix
  - code-review
fallbackSkills:
  - scout
  - debug
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Takes screenshots (creates image files)
  - Opens browser sessions via Playwright
  - Does NOT modify source code
---

# Test-UI Skill

## Purpose

Systematically test user interfaces across viewports, accessibility standards, and interaction patterns. This skill uses visual testing (screenshots), automated accessibility auditing, and interaction verification to catch UI problems that unit tests miss.

UI bugs are user-facing bugs. They are the first thing users see and the last thing developers test. This skill closes that gap.

## Workflow

### Phase 1: Test Setup

1. **Identify the test target**:
   - URL of a running application
   - Specific page or route
   - Component in a Storybook or dev server

2. **Define viewport matrix** (default set):
   | Name | Width | Height | Device Class |
   |------|-------|--------|-------------|
   | Mobile S | 320 | 568 | iPhone SE |
   | Mobile M | 375 | 667 | iPhone 8 |
   | Mobile L | 414 | 896 | iPhone 11 |
   | Tablet | 768 | 1024 | iPad |
   | Desktop | 1280 | 800 | Laptop |
   | Desktop L | 1920 | 1080 | Full HD |

3. **Set up the browser** using Playwright MCP:
   - Navigate to the target URL
   - Wait for page load completion
   - Dismiss any modals/cookie banners that obscure content

### Phase 2: Visual Testing

4. **For each viewport in the matrix**:
   a. Resize the browser to the viewport dimensions
   b. Wait for layout to settle (resize can trigger animations)
   c. Take a full-page screenshot
   d. Take a viewport-only screenshot (above the fold)
   e. Record any visual anomalies observed:
      - Text overflow / truncation
      - Element overlap
      - Broken layout (flex/grid issues)
      - Missing images or icons
      - Inconsistent spacing
      - Z-index conflicts (elements stacking incorrectly)

5. **Capture key states** (if interactive elements exist):
   - Default state
   - Hover state (for interactive elements)
   - Focus state (keyboard navigation)
   - Active/pressed state
   - Error state (form validation)
   - Loading state (if applicable)
   - Empty state (if applicable)

### Phase 3: Accessibility Audit

6. **Evaluate against WCAG 2.1 AA criteria**:

   **Perceivable**:
   - [ ] All images have alt text (or are marked decorative)
   - [ ] Color contrast meets 4.5:1 for text, 3:1 for UI elements
   - [ ] Content is readable without color alone (not just red/green indicators)
   - [ ] Text can be resized to 200% without loss of content
   - [ ] No content relies solely on sensory characteristics (shape, size, position)

   **Operable**:
   - [ ] All interactive elements are keyboard accessible (Tab, Enter, Space, Escape)
   - [ ] Focus order is logical and follows visual order
   - [ ] Focus indicators are visible (not just browser default)
   - [ ] No keyboard traps (can Tab out of every element)
   - [ ] Sufficient click/touch target size (minimum 44x44px)
   - [ ] Skip navigation link available (for pages with nav)

   **Understandable**:
   - [ ] Page language is set (`<html lang="en">`)
   - [ ] Form inputs have visible labels
   - [ ] Error messages are clear and associated with their fields
   - [ ] Navigation is consistent across pages

   **Robust**:
   - [ ] Semantic HTML is used (headings, landmarks, lists)
   - [ ] ARIA attributes are correct (roles, states, properties)
   - [ ] Heading hierarchy is logical (no skipped levels)

7. **Run automated accessibility check** using browser evaluation:
   ```javascript
   // Check for missing alt text
   document.querySelectorAll('img:not([alt])');
   // Check for empty buttons/links
   document.querySelectorAll('a:empty, button:empty');
   // Check heading hierarchy
   document.querySelectorAll('h1, h2, h3, h4, h5, h6');
   ```

### Phase 4: Responsive Testing

8. **Check layout integrity across viewports**:
   - Does content reflow properly at each breakpoint?
   - Are there horizontal scrollbars on mobile?
   - Does navigation collapse to a mobile menu?
   - Are touch targets large enough on mobile (44x44px minimum)?
   - Does text remain readable on all sizes (no text smaller than 14px)?
   - Do images scale appropriately?
   - Are interactive elements reachable without hover (for touch devices)?

9. **Check breakpoint transitions**:
   - Are there awkward intermediate states between breakpoints?
   - Does content jump or flash during resize?
   - Are there viewport ranges where the layout breaks?

### Phase 5: Interaction Testing

10. **Test interactive elements** (using Playwright):
    - Click buttons and links -- do they work?
    - Fill form fields -- do they accept input?
    - Test dropdown/select menus -- do they open and close?
    - Test modals/dialogs -- do they open, close, and trap focus?
    - Test navigation -- do links go to the right place?
    - Test form submission -- does it validate and submit?

11. **Test keyboard navigation**:
    - Tab through the page -- is the order logical?
    - Enter/Space on buttons -- do they activate?
    - Escape on modals -- do they close?
    - Arrow keys on menus/selects -- do they navigate?

### Phase 6: Report

12. **Produce the UI test report** using the template below.
13. **Prioritize findings** by user impact.

## UI Test Report Template

```markdown
# UI Test Report

## Target
**URL**: [url]
**Date**: [date]
**Viewports tested**: [list]

---

## Visual Summary
| Viewport | Screenshot | Issues |
|----------|-----------|--------|
| Mobile (375px) | [screenshot ref] | [count] issues |
| Tablet (768px) | [screenshot ref] | [count] issues |
| Desktop (1280px) | [screenshot ref] | [count] issues |

## Issues Found

### Critical (Blocks Usage)
#### [V1] [Title]
- **Viewport**: [affected viewports]
- **Description**: [what is wrong]
- **Expected**: [correct behavior]
- **Screenshot**: [reference]

### Major (Degrades Experience)
#### [V2] [Title]
...

### Minor (Polish)
#### [V3] [Title]
...

---

## Accessibility Audit
### Violations
| Rule | Impact | Elements | Fix |
|------|--------|----------|-----|
| [rule] | [critical/serious/moderate] | [count] | [recommendation] |

### Passes
- [count] rules passing

---

## Responsive Behavior
| Breakpoint | Layout | Navigation | Typography | Media |
|-----------|--------|------------|------------|-------|
| 320px | OK/Issue | OK/Issue | OK/Issue | OK/Issue |
| 768px | OK/Issue | OK/Issue | OK/Issue | OK/Issue |
| 1280px | OK/Issue | OK/Issue | OK/Issue | OK/Issue |

## Interaction Results
| Element | Click | Keyboard | Focus | Hover |
|---------|-------|----------|-------|-------|
| [button/link] | Pass/Fail | Pass/Fail | Pass/Fail | Pass/Fail |

---

## Recommendations
1. **[Highest priority]**: [action]
2. **[Second priority]**: [action]
3. ...
```

## Usage

### Full UI test
```
/test-ui http://localhost:3000
```

### Specific page
```
/test-ui http://localhost:3000/checkout
```

### Accessibility only
```
/test-ui accessibility http://localhost:3000
```

### Responsive only
```
/test-ui responsive http://localhost:3000/dashboard
```

### Specific viewports
```
/test-ui http://localhost:3000 --viewports mobile,desktop
```

## Examples

### Example: Finding a responsive issue

**Test**: Homepage at 375px width
**Finding**: Hero section text overflows container, creating horizontal scrollbar
**Root cause**: Fixed width of 500px on hero text container instead of max-width
**Fix recommendation**: Change `width: 500px` to `max-width: 100%`

### Example: Accessibility finding

**Test**: Login form
**Finding**: Password field has no visible label (only placeholder text)
**Impact**: Screen reader users cannot identify the field; placeholder disappears on focus
**Fix recommendation**: Add a visible `<label>` element associated with the input via `htmlFor`

### Example: Interaction issue

**Test**: Mobile navigation menu
**Finding**: Hamburger menu opens on click but cannot be closed with keyboard (Escape key does not work)
**Impact**: Keyboard users are trapped in the menu
**Fix recommendation**: Add Escape key handler to close the menu and return focus to the trigger button

## Guidelines

- **Test real viewports, not just desktop** -- More than half of web traffic is mobile. Test mobile first.
- **Accessibility is not optional** -- WCAG AA compliance is a legal requirement in many jurisdictions and a moral one everywhere.
- **Screenshots are evidence** -- Always include screenshots in reports. They are worth a thousand words.
- **Test the flow, not just the page** -- Users do not look at pages; they complete tasks. Test the full flow.
- **Focus states matter** -- If you cannot see where keyboard focus is, the site is broken for keyboard users.
- **Touch targets must be large enough** -- 44x44px minimum. Fingers are not mouse cursors.
- **Do not test with only Chrome** -- If possible, note that cross-browser testing should be done separately.
- **Color is not the only indicator** -- Always pair color with text, icons, or patterns for status indicators.
- **Test with real content** -- Lorem ipsum hides overflow issues. Use realistic text lengths.
