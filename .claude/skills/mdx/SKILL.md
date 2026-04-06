---
name: mdx
description: MDX authoring, compilation, component mapping, remark/rehype plugins, and integration with Next.js App Router
layer: domain
category: frontend
triggers:
  - "mdx"
  - "markdown jsx"
  - "next-mdx-remote"
  - "@next/mdx"
  - "mdx-bundler"
  - "contentlayer"
  - "velite"
  - "remark plugin"
  - "rehype plugin"
  - "frontmatter"
  - "gray-matter"
  - "rehype-pretty-code"
  - "shiki"
  - "mdx component"
  - "blog content"
  - "markdown content"
inputs:
  - "MDX compilation and rendering requirements"
  - "Custom component mapping for MDX content"
  - "Content pipeline architecture decisions"
  - "Syntax highlighting and plugin configuration"
outputs:
  - "MDX compilation pipelines with proper tooling"
  - "Component maps and custom MDX components"
  - "Remark/rehype plugin configurations"
  - "Content organization patterns"
linksTo:
  - nextjs
  - react
  - typescript-frontend
  - tailwindcss
  - contentlayer
  - docs-writer
linkedFrom:
  - code-writer
  - code-reviewer
preferredNextSkills:
  - nextjs
  - react
  - tailwindcss
fallbackSkills:
  - docs-writer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# MDX Authoring & Compilation

## Purpose

Provide expert guidance on MDX -- Markdown with embedded JSX -- covering compilation toolchains, component mapping, remark/rehype plugin ecosystems, syntax highlighting, and integration with Next.js App Router (RSC-compatible approaches). This skill focuses on building production content pipelines for blogs, documentation, and knowledge bases.

## Compilation Toolchains

### Choosing a Toolchain

| Tool | Best For | RSC Support | Bundle Size | Maintained |
|------|----------|-------------|-------------|------------|
| `next-mdx-remote` | Remote/dynamic MDX, CMS content | Yes (v5+) | Small | Active |
| `@next/mdx` | Local `.mdx` files as pages/routes | Yes | Zero runtime | Active |
| `mdx-bundler` | Full bundling with imports in MDX | No (client) | Medium | Stale |
| Contentlayer2 | Type-safe content with schema validation | Yes | Medium | Fork active |
| Velite | Contentlayer alternative, Zod schemas | Yes | Small | Active |

**Recommendation:** Use `next-mdx-remote` for dynamic content or `@next/mdx` for file-based routing. For type-safe content collections, use Velite.

### next-mdx-remote (Recommended for Dynamic Content)

```bash
npm install next-mdx-remote gray-matter
```

**RSC usage (Next.js App Router):**

```tsx
// lib/mdx.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export async function getPost(slug: string) {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  const source = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(source);
  return { frontmatter, content, slug };
}

export async function getAllPosts() {
  const files = await fs.readdir(CONTENT_DIR);
  const posts = await Promise.all(
    files
      .filter(f => f.endsWith('.mdx'))
      .map(f => getPost(f.replace(/\.mdx$/, '')))
  );
  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}
```

```tsx
// app/blog/[slug]/page.tsx
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getPost, getAllPosts } from '@/lib/mdx';
import { mdxComponents } from '@/components/mdx-components';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { frontmatter } = await getPost(slug);
  return {
    title: frontmatter.title,
    description: frontmatter.description,
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { content, frontmatter } = await getPost(slug);

  return (
    <article className="py-16 max-w-3xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{frontmatter.title}</h1>
        <time className="text-base text-gray-500 mt-4 block">
          {new Date(frontmatter.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </time>
      </header>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <MDXRemote
          source={content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [rehypePrettyCode, { theme: 'github-dark-dimmed', keepBackground: true }],
              ],
            },
          }}
        />
      </div>
    </article>
  );
}
```

**Alternative: `compileMDX` for more control:**

```tsx
// lib/mdx.ts
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

interface Frontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
}

export async function compileMDXContent(source: string) {
  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypePrettyCode, { theme: 'github-dark-dimmed' }],
        ],
      },
    },
  });

  return { content, frontmatter };
}
```

### @next/mdx (For File-Based MDX Pages)

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react
```

```js
// next.config.mjs
import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: 'github-dark-dimmed', keepBackground: false }],
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
};

export default withMDX(nextConfig);
```

```tsx
// mdx-components.tsx (project root — required by @next/mdx)
import type { MDXComponents } from 'mdx/types';
import { mdxComponents } from '@/components/mdx-components';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components, ...mdxComponents };
}
```

Then place `.mdx` files directly in `app/` as pages:

```
app/
  docs/
    getting-started.mdx   # becomes /docs/getting-started
    api-reference.mdx      # becomes /docs/api-reference
