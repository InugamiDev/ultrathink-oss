#!/usr/bin/env python3
"""
capture.py — HTML → image pipeline for the visual-render skill.

Usage:
  python capture.py <html_file> <output_file> [options]

Options:
  --scale N       Device pixel ratio for HiDPI output (default: 2)
  --bg COLOR      Background: transparent, white, black, or #rrggbb (default: transparent)
  --padding N     Extra padding around cropped content in px (default: 24)
  --format FMT    Output format: png, jpeg, webp (default: png)
  --quality N     JPEG/WebP quality 1-100 (default: 92)
  --selector SEL  CSS selector for element to capture (default: [data-export])
  --wait N        Wait Nms after page load, for Chart.js etc. (default: 300)
  --width N       Viewport width (default: 1200)
  --height N      Viewport height (default: 900)
  --resize WxH    Resize output to exact WxH (e.g. 512x512)
  --no-trim       Skip whitespace auto-trim
  --no-crop       Capture full viewport instead of element bounds
"""

import sys
import os
import argparse
import tempfile
import io
from pathlib import Path

def parse_args():
    p = argparse.ArgumentParser(description="Capture HTML visual to image")
    p.add_argument("html_file", help="Path to HTML file to capture")
    p.add_argument("output_file", help="Output image path (.png/.jpeg/.webp)")
    p.add_argument("--scale", type=float, default=2.0, help="Device pixel ratio (default: 2)")
    p.add_argument("--bg", default="transparent", help="Background color")
    p.add_argument("--padding", type=int, default=24, help="Extra padding in px (default: 24)")
    p.add_argument("--format", choices=["png", "jpeg", "webp"], help="Output format (inferred from extension if not set)")
    p.add_argument("--quality", type=int, default=92, help="JPEG/WebP quality (default: 92)")
    p.add_argument("--selector", default="[data-export]", help="CSS selector (default: [data-export])")
    p.add_argument("--wait", type=int, default=300, help="Wait ms after load (default: 300)")
    p.add_argument("--width", type=int, default=1200, help="Viewport width (default: 1200)")
    p.add_argument("--height", type=int, default=900, help="Viewport height (default: 900)")
    p.add_argument("--resize", help="Resize output to WxH e.g. 512x512")
    p.add_argument("--no-trim", action="store_true", help="Skip whitespace trim")
    p.add_argument("--no-crop", action="store_true", help="Capture full viewport")
    return p.parse_args()


def parse_bg_color(bg: str):
    """Parse background color string to RGBA tuple."""
    if bg == "transparent":
        return None  # Keep transparent
    if bg == "white":
        return (255, 255, 255, 255)
    if bg == "black":
        return (0, 0, 0, 255)
    if bg.startswith("#"):
        h = bg.lstrip("#")
        if len(h) == 3:
            h = "".join(c*2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (r, g, b, 255)
    return (255, 255, 255, 255)


def trim_whitespace(img, bg_color=None):
    """Auto-trim whitespace/transparency from image edges."""
    from PIL import Image, ImageChops

    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Create a reference image to diff against
    if bg_color:
        ref = Image.new("RGBA", img.size, bg_color)
    else:
        # For transparent: find bbox of non-transparent pixels
        r, g, b, a = img.split()
        # Bbox based on alpha channel
        alpha_bbox = a.getbbox()
        if alpha_bbox:
            return img.crop(alpha_bbox)
        return img

    diff = ImageChops.difference(img, ref)
    bbox = diff.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def add_padding(img, padding: int, bg_color=None):
    """Add uniform padding around the image."""
    from PIL import Image

    new_w = img.width + padding * 2
    new_h = img.height + padding * 2

    if bg_color:
        new_img = Image.new("RGBA", (new_w, new_h), bg_color)
    else:
        new_img = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))

    new_img.paste(img, (padding, padding), img if img.mode == "RGBA" else None)
    return new_img


