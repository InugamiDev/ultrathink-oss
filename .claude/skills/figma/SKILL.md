---
name: figma
description: Figma API integration, design tokens export, Auto Layout to Flexbox mapping, Dev Mode handoff, code-to-design reverse translation, and component property mapping
layer: domain
category: design
triggers:
  - "figma"
  - "figma api"
  - "figma to code"
  - "code to figma"
  - "design tokens"
  - "auto layout"
  - "figma handoff"
  - "design handoff"
  - "figma dev mode"
  - "figma component"
  - "figma variables"
inputs:
  - "Figma file URL or file key"
  - "Design token export requirements"
  - "Auto Layout frame to convert to CSS"
  - "Component property mapping needs"
  - "Tailwind classes to translate back to Figma spec"
outputs:
  - "CSS/Tailwind code from Figma designs"
  - "Design token JSON/CSS custom property definitions"
  - "React component props from Figma component properties"
  - "Figma spec from existing code (reverse translation)"
linksTo:
  - design-systems
  - design-principles
  - react
  - tailwindcss
linkedFrom:
  - ui-ux-pro
  - bootstrap
preferredNextSkills:
  - design-systems
  - react
  - tailwindcss
fallbackSkills:
  - design-principles
  - css-architecture
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - May make Figma REST API calls (read-only)
---

# Figma

## Purpose

Bridge the gap between design and code. This skill covers the Figma REST API, design token extraction, Auto Layout to CSS/Flexbox translation, Dev Mode handoff workflows, component property to React prop mapping, and reverse code-to-design translation.

---

## Figma REST API

### Authentication

```
Header: X-Figma-Token: <personal_access_token>
Base URL: https://api.figma.com/v1
```

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/files/:file_key` | GET | Get full file tree (nodes, styles, components) |
| `/files/:file_key/nodes?ids=:ids` | GET | Get specific nodes by ID |
| `/images/:file_key?ids=:ids&format=png` | GET | Export nodes as images (png, jpg, svg, pdf) |
| `/files/:file_key/styles` | GET | Get all published styles |
| `/files/:file_key/components` | GET | Get all published components |
| `/files/:file_key/component_sets` | GET | Get component sets (variant groups) |
| `/files/:file_key/variables/local` | GET | Get local variables (colors, spacing, etc.) |
| `/files/:file_key/variables/published` | GET | Get published variable collections |

### File Key Extraction

From URL: `https://www.figma.com/design/ABC123xyz/Project-Name`
File key: `ABC123xyz`

Node IDs are in the format `1:234` (page:node). URL-encode as `1%3A234`.

### Pagination and Depth

```
?depth=1        Only top-level children (fast, for structure scanning)
?depth=2        Two levels deep (good for page → frame overview)
?depth=N        N levels (full tree can be very large)
```

For large files, always use `?ids=` to request specific nodes rather than the full tree.

### Image Export

```
GET /images/:file_key
  ?ids=1:234,5:678
  &format=svg          (svg | png | jpg | pdf)
  &scale=2             (1-4, for raster formats)
  &svg_include_id=true (include node IDs in SVG)
```

---

## Auto Layout to CSS/Flexbox

Figma's Auto Layout maps directly to CSS Flexbox. Use this reference for 1:1 translation.

### Direction

| Figma | CSS |
|-------|-----|
| Horizontal | `flex-direction: row` |
| Vertical | `flex-direction: column` |
| Wrap | `flex-wrap: wrap` |

### Spacing

| Figma Property | CSS Property | Tailwind |
|---------------|-------------|----------|
| Item spacing | `gap` | `gap-N` |
| Padding (all) | `padding` | `p-N` |
| Padding (top) | `padding-top` | `pt-N` |
| Padding (right) | `padding-right` | `pr-N` |
| Padding (bottom) | `padding-bottom` | `pb-N` |
| Padding (left) | `padding-left` | `pl-N` |
| Padding (horizontal) | `padding-inline` | `px-N` |
| Padding (vertical) | `padding-block` | `py-N` |

### Alignment

| Figma (Primary Axis) | CSS | Tailwind |
|---------------------|-----|----------|
| Top / Left (packed start) | `justify-content: flex-start` | `justify-start` |
| Center | `justify-content: center` | `justify-center` |
| Bottom / Right (packed end) | `justify-content: flex-end` | `justify-end` |
| Space between | `justify-content: space-between` | `justify-between` |

| Figma (Cross Axis) | CSS | Tailwind |
|-------------------|-----|----------|
| Top / Left | `align-items: flex-start` | `items-start` |
| Center | `align-items: center` | `items-center` |
| Bottom / Right | `align-items: flex-end` | `items-end` |
| Stretch (fill) | `align-items: stretch` | `items-stretch` |
| Baseline | `align-items: baseline` | `items-baseline` |

