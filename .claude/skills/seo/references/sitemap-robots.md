# Sitemap & robots.txt

Sitemaps tell crawlers what URLs exist; robots.txt tells them what's off-limits. Both are cheap to ship, expensive to omit.

## Next.js App Router

```typescript
// app/sitemap.ts — Static + dynamic merge
import type { MetadataRoute } from "next";

export const revalidate = 3600; // re-generate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://example.com";
  const posts = await getAllPosts();
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/about`, priority: 0.6 },
    { url: `${base}/pricing`, priority: 0.8 },
    { url: `${base}/blog`, priority: 0.8, changeFrequency: "daily" },
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
```

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://example.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/_internal/"] },
      // Block aggressive AI crawlers if you don't want to be in their training:
      // { userAgent: ["GPTBot", "ClaudeBot", "Google-Extended"], disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
```

## Sitemap-of-sitemaps for >50K URLs

```typescript
// app/sitemap.ts — index file pointing to chunked sub-sitemaps
import type { MetadataRoute } from "next";

const PAGE_SIZE = 1000; // Google's hard limit is 50,000

export async function generateSitemaps() {
  const totalPosts = await getPostCount();
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);
  return Array.from({ length: totalPages }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const start = id * PAGE_SIZE;
  const posts = await getPostsRange(start, PAGE_SIZE);
  return posts.map((p) => ({
    url: `https://example.com/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
  }));
}
```

## Plain HTML / static-site fallback

```bash
# build-time generator (Astro / Vite / static)
node scripts/generate-sitemap.js > public/sitemap.xml
```

```javascript
// scripts/generate-sitemap.js
import { readFileSync, writeFileSync } from "node:fs";

const base = "https://example.com";
const urls = JSON.parse(readFileSync("./content/index.json", "utf8"));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u.path}</loc><lastmod>${u.updatedAt}</lastmod></url>`).join("\n")}
</urlset>`;

console.log(xml);
```

## hreflang for international sites

If you serve different languages, add `<xhtml:link>` annotations OR use HTTP `Link` headers.

```typescript
// In sitemap.ts
return [
  {
    url: "https://example.com/en/about",
    alternates: {
      languages: {
        "en-US": "https://example.com/en/about",
        "fr-FR": "https://example.com/fr/about",
        "x-default": "https://example.com/en/about",
      },
    },
  },
];
```

## Submission

- Submit `sitemap.xml` to Google Search Console once — Google polls automatically thereafter
- For Bing: submit via Bing Webmaster Tools
- Don't submit a sitemap that lists `noindex`-tagged URLs — that's a quality signal Google docks you for

## Checklist

- [ ] `sitemap.xml` reachable at `/sitemap.xml`
- [ ] `robots.txt` reachable at `/robots.txt` and references the sitemap
- [ ] Robots doesn't block `/_next/static/`, `/static/`, or any rendering-critical paths
- [ ] Sitemap doesn't include staging / preview URLs
- [ ] `lastModified` set on entries (helps crawl prioritisation)
- [ ] Submitted to Google Search Console
