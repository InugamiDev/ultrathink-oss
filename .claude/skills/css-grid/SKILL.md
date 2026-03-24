---
name: css-grid
description: "CSS Grid layout patterns — grid templates, auto-placement, subgrid, named areas, and responsive grids."
layer: domain
category: frontend
triggers:
  - "css grid"
  - "grid layout"
  - "grid template"
  - "subgrid"
  - "grid area"
  - "auto-fit"
  - "auto-fill"
inputs:
  - "Layout requirements or design specifications"
  - "Responsive grid pattern needs"
  - "Complex layout challenges (overlapping, asymmetric)"
  - "Subgrid alignment questions"
outputs:
  - "CSS Grid layout implementations"
  - "Responsive grid patterns without media queries"
  - "Named grid area templates"
  - "Subgrid patterns for nested alignment"
linksTo:
  - responsive-design
  - tailwindcss
  - css-architecture
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# CSS Grid Layout Patterns

## Purpose

Provide expert guidance on CSS Grid layout for building complex, responsive page layouts. Covers grid templates, auto-placement, subgrid, named areas, and intrinsic sizing patterns. Focuses on modern CSS Grid (including subgrid) with Tailwind CSS equivalents.

## Key Patterns

### Responsive Grid Without Media Queries

**Auto-fit with minmax — the most useful pattern:**

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1.5rem;
}
```

The `min(100%, 18rem)` prevents overflow on small screens where `18rem` exceeds container width.

**Tailwind equivalent:**

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6">
  <!-- cards -->
</div>
```

**auto-fit vs auto-fill:**

| Property | Behavior | Use When |
|----------|----------|----------|
| `auto-fit` | Collapses empty tracks, items stretch to fill | Few items, want them to fill width |
| `auto-fill` | Keeps empty tracks, items stay at min size | Many items, consistent column width |

```css
/* auto-fit: 2 items stretch to fill 4-column space */
.stretch { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

/* auto-fill: 2 items stay at 200px, empty tracks preserved */
.fixed { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
```

### Named Grid Areas

**Classic page layout:**

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar content aside"
    "footer  footer  footer";
  grid-template-columns: 16rem 1fr 14rem;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
  gap: 0;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* Collapse sidebar on mobile */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "content"
      "footer";
    grid-template-columns: 1fr;
  }
  .sidebar, .aside { display: none; }
}
```

### Subgrid

Subgrid allows child grids to inherit the parent's track sizing, ensuring alignment across nested components:

```css
/* Parent grid defines columns */
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 1.5rem;
}

/* Each card aligns its internal rows to siblings */
.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;  /* card takes 3 rows: image, title, description */
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
}

.card img    { grid-row: 1; object-fit: cover; border-radius: 0.5rem; }
.card h3     { grid-row: 2; align-self: start; }
.card p      { grid-row: 3; align-self: start; }
```

**Subgrid for form alignment:**

```css
.form {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem 1.5rem;
}

.form-field {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: center;
}

.form-field label { grid-column: 1; }
.form-field input { grid-column: 2; padding: 0.75rem 1rem; border-radius: 0.5rem; }
```

### Explicit Grid Placement

**Dashboard with mixed-size widgets:**

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(10rem, auto);
  gap: 1.5rem;
  padding: 2rem;
}

.widget-large  { grid-column: span 2; grid-row: span 2; }
.widget-wide   { grid-column: span 2; }
.widget-tall   { grid-row: span 2; }
.widget-full   { grid-column: 1 / -1; }

@media (max-width: 768px) {
  .dashboard { grid-template-columns: repeat(2, 1fr); }
  .widget-large { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
  .dashboard { grid-template-columns: 1fr; }
  .widget-large,
  .widget-wide { grid-column: 1 / -1; grid-row: span 1; }
}
```

### Overlapping Grid Items

Grid items can occupy the same cells for layered effects:

