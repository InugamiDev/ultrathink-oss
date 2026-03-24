---
name: sanity
description: Sanity.io CMS, GROQ queries, structured content modeling, real-time collaboration, and Sanity Studio customization
layer: domain
category: cms
triggers:
  - "sanity"
  - "sanity.io"
  - "groq"
  - "sanity studio"
  - "structured content"
  - "sanity schema"
  - "sanity vision"
  - "portable text"
inputs:
  - "Content modeling requirements"
  - "Query patterns and data fetching needs"
  - "Studio customization requirements"
outputs:
  - "Sanity schema definitions"
  - "GROQ queries"
  - "Studio configuration"
  - "Frontend data fetching patterns"
linksTo:
  - nextjs
  - react
  - typescript-frontend
  - graphql
linkedFrom: []
preferredNextSkills: [nextjs, react]
fallbackSkills: [payload, contentlayer]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Sanity.io CMS

## Purpose

Model, manage, and deliver structured content using Sanity.io. Covers schema definition, GROQ query language, Sanity Studio customization, Portable Text rendering, real-time content collaboration, image handling with the Sanity CDN, and integration with frontend frameworks (primarily Next.js).

## Core Patterns

### Project Structure

```
sanity-project/
  sanity/
    schemaTypes/
      post.ts
      author.ts
      category.ts
      blockContent.ts
      index.ts          # Schema registry
    lib/
      client.ts         # Sanity client instance
      queries.ts        # GROQ queries
      image.ts          # Image URL builder
    sanity.config.ts    # Studio configuration
    sanity.cli.ts       # CLI configuration
  app/                  # Next.js app (if embedded)
```

### Schema Definition

```typescript
// sanity/schemaTypes/post.ts
import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().min(5).max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      options: { hotspot: true }, // Enable focal point cropping
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent", // Custom Portable Text
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "metaTitle", type: "string" }),
        defineField({ name: "metaDescription", type: "text", rows: 3 }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
    },
    prepare({ title, author, media }) {
      return {
        title,
        subtitle: author ? `by ${author}` : "No author",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Publish Date, New",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
```

```typescript
// sanity/schemaTypes/blockContent.ts — Custom Portable Text
import { defineType, defineArrayMember } from "sanity";

export const blockContent = defineType({
  name: "blockContent",
  title: "Block Content",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Code", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "URL",
            fields: [
              { name: "href", type: "url", title: "URL" },
              { name: "blank", type: "boolean", title: "Open in new tab" },
            ],
          },
        ],
      },
    }),
    defineArrayMember({ type: "image", options: { hotspot: true } }),
    defineArrayMember({
      name: "codeBlock",
      title: "Code Block",
      type: "object",
      fields: [
        { name: "language", type: "string", options: { list: ["typescript", "javascript", "css", "bash"] } },
        { name: "code", type: "text" },
      ],
    }),
  ],
});
```

### GROQ Queries

```typescript
// sanity/lib/queries.ts
import { groq } from "next-sanity";

// Fetch all published posts
export const postsQuery = groq`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    slug,
    publishedAt,
    "excerpt": array::join(string::split(pt::text(body), "")[0..200], "") + "...",
    mainImage {
      asset->{
        _id,
        url,
        metadata { dimensions, lqip }
      },
      alt,
      hotspot
    },
    "author": author->{name, slug, image},
    "categories": categories[]->{ _id, title, slug }
  }
`;

// Single post by slug
export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    publishedAt,
    body,
    mainImage { asset->{ url, metadata { dimensions, lqip } }, alt },
    "author": author->{ name, slug, image, bio },
    "categories": categories[]->{ _id, title, slug },
    "related": *[
      _type == "post"
      && _id != ^._id
      && count(categories[@._ref in ^.^.categories[]._ref]) > 0
    ] | order(publishedAt desc) [0..2] {
      title, slug, mainImage { asset->{ url }, alt }
    }
  }
`;

// Paginated list
export const paginatedPostsQuery = groq`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) [$start..$end] {
    _id, title, slug, publishedAt,
    mainImage { asset->{ url, metadata { lqip } }, alt }
  }
`;

// Count for pagination
export const postCountQuery = groq`count(*[_type == "post" && defined(slug.current)])`;

