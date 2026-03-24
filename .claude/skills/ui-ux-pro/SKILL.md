---
name: ui-ux-pro
description: UI/UX best practices, accessibility compliance, design system guidance, and interaction design patterns
layer: utility
category: design
triggers:
  - "UI review"
  - "UX improvement"
  - "accessibility audit"
  - "design system"
  - "responsive design"
  - "component design"
  - "user interface"
  - "WCAG compliance"
inputs:
  - component_code: React/HTML component code to review
  - screenshot: Screenshot of current UI for visual analysis
  - design_requirement: Description of desired UI behavior
  - target_audience: Who will use this interface
outputs:
  - review_findings: Categorized list of UI/UX issues
  - accessibility_report: WCAG compliance assessment
  - recommendations: Prioritized improvement suggestions with code
  - component_code: Improved component implementation
  - design_tokens: Suggested design token values
linksTo:
  - ai-multimodal
  - chrome-devtools
  - media-processing
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - chrome-devtools
  - ai-multimodal
fallbackSkills:
  - ai-multimodal
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# UI/UX Pro

## Purpose

This skill ensures every user interface meets professional standards for usability, accessibility, visual polish, and interaction design. It enforces the mandatory UI minimums from the project guidelines while providing deep expertise in component design, responsive layouts, animation, and WCAG compliance.

## Mandatory UI Minimums (ENFORCED)

These are non-negotiable standards from the project guidelines:

### Golden Ratio Scale

```
phi = 1.618
Scale: 0.625rem, 0.8125rem, 1rem, 1.625rem, 2.625rem, 4.25rem
```

### Component Minimums

| Element | Padding | Min Height | Text | Radius | Tailwind |
|---------|---------|------------|------|--------|----------|
| Button | 1rem 1.5rem | 2.625rem | 1rem | 0.5rem | px-6 py-4 text-base rounded-lg |
| Card | 1.5rem+ | - | 1rem | 0.75rem | p-6 rounded-xl shadow-sm |
| Input | 0.75rem 1rem | 2.75rem | 1rem | 0.5rem | px-4 py-3 rounded-lg |
| Section | 4rem vert | - | - | - | py-16 |
| Modal | 2rem | - | - | 1rem | p-8 rounded-2xl |
| Badge | 0.25rem 0.5rem | 1.5rem | 0.75rem | full | px-2 py-1 text-xs rounded-full |

### Absolute Rules

**NEVER**:
- Padding < 1rem on buttons/cards
- Text < 0.875rem (14px) for body content
- Icons < 1rem (w-4 h-4 minimum)
- Flat cards (MUST have shadow-sm OR border)
- Skip hover/focus states on interactive elements
- Border-radius < 0.5rem on components

**MUST**:
- Use rem units (not px) for accessibility
- Add `transition-all duration-200` on interactive elements
- Include `focus-visible:ring-2 focus-visible:ring-offset-2`
- Respect `prefers-reduced-motion` with `motion-reduce:transition-none`
- Meet WCAG AA contrast: 4.5:1 text, 3:1 UI elements

## Key Concepts

### Visual Hierarchy

```
LEVEL 1 — PRIMARY:
  Size: 2.625rem+ (headings)
  Weight: Bold (700)
  Color: High contrast (primary text color)
  Spacing: 2rem+ margin-bottom

LEVEL 2 — SECONDARY:
  Size: 1.625rem (subheadings)
  Weight: Semibold (600)
  Color: Primary text color
  Spacing: 1.5rem margin-bottom

LEVEL 3 — BODY:
  Size: 1rem (16px minimum)
  Weight: Regular (400)
  Color: Primary or secondary text color
  Line-height: 1.5-1.75

LEVEL 4 — SUPPORTING:
  Size: 0.875rem (minimum for body text)
  Weight: Regular (400)
  Color: Muted text color
  Use: Timestamps, metadata, captions

LEVEL 5 — MICRO:
  Size: 0.75rem (ONLY for badges, labels)
  Weight: Medium (500)
  Color: Must meet 4.5:1 contrast
  Use: Status badges, category tags
```

### Spacing System (8px Grid)

