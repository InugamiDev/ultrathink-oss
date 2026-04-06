---
name: component-patterns
description: React component patterns — compound components, render props, HOCs, headless components, polymorphic components
layer: domain
category: frontend
triggers:
  - "compound component"
  - "render props"
  - "headless component"
  - "polymorphic component"
  - "component pattern"
  - "hoc pattern"
inputs:
  - "Component API design requirements"
  - "Reusable component architecture needs"
  - "Pattern selection guidance for specific use cases"
  - "Headless component library design"
outputs:
  - "Compound component implementations"
  - "Polymorphic component with TypeScript"
  - "Headless component patterns"
  - "Pattern selection recommendations"
linksTo:
  - react
  - design-systems
  - typescript-frontend
linkedFrom:
  - react
preferredNextSkills:
  - react
  - design-systems
fallbackSkills:
  - typescript-frontend
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Component Patterns

## Purpose

Design flexible, reusable React components using established patterns — compound components for composable APIs, headless components for logic-only reuse, polymorphic components for element flexibility, and render props for rendering control. Each pattern solves a specific API design problem.

## Key Patterns

### Pattern Selection Guide

| Pattern | Use When | Example |
|---------|----------|---------|
| Compound Components | Building composable UI primitives with shared state | Tabs, Accordion, Menu, Select |
| Headless Components | Reusing logic without prescribing UI | useCombobox, useDialog, useTable |
| Polymorphic Components | Element type should be consumer-controlled | Button as `<a>`, Card as `<article>` |
| Render Props | Consumer controls what renders based on internal state | Virtualized list item rendering |
| HOCs | Cross-cutting concerns (rare in modern React) | withAuth, withTheme (prefer hooks) |
| Slot Pattern | Named content areas within a layout component | PageLayout with header/sidebar/main |

### Compound Components

**Context-based compound component:**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// 1. Create typed context
interface AccordionContextValue {
  openItems: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion.* must be used within <Accordion>');
  return ctx;
}

// 2. Root component owns state
interface AccordionProps {
  children: ReactNode;
  type?: 'single' | 'multiple';
  defaultOpen?: string[];
}

function Accordion({ children, type = 'single', defaultOpen = [] }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (type === 'single') next.clear();
        next.add(id);
      }
      return next;
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="divide-y divide-gray-200 rounded-xl border shadow-sm">
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// 3. Child components consume context
interface AccordionItemProps {
  id: string;
  children: ReactNode;
}

function AccordionItem({ id, children }: AccordionItemProps) {
  return <div data-accordion-item={id}>{children}</div>;
}

