# Skill: intercepting-routes
> Layer: domain | Category: frontend

## Triggers
- intercepting routes, modal route, photo gallery modal, (.) (..) (...), route interception, shareable modal URL

## Links
- linksTo: parallel-routes, nextjs-app-router
- linkedFrom: parallel-routes, nextjs-app-router

## Overview

Intercepting routes let you load a route from another part of your app within the current layout.
The canonical use case: clicking a photo in a feed opens a modal, but navigating directly to
`/photo/123` renders the full page. The URL is shareable either way.

## Convention Syntax

| Pattern  | Matches                                    | Analogy       |
|----------|--------------------------------------------|---------------|
| `(.)`    | Same level                                 | `./`          |
| `(..)`   | One level up                               | `../`         |
| `(..)(..)` | Two levels up                            | `../../`      |
| `(...)`  | App root                                   | `/`           |

**Important**: levels are based on route segments, not filesystem directories.

## File Structure — Modal Pattern

```
app/
  layout.tsx
  @modal/
    (.)photo/[id]/
      page.tsx          # intercepted: renders inside modal
    default.tsx         # renders nothing when no modal is active
  feed/
    page.tsx            # photo grid
  photo/[id]/
    page.tsx            # full page: direct navigation or refresh
```

## Combining with Parallel Routes

The `@modal` slot is a parallel route that intercepts `/photo/[id]`.

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

```tsx
// app/@modal/default.tsx
export default function Default() {
  return null;
}
```

## Intercepted Route (Modal View)

```tsx
// app/@modal/(.)photo/[id]/page.tsx
import { Modal } from "@/components/modal";
import { getPhoto } from "@/lib/data";

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <Modal>
      <img
        src={photo.url}
        alt={photo.alt}
        className="rounded-xl max-h-[80vh] object-contain"
      />
      <p className="p-6 text-base">{photo.description}</p>
    </Modal>
  );
}
```

## Full Page Route (Direct Navigation)

```tsx
// app/photo/[id]/page.tsx
import { getPhoto } from "@/lib/data";

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const photo = await getPhoto(id);

  return (
    <main className="py-16 max-w-4xl mx-auto">
      <img src={photo.url} alt={photo.alt} className="rounded-xl w-full" />
      <h1 className="text-2xl font-bold mt-6">{photo.title}</h1>
      <p className="text-base mt-4">{photo.description}</p>
    </main>
  );
}
```

## Reusable Modal Component

```tsx
"use client";
import { useRouter } from "next/navigation";

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => router.back()}
    >
      <div
        className="p-8 rounded-2xl bg-white shadow-xl max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
```

## Key Rules

1. Interception only works on **soft navigation** (client-side `<Link>`). Hard refresh loads the actual route.
2. Always pair with a parallel `@slot` so the modal overlays without replacing page content.
3. Provide `default.tsx` in the slot to avoid 404 on unmatched states.
4. The `(..)` depth counts route segments, not filesystem folders — `@modal` is not a segment.
5. Use `router.back()` to dismiss the modal and restore the previous URL.