```
--space-1: 0.25rem   (4px)  — tight gaps, icon padding
--space-2: 0.5rem    (8px)  — inline element spacing
--space-3: 0.75rem   (12px) — input padding
--space-4: 1rem      (16px) — default component gap
--space-5: 1.5rem    (24px) — card padding, section gaps
--space-6: 2rem      (32px) — modal padding, large gaps
--space-8: 3rem      (48px) — section padding
--space-10: 4rem     (64px) — section vertical padding
--space-12: 5rem     (80px) — page-level spacing
--space-16: 8rem     (128px)— hero sections
```

### Color Usage

```
SEMANTIC COLORS:
  Primary:    Brand actions (CTAs, links, active states)
  Secondary:  Supporting actions, alternative styles
  Success:    Confirmations, completions, positive states
  Warning:    Caution states, approaching limits
  Error:      Validation errors, destructive actions, failures
  Info:       Informational messages, tips, help text

NEUTRAL SCALE:
  50:  Page background, subtle fills
  100: Card backgrounds, input backgrounds
  200: Borders, dividers
  300: Disabled states, placeholder text
  400: Muted text, secondary icons
  500: Body text on light, icons
  600: Emphasis text, heading secondary
  700: Heading text, strong emphasis
  800: Primary text on light backgrounds
  900: Maximum contrast text
  950: Near-black for highest contrast needs
```

## Accessibility Checklist (WCAG 2.1 AA)

### Perceivable

```
[ ] Text contrast ratio >= 4.5:1 (normal text)
[ ] Text contrast ratio >= 3:1 (large text: 18px+ or 14px+ bold)
[ ] UI component contrast >= 3:1 (borders, icons, controls)
[ ] No information conveyed by color alone (add icons, text, patterns)
[ ] Images have meaningful alt text (or aria-hidden if decorative)
[ ] Video has captions/subtitles
[ ] Content readable at 200% zoom without horizontal scroll
[ ] Minimum touch target: 44x44px (or 24x24 with adequate spacing)
```

### Operable

```
[ ] All interactive elements reachable via keyboard (Tab/Shift+Tab)
[ ] Visible focus indicator on all interactive elements
[ ] No keyboard traps (can always Tab away)
[ ] Skip-to-content link for screen reader users
[ ] No time limits (or user can extend/disable)
[ ] Animations respect prefers-reduced-motion
[ ] Hover content also available via focus
```

### Understandable

```
[ ] Page language declared (<html lang="en">)
[ ] Form inputs have visible labels (not just placeholders)
[ ] Error messages identify the field and suggest correction
[ ] Consistent navigation across pages
[ ] No unexpected context changes on focus/input
```

### Robust

```
[ ] Valid semantic HTML (heading hierarchy, landmark regions)
[ ] ARIA attributes used correctly (not overriding native semantics)
[ ] Form fields have associated labels (for/id or aria-labelledby)
[ ] Dynamic content changes announced (aria-live regions)
[ ] Custom controls have appropriate ARIA roles
```

## Component Patterns

### Button Pattern

```tsx
// Correct button implementation meeting all minimums
<button
  className={cn(
    // Size minimums
    "px-6 py-4 min-h-[2.625rem] text-base",
    // Shape
    "rounded-lg",
    // Visual depth
    "shadow-sm",
    // Colors (meet 4.5:1 contrast)
    "bg-primary-600 text-white",
    // Hover state
    "hover:bg-primary-700 hover:shadow-md",
    // Active state
    "active:bg-primary-800 active:shadow-sm",
    // Focus state
    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    // Disabled state
    "disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none",
    // Transitions
    "transition-all duration-200",
    // Reduced motion
    "motion-reduce:transition-none",
    // Font
    "font-medium leading-none"
  )}
>
  {children}
</button>
```

### Card Pattern

```tsx
<div
  className={cn(
    // Padding minimum
    "p-6",
    // Shape
    "rounded-xl",
    // Visual depth (REQUIRED — never flat)
    "shadow-sm border border-neutral-200",
    // Background
    "bg-white",
    // Hover (if interactive)
    isInteractive && [
      "hover:shadow-md hover:border-neutral-300",
      "cursor-pointer",
      "transition-all duration-200",
      "motion-reduce:transition-none",
      "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    ]
  )}
  {...(isInteractive ? { role: "button", tabIndex: 0 } : {})}
>
  {children}
</div>
```

