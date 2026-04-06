---
name: payload
description: Payload CMS headless content management, custom fields, access control, hooks, REST/GraphQL API, and admin panel customization
layer: domain
category: cms
triggers:
  - "payload"
  - "payload cms"
  - "payload collections"
  - "payload fields"
  - "payload hooks"
  - "payload access control"
  - "payload admin"
  - "payload globals"
inputs:
  - "Content modeling requirements"
  - "Access control and auth needs"
  - "Admin panel customization"
  - "API requirements (REST/GraphQL)"
outputs:
  - "Payload collection and global configs"
  - "Access control policies"
  - "Hook implementations"
  - "Admin panel extensions"
linksTo:
  - nextjs
  - react
  - postgresql
  - typescript-frontend
linkedFrom: []
preferredNextSkills: [nextjs, react]
fallbackSkills: [sanity, contentlayer]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [database migrations]
---

# Payload CMS

## Purpose

Build content-managed applications with Payload 3.x, a headless CMS that embeds directly into Next.js. Covers collection and global configuration, field types, access control, hooks, the Local API, REST/GraphQL endpoints, rich text with Lexical, admin panel customization, versioning/drafts, and database adapters.

## Core Patterns

### Project Structure

```
my-payload-app/
  payload.config.ts          # Main Payload configuration
  collections/
    Posts.ts
    Users.ts
    Media.ts
    Tags.ts
  globals/
    SiteSettings.ts
    Navigation.ts
  hooks/
    populateSlug.ts
    revalidateOnChange.ts
  access/
    isAdmin.ts
    isAdminOrSelf.ts
  fields/
    slug.ts                  # Reusable field configs
    hero.ts
  blocks/
    CallToAction.ts
    ContentBlock.ts
  components/
    admin/                   # Custom admin panel components
  app/
    (frontend)/              # Next.js frontend routes
    (payload)/
      admin/
        [[...segments]]/
          page.tsx           # Payload admin panel route
```

### Collection Config

```typescript
// collections/Posts.ts
import type { CollectionConfig } from "payload";
import { isAdmin } from "../access/isAdmin";
import { populateSlug } from "../hooks/populateSlug";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "author", "publishedAt"],
    listSearchableFields: ["title", "slug"],
    group: "Content",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [populateSlug],
    afterChange: [
      async ({ doc, req }) => {
        // Revalidate Next.js cache on content change
        if (process.env.NEXT_REVALIDATION_KEY) {
          await fetch(`${process.env.NEXT_PUBLIC_URL}/api/revalidate`, {
            method: "POST",
            headers: { "x-revalidation-key": process.env.NEXT_REVALIDATION_KEY },
            body: JSON.stringify({ collection: "posts", slug: doc.slug }),
          });
        }
      },
    ],
  },
  versions: {
    drafts: {
      autosave: { interval: 1500 },
    },
    maxPerDoc: 25,
  },
  fields: [
    { name: "title", type: "text", required: true, minLength: 5, maxLength: 120 },
    {
      name: "slug",
      type: "text",
      unique: true,
      admin: { position: "sidebar", readOnly: true },
      index: true,
    },
    { name: "content", type: "richText" }, // Lexical editor by default
    { name: "excerpt", type: "textarea", maxLength: 300 },
    { name: "author", type: "relationship", relationTo: "users", required: true },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true },
    { name: "hero", type: "upload", relationTo: "media" },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      defaultValue: "draft",
      admin: { position: "sidebar" },
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "relatedPosts",
      type: "relationship",
      relationTo: "posts",
      hasMany: true,
      maxRows: 3,
      filterOptions: ({ id }) => ({ id: { not_equals: id } }),
    },
    {
      name: "layout",
      type: "blocks",
      blocks: [
        {
          slug: "content-block",
          fields: [
            { name: "richText", type: "richText" },
          ],
        },
        {
          slug: "cta",
          fields: [
            { name: "heading", type: "text", required: true },
            { name: "description", type: "textarea" },
            { name: "link", type: "text" },
            { name: "buttonLabel", type: "text", defaultValue: "Learn More" },
          ],
        },
        {
          slug: "media-block",
          fields: [
            { name: "media", type: "upload", relationTo: "media", required: true },
            { name: "caption", type: "text" },
            { name: "size", type: "select", options: ["small", "medium", "full"], defaultValue: "medium" },
          ],
        },
      ],
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text", maxLength: 60 },
        { name: "metaDescription", type: "textarea", maxLength: 160 },
        { name: "ogImage", type: "upload", relationTo: "media" },
      ],
    },
  ],
};
```

### Global Config (Site Settings)

```typescript
// globals/SiteSettings.ts
import type { GlobalConfig } from "payload";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  access: { read: () => true, update: ({ req: { user } }) => user?.role === "admin" },
  fields: [
    { name: "siteName", type: "text", required: true },
    { name: "siteDescription", type: "textarea" },
    { name: "logo", type: "upload", relationTo: "media" },
    {
      name: "nav",
      type: "array",
      maxRows: 8,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true },
        { name: "newTab", type: "checkbox", defaultValue: false },
      ],
    },
    {
      name: "footer",
      type: "group",
      fields: [
        { name: "copyright", type: "text" },
        {
          name: "socialLinks",
          type: "array",
          fields: [
            { name: "platform", type: "select", options: ["twitter", "github", "linkedin", "youtube"] },
            { name: "url", type: "text", required: true },
          ],
        },
      ],
    },
  ],
};
```

### Access Control Patterns