```

### mdx-bundler (Advanced: Imports Inside MDX)

Use only when MDX files need to import local modules (images, data files). Client-only -- not RSC-compatible.

```bash
npm install mdx-bundler esbuild
```

```typescript
// lib/mdx-bundler.ts
import { bundleMDX } from 'mdx-bundler';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import path from 'path';

export async function bundleMDXContent(source: string, cwd?: string) {
  const { code, frontmatter } = await bundleMDX({
    source,
    cwd: cwd ?? path.join(process.cwd(), 'content'),
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm];
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      ];
      return options;
    },
    esbuildOptions(options) {
      options.loader = { ...options.loader, '.png': 'dataurl', '.jpg': 'dataurl' };
      return options;
    },
  });

  return { code, frontmatter };
}
```

```tsx
// Client component to render bundled MDX
'use client';

import { useMemo } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';

export function MDXRenderer({ code }: { code: string }) {
  const Component = useMemo(() => getMDXComponent(code), [code]);
  return <Component components={mdxComponents} />;
}
```

### Velite (Type-Safe Content Collections)

```bash
npm install velite
```

```ts
// velite.config.ts
import { defineConfig, defineCollection, s } from 'velite';

const posts = defineCollection({
  name: 'Post',
  pattern: 'posts/**/*.mdx',
  schema: s.object({
    title: s.string().max(200),
    description: s.string().max(500),
    date: s.isodate(),
    tags: s.array(s.string()).default([]),
    published: s.boolean().default(true),
    slug: s.slug('posts'),
    body: s.mdx(), // compiled MDX
  }),
});

export default defineConfig({
  root: 'content',
  output: { data: '.velite', assets: 'public/static' },
  collections: { posts },
});
```

## Component Mapping

### Building a Component Map

```tsx
// components/mdx-components.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/mdx/callout';
import { CodeTabs } from '@/components/mdx/code-tabs';

export const mdxComponents: MDXComponents = {
  // Override default HTML elements
  h1: ({ children, id }) => (
    <h1 id={id} className="text-4xl font-bold tracking-tight mt-12 mb-6 scroll-mt-24">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className="text-2xl font-semibold mt-10 mb-4 scroll-mt-24 border-b border-border pb-2">
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="text-xl font-semibold mt-8 mb-3 scroll-mt-24">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-base leading-7 text-text-secondary mb-4">{children}</p>
  ),
  a: ({ href, children }) => {
    const isExternal = href?.startsWith('http');
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 underline underline-offset-4 transition-colors duration-200 hover:text-brand-700"
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        href={href ?? '#'}
        className="text-brand-600 underline underline-offset-4 transition-colors duration-200 hover:text-brand-700"
      >
        {children}
      </Link>
    );
  },
  img: ({ src, alt, width, height }) => (
    <Image
      src={src ?? ''}
      alt={alt ?? ''}
      width={Number(width) || 800}
      height={Number(height) || 450}
      className="rounded-xl my-6 shadow-sm"
      sizes="(max-width: 768px) 100vw, 700px"
    />
  ),
  pre: ({ children }) => (
    <pre className="rounded-xl bg-gray-950 p-6 my-6 overflow-x-auto text-sm leading-relaxed shadow-sm">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    // Inline code (no className) vs code blocks (has className from rehype)
    if (!className) {
      return (
        <code className="rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-sm font-mono text-brand-600">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-500 pl-6 py-2 my-6 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full text-base">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b-2 border-border bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-4 py-3">{children}</td>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 space-y-2 text-text-secondary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 space-y-2 text-text-secondary">{children}</ol>
  ),
  hr: () => <hr className="my-8 border-border" />,

  // Custom components available in MDX files
  Callout,
  CodeTabs,
  Image: (props: React.ComponentProps<typeof Image>) => (
    <Image {...props} className="rounded-xl my-8" />
  ),
};
```

### Custom MDX Components

**Callout / Admonition:**

```tsx
// components/mdx/callout.tsx
import { cn } from '@/lib/utils';

type CalloutVariant = 'info' | 'warning' | 'error' | 'success';

const variants: Record<CalloutVariant, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800', icon: 'i' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-800', icon: '!' },
  error: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', icon: 'x' },
  success: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', icon: '+' },
};

