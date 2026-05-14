# Color Systems (14 Approaches)

## 1. 60-30-10 Rule
60% dominant (background) -> 30% secondary (cards, nav) -> 10% accent (CTAs, active states)

## 2. Monochromatic
Single hue, varied lightness/saturation. Elegant, guaranteed harmony. Use for dashboards, minimal interfaces.

## 3. Complementary
Opposites on color wheel (blue + orange). Maximum contrast. One dominant, one accent.

## 4. Analogous
3 adjacent colors. Naturally harmonious, low tension. Needs distant accent for CTAs.

## 5. Triadic
3 equally spaced colors. Vibrant, balanced. One dominant, two accents.

## 6. Split-Complementary
Base + two adjacent to complement. High contrast without tension.

## 7. Tetradic (Double Complementary)
Two complementary pairs. Very rich, hard to balance. Best for complex dashboards needing many distinct categories.

## 8. Neutral + Accent
Predominantly neutral palette (grays, whites) with a single bold accent. Clean, professional.

## 9. Semantic Color Mapping
Colors assigned by meaning: red=error, green=success, yellow=warning, blue=info. Consistent across product regardless of theme.

## 10. OKLCH-Based Systems (Modern Standard)
Perceptually uniform color space (Lightness, Chroma, Hue). Same L value = same perceived brightness across all hues (HSL lies). Native CSS: `oklch(70% 0.15 250)`.

```css
--brand-50:  oklch(97% 0.02 250);
--brand-500: oklch(55% 0.20 250); /* base */
--brand-900: oklch(22% 0.08 250);
```

## 11. Semantic Token Architecture (3-Tier)
- **Tier 1 — Primitives**: Raw values (`color.blue.500`)
- **Tier 2 — Semantic**: Purpose-based (`color.bg.primary`, `color.text.secondary`)
- **Tier 3 — Component**: Specific usage (`button.primary.bg`, `input.border.focus`)

Components -> Tier 3 -> Tier 2 -> Tier 1. Components never know raw values.

## 12. Dark Mode Strategies
- NOT inverted light mode — design a dedicated dark palette
- Reduce saturation of accents (they glow on dark backgrounds)
- Use elevated surfaces (lighter grays) for hierarchy instead of shadows
- Text opacity: primary ~87%, secondary ~60%, disabled ~38%
- Avoid pure #000 — use `oklch(13% 0.01 hue)` for depth perception

```
bg/base:            oklch(10% 0.005 hue)
bg/surface:         oklch(15% 0.005 hue)
bg/surface-raised:  oklch(20% 0.005 hue)
bg/surface-overlay: oklch(25% 0.008 hue)
```

## 13. Accessible Color Patterns
- WCAG 2.2: Normal text 4.5:1, large text 3:1, UI components 3:1
- Never color alone — add icons, patterns, labels
- Design for color blindness (~8% of men): avoid red/green only
- OKLCH delta-L > 40% is usually safe for text contrast
- Focus outlines: 2px min, 3:1 contrast

## 14. Perceptual Color Spaces

| Space | Perceptually Uniform? | CSS Native? | Best For |
|-------|----------------------|-------------|----------|
| sRGB/hex | No | Yes | Legacy |
| HSL | No | Yes | Quick prototyping |
| OKLCH | Yes | Yes (93%+) | Modern palettes, a11y, theming |
| HCT (Google) | Yes | No | Material Design 3 |
| P3 Display | Wider gamut | Yes | HDR screens |
