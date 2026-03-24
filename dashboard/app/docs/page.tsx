"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NavPage {
  slug: string;
  title: string;
}

interface NavSection {
  title: string;
  slug: string;
  pages: NavPage[];
}

export default function DocsIndex() {
  const [nav, setNav] = useState<NavSection[]>([]);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((d) => setNav(d.sections ?? []));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">UltraThink Documentation</h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Persistent memory, 4-layer skill mesh, privacy hooks, and observability dashboard for Claude Code.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nav.map((section) => (
          <Link
            key={section.slug}
            href={`/docs/${section.slug}/${section.pages[0]?.slug ?? ""}`}
            className="group p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]
                       hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]
                       transition-all duration-200"
          >
            <h2 className="text-lg font-semibold group-hover:text-[var(--color-accent)] transition-colors">
              {section.title}
            </h2>
            <p className="text-sm text-[var(--color-text-dim)] mt-1">
              {section.pages.length} {section.pages.length === 1 ? "page" : "pages"}
            </p>
            <ul className="mt-3 space-y-1">
              {section.pages.slice(0, 4).map((page) => (
                <li key={page.slug} className="text-sm text-[var(--color-text-muted)]">
                  {page.title}
                </li>
              ))}
              {section.pages.length > 4 && (
                <li className="text-sm text-[var(--color-text-dim)]">+{section.pages.length - 4} more</li>
              )}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
