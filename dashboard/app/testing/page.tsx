import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { getSkillRegistry } from "@/lib/skills";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TestResult {
  id: string;
  page: string;
  viewport: string;
  status: "pass" | "fail" | "pending";
  timestamp: string;
  durationMs?: number;
  error?: string;
}

interface PageResult {
  page: string;
  tests: TestResult[];
  status: "pass" | "fail" | "pending";
  lastRun: string;
}

/* ------------------------------------------------------------------ */
/*  Data loaders (server-side, filesystem)                             */
/* ------------------------------------------------------------------ */

const SCREENSHOTS_DIR = "/tmp/ultrathink-screenshots";

function loadTestResults(): {
  pages: PageResult[];
  totalTests: number;
  passed: number;
  failed: number;
  pending: number;
  hasData: boolean;
  avgDuration: number;
} {
  const results: TestResult[] = [];

  if (existsSync(SCREENSHOTS_DIR)) {
    const files = readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .slice(-50);

    for (const file of files) {
      try {
        const raw = readFileSync(`${SCREENSHOTS_DIR}/${file}`, "utf-8");
        const data = JSON.parse(raw);
        results.push({
          id: data.id ?? file.replace(".json", ""),
          page: data.page ?? data.url ?? "/",
          viewport: data.viewport ?? "desktop",
          status: data.status ?? "pass",
          timestamp: data.timestamp ?? new Date().toISOString(),
          durationMs: data.durationMs,
          error: data.error,
        });
      } catch {
        /* skip malformed */
      }
    }
  }

  // Group by page
  const byPage = new Map<string, TestResult[]>();
  for (const r of results) {
    const arr = byPage.get(r.page) || [];
    arr.push(r);
    byPage.set(r.page, arr);
  }

  const pages: PageResult[] = Array.from(byPage.entries()).map(([page, tests]) => ({
    page,
    tests,
    status: tests.some((t) => t.status === "fail")
      ? "fail"
      : tests.some((t) => t.status === "pending")
        ? "pending"
        : "pass",
    lastRun: tests.reduce((latest, t) => (t.timestamp > latest ? t.timestamp : latest), ""),
  }));

  const durations = results.filter((r) => r.durationMs).map((r) => r.durationMs!);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    pages,
    totalTests: results.length,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    pending: results.filter((r) => r.status === "pending").length,
    hasData: results.length > 0,
    avgDuration,
  };
}

function loadTestSkills(): { name: string; description: string; triggers: string[] }[] {
  try {
    const registry = getSkillRegistry();
    return registry.skills
      .filter(
        (s) =>
          s.name.toLowerCase().includes("test") ||
          s.name.toLowerCase().includes("qa") ||
          s.name.toLowerCase().includes("screenshot") ||
          s.name.toLowerCase().includes("visual") ||
          s.name.toLowerCase().includes("playwright") ||
          s.name.toLowerCase().includes("validate") ||
          (s.triggers ?? []).some((t: string) => t.toLowerCase().includes("test"))
      )
      .map((s) => ({
        name: s.name,
        description: s.description || "No description",
        triggers: s.triggers ?? [],
      }));
  } catch {
    return [];
  }
}

function loadRecentRuns(): { file: string; timestamp: string; status: string; page: string }[] {
  const runs: { file: string; timestamp: string; status: string; page: string; ts: number }[] = [];

  if (existsSync(SCREENSHOTS_DIR)) {
    const files = readdirSync(SCREENSHOTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 20);

    for (const file of files) {
      try {
        const raw = readFileSync(`${SCREENSHOTS_DIR}/${file}`, "utf-8");
        const data = JSON.parse(raw);
        runs.push({
          file,
          timestamp: data.timestamp ?? "",
          status: data.status ?? "pass",
          page: data.page ?? data.url ?? "/",
          ts: new Date(data.timestamp || 0).getTime(),
        });
      } catch {
        /* skip */
      }
    }
  }

  runs.sort((a, b) => b.ts - a.ts);
  return runs.slice(0, 12).map(({ file, timestamp, status, page }) => ({ file, timestamp, status, page }));
}