### Sizing (Resizing Behavior)

| Figma | CSS | Tailwind |
|-------|-----|----------|
| Fixed width | `width: Npx` | `w-[Npx]` |
| Fill container | `flex: 1 1 0` | `flex-1` |
| Hug contents | `width: fit-content` | `w-fit` |
| Fixed height | `height: Npx` | `h-[Npx]` |
| Fill (height) | `flex: 1 1 0` (in column parent) | `flex-1` |
| Hug (height) | `height: fit-content` | `h-fit` |

### Min/Max Constraints

| Figma | CSS |
|-------|-----|
| Min width | `min-width: Npx` |
| Max width | `max-width: Npx` |
| Min height | `min-height: Npx` |
| Max height | `max-height: Npx` |

### Complete Auto Layout Example

```
Figma Frame:
  Direction: Vertical
  Gap: 16px
  Padding: 24px
  Primary Axis: Top (packed start)
  Cross Axis: Stretch
  Width: Fill container
  Min Width: 320px
  Max Width: 640px

CSS:
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  justify-content: flex-start;
  align-items: stretch;
  flex: 1 1 0;
  min-width: 20rem;
  max-width: 40rem;

Tailwind:
  flex flex-col gap-4 p-6 justify-start items-stretch flex-1 min-w-[20rem] max-w-[40rem]
```

---

## Design Tokens Export

### Token Taxonomy

Extract Figma variables and styles into a structured token system:

```
Primitives (raw values)
  ├── colors/         Color hex/rgb values
  ├── spacing/        Numeric spacing values
  ├── radii/          Border radius values
  ├── typography/     Font family, size, weight, line-height
  ├── shadows/        Box shadow definitions
  └── breakpoints/    Viewport widths

Semantic (contextual aliases)
  ├── surface/        background-primary, background-secondary
  ├── text/           text-primary, text-muted, text-inverse
  ├── border/         border-default, border-strong
  ├── interactive/    interactive-primary, interactive-hover
  └── feedback/       success, warning, error, info
```

### Figma Variables to CSS Custom Properties

```css
/* From Figma variable collection "Primitives" */
:root {
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

/* From Figma variable collection "Semantic / Light" */
:root {
  --surface-primary: var(--color-white);
  --surface-secondary: var(--color-gray-50);
  --text-primary: var(--color-gray-900);
  --text-muted: var(--color-gray-500);
  --interactive-primary: var(--color-blue-600);
  --interactive-hover: var(--color-blue-700);
}

/* From Figma variable collection "Semantic / Dark" */
[data-theme="dark"] {
  --surface-primary: var(--color-gray-950);
  --surface-secondary: var(--color-gray-900);
  --text-primary: var(--color-gray-100);
  --text-muted: var(--color-gray-400);
  --interactive-primary: var(--color-blue-500);
  --interactive-hover: var(--color-blue-400);
}
```

### Figma Variables to Tailwind Theme

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
        },
        content: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
        interactive: {
          DEFAULT: 'var(--interactive-primary)',
          hover: 'var(--interactive-hover)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
}
```

---

## Component Property to React Prop Mapping

Figma component properties map directly to React component props:

### Property Type Mapping

| Figma Property Type | React Prop Type | Example |
|-------------------|----------------|---------|
| Boolean | `boolean` (flag) | `showIcon: true` → `showIcon` |
| Text | `string` (children or prop) | `label: "Submit"` → `children="Submit"` |
| Instance swap | `ReactNode` | `icon: IconCheck` → `icon={<IconCheck />}` |
| Variant | `string` union | `size: "sm" \| "md" \| "lg"` → `size="md"` |

### Component Mapping Example

```
Figma Component: Button
  Properties:
    - Variant: size (sm, md, lg)
    - Variant: intent (primary, secondary, ghost)
    - Boolean: isDisabled
    - Boolean: showIcon
    - Text: label
    - Instance swap: leadingIcon

React Component:
  interface ButtonProps {
    size?: 'sm' | 'md' | 'lg';
    intent?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    icon?: ReactNode;
    children: ReactNode;
  }
```

### Variant to Prop Pattern

```tsx
// Figma has a variant set with "State" property: default, hover, active, disabled
// Don't create a "state" prop — these are CSS states, not props

