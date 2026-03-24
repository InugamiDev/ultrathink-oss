---
name: accessibility
description: Web accessibility expertise — WCAG 2.1/2.2 compliance, ARIA patterns, keyboard navigation, screen reader compatibility, color contrast, semantic HTML, and React a11y primitives
layer: domain
category: frontend
triggers:
  - "accessibility"
  - "a11y"
  - "wcag"
  - "aria"
  - "screen reader"
  - "keyboard navigation"
  - "focus management"
  - "focus trap"
  - "color contrast"
  - "skip link"
  - "live region"
  - "landmark"
  - "semantic html"
  - "assistive technology"
  - "voiceover"
  - "nvda"
  - "axe-core"
inputs:
  - "Component or page requiring accessibility audit"
  - "ARIA pattern implementation guidance"
  - "Keyboard navigation and focus management questions"
  - "WCAG compliance level target (AA or AAA)"
  - "Screen reader compatibility issues"
outputs:
  - "Accessible component implementations with proper ARIA"
  - "Keyboard navigation patterns with focus management"
  - "WCAG compliance checklist and remediation steps"
  - "Testing strategies for assistive technology support"
linksTo:
  - react
  - forms
  - design-systems
  - ui-ux-pro
  - css-architecture
  - animation
  - testing-patterns
linkedFrom:
  - cook
  - react
  - forms
  - design-systems
  - ui-ux-pro
preferredNextSkills:
  - react
  - forms
  - testing-patterns
fallbackSkills:
  - ui-ux-pro
  - design-systems
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Web Accessibility

## Purpose

Provide expert guidance on building inclusive web experiences that conform to WCAG 2.1/2.2 at AA and AAA levels. This skill covers semantic HTML, ARIA patterns, keyboard navigation, screen reader compatibility, color and motion sensitivity, form accessibility, and testing with assistive technologies. Accessibility is not an afterthought — it is a core quality attribute of production software.

## WCAG 2.1/2.2 Quick Reference

### Conformance Levels

```
Level A   — Minimum baseline. Removes the most severe barriers.
Level AA  — Standard target for most websites and legal compliance.
Level AAA — Highest level. Not required for entire sites but target for critical flows.
```

### The Four Principles (POUR)

| Principle | Meaning | Key Success Criteria |
|-----------|---------|---------------------|
| **Perceivable** | Content available to all senses | Text alternatives, captions, contrast, resize |
| **Operable** | UI navigable by all input methods | Keyboard, timing, seizures, navigation |
| **Understandable** | Content and UI are predictable | Readable, predictable, input assistance |
| **Robust** | Works with current and future assistive tech | Parsing, name/role/value, status messages |

### Critical AA Criteria

| Criterion | ID | Requirement |
|-----------|----|-------------|
| Non-text Content | 1.1.1 | All images have text alternatives |
| Color Contrast (text) | 1.4.3 | 4.5:1 normal text, 3:1 large text (18px+ bold or 24px+) |
| Color Contrast (UI) | 1.4.11 | 3:1 for UI components and graphical objects |
| Resize Text | 1.4.4 | Content readable at 200% zoom |
| Reflow | 1.4.10 | No horizontal scroll at 320px width |
| Keyboard | 2.1.1 | All functionality available from keyboard |
| No Keyboard Trap | 2.1.2 | Focus can always be moved away from any component |
| Focus Visible | 2.4.7 | Keyboard focus indicator is visible |
| Focus Not Obscured | 2.4.11 | Focused item not fully hidden by other content (WCAG 2.2) |
| Heading Structure | 1.3.1 | Headings convey document structure |
| Link Purpose | 2.4.4 | Link text describes destination (no "click here") |
| Error Identification | 3.3.1 | Errors identified and described in text |
| Labels or Instructions | 3.3.2 | Input fields have labels |
| Name, Role, Value | 4.1.2 | Custom controls expose name, role, state to AT |
| Status Messages | 4.1.3 | Status updates announced without focus change |

### AAA Enhancements (Target for Key Flows)

| Criterion | ID | Requirement |
|-----------|----|-------------|
| Enhanced Contrast | 1.4.6 | 7:1 normal text, 4.5:1 large text |
| Focus Appearance | 2.4.13 | Focus indicator meets minimum area and contrast (WCAG 2.2) |
| Target Size | 2.5.5 | Interactive targets at least 44x44 CSS pixels |
| Error Prevention | 3.3.4 | Reversible submissions for legal/financial data |

## Semantic HTML and Landmarks

### Use the Right Element

