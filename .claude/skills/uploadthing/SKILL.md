# UploadThing

> Type-safe file uploads for Next.js/React — no S3 config, built-in validation, instant CDN.

## When to Use
- Adding file uploads to Next.js or React apps
- Need type-safe upload routes with auth middleware
- Want pre-built or custom upload UI components
- File validation (size, type) without manual wiring

## Core Patterns

### File Router (Server)
```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  avatar: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id }; // Passed to onUploadComplete
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({ where: { id: metadata.userId }, data: { avatar: file.url } });
      return { url: file.url };
    }),

  documents: f({ pdf: { maxFileSize: "16MB" }, image: { maxFileSize: "8MB" } })
    .middleware(async () => ({}))
    .onUploadComplete(({ file }) => ({ url: file.url })),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

### Route Handler (Next.js App Router)
```typescript
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "@/server/uploadthing";

export const { GET, POST } = createRouteHandler({ router: uploadRouter });
```

### Client Components
```typescript
import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/server/uploadthing";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();

// Pre-built: <UploadButton endpoint="avatar" onClientUploadComplete={(res) => setUrl(res[0].url)} />
// Custom UI with hook:
const { startUpload, isUploading } = useUploadThing("avatar", {
  onClientUploadComplete: (res) => setUrl(res[0].url),
  onUploadError: (err) => toast.error(err.message),
});
// Trigger: await startUpload(files)
```

### Key Features
- **Validators**: `.image()`, `.pdf()`, `.video()`, `.audio()`, `.blob()` with `maxFileSize`/`maxFileCount`
- **Middleware**: Runs server-side before upload; return metadata or throw to reject
- **Callbacks**: `onUploadComplete` receives `{ metadata, file: { url, name, size, key } }`
- **Client hooks**: `useUploadThing` for custom UIs, `useDropzone` for drag-and-drop
- **SSR ready**: `generateComponents`/`generateReactHelpers` for type-safe client utils
- **Delete**: `utapi.deleteFiles(fileKey)` via `uploadthing/server` for server-side file removal
- **CSS**: Import `@uploadthing/react/styles.css` or use `appearance` prop for custom styling
