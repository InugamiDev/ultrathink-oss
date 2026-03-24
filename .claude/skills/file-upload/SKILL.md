---
name: file-upload
description: File upload patterns including multipart/form-data, presigned URLs for S3/R2, chunked uploads, progress tracking, drag-and-drop with react-dropzone, and client-side validation
layer: utility
category: backend
triggers:
  - "file upload"
  - "upload file"
  - "presigned URL"
  - "multipart"
  - "drag and drop upload"
  - "image upload"
  - "S3 upload"
  - "R2 upload"
  - "chunked upload"
  - "react-dropzone"
inputs:
  - Storage target (S3, R2, local filesystem, Supabase Storage)
  - File types and size limits
  - Upload method (direct, presigned URL, chunked)
  - Frontend framework (React, vanilla JS)
outputs:
  - Upload endpoint implementation
  - Presigned URL generation
  - Client-side upload component with progress
  - Validation and security checks
linksTo:
  - aws
  - cloudflare
  - nextjs
  - forms
linkedFrom:
  - api-designer
  - media-processing
preferredNextSkills:
  - media-processing
  - caching
fallbackSkills:
  - aws
  - nodejs
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Creates files in storage bucket
  - May add AWS SDK or S3 client dependencies
---

# File Upload Patterns Skill

## Purpose

Implement secure, efficient file uploads from client to server or directly to cloud storage. Covers validation, progress tracking, presigned URLs for large files, and drag-and-drop UX.

## Upload Strategy Decision

| Method | Max Size | Complexity | Best For |
|--------|----------|------------|----------|
| **multipart/form-data** | ~10MB | Low | Simple forms, small files |
| **Presigned URL (S3/R2)** | 5GB | Medium | Large files, serverless |
| **Chunked/Resumable** | Unlimited | High | Video, unreliable networks |
| **Base64 in JSON** | ~1MB | Low | Avatars, thumbnails only |

## Key Patterns

### 1. Server-Side: Presigned URL Generation

```typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  // For Cloudflare R2:
  // endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const { filename, contentType, size } = await req.json();

  // Validate
  if (!ALLOWED_TYPES.includes(contentType)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 });
  }
  if (size > MAX_SIZE) {
    return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const key = `uploads/${randomUUID()}/${filename}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 600 } // 10 minutes
  );

  return Response.json({ url, key });
}
```

### 2. Client Upload with Progress (Presigned URL)

```typescript
async function uploadWithProgress(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  // Step 1: Get presigned URL from our API
  const { url, key } = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  }).then((r) => r.json());

  // Step 2: Upload directly to S3/R2 with progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(key);
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Upload network error'));

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(file);
  });
}
```

### 3. React Dropzone Component

```tsx
'use client';
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

interface UploadZoneProps {
  onUploadComplete: (key: string) => void;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

export function UploadZone({
  onUploadComplete,
  maxSize = 10 * 1024 * 1024,
  accept = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
}: UploadZoneProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (accepted: File[], rejected: FileRejection[]) => {
    setError(null);

    if (rejected.length > 0) {
      setError(rejected[0].errors[0].message);
      return;
    }

    const file = accepted[0];
    if (!file) return;

    try {
      setProgress(0);
      const key = await uploadWithProgress(file, setProgress);
      setProgress(100);
      onUploadComplete(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setTimeout(() => setProgress(null), 2000);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    accept,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-6 rounded-xl border-2 border-dashed cursor-pointer
                  transition-all duration-200
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500`}
    >
      <input {...getInputProps()} />
      {progress !== null ? (
        <div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 text-center">{progress}%</p>
        </div>
      ) : (
        <p className="text-center text-gray-600">
          {isDragActive ? 'Drop the file here' : 'Drag and drop a file, or click to select'}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
```

### 4. Next.js Route Handler (multipart/form-data)

```typescript
// app/api/upload-direct/route.ts -- for small files (< 10MB)
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate MIME type by reading magic bytes (not just extension)
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = detectMimeType(buffer); // Use `file-type` package

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: `uploads/${randomUUID()}/${file.name}`,
    Body: buffer,
    ContentType: mimeType,
  }));

  return Response.json({ success: true });
}
```

### 5. Client-Side Validation

```typescript
interface ValidationRule {
  maxSize: number;
  allowedTypes: string[];
  maxDimensions?: { width: number; height: number };
}

async function validateFile(file: File, rules: ValidationRule): Promise<string | null> {
  if (file.size > rules.maxSize) {
    return `File too large. Max ${(rules.maxSize / 1024 / 1024).toFixed(0)}MB.`;
  }

  if (!rules.allowedTypes.includes(file.type)) {
    return `File type ${file.type} not allowed.`;
  }

  // Image dimension check
  if (rules.maxDimensions && file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    if (dimensions.width > rules.maxDimensions.width || dimensions.height > rules.maxDimensions.height) {
      return `Image too large. Max ${rules.maxDimensions.width}x${rules.maxDimensions.height}px.`;
    }
  }

  return null; // Valid
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

## Best Practices

1. **Use presigned URLs** for files > 5MB -- avoids proxying bytes through your server
2. **Validate on both client and server** -- client for UX, server for security
3. **Check magic bytes**, not just file extension -- extensions can be spoofed
4. **Generate unique keys** with UUID prefixes to prevent collisions and enumeration
5. **Set `Content-Disposition`** for downloadable files: `attachment; filename="original.pdf"`
6. **Limit upload size** at the infrastructure level too (Nginx `client_max_body_size`, Vercel 4.5MB body limit)
7. **Use abort controllers** to let users cancel in-progress uploads

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No server-side validation | Malicious file uploads | Validate MIME type via magic bytes on server |
| Trusting `Content-Type` header | Attackers can spoof any type | Use `file-type` package to detect from bytes |
| Presigned URL without size limit | Attacker uploads huge files | Set `ContentLength` condition on presigned URL |
| No progress indicator | Users think upload is frozen | Use XMLHttpRequest `upload.onprogress` |
| Vercel 4.5MB body limit | Large uploads fail silently | Use presigned URLs for anything > 4MB |
| Sequential multi-file uploads | Slow UX | Upload files in parallel with `Promise.all` |
