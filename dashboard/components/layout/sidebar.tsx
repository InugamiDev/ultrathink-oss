"use client";

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Activity, LayoutGrid, Brain, ShieldCheck, Server, Settings, BookOpen } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/usage", label: "Usage", icon: "usage" },
  { href: "/activity", label: "Activity", icon: "pulse" },
  { href: "/skills", label: "Skills", icon: "grid" },
  { href: "/memory", label: "Memory", icon: "brain" },
  { href: "/hooks", label: "Hooks", icon: "shield" },
  { href: "/docs", label: "Docs", icon: "docs" },
  { href: "/system", label: "System", icon: "server" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

const iconMap: Record<string, ReactNode> = {
  home: <Home className="w-5 h-5" />,
  usage: <BarChart3 className="w-5 h-5" />,
  pulse: <Activity className="w-5 h-5" />,
  grid: <LayoutGrid className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
  shield: <ShieldCheck className="w-5 h-5" />,
  docs: <BookOpen className="w-5 h-5" />,
  server: <Server className="w-5 h-5" />,
  gear: <Settings className="w-5 h-5" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      <div className="shrink-0 px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-accent)]">UltraThink</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Workflow OS</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors duration-150"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="min-h-0 flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/") ||
            (item.href === "/docs" && pathname.startsWith("/docs"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
                transition-all duration-200
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]
                motion-reduce:transition-none
                ${
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                }
              `}
            >
              {iconMap[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-[var(--color-border)]">
        <div className="px-4 py-3 rounded-lg bg-[var(--color-surface-2)] text-sm">
          <div className="text-[var(--color-text-dim)]">Version</div>
          <div className="text-[var(--color-text-muted)]">1.0.0</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]
                   text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors duration-150
                   focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300 motion-reduce:transition-none ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-50
                    lg:hidden transition-transform duration-300 motion-reduce:transition-none
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col z-40">
        {sidebarContent}
      </aside>
    </>
  );
}
