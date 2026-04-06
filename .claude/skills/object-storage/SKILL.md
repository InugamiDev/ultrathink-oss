# Object Storage

> S3-compatible object storage — AWS S3, Cloudflare R2, MinIO. Upload, download, presign, lifecycle.

## When to Use
- File uploads/downloads in web apps (images, documents, media)
- Presigned URLs for secure direct-to-storage browser uploads
- Large file handling with multipart uploads
- Static asset hosting with lifecycle management
- Cloudflare R2 for zero-egress-fee S3-compatible storage

## Core Patterns

### S3/R2 Client Setup
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS S3
const s3 = new S3Client({ region: "us-east-1" });

// Cloudflare R2 (S3-compatible)
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});
```

### Presigned URLs (Upload + Download)
```typescript
// Generate upload URL (client uploads directly to S3/R2)
const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: "my-bucket", Key: `uploads/${crypto.randomUUID()}`,
  ContentType: "image/png",
}), { expiresIn: 600 }); // 10 min

// Generate download URL
const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: "my-bucket", Key: "uploads/file.png",
}), { expiresIn: 3600 });
```

### Multipart Upload (Large Files)
```typescript
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// High-level (recommended) — handles chunking + retries
const upload = new Upload({
  client: s3, params: { Bucket: "my-bucket", Key: "large-file.zip", Body: stream },
  partSize: 10 * 1024 * 1024, // 10MB chunks
});
upload.on("httpUploadProgress", (p) => console.log(`${p.loaded}/${p.total}`));
await upload.done();
```

### Next.js API Route (Presigned Upload Flow)
```typescript
// app/api/upload/route.ts
export async function POST(req: Request) {
  const { filename, contentType } = await req.json();
  const key = `uploads/${Date.now()}-${filename}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: "my-bucket", Key: key, ContentType: contentType,
  }), { expiresIn: 600 });
  return Response.json({ url, key });
}
// Client: fetch("/api/upload", { method: "POST", body: JSON.stringify({...}) })
//   .then(r => r.json()).then(({ url }) => fetch(url, { method: "PUT", body: file }));
```

## Key Features
- **CORS**: Set via bucket policy (S3 console) or R2 dashboard — allow `PUT` from your domain
- **Lifecycle**: `PutBucketLifecycleConfigurationCommand` — expire temp uploads after 24h
- **Bucket Policy**: Public read via `{ "Effect": "Allow", "Principal": "*", "Action": "s3:GetObject" }`
- **R2 Advantages**: Zero egress fees, S3-compatible API, automatic region placement
- **Content-Disposition**: Set `ResponseContentDisposition` on `GetObjectCommand` for download filenames
- **Packages**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `@aws-sdk/lib-storage`
