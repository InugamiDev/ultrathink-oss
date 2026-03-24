import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "UltraThink Dashboard",
  description: "Claude Workflow OS — Observability Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <Providers>
          <Sidebar />
          <CommandPalette />
          <div className="lg:pl-64 min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 p-8">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