```css
.hero {
  display: grid;
  grid-template: 1fr / 1fr;
  min-height: 60vh;
}

.hero > * {
  grid-area: 1 / 1;  /* all children overlap */
}

.hero-image {
  object-fit: cover;
  width: 100%;
  height: 100%;
}

.hero-overlay {
  background: linear-gradient(to top, rgb(0 0 0 / 0.7), transparent);
  z-index: 1;
}

.hero-content {
  z-index: 2;
  align-self: end;
  padding: 4rem;
  color: white;
}
```

### Intrinsic Sizing Patterns

```css
/* Content-sized sidebar, flexible main */
.layout {
  display: grid;
  grid-template-columns: fit-content(20rem) 1fr;
}

/* Minimum content size, then flexible */
.layout-2 {
  display: grid;
  grid-template-columns: minmax(min-content, 20rem) 1fr;
}

/* Auto tracks size to content, fr takes remaining space */
.header-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
}
```

### Masonry Layout (CSS Grid approach)

True CSS masonry is still experimental, but you can approximate it:

```css
/* Approximation using grid-auto-rows */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  grid-auto-rows: 1rem; /* small row unit */
  gap: 1rem;
}

/* Each item spans a calculated number of rows */
.masonry-item-sm { grid-row: span 10; }
.masonry-item-md { grid-row: span 15; }
.masonry-item-lg { grid-row: span 22; }
```

### Tailwind CSS Grid Utilities

```html
<!-- Responsive card grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div class="p-6 rounded-xl shadow-sm border">Card</div>
</div>

<!-- Dashboard layout with named areas (requires arbitrary values) -->
<div class="grid grid-cols-[16rem_1fr_14rem] grid-rows-[auto_1fr_auto] min-h-dvh">
  <header class="col-span-full">Header</header>
  <aside>Sidebar</aside>
  <main>Content</main>
  <aside>Right panel</aside>
  <footer class="col-span-full">Footer</footer>
</div>

<!-- Spanning items -->
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2 row-span-2">Large widget</div>
  <div>Small widget</div>
  <div>Small widget</div>
</div>
```

## Best Practices

1. **Use `auto-fit` with `minmax()` for responsive grids** — Eliminates the need for most media queries in card layouts.
2. **Use `min(100%, Xrem)` inside `minmax()`** — Prevents items from overflowing on very narrow containers.
3. **Use named grid areas for page layouts** — More readable than line-number placement for complex layouts.
4. **Use subgrid for aligned card content** — Ensures titles, descriptions, and CTAs align across cards in a row.
5. **Prefer `gap` over margins** — Grid gap only applies between items, not at edges. Simpler than managing margins.
6. **Use `dvh` for full-height layouts** — `100dvh` accounts for mobile browser chrome, unlike `100vh`.
7. **Combine Grid and Flexbox** — Use Grid for 2D layouts, Flexbox for 1D alignment within grid items.
8. **Use `fr` units, not percentages** — `fr` respects `gap` automatically; percentages don't.
9. **Set `min-width: 0` on grid children when needed** — Grid items default to `min-width: auto`, which can cause overflow with long text.
10. **Test with Grid DevTools** — Firefox and Chrome both have Grid overlay inspectors that show tracks and gaps.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `minmax(200px, 1fr)` overflow | On screens < 200px, items overflow | Use `minmax(min(100%, 200px), 1fr)` |
| Percentage gaps | Gaps calculated from container, not track | Use `rem` or `px` for gap values |
| `auto` vs `1fr` confusion | `auto` sizes to content; `1fr` shares remaining space | Use `1fr` when columns should be equal |
| Missing `min-width: 0` | Long words or images overflow grid cells | Add `min-width: 0` or `overflow: hidden` to children |
| Subgrid without `span` | Child grid doesn't span enough parent rows | Set `grid-row: span N` to match subgrid row count |
| `auto-fill` when wanting stretch | Items don't fill container width | Use `auto-fit` to collapse empty tracks |
| Fixed column count on mobile | Grid doesn't adapt to small screens | Use `auto-fit`/`auto-fill` or responsive breakpoints |
| Forgetting `grid-template-rows` | Only columns defined, rows auto-sized unexpectedly | Define explicit row templates for complex layouts |
