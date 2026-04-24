# Modern UI Patterns (2025-2026)

## Bento Grids

Apple-popularized modular card layout. Asymmetric grid cells of varying sizes create visual hierarchy without traditional columns.

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {/* Large feature card spanning 2x2 */}
  <div className="col-span-2 row-span-2 rounded-2xl bg-surface p-8">
    <h2>Hero Feature</h2>
  </div>
  {/* Small cards filling remaining space */}
  <div className="rounded-2xl bg-surface p-6">Card 2</div>
  <div className="rounded-2xl bg-surface p-6">Card 3</div>
  <div className="col-span-2 rounded-2xl bg-surface p-6">Wide card</div>
</div>
```

**Rules:**
- Use CSS Grid + `grid-template-areas` for complex layouts
- Each cell should have ONE clear purpose
- Vary sizes intentionally: large = important, small = supporting
- Consistent gap (16-24px), consistent border-radius
- Works naturally with CSS Subgrid for aligned content across cells

**When:** Product feature showcases, dashboards, landing pages, portfolios.

---

## Kinetic Typography

Text that reacts to scroll position, cursor, or viewport. Uses variable fonts for smooth weight/width transitions.

```css
/* Variable font that changes weight on scroll */
.kinetic-heading {
  font-family: "Inter Variable", sans-serif;
  font-variation-settings: "wght" var(--scroll-weight, 400);
  animation: weight-shift linear both;
  animation-timeline: scroll();
}

@keyframes weight-shift {
  from { font-variation-settings: "wght" 100; }
  to   { font-variation-settings: "wght" 900; }
}
```

**Cursor-reactive (JS):**
```js
document.addEventListener("mousemove", (e) => {
  const weight = Math.round((e.clientX / window.innerWidth) * 800 + 100);
  heading.style.fontVariationSettings = `"wght" ${weight}`;
});
```

**Variable fonts with axes:** Inter (wght), Recursive (wght, slnt, CASL, CRSV, MONO), Fraunces (wght, opsz, SOFT, WONK).

**When:** Hero sections, landing pages, creative portfolios. Respect `prefers-reduced-motion`.

---

## Editorial / Magazine Layouts

Content-first, narrative-driven design with large typography, asymmetric layouts, and generous whitespace. Inspired by print editorial.

**Characteristics:**
- Large display type (4-8rem headings)
- Asymmetric 2-column layouts (text + image, offset)
- Pull quotes and drop caps
- Full-bleed images breaking the grid
- Generous vertical rhythm (96-128px section spacing)
- Serif + sans-serif font pairing

**Tailwind pattern:**
```tsx
<article className="max-w-prose mx-auto">
  <h1 className="text-6xl md:text-8xl font-serif font-bold leading-none mb-12">
    The Headline
  </h1>
  <p className="text-xl text-muted-foreground leading-relaxed first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3">
    Opening paragraph with drop cap...
  </p>
</article>
```

**When:** Blogs, case studies, long-form content, brand storytelling.

---

## Command Palettes

Global keyboard-accessible search/action interface. Triggered by `Cmd+K` or `Ctrl+K`.

**Library:** `cmdk` (pacocoursey) — powers Linear, Raycast, Vercel.

```tsx
import { Command } from "cmdk";

<Command.Dialog open={open} onOpenChange={setOpen}>
  <Command.Input placeholder="Type a command or search..." />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group heading="Actions">
      <Command.Item onSelect={() => createNew()}>
        Create new document
      </Command.Item>
      <Command.Item onSelect={() => openSettings()}>
        Open settings
      </Command.Item>
    </Command.Group>
    <Command.Group heading="Navigation">
      <Command.Item onSelect={() => goto("/dashboard")}>
        Go to Dashboard
      </Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

**shadcn/ui version:** `npx shadcn@latest add command` — pre-styled, accessible.

**Rules:**
- Fuzzy search (not exact match)
- Group results by category
- Show keyboard shortcuts inline
- Recent items at top
- Max 8-10 visible results, scroll for more

---

## AI Chat Interface Patterns

Streaming responses, tool-use indicators, and citation UI for LLM-powered interfaces.

