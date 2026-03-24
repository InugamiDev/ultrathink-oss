# UI Standards — Mandatory Minimums

**STOP** before outputting any UI code. Verify these minimums.

Golden Ratio Scale (φ = 1.618): `0.625rem, 0.8125rem, 1rem, 1.625rem, 2.625rem, 4.25rem`

| Element  | Padding         | Min Height | Text    | Radius   | Tailwind Example           |
|----------|-----------------|------------|---------|----------|----------------------------|
| Button   | `1rem 1.5rem`   | `2.625rem` | `1rem`  | `0.5rem` | `px-6 py-4 text-base rounded-lg` |
| Card     | `1.5rem+`       | -          | `1rem`  | `0.75rem`| `p-6 rounded-xl shadow-sm` |
| Input    | `0.75rem 1rem`  | `2.75rem`  | `1rem`  | `0.5rem` | `px-4 py-3 rounded-lg`     |
| Section  | `4rem` vert     | -          | -       | -        | `py-16`                    |
| Modal    | `2rem`          | -          | -       | `1rem`   | `p-8 rounded-2xl`          |
| Badge    | `0.25rem 0.5rem`| `1.5rem`   | `0.75rem`| full    | `px-2 py-1 text-xs rounded-full` |

## NEVER
- Use padding < `1rem` on buttons/cards
- Use text < `0.875rem` (14px) for body content
- Use icons < `1rem` (use `w-4 h-4` minimum)
- Output flat cards (MUST have `shadow-sm` OR border)
- Skip hover/focus states on interactive elements
- Use border-radius < `0.5rem` on components

## MUST
- Use `rem` units (not px) for accessibility
- Add `transition-all duration-200` on interactive elements
- Include focus-visible states: `focus-visible:ring-2 focus-visible:ring-offset-2`
- Respect `prefers-reduced-motion` with `motion-reduce:transition-none`
- Meet WCAG AA contrast: 4.5:1 text, 3:1 UI elements

> **Critical**: KISS/YAGNI do NOT apply to UI polish. Shadows, transitions, and generous spacing are features, not bloat.