export function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}) {
  const v = variants[variant];
  return (
    <div className={cn('my-6 rounded-xl border p-6', v.bg, v.border)} role="note">
      {title && <p className="font-semibold text-base mb-2">{title}</p>}
      <div className="text-base leading-relaxed [&>p]:mb-0">{children}</div>
    </div>
  );
}
```

**Code Tabs (client component):**

```tsx
// components/mdx/code-tabs.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function CodeTabs({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="my-6 rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex border-b border-border bg-gray-50 dark:bg-gray-800">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              'px-6 py-4 text-base font-medium transition-all duration-200',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 focus-visible:outline-none',
              i === active
                ? 'text-brand-600 border-b-2 border-brand-600 bg-white dark:bg-gray-900'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="[&>pre]:my-0 [&>pre]:rounded-none">{tabs[active].content}</div>
    </div>
  );
}
```

**Usage in MDX:**

```mdx
<Callout variant="warning" title="Breaking Change">
  The `getData` API has been renamed to `fetchData` in v2.0.
</Callout>
```

## Frontmatter Parsing

### gray-matter with Zod Validation

```bash
npm install gray-matter zod
```

```tsx
// lib/frontmatter.ts
import matter from 'gray-matter';
import { z } from 'zod';

const PostFrontmatterSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(true),
  image: z.string().optional(),
  author: z.string().optional(),
  draft: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export function parseFrontmatter(raw: string) {
  const { data, content } = matter(raw);
  const frontmatter = PostFrontmatterSchema.parse(data);
  return { frontmatter, content };
}
```

**Frontmatter template:**

```mdx
---
title: "Building a Blog with MDX and Next.js"
description: "A step-by-step guide to setting up MDX content in the App Router"
date: 2025-03-01
tags: ["mdx", "nextjs", "react"]
published: true
image: /images/blog/mdx-setup.png
author: "Your Name"
---

Content starts here...
```

## Remark & Rehype Plugin Ecosystem

### Essential Plugins

```bash
npm install remark-gfm rehype-slug rehype-autolink-headings rehype-pretty-code remark-math rehype-katex
```

| Plugin | Purpose | Phase |
|--------|---------|-------|
| `remark-gfm` | Tables, strikethrough, task lists, autolinks | Remark |
| `remark-math` | Math expressions (`$...$`, `$$...$$`) | Remark |
| `remark-unwrap-images` | Remove wrapping `<p>` around images | Remark |
| `rehype-slug` | Add `id` attributes to headings | Rehype |
| `rehype-autolink-headings` | Add anchor links to headings | Rehype |
| `rehype-pretty-code` | Shiki-based syntax highlighting | Rehype |
| `rehype-katex` | Render math as KaTeX | Rehype |
| `rehype-external-links` | Add `target="_blank"` to external links | Rehype |

**Plugin order matters.** Remark plugins process the Markdown AST (mdast), rehype plugins process the HTML AST (hast). Within each phase, order is sequential:

```ts
const mdxOptions = {
  remarkPlugins: [
    remarkGfm,
    remarkMath,
    remarkUnwrapImages,
  ],
  rehypePlugins: [
    rehypeSlug,                           // Must come before autolink-headings
    [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    [rehypePrettyCode, {
      theme: 'github-dark-dimmed',
      keepBackground: true,
      defaultLang: 'plaintext',
    }],
    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
  ],
};
```

### Writing a Custom Remark Plugin

```ts
// lib/remark-reading-time.ts
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const WORDS_PER_MINUTE = 200;

export function remarkReadingTime() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    let textContent = '';
    visit(tree, ['text', 'code'], (node: any) => {
      textContent += node.value ?? '';
    });

    const words = textContent.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

    file.data.readingTime = `${minutes} min read`;
  };
}
```

## Syntax Highlighting

### rehype-pretty-code + Shiki (Recommended)

Zero client JavaScript. Highlights at compile time using Shiki.

```bash
npm install rehype-pretty-code shiki
```

```ts
// lib/mdx-options.ts
import type { Options as PrettyCodeOptions } from 'rehype-pretty-code';

export const prettyCodeOptions: PrettyCodeOptions = {
  theme: {
    dark: 'github-dark-dimmed',
    light: 'github-light',
  },
  keepBackground: true,
  defaultLang: 'plaintext',
  onVisitLine(node) {
    // Prevent empty lines from collapsing
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
  },
  onVisitHighlightedLine(node) {
    node.properties.className = [...(node.properties.className || []), 'highlighted'];
  },
  onVisitHighlightedChars(node) {
    node.properties.className = ['word-highlight'];
  },
};
```

**MDX syntax for line/word highlighting:**

````mdx
```js {1,3-5}
// Line 1 is highlighted
const a = 1;
const b = 2;  // Lines 3-5 highlighted
const c = 3;
const d = 4;
```

```js /useState/
// The word "useState" is highlighted inline
const [count, setCount] = useState(0);
```
````

**CSS for highlighted code blocks:**

```css
/* globals.css */
[data-rehype-pretty-code-figure] pre {
  @apply p-6 rounded-xl overflow-x-auto text-sm leading-relaxed;
}

