"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NavPage {
  slug: string;
  title: string;
}

interface NavSection {
  title: string;
  slug: string;
  pages: NavPage[];
}

export default function DocPage() {
  const params = useParams();
  const slugParts = (params.slug as string[]) ?? [];
  const slugPath = slugParts.join("/");

  const [nav, setNav] = useState<NavSection[]>([]);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Load nav
  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((d) => setNav(d.sections ?? []));
  }, []);

  // Load content
  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/docs?slug=${encodeURIComponent(slugPath)}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setContent(d.content ?? "");
        setLoading(false);
      });
  }, [slugPath]);

  // Find current page title
  const currentSection = nav.find((s) => s.slug === slugParts[0]);
  const currentPage = currentSection?.pages.find((p) => p.slug === slugParts[1]);
  const pageTitle = currentPage?.title ?? slugParts[slugParts.length - 1] ?? "Docs";

  // Find prev/next
  const allPages: { section: string; slug: string; title: string; href: string }[] = [];
  for (const section of nav) {
    for (const page of section.pages) {
      allPages.push({
        section: section.title,
        slug: `${section.slug}/${page.slug}`,
        title: page.title,
        href: `/docs/${section.slug}/${page.slug}`,
      });
    }
  }
  const currentIdx = allPages.findIndex((p) => p.slug === slugPath);
  const prev = currentIdx > 0 ? allPages[currentIdx - 1] : null;
  const next = currentIdx < allPages.length - 1 ? allPages[currentIdx + 1] : null;

  return (
    <div className="flex gap-0 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[var(--color-border)] p-4 overflow-y-auto">
        <Link href="/docs" className="text-sm font-semibold text-[var(--color-accent)] hover:underline mb-4 block">
          Documentation
        </Link>
        <nav className="space-y-4">
          {nav.map((section) => (
            <div key={section.slug}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-1.5">
                {section.title}
              </h3>
              <ul className="space-y-0.5">
                {section.pages.map((page) => {
                  const href = `/docs/${section.slug}/${page.slug}`;
                  const isActive = slugPath === `${section.slug}/${page.slug}`;
                  return (
                    <li key={page.slug}>
                      <Link
                        href={href}
                        className={`block px-3 py-1.5 rounded-md text-sm transition-colors duration-150 ${
                          isActive
                            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                        }`}
                      >
                        {page.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-10 max-w-4xl">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-[var(--color-surface-2)] rounded" />
            <div className="h-4 w-full bg-[var(--color-surface-2)] rounded" />
            <div className="h-4 w-3/4 bg-[var(--color-surface-2)] rounded" />
            <div className="h-4 w-5/6 bg-[var(--color-surface-2)] rounded" />
          </div>
        ) : notFound ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
            <p className="text-[var(--color-text-muted)] mb-4">
              The documentation page{" "}
              <code className="text-sm bg-[var(--color-surface-2)] px-2 py-1 rounded">{slugPath}</code> does not exist.
            </p>
            <Link href="/docs" className="text-[var(--color-accent)] hover:underline">
              Back to docs
            </Link>
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] mb-6">
              <Link href="/docs" className="hover:text-[var(--color-text)]">
                Docs
              </Link>
              <span>/</span>
              {currentSection && (
                <>
                  <span>{currentSection.title}</span>
                  <span>/</span>
                </>
              )}
              <span className="text-[var(--color-text)]">{pageTitle}</span>
            </div>

            {/* Markdown content */}
            <article
              className="prose prose-invert max-w-none
              prose-headings:text-[var(--color-text)] prose-headings:font-semibold
              prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-0
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-[var(--color-border)] prose-h2:pb-2
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-[var(--color-text-muted)] prose-p:leading-relaxed
              prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline
              prose-code:text-[var(--color-accent)] prose-code:bg-[var(--color-surface-2)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-[var(--color-surface-2)] prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded-lg
              prose-strong:text-[var(--color-text)]
              prose-li:text-[var(--color-text-muted)]
              prose-table:text-sm
              prose-th:text-[var(--color-text)] prose-th:border-[var(--color-border)]
              prose-td:text-[var(--color-text-muted)] prose-td:border-[var(--color-border)]
              prose-blockquote:border-[var(--color-accent)] prose-blockquote:text-[var(--color-text-muted)]
              prose-hr:border-[var(--color-border)]
            "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>

            {/* Prev/Next navigation */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-[var(--color-border)]">
              {prev ? (
                <Link
                  href={prev.href}
                  className="group flex flex-col items-start gap-1 text-sm hover:text-[var(--color-accent)] transition-colors"
                >
                  <span className="text-xs text-[var(--color-text-dim)]">{prev.section}</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={next.href}
                  className="group flex flex-col items-end gap-1 text-sm hover:text-[var(--color-accent)] transition-colors"
                >
                  <span className="text-xs text-[var(--color-text-dim)]">{next.section}</span>
                  <span className="flex items-center gap-1">
                    {next.title}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
