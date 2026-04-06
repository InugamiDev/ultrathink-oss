# Astro

> The web framework for content-driven websites — islands architecture, zero JS by default.

## When to Use
- Content-heavy sites (blogs, docs, marketing, portfolios)
- Static-first with selective interactivity (islands)
- Multi-framework pages (React + Svelte + Vue on same page)
- Maximum performance with minimal client JS

## Core Patterns

### Project Structure
```
src/
  pages/         # File-based routing (.astro, .md, .mdx)
  layouts/       # Reusable page layouts
  components/    # .astro, .tsx, .svelte, .vue components
  content/       # Content collections (type-safe markdown)
  styles/        # Global styles
public/          # Static assets (copied as-is)
astro.config.mjs
```

### Astro Components
```astro
---
// Server-side (runs at build time, not in browser)
const { title, items } = Astro.props;
const response = await fetch("https://api.example.com/data");
const data = await response.json();
---

<section>
  <h2>{title}</h2>
  {items.map((item) => <p>{item.name}</p>)}
  <!-- Island: only this component ships JS to the browser -->
  <ReactCounter client:load />
  <HeavyWidget client:visible /> <!-- Lazy hydrate on scroll -->
</section>

<style>
  /* Scoped by default */
  section { padding: 2rem; }
</style>
```

### Content Collections
```typescript
// src/content/config.ts
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

### Key Features
- **Islands**: `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`
- **View Transitions**: `<ViewTransitions />` for SPA-like page transitions
- **Server endpoints**: `src/pages/api/*.ts` for API routes
- **SSR adapters**: `@astrojs/node`, `@astrojs/vercel`, `@astrojs/cloudflare`
- **Integrations**: `@astrojs/tailwind`, `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/image`
- **Type-safe**: Full TypeScript, typed content collections, typed API routes
