# Next.js Metadata API

The App Router's first-class metadata system. Replaces `<Head>` for App Router; Pages Router still uses `<Head>` but you should be migrating.

## Root layout — global defaults

```typescript
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),     // CRITICAL — without this, OG images use relative URLs
  title: { default: "My App", template: "%s | My App" },
  description: "A concise description under 160 characters.",
  applicationName: "My App",
  authors: [{ name: "Author", url: "https://author.example.com" }],
  generator: "Next.js",
  keywords: ["nextjs", "react", "saas"],         // low SEO weight in 2026 but still indexed by some engines
  referrer: "origin-when-cross-origin",
  creator: "Author",
  publisher: "Publisher",
  formatDetection: { email: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://example.com",
    siteName: "My App",
    title: "My App",
    description: "Default OG description.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "My App" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@handle",
    creator: "@handle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
    languages: { "en-US": "/en-US", "fr-FR": "/fr-FR" },
  },
  verification: {
    google: "google-site-verification=...",
    yandex: "...",
    other: { "msvalidate.01": "..." },
  },
  category: "technology",
};
```

## Per-page metadata

### Static (preferred)
```typescript
// app/about/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Who we are.",
  alternates: { canonical: "/about" },
};
```

### Dynamic
```typescript
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
    other: {
      // Article-specific meta tags
      "article:published_time": post.publishedAt,
      "article:author": post.author.name,
      "article:section": post.category,
      "article:tag": post.tags.join(","),
    },
  };
}
```

## Dynamic OG image generation

```typescript
// app/og/route.tsx
import { ImageResponse } from "next/og";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Default";

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        {title}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

Reference from generateMetadata:
```typescript
images: [{ url: `/og?title=${encodeURIComponent(post.title)}`, width: 1200, height: 630 }]
```

## Tips

- `title.template` lets `%s` substitute the page title and append a brand suffix
- `metadataBase` MUST be set; otherwise relative `/og.png` URLs break in social shares
- `generateMetadata` runs in parallel with the page; it doesn't block render
- For preview deploys (Vercel branch URLs), set `metadataBase` from `process.env.VERCEL_URL` so OG images point to the right host
- Use `viewport` export (separate from metadata) for `width`, `initialScale`, `themeColor`
