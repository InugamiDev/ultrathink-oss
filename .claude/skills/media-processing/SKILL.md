---
name: media-processing
description: Image, video, and audio processing using FFmpeg, ImageMagick, Sharp, and web-optimized media pipelines
layer: utility
category: tooling
triggers:
  - "convert image"
  - "resize image"
  - "compress video"
  - "process media"
  - "ffmpeg"
  - "imagemagick"
  - "optimize images"
  - "generate thumbnails"
  - "audio processing"
inputs:
  - input_file: Path to the source media file
  - operation: resize | convert | compress | crop | watermark | thumbnail | transcode | extract
  - target_format: Desired output format
  - quality: Quality level or target file size
  - dimensions: Target dimensions (optional)
outputs:
  - command: The shell command to execute
  - output_path: Where the processed file will be saved
  - metadata: Information about the input/output files
  - pipeline: Multi-step processing pipeline if needed
linksTo:
  - ai-multimodal
  - ui-ux-pro
linkedFrom:
  - orchestrator
  - planner
preferredNextSkills:
  - ai-multimodal
  - ui-ux-pro
fallbackSkills:
  - ai-multimodal
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - filesystem: Creates processed media files
---

# Media Processing

## Purpose

This skill generates precise commands and pipelines for processing images, video, and audio files. It covers format conversion, resizing, compression, optimization for web delivery, thumbnail generation, watermarking, and batch processing using industry-standard tools: FFmpeg, ImageMagick, Sharp (Node.js), and native browser APIs.

## Key Concepts

### Tool Selection Guide

| Task | Best Tool | Why |
|------|-----------|-----|
| Image resize/convert (CLI) | ImageMagick (`magick`) | Versatile, widely available |
| Image resize/convert (Node.js) | Sharp | Fastest Node.js image processing |
| Image optimization for web | Squoosh CLI / Sharp | Modern format support (AVIF, WebP) |
| Video processing | FFmpeg | Industry standard, handles everything |
| Audio processing | FFmpeg | Supports all codecs and formats |
| Animated images (GIF/APNG) | FFmpeg | Better quality and compression than IM |
| PDF to image | ImageMagick + Ghostscript | Rasterize PDF pages |
| SVG manipulation | SVGO (CLI) | SVG-specific optimization |

### Modern Image Formats

| Format | Use Case | Browser Support | Quality |
|--------|----------|-----------------|---------|
| **AVIF** | Photos, illustrations | Chrome, Firefox, Safari 16+ | Best compression |
| **WebP** | Universal web images | All modern browsers | Good compression |
| **JPEG** | Photos (fallback) | Universal | Baseline |
| **PNG** | Transparency, screenshots | Universal | Lossless |
| **SVG** | Icons, logos, illustrations | Universal | Vector/infinite |
| **JPEG XL** | Future standard | Chrome (flag), Safari | Excellent |

### Quality vs File Size Guidelines

```
PHOTOGRAPHIC CONTENT:
  AVIF quality 50-65  → Excellent visual quality, ~60% smaller than JPEG
  WebP quality 75-85  → Good quality, ~30% smaller than JPEG
  JPEG quality 80-85  → Standard web quality

ILLUSTRATIONS / UI:
  WebP lossless      → Smaller than PNG, no quality loss
  PNG optimized      → Universal support, lossless
  SVG               → Best for vector graphics (infinitely scalable)

THUMBNAILS:
  AVIF quality 40-50  → Good enough for small sizes
  WebP quality 60-70  → Small and fast
  JPEG quality 60-70  → Acceptable for 200px thumbnails
```

## Image Processing Commands

### Resize Operations (ImageMagick)

```bash
# Resize to exact dimensions (may distort)
magick input.jpg -resize 800x600! output.jpg

# Resize to fit within bounds (maintain aspect ratio)
magick input.jpg -resize 800x600 output.jpg

# Resize to fill bounds (may crop)
magick input.jpg -resize 800x600^ -gravity center -extent 800x600 output.jpg

# Resize by percentage
magick input.jpg -resize 50% output.jpg

# Resize width only (height auto)
magick input.jpg -resize 800x output.jpg

# Resize with quality setting
magick input.jpg -resize 800x600 -quality 85 output.jpg
```