[data-rehype-pretty-code-figure] code {
  @apply grid;
}

[data-rehype-pretty-code-figure] [data-line] {
  @apply px-6 border-l-2 border-transparent;
}

[data-rehype-pretty-code-figure] [data-highlighted-line] {
  @apply bg-white/5 border-l-blue-400;
}

[data-rehype-pretty-code-figure] [data-highlighted-chars] {
  @apply bg-white/10 rounded px-1 py-0.5;
}

/* Line numbers */
[data-rehype-pretty-code-figure] code[data-line-numbers] {
  counter-reset: line;
}

[data-rehype-pretty-code-figure] code[data-line-numbers] > [data-line]::before {
  counter-increment: line;
  content: counter(line);
  @apply inline-block w-8 mr-4 text-right text-gray-500;
}
```

### Code Block with Copy Button

```tsx
// components/mdx/copy-button.tsx
'use client';

import { useState, useRef } from 'react';

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-2 text-sm rounded-lg bg-white/10 text-gray-300 transition-all duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
```

## Table of Contents Generation

### Extract Headings from MDX Content

```ts
// lib/toc.ts
import { remark } from 'remark';
import { visit } from 'unist-util-visit';

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export function extractToc(markdown: string): TocItem[] {
  const toc: TocItem[] = [];
  const tree = remark().parse(markdown);

  visit(tree, 'heading', (node: any) => {
    const text = node.children
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.value)
      .join('');

    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    toc.push({ id, title: text, level: node.depth });
  });

  return toc;
}
```

### Table of Contents Component

```tsx
// components/table-of-contents.tsx
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TocItem } from '@/lib/toc';

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-24 space-y-1" aria-label="Table of contents">
      <p className="font-semibold text-base mb-4">On this page</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            'block text-sm py-1 transition-colors duration-200',
            item.level === 2 ? 'pl-0' : item.level === 3 ? 'pl-4' : 'pl-8',
            activeId === item.id
              ? 'text-brand-600 font-medium'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
```

**Usage in blog layout:**

```tsx
// app/blog/[slug]/page.tsx
import { TableOfContents } from '@/components/table-of-contents';
import { extractToc } from '@/lib/toc';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { content, frontmatter } = await getPost(slug);
  const toc = extractToc(content);

  return (
    <div className="py-16 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-12">
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <MDXRemote source={content} components={mdxComponents} options={mdxOptions} />
      </article>
      <aside className="hidden lg:block">
        <TableOfContents items={toc} />
      </aside>
    </div>
  );
}
```

## MDX File Organization Patterns

### Blog / Content Site

```
content/
  posts/
    2025-03-01-building-with-mdx.mdx
    2025-02-15-react-server-components.mdx
  pages/
    about.mdx
    contact.mdx
  snippets/
    use-debounce.mdx
    use-local-storage.mdx

components/
  mdx-components.tsx      # Component map (single source of truth)
  mdx/
    callout.tsx
    code-tabs.tsx
    copy-button.tsx

lib/
  mdx.ts                  # File reading, parsing, listing
  toc.ts                  # Table of contents extraction
  frontmatter.ts          # Zod schema + gray-matter parsing
  mdx-options.ts          # Shared remark/rehype plugin config
```

### Documentation Site

```
content/
  docs/
    01-getting-started/
      01-installation.mdx
      02-quick-start.mdx
      meta.json              # { "title": "Getting Started" }
    02-guides/
      01-authentication.mdx
      02-data-fetching.mdx
      meta.json
    03-api-reference/
      components/
        button.mdx
        input.mdx
      hooks/
        use-auth.mdx
      meta.json

lib/
  docs.ts                    # Recursive directory reading, sidebar generation
```

### Sidebar Generation from File Structure

```ts
// lib/docs.ts
import fs from 'node:fs/promises';
import path from 'node:path';

interface SidebarItem {
  title: string;
  slug: string;
  children?: SidebarItem[];
}