```typescript
// access/isAdmin.ts
import type { Access } from "payload";

export const isAdmin: Access = ({ req: { user } }) => {
  return user?.role === "admin";
};

// access/isAdminOrSelf.ts — users can edit their own content
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  // Return a query constraint — Payload applies it as a WHERE clause
  return { author: { equals: user.id } };
};

// Field-level access
const adminOnlyField = {
  name: "internalNotes",
  type: "textarea" as const,
  access: {
    read: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin",
  },
};
```

### Hooks

```typescript
// hooks/populateSlug.ts
import type { CollectionBeforeChangeHook } from "payload";

export const populateSlug: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === "create" && data?.title && !data.slug) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  return data;
};

// hooks/revalidateOnChange.ts
import type { CollectionAfterChangeHook } from "payload";
import { revalidatePath, revalidateTag } from "next/cache";

export const revalidateOnChange: CollectionAfterChangeHook = ({
  doc,
  collection,
  req: { payload },
}) => {
  payload.logger.info(`Revalidating ${collection.slug}: ${doc.id}`);
  revalidateTag(collection.slug);
  if (doc.slug) {
    revalidatePath(`/blog/${doc.slug}`);
  }
  return doc;
};
```

### Local API (Server-Side Data Fetching)

```typescript
// lib/payload.ts — Server-side data access
import { getPayload } from "payload";
import config from "@payload-config";

export async function getPublishedPosts(page = 1, limit = 10) {
  const payload = await getPayload({ config });
  return payload.find({
    collection: "posts",
    where: {
      status: { equals: "published" },
      publishedAt: { less_than_equal: new Date().toISOString() },
    },
    sort: "-publishedAt",
    page,
    limit,
    depth: 1, // Resolve 1 level of relationships
  });
}

export async function getPostBySlug(slug: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  });
  return result.docs[0] ?? null;
}

export async function getSiteSettings() {
  const payload = await getPayload({ config });
  return payload.findGlobal({ slug: "site-settings" });
}

// Creating content programmatically
export async function seedPosts() {
  const payload = await getPayload({ config });
  await payload.create({
    collection: "posts",
    data: {
      title: "Welcome",
      slug: "welcome",
      status: "published",
      content: { root: { children: [] } }, // Lexical format
      author: "admin-user-id",
      publishedAt: new Date().toISOString(),
    },
  });
}
```

### Payload Config (Main Entry)

```typescript
// payload.config.ts
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import sharp from "sharp";

import { Posts } from "./collections/Posts";
import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Tags } from "./collections/Tags";
import { SiteSettings } from "./globals/SiteSettings";

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: " — My CMS",
      icons: [{ url: "/favicon.ico" }],
    },
  },
  collections: [Posts, Users, Media, Tags],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET!,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL! },
    push: process.env.NODE_ENV === "development", // Auto-push schema in dev
  }),
  plugins: [
    s3Storage({
      collections: { media: { prefix: "media" } },
      bucket: process.env.S3_BUCKET!,
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
        region: process.env.S3_REGION!,
      },
    }),
  ],
  sharp,
  typescript: { outputFile: "payload-types.ts" },
});
```

## Best Practices

- **Use the Local API** for server-side data fetching — it's type-safe, fast, and skips HTTP overhead
- **Control `depth`** in queries — default depth resolves all relationships, which is expensive; set explicitly
- **Use field-level access control** — hide sensitive fields from non-admin users at the API level
- **Enable versions and drafts** — `versions: { drafts: true }` gives content editors a publish workflow
- **Use blocks for page builders** — the `blocks` field type lets editors compose flexible layouts
- **Revalidate Next.js cache in hooks** — use `afterChange` hooks to call `revalidateTag` or `revalidatePath`
- **Generate TypeScript types** — `payload generate:types` creates types from your collection configs
- **Use `group` fields** for organization — groups like `seo`, `metadata` keep the admin panel tidy
- **Use relationship `filterOptions`** — prevent self-referencing and enforce business rules in the admin UI
- **Set `index: true`** on fields used in queries — slug, status, publishedAt benefit from DB indexes

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do Instead |
|---|---|---|
| `depth: 0` or unbounded depth | Under-fetching or over-fetching related data | Set explicit depth (1-2) based on needs |
| Access control only in frontend | API is wide open, data leaks | Define access at collection and field level |
| Storing computed data in fields | Stale data, manual sync needed | Use `computedFields` or hooks |
| Hardcoding user roles as strings | Typos, no autocomplete | Define role enum and reuse across access fns |
| No slug index | Slow lookups on common queries | Add `index: true` to slug fields |
| Giant monolithic collection config | Hard to maintain, poor readability | Extract hooks, access fns, and blocks to files |
| Skipping `sharp` in config | Image resizing fails silently | Always include `sharp` for media processing |
| Using REST API for server components | Unnecessary HTTP overhead | Use the Local API (`getPayload`) in RSC |

## Decision Guide

| Scenario | Recommendation |
|---|---|
| Content site with Next.js App Router | Payload embedded in same Next.js app |
| Need admin panel for editors | Built-in — Payload admin at `/admin` |
| User authentication needed | Add `auth: true` to Users collection — JWT/sessions included |
| Page builder / flexible layouts | Use `blocks` field type with custom block configs |
| Rich text editing | Lexical editor (default); customize features via `lexicalEditor({ features })` |
| Media uploads to S3/R2 | `@payloadcms/storage-s3` or `@payloadcms/storage-vercel-blob` |
| Need GraphQL API | Enable via `@payloadcms/graphql` plugin |
| Multi-tenant app | Use access control returning query constraints per tenant |
| Database choice | Postgres (recommended) or MongoDB via `@payloadcms/db-mongodb` |
| Content versioning | `versions: { drafts: true, maxPerDoc: 25 }` on collections |