### Input Pattern

```tsx
<div className="flex flex-col gap-2">
  <label
    htmlFor={id}
    className="text-sm font-medium text-neutral-700"
  >
    {label}
    {required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
  </label>
  <input
    id={id}
    className={cn(
      // Size minimums
      "px-4 py-3 min-h-[2.75rem] text-base",
      // Shape
      "rounded-lg",
      // Border
      "border border-neutral-300",
      // Focus
      "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none",
      // Error state
      hasError && "border-error-500 focus:border-error-500 focus:ring-error-500/20",
      // Disabled
      "disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed",
      // Transition
      "transition-all duration-200",
      "motion-reduce:transition-none",
      // Placeholder
      "placeholder:text-neutral-400"
    )}
    aria-invalid={hasError}
    aria-describedby={hasError ? `${id}-error` : undefined}
    aria-required={required}
  />
  {hasError && (
    <p id={`${id}-error`} className="text-sm text-error-600" role="alert">
      {errorMessage}
    </p>
  )}
</div>
```

## Review Workflow

### Phase 1: Structural Review

```
CHECK:
  [ ] Semantic HTML (correct heading hierarchy, landmarks)
  [ ] Component composition (single responsibility)
  [ ] Props interface (well-typed, documented)
  [ ] Conditional rendering (loading, empty, error states)
  [ ] Key props on lists
```

### Phase 2: Visual Review

```
CHECK:
  [ ] Spacing meets minimums (see table)
  [ ] Typography hierarchy clear
  [ ] Color contrast passes AA
  [ ] Cards have depth (shadow or border)
  [ ] Consistent border-radius
  [ ] No orphaned text (widows/orphans controlled)
  [ ] Responsive at 320px, 768px, 1024px, 1440px
```

### Phase 3: Interaction Review

```
CHECK:
  [ ] All interactive elements have hover states
  [ ] All interactive elements have focus-visible states
  [ ] Transitions present (duration-200)
  [ ] Reduced motion respected
  [ ] Loading states provided
  [ ] Error states provided
  [ ] Empty states provided
  [ ] Disabled states styled correctly
```

### Phase 4: Accessibility Review

```
CHECK:
  [ ] Run WCAG checklist (see above)
  [ ] Screen reader test: does it make sense read linearly?
  [ ] Keyboard test: can you complete the flow with keyboard only?
  [ ] Zoom test: does 200% zoom break layout?
  [ ] Color blindness: remove color, is information still conveyed?
```

## Responsive Design Breakpoints

```
DEFAULT:     0px+     Mobile-first base styles
sm:          640px+   Large phones, small tablets
md:          768px+   Tablets
lg:          1024px+  Small desktops, landscape tablets
xl:          1280px+  Standard desktops
2xl:         1536px+  Large desktops

PRINCIPLE: Design mobile-first, then add complexity at larger breakpoints
NEVER: Hide critical content at any breakpoint — rearrange, don't remove
```

## Anti-Patterns

1. **Pixel values**: Using px instead of rem. All sizing must use rem for accessibility (user font scaling).
2. **Missing states**: Interactive elements without hover, focus, disabled, and loading states.
3. **Flat cards**: Cards without any shadow or border look like plain text blocks. Always add visual depth.
4. **Tiny text**: Body text below 14px (0.875rem) is unreadable for many users. 16px (1rem) is the standard baseline.
5. **Color-only indicators**: Using red/green alone to indicate error/success. Always pair with icons or text.
6. **Focus suppression**: Using `outline: none` without providing an alternative focus indicator destroys keyboard accessibility.
7. **Animation without escape**: Animations without `prefers-reduced-motion` support can trigger vestibular disorders.

## Integration Notes

- Use **chrome-devtools** to test components in actual browsers at different viewports.
- Use **ai-multimodal** to analyze screenshots of current UI for design issues.
- Use **media-processing** for image optimization recommendations (proper sizing, formats, compression).
- When designing data-heavy interfaces, coordinate with **data-modeling** to ensure the UI reflects the data structure efficiently.