def main():
    args = parse_args()

    # Check dependencies
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && python -m playwright install chromium", file=sys.stderr)
        sys.exit(1)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed. Run: pip install Pillow", file=sys.stderr)
        sys.exit(1)

    html_path = Path(args.html_file).resolve()
    output_path = Path(args.output_file).resolve()

    if not html_path.exists():
        print(f"ERROR: HTML file not found: {html_path}", file=sys.stderr)
        sys.exit(1)

    # Infer format from extension if not specified
    fmt = args.format
    if not fmt:
        ext = output_path.suffix.lower().lstrip(".")
        fmt = ext if ext in ("png", "jpeg", "jpg", "webp") else "png"
    if fmt == "jpg":
        fmt = "jpeg"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    bg_rgba = parse_bg_color(args.bg)

    print(f"Capturing: {html_path}")
    print(f"Output:    {output_path}")
    print(f"Scale:     {args.scale}x  Format: {fmt}  BG: {args.bg}  Wait: {args.wait}ms")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        page = browser.new_page(
            viewport={"width": args.width, "height": args.height},
            device_scale_factor=args.scale,
        )

        # Set transparent background if needed
        if args.bg == "transparent":
            page.emulate_media(color_scheme="light")

        page.goto(f"file://{html_path}")

        # Wait for page and optional extra delay
        page.wait_for_load_state("networkidle")
        if args.wait > 0:
            page.wait_for_timeout(args.wait)

        # Determine clip region
        clip = None
        if not args.no_crop:
            # Try data-export selector first, then fall back
            selectors_to_try = [args.selector, "[data-export]", "body > *:first-child", "body"]
            for sel in selectors_to_try:
                try:
                    el = page.query_selector(sel)
                    if el:
                        box = el.bounding_box()
                        if box and box["width"] > 0 and box["height"] > 0:
                            clip = {
                                "x": max(0, box["x"]),
                                "y": max(0, box["y"]),
                                "width": box["width"],
                                "height": box["height"],
                            }
                            print(f"Clip via '{sel}': {clip['width']:.0f}×{clip['height']:.0f}px")
                            break
                except Exception:
                    continue

        # Screenshot
        screenshot_bytes = page.screenshot(
            type="png",
            clip=clip,
            full_page=(clip is None),
            omit_background=(args.bg == "transparent"),
        )

        browser.close()

    # Post-process with Pillow
    from PIL import Image
    img = Image.open(io.BytesIO(screenshot_bytes))

    # Ensure RGBA for compositing
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Apply background fill if not transparent
    if bg_rgba:
        bg_img = Image.new("RGBA", img.size, bg_rgba)
        bg_img.paste(img, mask=img.split()[3])
        img = bg_img

    # Auto-trim whitespace
    if not args.no_trim:
        img = trim_whitespace(img, bg_rgba)
        print(f"After trim: {img.width}×{img.height}px")

    # Add padding
    if args.padding > 0:
        padded_padding = int(args.padding * args.scale)
        img = add_padding(img, padded_padding, bg_rgba)
        print(f"After padding: {img.width}×{img.height}px")

    # Resize if requested
    if args.resize:
        try:
            tw, th = map(int, args.resize.lower().split("x"))
            img = img.resize((tw, th), Image.LANCZOS)
            print(f"Resized to: {tw}×{th}px")
        except ValueError:
            print(f"WARNING: Invalid --resize '{args.resize}', skipping", file=sys.stderr)

    # Convert mode for JPEG (no alpha)
    if fmt == "jpeg" and img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif fmt != "png" and img.mode == "RGBA":
        pass  # WebP supports alpha

    # Save
    save_kwargs = {}
    if fmt in ("jpeg", "webp"):
        save_kwargs["quality"] = args.quality
    if fmt == "png":
        save_kwargs["optimize"] = True

    img.save(str(output_path), format=fmt.upper(), **save_kwargs)

    size_kb = output_path.stat().st_size / 1024
    print(f"\nSaved: {output_path}")
    print(f"Size:  {img.width}×{img.height}px  ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
