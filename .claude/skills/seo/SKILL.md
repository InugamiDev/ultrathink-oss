---
name: seo
description: SEO for web apps — meta tags, OpenGraph, JSON-LD structured data, sitemaps, robots.txt, Core Web Vitals, and Next.js metadata API
layer: domain
category: frontend
triggers:
  - "seo"
  - "meta tags"
  - "opengraph"
  - "og tags"
  - "structured data"
  - "json-ld"
  - "sitemap"
  - "robots.txt"
  - "core web vitals"
  - "search engine"
inputs:
  - Page or route to optimize
  - Target keywords and content type
  - Framework (Next.js, Remix, etc.)
outputs:
  - Metadata configuration with OG and Twitter cards
  - JSON-LD structured data blocks
  - Sitemap and robots.txt files
  - Core Web Vitals optimization recommendations
linksTo:
  - nextjs
  - performance-profiler
  - vercel
linkedFrom:
  - ship
  - optimize
  - ui-ux-pro
preferredNextSkills:
  - performance-profiler
  - nextjs
fallbackSkills:
  - react
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# SEO Skill

## Purpose

Implement search engine optimization for web applications: metadata, social sharing tags, structured data for rich snippets, crawl configuration, and Core Web Vitals. Primarily covers Next.js but patterns apply to any framework.

## Next.js Metadata API

```typescript
// app/layout.tsx — Global defaults
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: { default: "My App", template: "%s | My App" },
  description: "A concise description under 160 characters.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "My App",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", creator: "@handle" },
  robots: { index: true, follow: true },
};
```

```typescript
// app/blog/[slug]/page.tsx — Per-page dynamic metadata
import type { Metadata } from "next";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
  };
}
```

## JSON-LD Structured Data

```typescript
// components/json-ld.tsx
export function ArticleJsonLd({ post }: { post: Post }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: "My App",
      logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

## Sitemap and robots.txt

```typescript
// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const postEntries = posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: "https://example.com", lastModified: new Date(), priority: 1.0 },
    { url: "https://example.com/about", priority: 0.5 },
    ...postEntries,
  ];
}
```

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
    ],
    sitemap: "https://example.com/sitemap.xml",
  };
}
```

## Core Web Vitals Checklist

| Metric | Target | Key Fixes |
|--------|--------|-----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Optimize hero images, use `priority` on above-fold `<Image>`, preload fonts |
| **INP** (Interaction to Next Paint) | < 200ms | Avoid long tasks, use `startTransition`, defer non-critical JS |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Set explicit `width`/`height` on images, reserve space for dynamic content |

```typescript
// Preload critical font to prevent CLS
// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });

// Priority image for LCP
import Image from "next/image";
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `metadataBase` | OG images resolve to relative URLs; always set the base URL |
| Duplicate meta tags | Use Next.js metadata API exclusively; do not mix with `<Head>` |
| No `alt` text on images | Hurts accessibility and image search ranking |
| Blocking render with scripts | Use `next/script` with `strategy="lazyOnload"` for analytics |
| Missing canonical URL | Add `alternates: { canonical: url }` to prevent duplicate content |