// Figma has a variant set with "Type" property: filled, outlined, ghost
// This IS a prop:
type ButtonVariant = 'filled' | 'outlined' | 'ghost';
```

---

## Code-to-Design Reverse Translation

When given existing code (especially Tailwind), translate back to a Figma specification.

### Tailwind to Figma Auto Layout

| Tailwind | Figma Property |
|----------|---------------|
| `flex flex-col` | Auto Layout: Vertical |
| `flex flex-row` | Auto Layout: Horizontal |
| `gap-4` | Item spacing: 16 |
| `p-6` | Padding: 24 (all sides) |
| `px-4 py-3` | Padding: L12, R12, T12, B12 |
| `items-center` | Cross axis: Center |
| `justify-between` | Primary axis: Space between |
| `flex-1` | Sizing: Fill container |
| `w-fit` | Sizing: Hug contents |
| `w-[320px]` | Sizing: Fixed 320 |
| `min-w-0` | Min width: 0 |
| `max-w-md` | Max width: 448 |

### Tailwind to Figma Visual Properties

| Tailwind | Figma Property |
|----------|---------------|
| `rounded-lg` | Corner radius: 8 |
| `rounded-xl` | Corner radius: 12 |
| `rounded-full` | Corner radius: 9999 |
| `shadow-sm` | Drop shadow: 0 1 2 0 rgba(0,0,0,0.05) |
| `shadow-md` | Drop shadow: 0 4 6 -1 rgba(0,0,0,0.1) |
| `bg-gray-100` | Fill: #F3F4F6 |
| `text-gray-900` | Text color: #111827 |
| `text-sm` | Font size: 14, Line height: 20 |
| `font-medium` | Font weight: Medium (500) |
| `border border-gray-200` | Stroke: Inside, 1px, #E5E7EB |
| `opacity-50` | Opacity: 50% |

### Reverse Translation Workflow

```
1. Read the React component and extract all Tailwind classes
2. Group by purpose: layout, spacing, typography, color, effects
3. Map each group to Figma properties
4. Output a Figma spec document:

   Frame: "Card"
   Auto Layout: Vertical, Gap 16, Padding 24
   Fill: white
   Corner radius: 12
   Effects: Drop shadow (0, 1, 3, rgba(0,0,0,0.1))
   Width: Fill container
   Min width: 280

   Child: "Heading"
   Type: Text
   Font: Inter, 20/28, Semibold
   Fill: #111827

   Child: "Body"
   Type: Text
   Font: Inter, 16/24, Regular
   Fill: #6B7280
```

---

## Dev Mode Handoff Workflow

### Reading Dev Mode Output

When a developer inspects a frame in Figma Dev Mode:

1. **Properties panel** — Shows Auto Layout, sizing, constraints
2. **CSS tab** — Generates CSS (but don't copy blindly — it's verbose)
3. **Variables tab** — Shows which Figma variables are applied
4. **Assets tab** — Lists components and their properties

### Handoff Checklist

```
[ ] Extract variable names, not raw values (use tokens)
[ ] Map Auto Layout to Flexbox (use the mapping table above)
[ ] Check which properties are from component variants vs. overrides
[ ] Verify responsive behavior (check Figma's min/max constraints)
[ ] Export icons as SVG with svg_include_id for component matching
[ ] Note any prototype interactions that need JS implementation
[ ] Check for Figma comments / annotations from designers
```

### Common Handoff Mistakes

1. **Copying Figma CSS verbatim** — Figma generates absolute positioning and pixel values. Always translate to flex/grid with rem units.
2. **Ignoring constraints** — Figma min/max width constraints are often the responsive behavior spec. Don't skip them.
3. **Missing hover/focus states** — Check if the component has variant states. Figma often stores these as separate variants, not as CSS pseudo-classes.
4. **Hardcoding colors** — Always use design token variables, not the hex values from Figma's CSS output.

---

## Pitfalls

1. **Full file fetches** — Never fetch an entire Figma file without `depth` or `ids` constraints. Large files can be 50MB+ of JSON.
2. **Token sync drift** — Design tokens in code and Figma must stay in sync. Use automated token pipelines (Style Dictionary, Token Studio) rather than manual copy.
3. **Auto Layout !== CSS Grid** — Auto Layout is Flexbox only. For CSS Grid layouts, you need to interpret the design intent, not translate 1:1.
4. **Instance swap complexity** — Figma's instance swap creates implicit component hierarchies. Map carefully to React composition patterns (children, render props, slots).
5. **Responsive breakpoints** — Figma doesn't natively handle responsive breakpoints well. Designers often create separate frames per breakpoint. Combine them into a single responsive component in code.
6. **Figma's shadow model** — Figma uses separate inner shadow and drop shadow. CSS `box-shadow` can handle both but the syntax differs from Figma's visual representation.