function AccordionTrigger({ id, children }: { id: string; children: ReactNode }) {
  const { openItems, toggle } = useAccordionContext();
  const isOpen = openItems.has(id);

  return (
    <button
      onClick={() => toggle(id)}
      aria-expanded={isOpen}
      aria-controls={`accordion-panel-${id}`}
      className="flex w-full items-center justify-between px-6 py-4 text-base font-medium transition-all duration-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
    >
      {children}
      <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

function AccordionContent({ id, children }: { id: string; children: ReactNode }) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.has(id);

  if (!isOpen) return null;

  return (
    <div id={`accordion-panel-${id}`} role="region" className="px-6 py-4 text-base">
      {children}
    </div>
  );
}

// 4. Attach sub-components
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

// Usage:
// <Accordion type="single" defaultOpen={["faq-1"]}>
//   <Accordion.Item id="faq-1">
//     <Accordion.Trigger id="faq-1">What is this?</Accordion.Trigger>
//     <Accordion.Content id="faq-1">An accordion component.</Accordion.Content>
//   </Accordion.Item>
// </Accordion>
```

### Headless Components (Hooks)

**Headless combobox:**

```tsx
import { useState, useCallback, useRef, useMemo } from 'react';

interface UseComboboxProps<T> {
  items: T[];
  itemToString: (item: T) => string;
  onSelect: (item: T) => void;
  filter?: (item: T, query: string) => boolean;
}

interface UseComboboxReturn<T> {
  query: string;
  setQuery: (q: string) => void;
  filteredItems: T[];
  isOpen: boolean;
  highlightedIndex: number;
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  getListProps: () => React.HTMLAttributes<HTMLUListElement>;
  getItemProps: (index: number) => React.LiHTMLAttributes<HTMLLIElement>;
}

function useCombobox<T>({
  items,
  itemToString,
  onSelect,
  filter,
}: UseComboboxProps<T>): UseComboboxReturn<T> {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const defaultFilter = useCallback(
    (item: T, q: string) => itemToString(item).toLowerCase().includes(q.toLowerCase()),
    [itemToString]
  );

  const filterFn = filter ?? defaultFilter;
  const filteredItems = useMemo(
    () => (query ? items.filter((item) => filterFn(item, query)) : items),
    [items, query, filterFn]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
          setIsOpen(true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
            onSelect(filteredItems[highlightedIndex]);
            setQuery(itemToString(filteredItems[highlightedIndex]));
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [filteredItems, highlightedIndex, onSelect, itemToString]
  );

  return {
    query,
    setQuery,
    filteredItems,
    isOpen,
    highlightedIndex,
    getInputProps: () => ({
      value: query,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
      },
      onFocus: () => setIsOpen(true),
      onBlur: () => setTimeout(() => setIsOpen(false), 200),
      onKeyDown: handleKeyDown,
      role: 'combobox',
      'aria-expanded': isOpen,
      'aria-autocomplete': 'list' as const,
      'aria-activedescendant':
        highlightedIndex >= 0 ? `combobox-item-${highlightedIndex}` : undefined,
    }),
    getListProps: () => ({
      ref: listRef,
      role: 'listbox',
    }),
    getItemProps: (index: number) => ({
      id: `combobox-item-${index}`,
      role: 'option',
      'aria-selected': index === highlightedIndex,
      onClick: () => {
        onSelect(filteredItems[index]);
        setQuery(itemToString(filteredItems[index]));
        setIsOpen(false);
      },
      onMouseEnter: () => setHighlightedIndex(index),
    }),
  };
}

// Consumer provides all UI — hook provides all logic
function CityPicker({ cities }: { cities: City[] }) {
  const combobox = useCombobox({
    items: cities,
    itemToString: (city) => city.name,
    onSelect: (city) => console.log('Selected:', city),
  });

  return (
    <div className="relative">
      <input
        {...combobox.getInputProps()}
        className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        placeholder="Search cities..."
      />
      {combobox.isOpen && combobox.filteredItems.length > 0 && (
        <ul
          {...combobox.getListProps()}
          className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow-sm"
        >
          {combobox.filteredItems.map((city, index) => (
            <li
              key={city.id}
              {...combobox.getItemProps(index)}
              className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                index === combobox.highlightedIndex ? 'bg-blue-50' : ''
              }`}
            >
              {city.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Polymorphic Components

**Type-safe `as` prop:**

```tsx
import { type ElementType, type ComponentPropsWithoutRef } from 'react';

// Generic type that resolves props based on the `as` element
type PolymorphicProps<E extends ElementType, Props = {}> = Props &
  Omit<ComponentPropsWithoutRef<E>, keyof Props | 'as'> & {
    as?: E;
  };

// Polymorphic Button that can render as <button>, <a>, or any element
type ButtonOwnProps = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

type ButtonProps<E extends ElementType = 'button'> = PolymorphicProps<E, ButtonOwnProps>;

const sizeClasses = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-4 text-base rounded-lg',
  lg: 'px-8 py-5 text-lg rounded-lg',
};

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
};

function Button<E extends ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps<E>) {
  const Component = as ?? 'button';

  return (
    <Component
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ''}`}
      {...props}
    />
  );
}

// Usage — TypeScript enforces correct props for each element
// <Button onClick={handleClick}>Click me</Button>           // button props
// <Button as="a" href="/home">Go home</Button>              // anchor props
// <Button as={Link} to="/dashboard">Dashboard</Button>      // Link props
```

### Render Props

```tsx
// Render prop for controlled rendering of list items
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => ReactNode;
}

function VirtualList<T>({ items, itemHeight, containerHeight, renderItem }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="rounded-xl border shadow-sm"
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, i) =>
          renderItem(item, startIndex + i, {
            position: 'absolute',
            top: (startIndex + i) * itemHeight,
            height: itemHeight,
            width: '100%',
          })
        )}
      </div>
    </div>
  );
}
```

### Slot Pattern

```tsx
// Named slots for layout components
interface PageLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

function PageLayout({ header, sidebar, children, footer }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {header && (
        <header className="sticky top-0 z-50 border-b bg-white px-6 py-4">
          {header}
        </header>
      )}
      <div className="flex flex-1">
        {sidebar && (
          <aside className="w-64 border-r p-6 hidden lg:block">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 py-16 px-6">{children}</main>
      </div>
      {footer && (
        <footer className="border-t px-6 py-4">{footer}</footer>
      )}
    </div>
  );
}
```

### Controlled vs Uncontrolled Pattern

```tsx
// Component supports both controlled and uncontrolled usage
interface ToggleProps {
  defaultPressed?: boolean;  // Uncontrolled
  pressed?: boolean;         // Controlled
  onPressedChange?: (pressed: boolean) => void;
  children: ReactNode;
}

function Toggle({ defaultPressed, pressed: controlledPressed, onPressedChange, children }: ToggleProps) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed ?? false);
  const isControlled = controlledPressed !== undefined;
  const pressed = isControlled ? controlledPressed : uncontrolledPressed;

  const handleToggle = useCallback(() => {
    const next = !pressed;
    if (!isControlled) setUncontrolledPressed(next);
    onPressedChange?.(next);
  }, [pressed, isControlled, onPressedChange]);

  return (
    <button
      role="switch"
      aria-checked={pressed}
      onClick={handleToggle}
      className={`px-6 py-4 text-base rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 ${
        pressed ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

// Uncontrolled: <Toggle defaultPressed={false}>Dark mode</Toggle>
// Controlled:   <Toggle pressed={isDark} onPressedChange={setIsDark}>Dark mode</Toggle>
```

## Best Practices

1. **Compound components for public APIs** — When building a component library, compound components give consumers maximum flexibility without prop explosion.
2. **Hooks over HOCs** — Prefer custom hooks for logic reuse. HOCs add wrapper layers and make debugging harder.
3. **Headless for design system foundations** — Build headless hooks first (logic + a11y), then wrap with styled components. This separates concerns cleanly.
4. **Support controlled and uncontrolled** — Components like inputs, toggles, and accordions should work both ways.
5. **Use context validation** — Throw descriptive errors when sub-components are used outside their parent context.
6. **Keep render props for rendering control only** — If you are just sharing logic (no rendering control needed), use a hook instead.
7. **Type polymorphic components strictly** — Use generics so TypeScript enforces correct props for each `as` element type.
8. **Prefer composition over configuration** — `<Card><Card.Header /><Card.Body /></Card>` beats `<Card header={...} body={...} />`.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Prop explosion | Component has 20+ props for every variation | Split into compound components with named sub-components |
| Context without validation | Cryptic error when sub-component used outside provider | Throw descriptive error in `useContext` wrapper |
| HOC wrapping order | Multiple HOCs create confusing wrapper chains | Replace with hooks: `const auth = useAuth(); const theme = useTheme();` |
| Polymorphic without generics | `as="a"` allows button props, not anchor props | Use generic `PolymorphicProps<E>` type for correct prop inference |
| Render prop callback identity | New function on every render triggers child re-renders | Memoize render prop callbacks or accept stable component references |
| Headless without ARIA | Logic reused but accessibility missing | Include ARIA attributes in `getProps` return values |
| Uncontrolled to controlled switch | React warns about changing from uncontrolled to controlled | Decide mode once based on initial props; document clearly |
| Over-abstraction | Pattern used where a simple component suffices | Use patterns only when the flexibility is actually needed |