### Format Conversion

```bash
# JPEG to WebP
magick input.jpg -quality 80 output.webp

# PNG to AVIF
magick input.png -quality 60 output.avif

# SVG to PNG (rasterize)
magick -density 300 input.svg -resize 800x output.png

# PDF page to PNG
magick -density 150 input.pdf[0] output.png

# Batch convert (all JPEGs to WebP)
for f in *.jpg; do magick "$f" -quality 80 "${f%.jpg}.webp"; done
```

### Web Optimization Pipeline

```bash
# Full web optimization pipeline for a photo
magick input.jpg \
  -resize "1920x1920>" \
  -strip \
  -interlace Plane \
  -quality 85 \
  -sampling-factor 4:2:0 \
  output.jpg

# Generate responsive image set
for size in 320 640 960 1280 1920; do
  magick input.jpg \
    -resize "${size}x>" \
    -quality 80 \
    -strip \
    "output-${size}w.webp"
done
```

### Thumbnail Generation

```bash
# Square thumbnail with center crop
magick input.jpg \
  -resize 200x200^ \
  -gravity center \
  -extent 200x200 \
  -quality 75 \
  -strip \
  thumb.jpg

# Rounded thumbnail (for avatars)
magick input.jpg \
  -resize 200x200^ \
  -gravity center \
  -extent 200x200 \
  \( +clone -alpha extract \
     -draw "fill black polygon 0,0 0,15 15,0 fill white circle 15,15 15,0" \
     \( +clone -flip \) -compose Multiply -composite \
     \( +clone -flop \) -compose Multiply -composite \
  \) -alpha off -compose CopyOpacity -composite \
  thumb.png
```

### Watermarking

```bash
# Text watermark
magick input.jpg \
  -gravity southeast \
  -pointsize 24 \
  -fill "rgba(255,255,255,0.5)" \
  -annotate +20+20 "© 2026 Company" \
  output.jpg

# Image watermark (logo overlay)
magick input.jpg \
  \( logo.png -resize 200x -alpha set -channel A -evaluate multiply 0.3 \) \
  -gravity southeast \
  -geometry +20+20 \
  -composite \
  output.jpg
```

## Video Processing Commands (FFmpeg)

### Basic Operations

```bash
# Convert format
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4

# Resize video
ffmpeg -i input.mp4 -vf scale=1280:720 -c:a copy output.mp4

# Resize maintaining aspect ratio (width 1280, height auto)
ffmpeg -i input.mp4 -vf "scale=1280:-2" -c:a copy output.mp4

# Extract audio
ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3

# Extract frames (1 frame per second)
ffmpeg -i input.mp4 -vf fps=1 frame_%04d.png

# Extract specific frame at timestamp
ffmpeg -i input.mp4 -ss 00:01:30 -vframes 1 frame.png
```

### Web-Optimized Video

```bash
# H.264 for maximum compatibility
ffmpeg -i input.mov \
  -c:v libx264 \
  -preset slow \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  -pix_fmt yuv420p \
  output.mp4

# VP9/WebM for smaller file size
ffmpeg -i input.mov \
  -c:v libvpx-vp9 \
  -b:v 0 \
  -crf 30 \
  -c:a libopus \
  -b:a 96k \
  output.webm

# AV1 for best compression (slower encode)
ffmpeg -i input.mov \
  -c:v libaom-av1 \
  -crf 30 \
  -b:v 0 \
  -c:a libopus \
  -b:a 96k \
  output.webm
```

### Video Manipulation

```bash
# Trim video (start at 10s, duration 30s)
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:30 -c copy output.mp4

# Concatenate videos (same codec)
printf "file 'part1.mp4'\nfile 'part2.mp4'\nfile 'part3.mp4'" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4

# Add fade in/out (1 second each)
ffmpeg -i input.mp4 \
  -vf "fade=t=in:st=0:d=1,fade=t=out:st=29:d=1" \
  -c:a copy \
  output.mp4

# Create GIF from video (optimized)
ffmpeg -i input.mp4 \
  -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  output.gif

# Generate video thumbnail sprite (for video scrubbing)
ffmpeg -i input.mp4 \
  -vf "fps=1/10,scale=160:-1,tile=10x10" \
  sprite.jpg
```

