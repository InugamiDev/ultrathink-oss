# Component Patterns

## Button Pattern

```tsx
<button
  className={cn(
    "px-6 py-3 min-h-[2.75rem] text-base",
    "rounded-lg",
    "shadow-sm",
    "bg-primary-600 text-white",
    "hover:bg-primary-700 hover:shadow-md",
    "active:bg-primary-800 active:shadow-sm",
    "focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none",
    "transition-all duration-200",
    "motion-reduce:transition-none",
    "font-medium leading-none"
  )}
>
  {children}
</button>
```

## Card Pattern

```tsx
<div
  className={cn(
    "p-6",
    "rounded-xl",
    "shadow-sm border border-neutral-200",
    "bg-white",
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

## Input Pattern

```tsx
<div className="flex flex-col gap-2">
  <label htmlFor={id} className="text-sm font-medium text-neutral-700">
    {label}
    {required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
  </label>
  <input
    id={id}
    className={cn(
      "px-4 py-3 min-h-[2.75rem] text-base",
      "rounded-lg",
      "border border-neutral-300",
      "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none",
      hasError && "border-error-500 focus:border-error-500 focus:ring-error-500/20",
      "disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed",
      "transition-all duration-200",
      "motion-reduce:transition-none",
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

## Form with Validation (shadcn/ui)

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </Form>
  )
}
```

## Design Styles

### Glassmorphism
```
WHEN: Modern, layered UIs — dashboards, overlays, cards on media backgrounds
TAILWIND: bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg
PAIR WITH: Gradient backgrounds, subtle noise textures, high-contrast text
AVOID: On text-heavy content, low-contrast backgrounds, critical forms
```

### Claymorphism
```
WHEN: Playful, friendly, 3D-feeling UIs — landing pages, kid-friendly apps
TAILWIND: rounded-3xl shadow-lg (+ custom inset shadow)
PAIR WITH: Soft pastel palettes, rounded typography, 3D icons from 3dicons.co
```

### Minimalism
```
WHEN: Content-focused — blogs, portfolios, SaaS dashboards, docs
RULE: If removing an element doesn't reduce understanding, remove it
Max 2-3 colors, typography as primary visual element, grid-based alignment
```

### Liquid Glass (Apple-inspired)
```
WHEN: Premium, modern UIs — settings panels, system overlays, nav bars
TAILWIND: backdrop-blur-3xl bg-gradient-to-br from-white/15 to-white/5 border border-white/30 rounded-2xl
PAIR WITH: SF Pro/Inter, system-level blur, adaptive color from background
```

## Component Minimums

| Element | Padding | Min Height | Text | Radius |
|---------|---------|------------|------|--------|
| Button | px-6 py-3 | 2.75rem | 1rem | rounded-lg |
| Card | p-6 | - | 1rem | rounded-xl |
| Input | px-4 py-3 | 2.75rem | 1rem | rounded-lg |
| Section | py-16 | - | - | - |
| Modal | p-8 | - | - | rounded-2xl |
| Badge | px-2 py-1 | 1.5rem | 0.75rem | rounded-full |

## Absolute Rules

**NEVER**: padding < 1rem on buttons/cards, text < 14px body, icons < 1rem, flat cards without shadow/border, skip hover/focus states, border-radius < 0.5rem on components

**MUST**: rem units, `transition-all duration-200` on interactive, `focus-visible:ring-2 focus-visible:ring-offset-2`, `motion-reduce:transition-none`, WCAG AA contrast (4.5:1 text, 3:1 UI)
