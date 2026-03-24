---
name: image-optimization
description: Image optimization — next/image, responsive sizes, priority loading, blur placeholders, WebP/AVIF, CDN loaders, lazy loading
layer: domain
category: frontend
triggers:
  - "image optimization"
  - "next/image"
  - "responsive images"
  - "lazy loading"
  - "blur placeholder"
  - "webp"
  - "avif"
  - "image cdn"
linksTo:
  - nextjs
  - performance-profiler
  - seo
linkedFrom:
  - optimize
  - seo
---

# Image Optimization Skill

## Purpose

Images are 50%+ of page weight. Proper optimization directly improves LCP, bandwidth, and UX.

## Format Selection

| Format | vs JPEG | Best For |
|--------|---------|----------|
| **AVIF** | ~50% smaller | Photos, complex images (Chrome, Firefox, Safari 16.4+) |
| **WebP** | ~30% smaller | Universal modern fallback |
| **SVG** | Vector | Icons, logos, illustrations |

Default: Serve AVIF with WebP fallback. next/image handles this automatically.

## next/image Basics

```typescript
import Image from 'next/image';
import heroImage from '@/public/images/hero.jpg';

// Static import enables automatic blur placeholder
<Image
  src={heroImage}
  alt="Descriptive alt text"
  placeholder="blur"
  priority              // Preload for above-the-fold LCP images
  sizes="100vw"
  className="h-auto w-full object-cover"
/>

// Card grid: 1 col mobile, 2 col tablet, 3 col desktop
<Image
  src={card.image}
  alt={card.title}
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="h-auto w-full rounded-xl"
/>

// Fill mode for unknown dimensions
<div className="relative aspect-video overflow-hidden rounded-xl">
  <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
</div>
```

## Remote Image Placeholders

```typescript
// Option 1: plaiceholder (build-time)
import { getPlaiceholder } from 'plaiceholder';
const { base64 } = await getPlaiceholder(Buffer.from(await fetch(src).then(r => r.arrayBuffer())));

// Option 2: Inline SVG shimmer
const shimmer = (w: number, h: number) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#e2e8f0"/></svg>`
  ).toString('base64')}`;

<Image src={url} alt="Photo" width={800} height={600} placeholder={shimmer(800, 600)} />
```

## next.config Configuration

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};
```

## Custom CDN Loaders

```typescript
import type { ImageLoaderProps } from 'next/image';

export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://res.cloudinary.com/demo/image/upload/w_${width},q_${quality || 'auto'},f_auto/${src}`;
}

export function imgixLoader({ src, width, quality }: ImageLoaderProps) {
  return `https://example.imgix.net/${src}?w=${width}&q=${quality || 75}&auto=format,compress`;
}

<Image loader={cloudinaryLoader} src="photos/hero.jpg" alt="Hero" width={1200} height={630} />
```

## Native HTML (Non-Next.js)

```html
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="Hero" width="1200" height="630"
       loading="lazy" decoding="async" fetchpriority="high" />
</picture>
```

## Best Practices

1. **Always set `width`/`height`** (or `fill`) to prevent CLS
2. **Use `priority`** on the LCP image (largest above-the-fold)
3. **Use accurate `sizes`** to avoid downloading oversized images
4. **Use blur placeholders** for perceived performance
5. **Serve AVIF > WebP > JPEG** via formats config
6. **Use SVG** for icons and logos
7. **Set long cache TTL** for immutable assets
8. **Audit with Lighthouse** for image-related diagnostics
