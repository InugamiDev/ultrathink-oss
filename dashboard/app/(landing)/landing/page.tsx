import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  UltraThink Landing Page — mirrors thinkbetter.dev layout          */
/* ------------------------------------------------------------------ */

export const metadata = {
  title: "UltraThink — Claude Workflow OS",
  description: "Persistent memory, 300+ skills, privacy hooks, and an observability dashboard for Claude Code.",
};

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function IconGithub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Terminal component                                                 */
/* ------------------------------------------------------------------ */

function TerminalWindow() {
  return (
    <div className="rounded-xl overflow-hidden border border-[#1a1a2e] shadow-2xl shadow-black/60">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d1a] border-b border-[#1a1a2e]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-[#4a4a6a] font-mono">claude-code — ultrathink</span>
      </div>
      {/* Terminal body */}
      <div className="bg-[#090912] p-6 font-mono text-sm leading-relaxed">
        <p className="text-[#5a5a7a]">➜ ~/projects/api</p>
        <p className="text-[#e2e8f0] mt-1">
          <span className="text-[#5a5a7a]">$ </span>claude{" "}
          <span className="text-amber-300">&quot;refactor the auth module to use JWT refresh tokens&quot;</span>
        </p>

        <div className="mt-4 text-[#5a5a7a]">
          <p>SessionStart: recalling memories...</p>
        </div>

        <div className="mt-2 border-l-2 border-[#f59e0b]/40 pl-3 space-y-1">
          <p className="text-[#94a3b8]">↳ Memory: &quot;Project uses Express 5 + Postgres&quot;</p>
          <p className="text-[#94a3b8]">↳ Memory: &quot;Prefer async/await over callbacks&quot;</p>
          <p className="text-[#94a3b8]">↳ Identity: &quot;Avoids magic strings — use constants&quot;</p>
        </div>

        <div className="mt-4 text-[#5a5a7a]">
          <p>
            UserPromptSubmit: scoring 302 skills
            <span className="text-amber-400/70">...</span>
          </p>
        </div>

        <div className="mt-2 space-y-1">
          <p>
            <span className="text-[#f59e0b]">▸ refactor</span>
            <span className="text-[#5a5a7a]"> (score: 9.42)</span>
          </p>
          <p>
            <span className="text-[#f59e0b]">▸ authentication</span>
            <span className="text-[#5a5a7a]"> (score: 8.91)</span>
          </p>
          <p>
            <span className="text-[#f59e0b]">▸ jwt</span>
            <span className="text-[#5a5a7a]"> (score: 7.15) → injecting skill context</span>
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-[#0f0f1e] border border-[#1a1a2e] p-3 space-y-1">
          <p className="text-[#22c55e]">✓ Skill: jwt</p>
          <p className="text-[#64748b] text-xs">
            Refresh token rotation pattern detected. Using httpOnly cookies + sliding window.
          </p>
          <p className="text-[#64748b] text-xs">
            DB schema: add <span className="text-amber-300/80">refresh_tokens</span> table with{" "}
            <span className="text-amber-300/80">family_id</span> for reuse detection.
          </p>
        </div>

        <p className="mt-4 text-[#22c55e]">
          ✅ Memory saved: &quot;Auth module now uses JWT refresh tokens with rotation&quot;
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature cards                                                      */
/* ------------------------------------------------------------------ */

const TOP_FEATURES = [
  {
    icon: "🧠",
    title: "Persistent Memory",
    desc: "Never repeat context again. UltraThink stores decisions, preferences, and patterns in Neon Postgres. pgvector similarity search surfaces the right memories — automatically, every session.",
  },
  {
    icon: "🛡️",
    title: "Privacy-First Hooks",
    desc: "Every tool call is pre-screened. .env files, credentials, and private paths are blocked before they reach the model. Configurable sensitivity levels per project.",
  },
  {
    icon: "⚡",
    title: "Zero Overhead",
    desc: "Pure TypeScript + Bash hooks. No Python environments. No Node servers. All hooks run in milliseconds and exit clean — UltraThink adds intelligence without adding latency.",
  },
];

/* ------------------------------------------------------------------ */
/*  Install steps                                                      */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    title: "Clone & Configure",
    code: [
      "git clone https://github.com/your-org/ultrathink",
      "cd ultrathink",
      "cp .env.example .env  # add DATABASE_URL",
    ],
  },
  {
    n: "02",
    title: "Start Your Session",
    code: [
      "# Memory + skill hooks register automatically",
      'npx tsx memory/scripts/memory-runner.ts session-start "my-project"',
    ],
  },
  {
    n: "03",
    title: "Open the Dashboard",
    code: ["cd dashboard && bun dev  # port 3333", "# Memory galaxy, analytics, kanban — live"],
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060e] text-[#e2e8f0] overflow-x-hidden">
      {/* ============================================================ */}
      {/*  Nav                                                          */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#06060e]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">
              🧠
            </span>
            <span className="font-semibold text-[#e2e8f0] tracking-tight">UltraThink</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {[
              ["Features", "#features"],
              ["Memory", "#demo"],
              ["Install", "#install"],
              ["GitHub", "https://github.com"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="https://github.com"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1e1e2e] text-sm text-[#e2e8f0]
                       hover:border-[#f59e0b]/40 hover:bg-[#f59e0b]/5 transition-all duration-200"
          >
            <IconStar />
            Star Repo
          </a>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  Hero                                                         */}
      {/* ============================================================ */}
      <section className="relative pt-24 pb-20 px-6 text-center overflow-hidden">
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#f59e0b] opacity-[0.04] blur-[120px]" />

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e1e2e] bg-[#0d0d1a] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
            <span className="text-xs text-[#64748b]">Claude Code · Neon Postgres · 302 Skills</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            <span className="text-[#e2e8f0]">Stop Managing</span>
            <br />
            <span className="text-[#f59e0b]">Your AI.</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg text-[#64748b] max-w-2xl mx-auto leading-relaxed mb-10">
            Claude forgets context, loses decisions, and starts fresh every session.{" "}
            <strong className="text-[#94a3b8]">UltraThink</strong> is an open-source Claude Workflow OS that adds{" "}
            <strong className="text-[#94a3b8]">persistent memory</strong>, 302 auto-triggered skills, and privacy hooks
            — turning Claude Code into a principal engineer that actually remembers.
          </p>

          {/* Install commands */}
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto text-left mb-10">
            {[
              {
                label: "SESSION START",
                cmd: 'npx tsx memory/scripts/memory-runner.ts session-start "project"',
              },
              {
                label: "DASHBOARD",
                cmd: "cd dashboard && bun dev  # port 3333",
              },
            ].map(({ label, cmd }) => (
              <div key={label} className="flex-1 rounded-lg border border-[#1a1a2e] bg-[#0a0a14] overflow-hidden">
                <div className="px-4 py-2 border-b border-[#1a1a2e]">
                  <span className="text-[0.625rem] font-mono tracking-widest text-[#3a3a5a] uppercase">{label}</span>
                </div>
                <div className="px-4 py-3">
                  <code className="text-xs font-mono text-[#94a3b8] break-all">{cmd}</code>
                </div>
              </div>
            ))}
          </div>

          <a href="#demo" className="text-sm text-[#f59e0b] hover:text-amber-300 transition-colors duration-150">
            See how it works →
          </a>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Terminal Demo                                               */}
      {/* ============================================================ */}
      <section id="demo" className="max-w-4xl mx-auto px-6 pb-28">
        <TerminalWindow />
      </section>

      {/* ============================================================ */}
      {/*  Features                                                     */}
      {/* ============================================================ */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-28">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#e2e8f0]">
            Your AI is powerful. <span className="text-[#f59e0b]">Make it remember.</span>
          </h2>
          <p className="text-[#64748b] mt-3 text-base">
            Because re-explaining your entire codebase every session is not engineering.
          </p>
        </div>

        {/* Top row: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {TOP_FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-[#1a1a2e] bg-[#0a0a14]
                         hover:border-[#f59e0b]/20 hover:bg-[#0d0d1a] transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-[#13131e] flex items-center justify-center text-xl mb-4">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">{f.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom row: wide BM25 card */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-[#1a1a2e] bg-[#0a0a14]
                     hover:border-[#f59e0b]/20 hover:bg-[#0d0d1a] transition-all duration-200 overflow-hidden"
        >
          <div className="p-6">
            <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">BM25 Skill Scoring</h3>
            <p className="text-sm text-[#64748b] leading-relaxed">
              UserPromptSubmit hook scores all 302 skills at keystroke speed using BM25 keyword matching. Top 5 relevant
              skills are injected as{" "}
              <code className="text-xs bg-[#0f0f1e] px-1 py-0.5 rounded text-amber-300/80">additionalContext</code>{" "}
              before Claude ever sees your prompt.
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {["TypeScript", "BM25", "Hooks API"].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs rounded-full bg-[#0f0f1e] text-[#64748b] border border-[#1a1a2e]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="p-5 bg-[#07070f] rounded-r-xl font-mono text-xs space-y-2 flex flex-col justify-center">
            <p className="text-amber-300/70">intent=&quot;refactor auth&quot;</p>
            <p className="text-[#22c55e]">score: 9.42 → refactor</p>
            <p className="text-[#22c55e]">score: 8.91 → authentication</p>
            <p className="text-[#22c55e]">score: 7.15 → jwt</p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Install Steps                                               */}
      {/* ============================================================ */}
      <section id="install" className="max-w-6xl mx-auto px-6 pb-28">
        <h2 className="text-3xl md:text-4xl font-bold text-[#e2e8f0] mb-12">Up in minutes.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ n, title, code }) => (
            <div key={n} className="rounded-xl border border-[#1a1a2e] bg-[#0a0a14] overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <p className="text-xs font-mono text-[#f59e0b]/60 tracking-widest mb-2">STEP {n}</p>
                <h3 className="text-base font-semibold text-[#e2e8f0]">{title}</h3>
              </div>
              <div className="mx-4 mb-4 rounded-lg bg-[#07070f] border border-[#1a1a2e] p-4 space-y-1">
                {code.map((line, i) => (
                  <p
                    key={i}
                    className={`text-xs font-mono ${line.startsWith("#") ? "text-[#3a3a5a]" : "text-[#94a3b8]"}`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Last step — chat demo */}
        <div className="mt-6 rounded-xl border border-[#1a1a2e] bg-[#0a0a14] p-6 md:flex gap-8 items-center">
          <div className="md:w-1/2 mb-6 md:mb-0">
            <p className="text-xs font-mono text-[#f59e0b]/60 tracking-widest mb-2">STEP 04</p>
            <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">Start Thinking</h3>
            <p className="text-sm text-[#64748b]">
              Skills auto-trigger. Memories auto-save. Privacy hooks auto-enforce. Just open Claude Code and work —
              UltraThink handles the rest.
            </p>
          </div>
          <div className="md:w-1/2 rounded-lg bg-[#07070f] border border-[#1a1a2e] p-4 font-mono text-xs space-y-2">
            <p className="text-amber-300/80">Refactor the payments module to handle retries.</p>
            <div className="border-t border-[#1a1a2e] pt-2 text-[#5a5a7a]">
              ↳ Skills: refactor · stripe · error-handling
            </div>
            <p className="text-[#22c55e]">✓ Memory: &quot;Using Stripe idempotency keys&quot;</p>
            <p className="text-[#64748b]">I&apos;ll use exponential backoff with jitter + idempotency keys...</p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Skill mesh stat banner                                      */}
      {/* ============================================================ */}
      <section className="border-y border-[#1a1a2e] bg-[#08080f] py-16 mb-28">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "302", label: "Skills" },
            { value: "4", label: "Layers" },
            { value: "∞", label: "Memory" },
            { value: "0ms", label: "Overhead" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-[#f59e0b]">{value}</p>
              <p className="text-sm text-[#64748b] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section className="max-w-3xl mx-auto px-6 pb-32 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#e2e8f0] mb-4">Ready to stop repeating yourself?</h2>
        <p className="text-[#64748b] mb-8 text-base">
          Clone the repo, add your Neon Postgres URL, and never re-explain your codebase again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                       bg-[#f59e0b] text-black font-semibold text-base
                       hover:bg-amber-400 transition-all duration-200"
          >
            <IconGithub />
            View on GitHub
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                       border border-[#1e1e2e] text-[#94a3b8] font-medium text-base
                       hover:border-[#f59e0b]/30 hover:text-[#e2e8f0] transition-all duration-200"
          >
            Open Dashboard →
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Footer                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-[#1a1a2e] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors duration-150 flex items-center gap-1.5"
            >
              <IconGithub />
              GitHub
            </a>
            <a href="#" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors duration-150">
              Contributing
            </a>
            <a href="#" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors duration-150">
              Report an Issue
            </a>
          </div>
          <p className="text-sm text-[#3a3a5a]">MIT License © 2026 UltraThink.</p>
        </div>
      </footer>
    </div>
  );
}
