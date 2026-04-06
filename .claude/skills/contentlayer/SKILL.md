---
name: contentlayer
description: Content layer and MDX content management for Next.js, including Contentlayer2, content collections, and MDX processing
layer: domain
category: content
triggers:
  - "contentlayer"
  - "mdx"
  - "content collections"
  - "contentlayer config"
  - ".mdx files"
  - "contentlayer2"
  - "mdx components"
  - "fumadocs"
inputs:
  - "Content structure requirements"
  - "MDX component needs"
  - "Content sourcing strategy"
outputs:
  - "Contentlayer configuration"
  - "MDX component setup"
  - "Content type definitions"
  - "Next.js integration patterns"
linksTo:
  - nextjs
  - react
  - typescript-frontend
  - docs-writer
linkedFrom: []
preferredNextSkills: [nextjs, docs-writer]
fallbackSkills: [sanity, astro]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Contentlayer / MDX Content Management

## Purpose

Manage file-based content (Markdown/MDX) as type-safe data in Next.js applications. Covers Contentlayer 2 (community fork), raw MDX with `next-mdx-remote` or `@next/mdx`, content collections patterns, frontmatter handling, custom MDX components, and alternatives like Fumadocs and Velite for documentation sites.

## Core Patterns

### Contentlayer 2 Configuration

```typescript
// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: "posts/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    date: { type: "date", required: true },
    published: { type: "boolean", default: true },
    image: { type: "string" },
    authors: { type: "list", of: { type: "string" }, required: true },
    tags: { type: "list", of: { type: "string" }, default: [] },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("posts/", ""),
    },
    readingTime: {
      type: "number",
      resolve: (doc) => Math.ceil(doc.body.raw.split(/\s+/).length / 200),
    },
    url: {
      type: "string",
      resolve: (doc) => `/blog/${doc._raw.flattenedPath.replace("posts/", "")}`,
    },
  },
}));

export const Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: "docs/**/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string" },
    order: { type: "number", default: 999 },
    section: { type: "string" },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.replace("docs/", ""),
    },
  },
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Post, Doc],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: false }],
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
    ],
  },
});
```

### Content Directory Structure

```
content/
  posts/
    getting-started.mdx
    advanced-patterns.mdx
    2024/
      yearly-review.mdx
  docs/
    introduction.mdx
    installation.mdx
    api-reference.mdx
```

### MDX File Format

```mdx
---
title: "Building Type-Safe Content Pipelines"
description: "How to use Contentlayer with Next.js for fully typed MDX content"
date: 2024-11-15
published: true
authors: ["alice"]
tags: ["nextjs", "mdx", "typescript"]
image: "/images/content-pipeline.jpg"
---

## Introduction

This is standard markdown with **bold** and _italic_ support.

<Callout type="info">
  This is a custom MDX component rendered inline with markdown.
</Callout>

### Code Example

```tsx
export function Component() {
  return <div>Hello from MDX</div>;
}
```

<Steps>
  <Step title="Install dependencies">
    Run `pnpm add contentlayer2 next-contentlayer2`
  </Step>
  <Step title="Create config">
    Add `contentlayer.config.ts` to your project root.
  </Step>
</Steps>
```

### Next.js Integration

```typescript
// next.config.ts
import { withContentlayer } from "next-contentlayer2";

const nextConfig = {
  reactStrictMode: true,
};

export default withContentlayer(nextConfig);
```

```tsx
// app/blog/page.tsx
import { allPosts } from "contentlayer/generated";
import { compareDesc } from "date-fns";
import Link from "next/link";

export default function BlogPage() {
  const posts = allPosts
    .filter((post) => post.published)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));

  return (
    <section className="py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.slug} className="p-6 rounded-xl shadow-sm border">
            <Link href={post.url}>
              <h2 className="text-xl font-semibold hover:underline">{post.title}</h2>
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(post.date).toLocaleDateString()} · {post.readingTime} min read
            </p>
            <p className="mt-2 text-gray-700">{post.description}</p>
            <div className="flex gap-2 mt-3">
              {post.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs rounded-full bg-gray-100">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// app/blog/[slug]/page.tsx
import { allPosts } from "contentlayer/generated";
import { notFound } from "next/navigation";
import { useMDXComponent } from "next-contentlayer2/hooks";
import { mdxComponents } from "@/components/mdx-components";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = allPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { images: post.image ? [post.image] : [] },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = allPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="py-16 max-w-3xl mx-auto prose prose-lg dark:prose-invert">
      <h1>{post.title}</h1>
      <time className="text-sm text-gray-500">{new Date(post.date).toLocaleDateString()}</time>
      <MDXContent code={post.body.code} />
    </article>
  );
}

function MDXContent({ code }: { code: string }) {
  const Component = useMDXComponent(code);
  return <Component components={mdxComponents} />;
}
```