**Key patterns:**

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Streaming text | Show response as it generates | SSE + `useChat` (Vercel AI SDK) |
| Thinking indicator | Show model is processing | Animated dots or "Thinking..." with pulse |
| Tool use indicator | Show when model calls a tool | Collapsible card with tool name + params |
| Citations | Link claims to sources | Superscript numbers → footnote panel |
| Code blocks | Syntax-highlighted output | `react-syntax-highlighter` or `shiki` |
| Retry/regenerate | Let user request new response | Button below each assistant message |
| Copy button | Copy response text | Floating button on hover |
| Message editing | Edit previous user message | Inline edit → re-run from that point |

**Vercel AI SDK pattern:**
```tsx
import { useChat } from "ai/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-auto" : ""}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <input value={input} onChange={handleInputChange} placeholder="Ask anything..." />
      </form>
    </div>
  );
}
```

---

## Generative UI

Interface spawns bespoke UI controls at runtime based on context. Instead of showing a text response, the AI generates actual interactive components.

**Example:** User asks "What's the weather?" → AI returns a `<WeatherCard>` component with real data, not a text description.

**Vercel AI SDK `createStreamableUI`:**
```tsx
// server action
async function submitMessage(input: string) {
  "use server";
  const ui = createStreamableUI();

  // AI decides which component to render
  if (intent === "weather") {
    ui.done(<WeatherCard city={city} />);
  } else if (intent === "flight") {
    ui.done(<FlightSearch from={from} to={to} />);
  }

  return { display: ui.value };
}
```

**When:** AI-powered products, conversational interfaces, dynamic dashboards.

---

## Calm / Quiet UI

Reduced visual noise, intentional whitespace, restrained micro-interactions. Counter-movement to overstimulating dashboards.

**Principles:**
- Fewer colors (2-3 max, low saturation)
- No decorative elements unless functional
- Subtle transitions (opacity only, 200ms)
- Large whitespace between sections
- System font stack (no custom fonts = faster load)
- Muted states by default, vivid only on interaction

**Palette approach:** Single hue + neutral. Example: `oklch(95% 0.02 250)` bg, `oklch(25% 0.02 250)` text, `oklch(55% 0.15 250)` accent.

**When:** Productivity tools, reading apps, meditation/wellness, settings panels.

---

## Spatial Design (Vision Pro Influence)

3D depth cues applied to 2D screens. Influenced by Apple's visionOS spatial computing.

**Techniques:**
- **Layered translucency**: Multiple blur layers at different depths
- **Parallax on interaction**: Subtle shift on hover/scroll
- **Elevation system**: Cards "float" at defined z-levels
- **Ambient lighting**: Elements pick up color from surroundings (vibrancy)
- **Rounded forms**: Pill shapes, high border-radius (16-24px)

```css
.spatial-card {
  background: oklch(98% 0.005 250 / 0.6);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid oklch(100% 0 0 / 0.2);
  border-radius: 1.5rem;
  box-shadow:
    0 2px 8px oklch(0% 0 0 / 0.04),
    0 12px 40px oklch(0% 0 0 / 0.08);
  transform: translateZ(0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.spatial-card:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow:
    0 4px 12px oklch(0% 0 0 / 0.06),
    0 20px 60px oklch(0% 0 0 / 0.12);
}
```

**When:** Premium UIs, system panels, nav bars, settings. Pairs with Liquid Glass style.

---

## AI Design Tools Landscape

| Tool | Input | Output | Best For |
|------|-------|--------|----------|
| **v0.dev** (Vercel) | Text prompt or screenshot | React + shadcn/ui + Tailwind code | Component generation |
| **Galileo AI** | Text prompt | Figma-editable high-fidelity screens | Full page designs |
| **Relume** | Site brief | Sitemap + wireframes + copy | Site structure planning |
| **Locofy** | Figma file | Production React code with tokens | Design-to-code handoff |
| **Builder.io** | Visual editor | React code + headless CMS | Visual CMS + code gen |
| **Google Stitch** | Text prompt | Multi-platform HTML/CSS | AI screen generation |
| **Pencil.dev** | MCP tools | .pen visual designs | AI-assisted visual editing |

**Recommended workflow:**
```
Relume (structure) → Galileo/v0 (initial design) → Figma (refine) → Locofy/code (implement)
```

Or with UltraThink:
```
/stitch generate → /stitch edit (Pencil) → /ui build (implement)
```