```html
<!-- BAD: div soup with ARIA bolted on -->
<div role="navigation">
  <div role="list">
    <div role="listitem"><div role="link" tabindex="0" onclick="...">Home</div></div>
  </div>
</div>

<!-- GOOD: semantic HTML needs no ARIA -->
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

**First Rule of ARIA:** Do not use ARIA if a native HTML element provides the semantics you need.

### Landmark Regions

Every page must have these landmarks. Screen reader users navigate by landmarks.

```html
<body>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:z-50
    focus:px-6 focus:py-4 focus:text-base focus:rounded-lg focus:bg-white focus:shadow-lg
    focus:ring-2 focus:ring-offset-2">
    Skip to main content
  </a>

  <header role="banner">
    <nav aria-label="Main navigation">...</nav>
  </header>

  <main id="main-content" role="main">
    <h1>Page Title</h1>
    <!-- Primary content -->
  </main>

  <aside role="complementary" aria-label="Related articles">
    <!-- Secondary content -->
  </aside>

  <footer role="contentinfo">...</footer>
</body>
```

### Heading Hierarchy

```html
<!-- GOOD: logical hierarchy, no skipped levels -->
<h1>Dashboard</h1>
  <h2>Recent Activity</h2>
    <h3>Today</h3>
    <h3>Yesterday</h3>
  <h2>Statistics</h2>
    <h3>Revenue</h3>

<!-- BAD: skipped levels, multiple h1s -->
<h1>Dashboard</h1>
<h3>Activity</h3>    <!-- skipped h2 -->
<h1>Statistics</h1>  <!-- second h1 -->
```

## ARIA Attributes, Roles, States, and Properties

### When ARIA Is Necessary

Use ARIA only for custom widgets that have no native HTML equivalent — tabs, accordions, tree views, comboboxes, toolbars.

### Essential Attributes

```tsx
// aria-label: names an element when no visible text exists
<button aria-label="Close dialog">
  <XIcon className="w-5 h-5" />
</button>

// aria-labelledby: references another element as the label
<section aria-labelledby="stats-heading">
  <h2 id="stats-heading">Monthly Statistics</h2>
</section>

// aria-describedby: references supplementary description
<input
  id="password"
  type="password"
  aria-describedby="password-hint password-error"
/>
<p id="password-hint">Must be at least 8 characters.</p>
<p id="password-error" role="alert">Password is too short.</p>

// aria-expanded: communicates open/closed state
<button aria-expanded={isOpen} aria-controls="menu-panel">
  Options
</button>
<div id="menu-panel" role="menu" hidden={!isOpen}>...</div>

// aria-current: indicates current item in a set
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/products/shoes" aria-current="page">Shoes</a></li>
  </ol>
</nav>

// aria-live: announces dynamic content changes
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// aria-busy: indicates loading state
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? 'Loading...' : content}
</div>
```

### Role Patterns

| Widget | Role(s) | Required Properties |
|--------|---------|-------------------|
| Tabs | `tablist`, `tab`, `tabpanel` | `aria-selected`, `aria-controls`, `aria-labelledby` |
| Accordion | `button` (trigger), `region` (panel) | `aria-expanded`, `aria-controls` |
| Dialog | `dialog` or `alertdialog` | `aria-labelledby`, `aria-describedby`, `aria-modal` |
| Menu | `menu`, `menuitem` | `aria-expanded` (trigger), `aria-haspopup` |
| Combobox | `combobox`, `listbox`, `option` | `aria-expanded`, `aria-activedescendant`, `aria-autocomplete` |
| Tree | `tree`, `treeitem` | `aria-expanded`, `aria-level`, `aria-selected` |
| Alert | `alert` | Implicitly `aria-live="assertive"` |
| Status | `status` | Implicitly `aria-live="polite"` |

## Keyboard Navigation

### Fundamental Patterns

```
Tab / Shift+Tab  — Move between focusable elements
Enter / Space     — Activate buttons, links, checkboxes
Arrow keys        — Navigate within composite widgets (tabs, menus, lists)
Escape            — Close overlays (modals, menus, tooltips)
Home / End        — Jump to first/last item in a list
```

### Focus Management

```tsx
import { useRef, useEffect } from 'react';

// Move focus to a newly revealed element
function Notification({ message, visible }: { message: string; visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.focus();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="p-6 rounded-xl shadow-sm bg-green-50 border border-green-200
                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
    >
      {message}
    </div>
  );
}
```

### Focus Trap (Modal Pattern)

Focus must stay inside a modal while it is open. Return focus to the trigger when it closes.

```tsx
import { useRef, useEffect, useCallback } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableElements = container!.querySelectorAll<HTMLElement>(focusableSelector);
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the trigger element
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}