/* ------------------------------------------------------------------ */
/*  Coverage (computed from actual filesystem)                         */
/* ------------------------------------------------------------------ */

function loadCoverage(appDir: string): { area: string; covered: number; total: number; color: string }[] {
  function countFiles(dir: string, ext: string): number {
    try {
      return readdirSync(dir, { recursive: true } as Parameters<typeof readdirSync>[1]).filter((f) =>
        String(f).endsWith(ext)
      ).length;
    } catch {
      return 0;
    }
  }

  const totalPages = countFiles(appDir, "page.tsx");
  const totalRoutes = countFiles(path.join(appDir, "api"), "route.ts");
  const totalComponents = countFiles(path.join(appDir, "..", "components"), ".tsx");

  return [
    { area: "Dashboard Pages", covered: 0, total: totalPages, color: "var(--color-accent)" },
    { area: "API Routes", covered: 0, total: totalRoutes, color: "var(--color-info)" },
    { area: "Components", covered: 0, total: totalComponents, color: "var(--color-success)" },
  ];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  if (!ts) return "--";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return ts;
  }
}

function passRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

/* ------------------------------------------------------------------ */
/*  Test commands reference                                            */
/* ------------------------------------------------------------------ */

const TEST_COMMANDS = [
  { command: "/test-visual", description: "Run visual regression tests across all pages and viewports" },
  { command: "/test-screenshot", description: "Capture screenshots for all dashboard routes" },
  { command: "/test-a11y", description: "Run accessibility audit (WCAG AA compliance)" },
  { command: "/test-responsive", description: "Validate responsive layouts at mobile, tablet, desktop" },
  { command: "/qa-review", description: "Full QA pass: visual + a11y + performance checks" },
  { command: "/validate-ui", description: "Check UI against design system constraints" },
];

/* ------------------------------------------------------------------ */
/*  Viewports                                                          */
/* ------------------------------------------------------------------ */

