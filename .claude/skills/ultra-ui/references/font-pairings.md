# Font Pairings (73 curated pairs)

Source: `.claude/skills/ui-ux-pro-max/data/typography.csv`

## Quick Picks by Use Case

| Use Case | Heading | Body | # | Vibe |
|---|---|---|---|---|
| **SaaS / Product** | Plus Jakarta Sans | Plus Jakarta Sans | 13 | Friendly, modern |
| | Space Grotesk | DM Sans | 3 | Tech-forward |
| | Poppins | Open Sans | 2 | Clean, approachable |
| **Editorial / Blog** | Cormorant Garamond | Libre Baskerville | 4 | Literary, classic |
| | Libre Bodoni | Public Sans | 35 | Magazine, refined |
| | Newsreader | Roboto | 14 | Journalism, trustworthy |
| **E-commerce / Luxury** | Playfair Display | Inter | 1 | Elegant, premium |
| | Cormorant | Montserrat | 12 | High-end fashion |
| | Bodoni Moda | Jost | 50 | Luxury minimalist |
| **Developer / Tech** | JetBrains Mono | IBM Plex Sans | 9 | Code, precise |
| | Fira Code | Fira Sans | 42 | Dashboard, data |
| | Share Tech Mono | Fira Code | 51 | HUD, sci-fi |
| **Corporate** | Lexend | Source Sans 3 | 16 | Trustworthy, accessible |
| | IBM Plex Sans | IBM Plex Sans | 31 | Financial, serious |
| | EB Garamond | Lato | 29 | Legal, formal |
| **Creative / Agency** | Syne | Manrope | 18 | Avant-garde, edgy |
| | Clash Display | Satoshi | 39 | Bold, dynamic |
| | Archivo | Space Grotesk | 44 | Minimal portfolio |
| **Fintech / Dashboard** | IBM Plex Sans | IBM Plex Sans | 31 | Trust, banking |
| | Inter | Inter | 5 | Swiss, neutral |
| | Space Grotesk | Inter | 69 | Web3, DeFi |
| **Healthcare / Wellness** | Lora | Raleway | 8 | Calm, natural |
| | Figtree | Noto Sans | 30 | Medical, clean |
| | Atkinson Hyperlegible | Atkinson Hyperlegible | 48 | WCAG, inclusive |
| **Education** | Baloo 2 | Comic Neue | 45 | Kids, playful |
| | Crimson Pro | Atkinson Hyperlegible | 41 | Academic, scholarly |
| | Fredoka | Nunito | 6 | Fun, creative |
| **Gaming** | Russo One | Chakra Petch | 37 | Esports, action |
| | Press Start 2P | VT323 | 52 | Pixel, retro |
| | Orbitron | JetBrains Mono | 68 | Cyberpunk, neon |

## Categories

| Category | Count |
|---|---|
| Sans + Sans | 25 |
| Serif + Sans | 13 |
| Display + Sans | 10 |
| Serif + Serif | 2 |
| Mono + Sans | 2 |
| Mono + Mono | 2 |
| Display + Serif | 1 |
| Script + Sans | 1 |
| Script + Serif | 1 |
| Display + Mono | 1 |
| Triple stacks (Serif/Sans/Mono combos) | 5 |
| Single-family variants (system, bold-only, rounded) | 5 |
| Handwritten + Handwritten | 1 |
| Tech Display + Mono | 1 |
| Display Rounded + Geometric Sans | 1 |

Rows 58-73 are mobile-specific pairings with advanced category labels (triple stacks, single-family systems, etc.).

## Typography Rules

- **Max 2 fonts** (display + body), 3 if mono needed for code blocks
- **Type scale** — fluid `clamp()`:
  - `xs`: `clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)`
  - `sm`: `clamp(0.8125rem, 0.75rem + 0.3125vw, 0.875rem)`
  - `base`: `clamp(0.875rem, 0.8rem + 0.375vw, 1rem)`
  - `lg`: `clamp(1.125rem, 1rem + 0.625vw, 1.25rem)`
  - `xl`: `clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)`
  - `2xl`: `clamp(1.5rem, 1.2rem + 1.5vw, 2rem)`
  - `3xl`: `clamp(2rem, 1.5rem + 2.5vw, 3rem)`
- **Line height**: 1.5-1.75 for body, 1.1-1.3 for headings
- **Line length**: 35-60 chars mobile, 60-75 chars desktop
- **Weight hierarchy**: Bold headings (600-700), Regular body (400), Medium labels (500)
- **No overused fonts**: Avoid Inter/Roboto/Arial as the ONLY choice -- pair with a distinctive display font
- **Variable fonts preferred**: Better performance, fewer HTTP requests
- **Font loading**: `font-display: swap` or `optional`, preload critical fonts only

## How to Search

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --domain typography
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --domain google-fonts
```