// Usage in a modal
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const trapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 w-full max-w-lg p-8 rounded-2xl bg-white shadow-xl
                   motion-reduce:transition-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <h2 id="modal-title" className="text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-lg transition-all duration-200
                     hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

### Roving Tabindex

For composite widgets (tabs, toolbars, menus), one item is tabbable (`tabindex="0"`) and the rest are `tabindex="-1"`. Arrow keys move focus between items.

```tsx
import { useState, useRef, useCallback, KeyboardEvent } from 'react';

function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let nextIndex = activeIndex;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = (activeIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      setActiveIndex(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    },
    [activeIndex, tabs.length],
  );

  return (
    <div>
      <div role="tablist" aria-label="Content tabs" onKeyDown={handleKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={index === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            className={`px-6 py-4 text-base rounded-lg transition-all duration-200
              focus-visible:ring-2 focus-visible:ring-offset-2
              ${index === activeIndex
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeIndex}
          tabIndex={0}
          className="p-6 rounded-xl mt-2 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

## Screen Reader Compatibility

### Live Regions

Live regions announce dynamic content changes without moving focus.

```tsx
// Polite: waits for screen reader to finish current speech
<div aria-live="polite" aria-atomic="true">
  {searchResults.length} results found
</div>

// Assertive: interrupts current speech (use sparingly)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>

// Status role: implicitly polite live region
<div role="status">
  Saving... {progress}% complete
</div>
```

### Announcing Toast Notifications

```tsx
import { useRef, useCallback } from 'react';

function useAnnouncer() {
  const regionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!regionRef.current) return;
    // Clear and re-set to trigger announcement
    regionRef.current.textContent = '';
    requestAnimationFrame(() => {
      if (regionRef.current) {
        regionRef.current.setAttribute('aria-live', priority);
        regionRef.current.textContent = message;
      }
    });
  }, []);

  const AnnouncerRegion = () => (
    <div
      ref={regionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncerRegion };
}
```

### Visually Hidden Content

Content that must be available to screen readers but hidden visually:

```tsx
// Utility class (Tailwind's sr-only or custom)
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: 'rect(0, 0, 0, 0)' }}
    >
      {children}
    </span>
  );
}

// Usage: icon-only buttons
<button className="p-3 rounded-lg hover:bg-gray-100 transition-all duration-200
                   focus-visible:ring-2 focus-visible:ring-offset-2">
  <TrashIcon className="w-5 h-5" aria-hidden="true" />
  <VisuallyHidden>Delete item</VisuallyHidden>
</button>

// Usage: table context
<th>
  <VisuallyHidden>Actions</VisuallyHidden>
</th>
```

## Color Contrast and Visual Design

### Contrast Requirements

```
WCAG AA:
  Normal text (<18px bold, <24px regular): 4.5:1 ratio
  Large text (>=18px bold, >=24px regular): 3:1 ratio
  UI components and graphical objects:      3:1 ratio

WCAG AAA:
  Normal text: 7:1 ratio
  Large text:  4.5:1 ratio
```

### Color Must Not Be the Only Indicator

```tsx
// BAD: only color distinguishes error state
<input className={hasError ? 'border-red-500' : 'border-gray-300'} />

// GOOD: color + icon + text
<div>
  <input
    aria-invalid={hasError}
    aria-describedby={hasError ? 'email-error' : undefined}
    className={`px-4 py-3 rounded-lg border transition-all duration-200
      focus-visible:ring-2 focus-visible:ring-offset-2
      ${hasError
        ? 'border-red-500 ring-red-100'
        : 'border-gray-300 focus-visible:ring-blue-500'
      }`}
  />
  {hasError && (
    <p id="email-error" role="alert" className="mt-2 flex items-center gap-2 text-sm text-red-600">
      <AlertCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
      Please enter a valid email address
    </p>
  )}
</div>
```

### Motion Sensitivity

```css
/* Always provide reduced-motion alternatives */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// React: check motion preference
function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Usage
function AnimatedCard({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className={`p-6 rounded-xl shadow-sm ${
        prefersReduced ? '' : 'transition-all duration-200 hover:-translate-y-1 hover:shadow-md'
      }`}
    >
      {children}
    </div>
  );
}

// Tailwind: use motion-reduce and motion-safe utilities
<div className="transition-all duration-200 motion-reduce:transition-none
                hover:-translate-y-1 motion-reduce:hover:translate-y-0">
  ...
</div>
```

## Form Accessibility

### Complete Accessible Input Pattern

```tsx
interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    'aria-required': boolean;
  }) => React.ReactNode;
}

function FormField({ id, label, error, hint, required = false, children }: FormFieldProps) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium text-gray-900">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">*</span>
        )}
      </label>

      {hint && (
        <p id={`${id}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}

      {children({
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        'aria-required': required,
      })}

      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// Usage