const VIEWPORTS = [
  { name: "Mobile", size: "375 x 667", icon: "phone" as const },
  { name: "Tablet", size: "768 x 1024", icon: "tablet" as const },
  { name: "Desktop", size: "1440 x 900", icon: "desktop" as const },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function TestingPage() {
  const data = loadTestResults();
  const testSkills = loadTestSkills();
  const recentRuns = loadRecentRuns();
  const coverageSections = loadCoverage(path.join(process.cwd(), "app"));

  const hasLiveData = data.hasData;
  const pages = data.pages;
  const totalTests = data.totalTests;
  const passed = data.passed;
  const failed = data.failed;
  const pending = data.pending;
  const avgDuration = data.avgDuration;
  const rate = passRate(passed, totalTests);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Testing Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Visual regression, coverage, and test run history
          </p>
        </div>
        <span
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
            hasLiveData
              ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)]"
          }`}
        >
          {hasLiveData ? "Live Data" : "No runs yet"}
        </span>
      </div>

      {/* No data — getting started callout */}
      {!hasLiveData && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center space-y-3">
          <svg
            className="w-10 h-10 mx-auto text-[var(--color-text-dim)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
            />
          </svg>
          <p className="text-base font-semibold text-[var(--color-text-muted)]">No test runs yet</p>
          <p className="text-sm text-[var(--color-text-dim)] max-w-sm mx-auto">
            Run{" "}
            <code className="font-mono text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded text-[var(--color-accent)]">
              /test-visual
            </code>{" "}
            or drop JSON result files into{" "}
            <code className="font-mono text-xs bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">
              {SCREENSHOTS_DIR}
            </code>{" "}
            to see results here.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/*  1. Test Results Summary — only shown when data exists        */}
      {/* ============================================================ */}

      {hasLiveData && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
              <p className="text-sm text-[var(--color-text-muted)]">Total Tests</p>
              <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">{totalTests}</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">{pages.length} pages</p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
              <p className="text-sm text-[var(--color-text-muted)]">Passed</p>
              <p className="text-3xl font-bold mt-2 text-[var(--color-success)]">{passed}</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">{rate}% pass rate</p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
              <p className="text-sm text-[var(--color-text-muted)]">Failed</p>
              <p className="text-3xl font-bold mt-2 text-[var(--color-error)]">{failed}</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">
                {failed > 0 ? "Needs attention" : "All clear"}
              </p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
              <p className="text-sm text-[var(--color-text-muted)]">Pending</p>
              <p className="text-3xl font-bold mt-2 text-[var(--color-warning)]">{pending}</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">{pending > 0 ? "In queue" : "None queued"}</p>
            </div>
            <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none">
              <p className="text-sm text-[var(--color-text-muted)]">Avg Duration</p>
              <p className="text-3xl font-bold mt-2 text-[var(--color-info)]">
                {avgDuration > 0 ? `${avgDuration}ms` : "--"}
              </p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">Per test</p>
            </div>
          </section>

          {/* Pass Rate Bar */}
          <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--color-text)]">Overall Pass Rate</span>
              <span className="text-sm font-bold text-[var(--color-text)]">{rate}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                style={{
                  width: `${rate}%`,
                  backgroundColor:
                    rate >= 90 ? "var(--color-success)" : rate >= 70 ? "var(--color-warning)" : "var(--color-error)",
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  Viewport Configuration                                      */}
      {/* ============================================================ */}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VIEWPORTS.map((vp) => (
          <div
            key={vp.name}
            className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm
                       hover:border-[var(--color-border-hover)] transition-all duration-200 motion-reduce:transition-none
                       flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-muted)]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {vp.icon === "phone" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                ) : vp.icon === "tablet" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
                  />
                )}
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-text)]">{vp.name}</h4>
              <p className="text-sm text-[var(--color-text-muted)]">{vp.size}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ============================================================ */}
      {/*  Test Results Table — only when data exists                   */}
      {/* ============================================================ */}

      {hasLiveData && (
        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Test Results by Page</h3>
            <span className="text-xs text-[var(--color-text-dim)]">
              {pages.filter((p) => p.status === "pass").length}/{pages.length} pages passing
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">Page</th>
                  <th className="px-6 py-3 font-medium text-center">Mobile</th>
                  <th className="px-6 py-3 font-medium text-center">Tablet</th>
                  <th className="px-6 py-3 font-medium text-center">Desktop</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Duration</th>
                  <th className="px-6 py-3 font-medium text-right">Last Run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pages.map((page) => {
                  const mobile = page.tests.find((t) => t.viewport === "mobile");
                  const tablet = page.tests.find((t) => t.viewport === "tablet");
                  const desktop = page.tests.find((t) => t.viewport === "desktop");
                  const maxDuration = Math.max(...page.tests.map((t) => t.durationMs ?? 0));
                  return (
                    <tr key={page.page} className="hover:bg-[var(--color-surface-2)] transition-colors duration-150">
                      <td className="px-6 py-4 font-mono text-[var(--color-text)]">{page.page}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusDot status={mobile?.status ?? "pending"} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusDot status={tablet?.status ?? "pending"} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusDot status={desktop?.status ?? "pending"} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={page.status} />
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--color-text-muted)] font-mono text-xs">
                        {maxDuration > 0 ? `${maxDuration}ms` : "--"}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--color-text-muted)]">
                        {formatTimestamp(page.lastRun)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Error Details (inline under table) */}
          {pages.some((p) => p.tests.some((t) => t.error)) && (
            <div className="border-t border-[var(--color-border)] px-6 py-4">
              <h4 className="text-sm font-medium text-[var(--color-error)] mb-3">Failures</h4>
              <div className="space-y-2">
                {pages.flatMap((p) =>
                  p.tests
                    .filter((t) => t.error)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--color-error)]/5 border border-[var(--color-error)]/10"
                      >
                        <span className="w-2 h-2 rounded-full bg-[var(--color-error)] mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--color-text)]">
                            <span className="font-mono">{t.page}</span>
                            <span className="text-[var(--color-text-muted)] mx-2">/</span>
                            <span className="capitalize">{t.viewport}</span>
                          </p>
                          <p className="text-xs text-[var(--color-error)] mt-0.5">{t.error}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Two-column layout: Commands + Coverage */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ============================================================ */}
        {/*  2. Available Test Commands / Skills                          */}
        {/* ============================================================ */}

        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Test Commands</h3>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">Available slash commands for testing workflows</p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {TEST_COMMANDS.map((cmd) => (
              <div
                key={cmd.command}
                className="px-6 py-4 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
              >
                <code className="text-sm font-mono text-[var(--color-accent)]">{cmd.command}</code>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{cmd.description}</p>
              </div>
            ))}
          </div>

          {/* Skills from registry */}
          {testSkills.length > 0 && (
            <>
              <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  Registered Testing Skills
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {testSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="px-6 py-4 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
                      <span className="text-sm font-medium text-[var(--color-text)]">{skill.name}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-4">{skill.description}</p>
                    {skill.triggers.length > 0 && (
                      <div className="flex gap-1.5 mt-2 ml-4 flex-wrap">
                        {skill.triggers.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-1 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border border-[var(--color-border)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ============================================================ */}
        {/*  3. Codebase Coverage (from filesystem counts)               */}
        {/* ============================================================ */}

        <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-[var(--color-text)]">Codebase Overview</h3>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">
              Files in scope — run tests to track covered vs. total
            </p>
          </div>
          <div className="p-6 space-y-5">
            {coverageSections.map((section) => (
              <div key={section.area}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[var(--color-text)]">{section.area}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {section.total} files
                    {section.covered > 0 && (
                      <span className="text-[var(--color-text-dim)] ml-1">
                        ({Math.round((section.covered / section.total) * 100)}% covered)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                  {section.covered > 0 ? (
                    <div
                      className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                      style={{
                        width: `${Math.round((section.covered / section.total) * 100)}%`,
                        backgroundColor: section.color,
                      }}
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-[var(--color-border)]" />
                  )}
                </div>
                {section.covered === 0 && <p className="text-xs text-[var(--color-text-dim)] mt-1">No tests run yet</p>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/*  4. Recent Test Runs                                          */}
      {/* ============================================================ */}

      <section className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Recent Test Runs</h3>
          <span className="text-xs text-[var(--color-text-dim)]">Last {recentRuns.length} results</span>
        </div>
        {recentRuns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No test runs recorded yet.</p>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">
              Run <code className="font-mono text-[var(--color-accent)]">/test-visual</code> to generate results.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {recentRuns.map((run, i) => (
              <div
                key={`${run.file}-${i}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-[var(--color-surface-2)] transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusDot status={run.status} />
                  <span className="text-sm font-mono text-[var(--color-text)] truncate">{run.page}</span>
                  <StatusBadge status={run.status} />
                </div>
                <span className="text-xs text-[var(--color-text-dim)] shrink-0 ml-4">
                  {formatTimestamp(run.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: string }) {
  const color =
    status === "pass"
      ? "bg-[var(--color-success)]"
      : status === "fail"
        ? "bg-[var(--color-error)]"
        : "bg-[var(--color-warning)] animate-pulse";
  return <span className={`w-2.5 h-2.5 rounded-full inline-block ${color}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "pass"
      ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20"
      : status === "fail"
        ? "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20"
        : "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20";
  return <span className={`px-2 py-1 text-xs rounded-full border ${styles}`}>{status}</span>;
}
