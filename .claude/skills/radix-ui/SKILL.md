# Radix UI

- **Layer**: domain
- **Category**: ui-primitives
- **Risk Level**: low
- **Triggers**: radix, primitives, accessible components, headless ui, unstyled components

## Overview

Unstyled, accessible UI primitives for building high-quality design systems. Radix provides the behavior, accessibility, and keyboard interactions — you provide the styling.

## When to Use

- Building a custom design system that needs accessible primitives
- Need complex UI patterns (dialogs, dropdowns, popovers) with proper ARIA and focus management
- Using Tailwind or CSS modules and want full styling control
- Extending shadcn/ui components (which are built on Radix)

## Key Patterns

### Composition Pattern
Every component follows `Root > Trigger > Content` composition. Use `Portal` for overlays to escape DOM stacking contexts.

```tsx
<Dialog.Root>
  <Dialog.Trigger asChild><button>Open</button></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
      <Dialog.Close asChild><button>Close</button></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Controlled vs Uncontrolled
All components work uncontrolled by default. Use `open`/`onOpenChange` for controlled state.

### Animation with data-state
Style enter/exit animations using `data-[state=open]` and `data-[state=closed]` attributes instead of managing animation state manually.

```css
[data-state="open"] { animation: fadeIn 200ms ease-out; }
[data-state="closed"] { animation: fadeOut 150ms ease-in; }
```

### Accessibility Built-in
ARIA roles, keyboard navigation, and focus management are handled automatically. Do not override `role`, `aria-*`, or `tabIndex` unless you have a specific reason.

### Styling Integration
Use `asChild` to merge Radix behavior onto your own styled element. Use `className` or `style` directly on Radix components when not using `asChild`.

### Context Value Forwarding
Nested Radix components share context automatically. Access internal state via render props or `data-*` attributes for conditional styling.

## Anti-Patterns

- **Wrapping with extra divs**: Use `asChild` instead of nesting styled wrappers around triggers/content
- **Reimplementing accessibility**: Do not add manual `aria-*` or keyboard handlers — Radix handles this
- **Skipping Portal**: Always portal overlays (Dialog, Popover, Tooltip) to avoid z-index and overflow issues
- **Inline open/close logic**: Prefer `onOpenChange` callback over manual `useState` + `onClick` toggling
- **Ignoring `forwardRef`**: Custom components passed via `asChild` must forward refs

## Related Skills

`react` | `shadcn-ui` | `design-systems` | `tailwindcss`