// Full-text search
export const searchQuery = groq`
  *[_type == "post" && (
    title match $query + "*" ||
    pt::text(body) match $query + "*"
  )] | order(publishedAt desc) [0..9] {
    _id, title, slug, publishedAt
  }
`;
```

### Sanity Client Setup

```typescript
// sanity/lib/client.ts
import { createClient, type QueryParams } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-12-01", // Use a fixed date, not "vX"
  useCdn: process.env.NODE_ENV === "production",
});

// Revalidation-aware fetch for Next.js App Router
export async function sanityFetch<T>({
  query,
  params = {},
  tags = [],
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
}): Promise<T> {
  return client.fetch<T>(query, params, {
    next: {
      revalidate: tags.length ? false : 60,
      tags,
    },
  });
}

// Image URL builder
const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
```

### Next.js Integration

```tsx
// app/blog/page.tsx
import { sanityFetch } from "@/sanity/lib/client";
import { postsQuery } from "@/sanity/lib/queries";
import { PostCard } from "@/components/post-card";

export default async function BlogPage() {
  const posts = await sanityFetch<Post[]>({
    query: postsQuery,
    tags: ["post"],
  });

  return (
    <section className="py-16">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}
```

```typescript
// app/api/revalidate/route.ts — Webhook handler for on-demand revalidation
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

export async function POST(req: NextRequest) {
  const { isValidSignature, body } = await parseBody<{
    _type: string;
    slug?: { current?: string };
  }>(req, process.env.SANITY_WEBHOOK_SECRET!);

  if (!isValidSignature) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  if (body?._type) {
    revalidateTag(body._type);
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

### Sanity Studio Configuration

```typescript
// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";

export default defineConfig({
  name: "default",
  title: "My Studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .title("Posts")
              .child(
                S.documentList()
                  .title("Posts")
                  .filter('_type == "post"')
                  .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !["post"].includes(item.getId()!)
            ),
          ]),
    }),
    visionTool({ defaultApiVersion: "2024-12-01" }),
  ],
  schema: { types: schemaTypes },
});
```

## Best Practices

- **Fix `apiVersion` to a date** — never use `"v1"` or `"v2023-08-01"`; use `"2024-12-01"` style dates
- **Use `next-sanity`** for Next.js projects — it provides `sanityFetch`, visual editing, and webhook parsing
- **Colocate GROQ queries** — keep queries in a dedicated file near the client, not scattered across components
- **Enable `useCdn: true`** in production for fast reads; disable for previews and mutations
- **Use webhook revalidation** — set up a Sanity webhook to hit `/api/revalidate` for instant cache invalidation
- **Use `hotspot: true`** on image fields — lets editors pick focal points for responsive cropping
- **Define `preview`** on all document types — makes the Studio list views useful for editors
- **Use Portable Text** for rich content — it's structured JSON, not HTML, so it's portable across platforms
- **Type your queries** — generate TypeScript types from schemas with `sanity typegen generate`

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do Instead |
|---|---|---|
| Fetching all fields with `*[_type == "post"]` | Over-fetches data, slow responses | Project only the fields you need |
| Using `_updatedAt` for cache keys | Changes on every edit, defeats caching | Use webhook revalidation with tags |
| Storing HTML in text fields | Loses structured content benefits | Use Portable Text (`blockContent`) |
| Hardcoding project ID in code | Breaks across environments | Use environment variables |
| Skipping `alt` on images | Accessibility violation | Add `alt` field with required validation |
| Deep nesting references in GROQ | N+1 query explosion | Dereference with `->` in a single query |
| Using `apiVersion: "v1"` | Stuck on legacy API behavior | Pin to a recent date string |

## Decision Guide

| Scenario | Recommendation |
|---|---|
| Content-heavy site with editors | Sanity Studio with custom structure |
| Blog with Next.js | `next-sanity` + ISR with webhook revalidation |
| E-commerce product pages | Sanity for content + Shopify/Stripe for transactions |
| Multi-language content | Use `@sanity/document-internationalization` plugin |
| Complex page builder | `blockContent` with custom block types |
| Real-time collaborative editing | Built into Sanity — no extra setup needed |
| Need GraphQL instead of GROQ | Enable GraphQL API in project settings, but prefer GROQ |
| Type-safe queries | Run `sanity typegen generate` for auto-generated types |