## Audio Processing (FFmpeg)

```bash
# Convert to MP3
ffmpeg -i input.wav -c:a libmp3lame -q:a 2 output.mp3

# Convert to AAC
ffmpeg -i input.wav -c:a aac -b:a 192k output.m4a

# Normalize audio levels
ffmpeg -i input.mp3 -af loudnorm=I=-16:LRA=11:TP=-1.5 output.mp3

# Trim audio
ffmpeg -i input.mp3 -ss 00:00:30 -to 00:02:00 -c copy output.mp3

# Mix audio tracks
ffmpeg -i voice.mp3 -i music.mp3 \
  -filter_complex "[1]volume=0.3[bg];[0][bg]amix=inputs=2:duration=first" \
  output.mp3
```

## Sharp (Node.js) Recipes

```typescript
import sharp from 'sharp';

// Responsive image generation
async function generateResponsiveImages(inputPath: string, outputDir: string) {
  const widths = [320, 640, 960, 1280, 1920];
  const formats = ['webp', 'avif'] as const;

  for (const width of widths) {
    for (const format of formats) {
      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .toFormat(format, {
          quality: format === 'avif' ? 55 : 80,
        })
        .toFile(`${outputDir}/image-${width}w.${format}`);
    }
  }
}

// Optimized thumbnail
async function createThumbnail(input: string, output: string) {
  await sharp(input)
    .resize(200, 200, {
      fit: 'cover',
      position: 'attention', // Smart crop using saliency detection
    })
    .webp({ quality: 75 })
    .toFile(output);
}

// Blur hash placeholder (for progressive loading)
async function generateBlurPlaceholder(input: string): Promise<string> {
  const { data, info } = await sharp(input)
    .resize(32, 32, { fit: 'inside' })
    .blur()
    .toBuffer({ resolveWithObject: true });

  return `data:image/${info.format};base64,${data.toString('base64')}`;
}
```

## HTML Picture Element Pattern

```html
<!-- Responsive images with format fallbacks -->
<picture>
  <source
    type="image/avif"
    srcset="
      image-320w.avif 320w,
      image-640w.avif 640w,
      image-960w.avif 960w,
      image-1280w.avif 1280w,
      image-1920w.avif 1920w
    "
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  />
  <source
    type="image/webp"
    srcset="
      image-320w.webp 320w,
      image-640w.webp 640w,
      image-960w.webp 960w,
      image-1280w.webp 1280w,
      image-1920w.webp 1920w
    "
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  />
  <img
    src="image-960w.jpg"
    alt="Descriptive alt text"
    width="960"
    height="640"
    loading="lazy"
    decoding="async"
  />
</picture>
```

## Anti-Patterns

1. **No lazy loading**: Serving all images eagerly. Use `loading="lazy"` for below-the-fold images.
2. **Missing dimensions**: Images without width/height cause layout shifts. Always specify dimensions.
3. **Single format**: Serving only JPEG when WebP/AVIF would reduce size by 30-60%.
4. **Oversized sources**: Serving 4K images to mobile devices. Use responsive srcset.
5. **No compression**: Uploading raw camera images directly. Always compress for web delivery.
6. **GIF for animations**: Modern video formats (WebM, MP4) are 10-100x smaller than GIF for animations.
7. **Processing in the request path**: Image processing should happen at build/upload time, not per-request. Use a CDN with transformation capabilities for dynamic sizing.

## Integration Notes

- When **ui-ux-pro** identifies oversized or unoptimized images, hand off here for processing commands.
- When **ai-multimodal** needs to analyze processed output, provide the optimized file paths.
- For batch processing in CI/CD pipelines, combine commands into shell scripts.
- Always verify output quality visually — automated metrics (SSIM, PSNR) are helpful but not sufficient.