<FormField id="email" label="Email address" required error={errors.email} hint="We will never share your email.">
  {(fieldProps) => (
    <input
      type="email"
      autoComplete="email"
      className="w-full px-4 py-3 rounded-lg border transition-all duration-200
                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
      {...fieldProps}
      {...register('email')}
    />
  )}
</FormField>
```

### Error Summary on Submission

```tsx
function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      summaryRef.current?.focus();
    }
  }, [errors]);

  if (Object.keys(errors).length === 0) return null;

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="p-6 rounded-xl border border-red-200 bg-red-50
                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
    >
      <h2 className="text-base font-semibold text-red-800">
        There {Object.keys(errors).length === 1 ? 'is 1 error' : `are ${Object.keys(errors).length} errors`} in the form
      </h2>
      <ul className="mt-3 space-y-1">
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} className="text-sm text-red-700 underline hover:text-red-900">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Common Accessible Patterns

### Skip Link

```tsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                 focus:px-6 focus:py-4 focus:text-base focus:font-medium focus:rounded-lg
                 focus:bg-white focus:text-blue-700 focus:shadow-lg focus:ring-2 focus:ring-blue-500
                 transition-all duration-200 motion-reduce:transition-none"
    >
      Skip to main content
    </a>
  );
}
```

### Accessible Dropdown Menu

```tsx
function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  function handleTriggerKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(items.length - 1);
        break;
    }
  }

  function handleMenuKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        items[activeIndex]?.onSelect();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  }

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="dropdown-menu"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className="px-6 py-4 text-base rounded-lg border transition-all duration-200
                   hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {trigger}
      </button>

      {isOpen && (
        <ul
          id="dropdown-menu"
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full mt-2 w-56 p-2 rounded-xl shadow-lg border bg-white z-50"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="px-4 py-3 text-base rounded-lg cursor-pointer transition-all duration-200
                         hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none"
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Accessible Toast System

```tsx
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`p-6 rounded-xl shadow-lg border flex items-start gap-3
            transition-all duration-200 motion-reduce:transition-none
            ${toast.type === 'error' ? 'bg-red-50 border-red-200' : ''}
            ${toast.type === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200' : ''}
          `}
        >
          <span className="text-base">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label={`Dismiss: ${toast.message}`}
            className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-all duration-200
                       focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <XIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

## React Accessibility Libraries

### react-aria (Adobe)

Headless hooks for fully accessible components. Best for custom design systems.

```tsx
import { useButton } from 'react-aria';
import { useRef } from 'react';

function Button(props: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);

  return (
    <button
      {...buttonProps}
      ref={ref}
      className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white
                 transition-all duration-200 hover:bg-blue-700
                 focus-visible:ring-2 focus-visible:ring-offset-2
                 disabled:opacity-50 motion-reduce:transition-none"
    >
      {props.children}
    </button>
  );
}
```

```tsx
import { useDialog } from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';

// react-aria handles focus trap, Escape key, aria attributes,
// and scroll lock automatically.
```

### Radix UI Primitives

Pre-built accessible primitives with full keyboard support. Unstyled by default.

```tsx
import * as Dialog from '@radix-ui/react-dialog';

function ConfirmDialog({ trigger, title, description, onConfirm }: ConfirmDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in
                                   motion-reduce:animate-none" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-full max-w-md p-8 rounded-2xl bg-white shadow-xl
                     animate-scale-in motion-reduce:animate-none
                     focus-visible:outline-none"
        >
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-base text-gray-600">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex gap-3 justify-end">
            <Dialog.Close asChild>
              <button className="px-6 py-4 text-base rounded-lg border transition-all duration-200
                                 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              className="px-6 py-4 text-base rounded-lg bg-red-600 text-white
                         transition-all duration-200 hover:bg-red-700
                         focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Confirm
            </button>
          </div>
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100
                         transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Testing Accessibility

### Automated Testing

```bash
# Install axe-core for unit/integration tests
npm install -D @axe-core/react axe-core vitest-axe

# Install Lighthouse CI
npm install -D @lhci/cli
```

```tsx
// Vitest + axe-core
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

