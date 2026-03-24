# shadcn/ui

> Copy-paste component library built on Radix UI + Tailwind CSS.

## When to Use
- Building UI with pre-styled, accessible components
- Extending or customizing component primitives
- Setting up a component system with Tailwind

## Core Concepts

### Installation
```bash
npx shadcn@latest init     # Setup project
npx shadcn@latest add button card dialog  # Add components
```

### Architecture
- Components copied to `components/ui/` — you own the code
- Built on Radix UI primitives (accessible, unstyled)
- Styled with Tailwind + `cn()` utility (clsx + tailwind-merge)
- Theme via CSS variables in `globals.css`

### Key Patterns
- `cn()` for conditional class merging: `cn("base", condition && "extra")`
- All components use `forwardRef` for ref forwarding
- Variants via `cva()` (class-variance-authority)
- Theme tokens: `--background`, `--foreground`, `--primary`, `--muted`, etc.
- Dark mode: `class` strategy with `.dark` class on `<html>`

### Common Components
Button, Card, Dialog, Sheet, Dropdown, Select, Input, Textarea,
Tabs, Accordion, Avatar, Badge, Toast, Tooltip, Popover, Command,
Table, Form (react-hook-form + zod), Calendar, Sidebar, Chart

### Integration
- Forms: `<Form>` component wraps react-hook-form with zod validation
- Data tables: `@tanstack/react-table` + shadcn Table component
- Charts: built on Recharts with shadcn wrapper