export async function getSidebar(docsDir: string): Promise<SidebarItem[]> {
  const entries = await fs.readdir(docsDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  const sidebar: SidebarItem[] = [];

  for (const dir of dirs) {
    const dirPath = path.join(docsDir, dir.name);
    const metaPath = path.join(dirPath, 'meta.json');

    let title = dir.name.replace(/^\d+-/, '');
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      title = meta.title ?? title;
    } catch {
      // No meta.json, derive title from directory name
    }

    const files = (await fs.readdir(dirPath))
      .filter(f => f.endsWith('.mdx'))
      .sort();

    const children = files.map(f => ({
      title: f.replace(/^\d+-/, '').replace(/\.mdx$/, '').replace(/-/g, ' '),
      slug: `${dir.name.replace(/^\d+-/, '')}/${f.replace(/\.mdx$/, '').replace(/^\d+-/, '')}`,
    }));

    sidebar.push({ title, slug: dir.name.replace(/^\d+-/, ''), children });
  }

  return sidebar;
}
```

## Best Practices

1. **Use `next-mdx-remote/rsc`** for server-rendered MDX in Next.js App Router -- no client bundle for content.
2. **Define `mdx-components.tsx` at project root** -- required by `@next/mdx` for component overrides.
3. **Validate frontmatter with Zod** -- catch missing or malformed metadata at build time, not runtime.
4. **Use `rehype-pretty-code`** with Shiki for syntax highlighting -- built-in language support, zero client JS.
5. **Order rehype plugins carefully** -- `rehype-slug` before `rehype-autolink-headings`, `rehype-pretty-code` after both.
6. **Scope custom components** -- only expose components that content authors actually need in the MDX component map.
7. **Use `prose` from Tailwind Typography** -- provides sensible defaults for long-form content, override specific elements in the component map.
8. **Generate static params** -- always use `generateStaticParams` for blog/docs routes to pre-render at build time.
9. **Add `scroll-mt-24` to headings** -- so anchor links do not hide behind sticky headers.
10. **Cache parsed content in production** -- avoid re-reading and re-parsing files on every request. Use `React.cache()` or Next.js data cache.
11. **Keep custom MDX components in a dedicated folder** (`components/mdx/`) separate from UI components.
12. **Extract shared plugin config** into `lib/mdx-options.ts` to avoid duplicating remark/rehype arrays.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Using `mdx-bundler` in RSC | Client-only bundler fails in Server Components | Switch to `next-mdx-remote/rsc` |
| Missing `rehype-slug` | Heading anchors and TOC links do not work | Install and add `rehype-slug` before `rehype-autolink-headings` |
| Inline `<img>` tags in MDX | No Next.js image optimization | Override `img` in component map to use `next/image` |
| No frontmatter validation | Runtime crashes from missing fields | Parse with Zod schema |
| Importing from MDX files | `mdx-bundler` supports it, `next-mdx-remote` does not | Pass data via component props or frontmatter instead |
| Giant component map | Bundle bloat from unused components | Only include components that MDX content actually uses |
| No `generateStaticParams` | Pages render dynamically on every request | Add static params for all known slugs |
| Shiki loading all themes | Large bundle at compile time | Import only the themes you need |
| Content not updating in dev | `next-mdx-remote` caching | Restart dev server or clear `.next` cache |
| Math rendering broken | Missing KaTeX CSS | Import `katex/dist/katex.min.css` in layout |
| Client-side MDX compilation | Large bundle size, slow rendering | Use `next-mdx-remote/rsc` for server-side compilation |
| Rendering raw HTML strings | XSS vulnerability risk | Use proper MDX compilation pipeline with sanitized components |
| Storing MDX in DB without cache | Recompiles on every request | Cache compiled output with `unstable_cache` or Redis |

## Decision Guide

| Scenario | Approach |
|----------|----------|
| Local MDX files in repo | `@next/mdx` with `pageExtensions` |
| CMS-sourced content | `next-mdx-remote/rsc` with `compileMDX` |
| MDX with local imports (images, data) | `mdx-bundler` (supports esbuild imports) |
| Blog with frontmatter | `next-mdx-remote/rsc` + `parseFrontmatter: true` or gray-matter |
| Type-safe content collections | Velite with Zod schemas |
| Docs site with sidebar | File-based MDX + generated nav from directory structure |
| Syntax highlighting | `rehype-pretty-code` (Shiki-based, zero client JS) |
| Table of contents | `remark` parse + `rehype-slug` + IntersectionObserver |
| Custom admonitions/callouts | Create `Callout` component, register in `mdx-components.tsx` |
| Type-safe frontmatter | Zod validation + TypeScript interfaces |