test('form has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('modal traps focus correctly', async () => {
  const { getByRole, getByLabelText } = render(<Modal isOpen={true} onClose={vi.fn()} title="Test" />);
  const dialog = getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');

  const closeButton = getByLabelText('Close dialog');
  expect(closeButton).toBeInTheDocument();
});
```

```tsx
// ESLint plugin for static analysis
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },
];
```

### Manual Testing Checklist

```
KEYBOARD TESTING:
  - [ ] Tab through entire page — all interactive elements reachable
  - [ ] Shift+Tab moves backwards correctly
  - [ ] Enter/Space activates buttons and links
  - [ ] Escape closes modals, dropdowns, tooltips
  - [ ] Arrow keys work inside tabs, menus, and comboboxes
  - [ ] Focus is never trapped (except inside modals)
  - [ ] Focus indicator is always visible on focused element
  - [ ] Focus returns to trigger when modal/dropdown closes

SCREEN READER TESTING:
  - [ ] VoiceOver (macOS): Cmd+F5 to enable, use VO+arrows to navigate
  - [ ] NVDA (Windows): Free download, use browse mode and focus mode
  - [ ] All images have descriptive alt text (or alt="" for decorative)
  - [ ] Headings structure is logical (navigate with H key in NVDA/VO)
  - [ ] Landmarks are present and labeled (navigate with D key in NVDA)
  - [ ] Form fields announce their label, required state, and errors
  - [ ] Dynamic content changes are announced via live regions
  - [ ] Buttons and links announce their purpose

VISUAL TESTING:
  - [ ] Zoom to 200% — no content clipped, no horizontal scroll
  - [ ] Zoom to 400% — content still usable (WCAG 2.2)
  - [ ] High contrast mode (Windows) — UI still functional
  - [ ] prefers-reduced-motion respected — no unnecessary animation
  - [ ] Color is not the only indicator of state (errors, success, links)
  - [ ] All text meets contrast ratios (use browser DevTools audit)

TOOLS:
  - axe DevTools (browser extension) — automated page scan
  - Lighthouse (Chrome DevTools > Audits) — a11y score with recommendations
  - Accessibility Insights (Microsoft) — guided manual + automated testing
  - Colour Contrast Analyzer (TPGi) — eyedropper for contrast checking
  - WAVE (WebAIM) — visual overlay of page accessibility issues
```

## Best Practices

1. **Start with semantic HTML** — Correct elements (`button`, `nav`, `main`, `label`) provide free accessibility. ARIA is for custom widgets only.
2. **Test with keyboard first** — If you cannot complete every user flow with keyboard alone, the component is inaccessible.
3. **Make focus visible** — Always use `focus-visible:ring-2 focus-visible:ring-offset-2` or equivalent. Never `outline: none` without replacement.
4. **Announce dynamic changes** — Use `aria-live` regions for status updates, toasts, loading states, and search results counts.
5. **Label everything** — Every interactive element needs an accessible name via `<label>`, `aria-label`, or `aria-labelledby`.
6. **Do not disable zoom** — Never set `user-scalable=no` or `maximum-scale=1` in the viewport meta tag.
7. **Use rem units** — Pixels do not scale with user font size preferences. All sizing in `rem`.
8. **Respect motion preferences** — Provide `prefers-reduced-motion` alternatives with `motion-reduce:transition-none`.
9. **Design for color blindness** — Use icons, patterns, or text alongside color to convey meaning.
10. **Test with real assistive technology** — Automated tools catch ~30% of issues. Manual testing with VoiceOver and NVDA catches the rest.

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| `div` and `span` for everything | No semantic meaning for AT | Use `button`, `nav`, `main`, `section`, `ul`/`li` |
| Missing alt text on images | Screen readers say "image" with no context | Add descriptive `alt`; use `alt=""` for decorative images |
| `outline: none` without replacement | Keyboard users cannot see focus | Use `focus-visible:ring-2` instead of removing outlines |
| Positive `tabindex` values | Unpredictable tab order | Use only `tabindex="0"` or `tabindex="-1"` |
| Auto-playing video/audio | Disorienting, blocks screen reader | Never autoplay with sound; provide pause controls |
| Placeholder as label | Disappears on input, low contrast | Use visible `<label>` elements |
| Custom controls without roles | AT cannot identify widget type | Add appropriate ARIA roles, states, and properties |
| `onClick` on non-button elements | Not keyboard accessible | Use `<button>` or add `role="button"`, `tabindex="0"`, and `onKeyDown` |
| Missing error announcements | Screen reader users do not know form failed | Use `role="alert"` or `aria-live="assertive"` for errors |
| `aria-hidden="true"` on focusable elements | Focus enters hidden content, confusing AT | Remove from tab order with `tabindex="-1"` or do not hide |
| Time limits without extension | Users with motor/cognitive disabilities cannot complete tasks | Provide option to extend or disable time limits |
| Missing skip link | Keyboard users must tab through entire nav on every page | Add skip link as the first focusable element |
