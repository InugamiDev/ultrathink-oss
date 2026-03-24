"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/activity": "Activity Feed",
  "/skills": "Skill Catalog",
  "/skills/graph": "Skill Graph",
  "/memory": "Memory Galaxy",
  "/hooks": "Hooks & Privacy",
  "/settings": "Settings",
  "/usage": "Usage",
  "/docs": "Documentation",
  "/system": "System",
  "/assets": "Asset Pipeline",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? (pathname.startsWith("/docs") ? "Documentation" : "UltraThink");
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-8">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 flex items-center justify-center rounded-lg
                     bg-[var(--color-surface-2)] border border-[var(--color-border)]
                     text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)]
                     transition-all duration-200 motion-reduce:transition-none
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          {theme === "dark" ? (
            /* Sun icon */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
              />
            </svg>
          )}
        </button>
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="hidden md:flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]
                     text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]
                     transition-all duration-200 motion-reduce:transition-none
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 rounded text-xs bg-[var(--color-surface)] border border-[var(--color-border)]">
            ⌘K
          </kbd>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface-2)] text-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
          <span className="text-[var(--color-text-muted)]">System Online</span>
        </div>
      </div>
    </header>
  );
}
