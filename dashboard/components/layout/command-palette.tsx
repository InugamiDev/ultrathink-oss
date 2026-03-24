"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "page" | "skill" | "action";
  label: string;
  description?: string;
  href?: string;
  action?: () => void;
  icon?: string;
}

const PAGES: SearchResult[] = [
  { type: "page", label: "Dashboard", href: "/", description: "Home overview" },
  { type: "page", label: "Activity", href: "/activity", description: "Activity feed" },
  { type: "page", label: "Analytics", href: "/analytics", description: "Usage analytics" },
  { type: "page", label: "Skills", href: "/skills", description: "Skill catalog" },
  { type: "page", label: "Skill Graph", href: "/skills/graph", description: "Interactive graph" },
  { type: "page", label: "Plans", href: "/plans", description: "Implementation plans" },
  { type: "page", label: "Kanban", href: "/kanban", description: "Task board" },
  { type: "page", label: "Testing", href: "/testing", description: "Test dashboard" },
  { type: "page", label: "Memory", href: "/memory", description: "Memory galaxy" },
  { type: "page", label: "Hooks", href: "/hooks", description: "Hooks & privacy" },
  { type: "page", label: "System", href: "/system", description: "System health & diagnostics" },
  { type: "page", label: "Settings", href: "/settings", description: "Configuration" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [skills, setSkills] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load skills on mount
  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        const s = (data.skills ?? []).map((skill: { name: string; description: string; layer: string }) => ({
          type: "skill" as const,
          label: skill.name,
          description: `${skill.layer} — ${skill.description.slice(0, 60)}`,
          href: `/skills?search=${skill.name}`,
        }));
        setSkills(s);
      })
      .catch((err) => console.warn("[command-palette]", err.message));
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults(PAGES);
      setSelectedIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const all = [...PAGES, ...skills];
    const filtered = all.filter((r) => r.label.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
    setResults(filtered.slice(0, 12));
    setSelectedIndex(0);
  }, [query, skills]);

  const execute = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      if (result.href) {
        router.push(result.href);
      }
      if (result.action) {
        result.action();
      }
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        execute(results[selectedIndex]);
      }
    },
    [results, selectedIndex, execute]
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-xl">
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)]">
            <svg
              className="w-5 h-5 text-[var(--color-text-muted)] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, skills..."
              className="flex-1 bg-transparent text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] outline-none"
            />
            <kbd className="px-2 py-0.5 rounded text-xs bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)]">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-[var(--color-text-dim)]">No results found</div>
            ) : (
              results.map((result, i) => (
                <button
                  key={`${result.type}-${result.label}-${i}`}
                  onClick={() => execute(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors duration-100
                    ${i === selectedIndex ? "bg-[var(--color-accent)]/10" : "hover:bg-[var(--color-surface-2)]"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      result.type === "page"
                        ? "bg-[var(--color-accent)]"
                        : result.type === "skill"
                          ? "bg-[var(--color-info)]"
                          : "bg-[var(--color-success)]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${i === selectedIndex ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}`}
                    >
                      {result.label}
                    </p>
                    {result.description && (
                      <p className="text-xs text-[var(--color-text-dim)] truncate mt-0.5">{result.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-dim)] shrink-0 capitalize">{result.type}</span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                &uarr;&darr;
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                enter
              </kbd>{" "}
              select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                esc
              </kbd>{" "}
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
