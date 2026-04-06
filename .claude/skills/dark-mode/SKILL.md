---
name: dark-mode
description: Dark mode implementation with CSS custom properties, prefers-color-scheme, Tailwind dark variant, theme persistence in localStorage, class vs media strategy, and smooth transitions
layer: domain
category: frontend
triggers:
  - "dark mode"
  - "dark theme"
  - "light mode"
  - "theme toggle"
  - "color scheme"
  - "prefers-color-scheme"
  - "theme switching"
inputs: [framework, CSS approach, persistence method, default theme]
outputs: [theme provider, toggle component, CSS variables, anti-flash script]
linksTo: [tailwindcss, css-architecture, accessibility]
linkedFrom: [design-systems, ui-ux-pro, bootstrap]
preferredNextSkills: [tailwindcss, accessibility]
fallbackSkills: [css-architecture, react]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May modify tailwind.config.ts (darkMode strategy)
  - May add script to layout.tsx or _document.tsx
---

# Dark Mode Skill

## Purpose

Implement a flicker-free, accessible dark mode that respects user system preferences, persists choice across sessions, and transitions smoothly between themes.

## Key Concepts

### Strategy: Class vs Media

| Strategy | Tailwind Config | Control | Best For |
|----------|----------------|---------|----------|
| `class` | `darkMode: "class"` | Manual toggle + system fallback | Most apps (recommended) |
| `media` | `darkMode: "media"` | System preference only | Blogs, simple sites |

### CSS Custom Properties (Design Tokens)

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --border: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 7%;
  --card-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
}

/* Smooth transition between themes */
html.transitioning,
html.transitioning *,
html.transitioning *::before,
html.transitioning *::after {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease !important;
}
```

### Anti-Flash Script (Critical)

Inject an inline `<script>` in `<head>` before the body renders. This prevents a white flash
when a dark-mode user loads the page. Use React's `dangerouslySetInnerHTML` on a `<script>` tag
inside `app/layout.tsx`:

```javascript
// Inline script content (runs before paint):
(function() {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme:dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch(e) {}
})()
```

Add `suppressHydrationWarning` on the `<html>` element to avoid React hydration mismatches
caused by the class being added before hydration.

### Theme Provider (React)

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.add("transitioning");
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const isDark = matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "dark" : "light");
      localStorage.removeItem("theme");
    } else {
      root.classList.add(newTheme);
    }

    setTimeout(() => root.classList.remove("transitioning"), 250);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Toggle Component

```tsx
"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-lg px-4 py-3 text-base transition-all duration-200
                 hover:bg-black/10 dark:hover:bg-white/10
                 focus-visible:ring-2 focus-visible:ring-offset-2
                 motion-reduce:transition-none"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="dark:hidden">Moon Icon</span>
      <span className="hidden dark:inline">Sun Icon</span>
    </button>
  );
}
```

### Tailwind Usage

```tsx
{/* Tailwind dark: prefix applies when .dark class is on <html> */}
<div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
  <p className="text-gray-600 dark:text-gray-400">Adapts to theme</p>
</div>
```

## Best Practices

- **Inline the anti-flash script**: Must run before first paint. Never load it as an external file.
- **Use `suppressHydrationWarning`**: On `<html>` to prevent React hydration mismatch from the class.
- **Respect system preference**: Default to `system`, then allow manual override.
- **Use HSL tokens**: Store colors as HSL channels so opacity modifiers work: `bg-background/50`.
- **Test both modes**: Every page, every component. Dark mode is not an afterthought.
- **Accessible contrast**: Verify WCAG AA (4.5:1 text, 3:1 UI) in both themes.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| White flash on dark-mode page load | Add inline script to `<head>` before body renders |
| Hydration mismatch warning | Add `suppressHydrationWarning` to `<html>` |
| Images look wrong in dark mode | Use `dark:invert` or provide dark variants |
| Hardcoded colors ignore theme | Use CSS variables or Tailwind `dark:` prefix everywhere |
| Transition flicker on first load | Only add transition class during intentional toggles |