### Custom MDX Components

```tsx
// components/mdx-components.tsx
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";

function Callout({ type = "info", children }: { type?: "info" | "warning" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
    warning: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100",
    error: "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
  };
  return (
    <div className={`p-6 rounded-xl border my-6 ${styles[type]}`}>
      {children}
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 my-6 border-l-2 border-gray-200 pl-6">{children}</div>;
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-base">{title}</h4>
      <div className="text-gray-600 mt-1">{children}</div>
    </div>
  );
}

export const mdxComponents: MDXComponents = {
  Callout,
  Steps,
  Step,
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/")) return <Link href={href} {...props}>{children}</Link>;
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  },
  img: ({ src, alt, ...props }) => (
    <Image src={src ?? ""} alt={alt ?? ""} width={800} height={400} className="rounded-xl" {...props} />
  ),
};
```

### Alternative: next-mdx-remote (No Contentlayer)

```tsx
// For projects that don't want a build plugin
import { compileMDX } from "next-mdx-remote/rsc";
import { readFile } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";

async function getPost(slug: string) {
  const filePath = join(process.cwd(), "content/posts", `${slug}.mdx`);
  const raw = await readFile(filePath, "utf-8");
  const { content, data: frontmatter } = matter(raw);

  const { content: mdxContent } = await compileMDX({
    source: content,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, rehypePrettyCode],
      },
    },
    components: mdxComponents,
  });

  return { content: mdxContent, frontmatter };
}
```

### Alternative: Velite (Contentlayer Successor)

```typescript
// velite.config.ts — Velite is a modern alternative to Contentlayer
import { defineConfig, defineCollection, s } from "velite";

const posts = defineCollection({
  name: "Post",
  pattern: "posts/**/*.mdx",
  schema: s.object({
    title: s.string().max(120),
    description: s.string().max(300),
    date: s.isodate(),
    published: s.boolean().default(true),
    tags: s.array(s.string()).default([]),
    body: s.mdx(),
    slug: s.slug("posts"),
    metadata: s.metadata(),
  }),
});

export default defineConfig({
  root: "content",
  collections: { posts },
});
```

## Best Practices

- **Type everything** — Contentlayer generates TypeScript types; use them in all components
- **Compute derived fields** — reading time, slugs, URLs belong in `computedFields`, not in frontmatter
- **Use rehype/remark plugins** — syntax highlighting, slug headings, GFM support via the plugin pipeline
- **Create reusable MDX components** — `Callout`, `Steps`, `CodeGroup`, `Tabs` for rich documentation
- **Generate static params** — use `generateStaticParams` from the generated collection for full static generation
- **Validate frontmatter** — required fields catch missing metadata at build time, not runtime
- **Keep content in `content/`** — separate content from app code; makes it easy to move to a CMS later
- **Use `prose` typography** — Tailwind's `@tailwindcss/typography` plugin handles MDX rendering beautifully

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do Instead |
|---|---|---|
| Storing slugs in frontmatter | Duplicates file path info, can drift | Compute from `_raw.flattenedPath` |
| Inline styles in MDX files | Hard to maintain, inconsistent | Use MDX components with Tailwind classes |
| Fetching content at request time | Unnecessary for static content | Use `generateStaticParams` for SSG |
| No syntax highlighting plugin | Raw `<code>` blocks look terrible | Add `rehype-pretty-code` or `shiki` |
| Skipping frontmatter validation | Missing fields cause runtime errors | Set `required: true` on critical fields |
| Giant MDX files (1000+ lines) | Slow to parse, hard to edit | Split into sections or use content refs |
| No `generateMetadata` for posts | Poor SEO, no social previews | Export metadata from frontmatter fields |

## Decision Guide

| Scenario | Recommendation |
|---|---|
| Blog with Next.js App Router | Contentlayer 2 or Velite for type-safe MDX |
| Documentation site | Fumadocs (built on Contentlayer) or Nextra |
| Simple markdown, no build plugin | `next-mdx-remote/rsc` with `gray-matter` |
| Content from CMS + local MDX | Sanity for dynamic, Contentlayer for static |
| Astro project | Use Astro's built-in content collections instead |
| Need syntax highlighting | `rehype-pretty-code` with Shiki themes |
| Migration from Contentlayer v1 | Switch to `contentlayer2` (community fork) — drop-in compatible |
| Heavy interactive content | Consider a CMS; MDX is best for mostly-text content |
