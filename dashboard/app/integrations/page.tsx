"use client";

import Link from "next/link";

type IntegrationStatus = "installed" | "available" | "external";

interface Integration {
  id: string;
  name: string;
  tagline: string;
  description: string;
  source: string;
  stars: string;
  lang: string;
  status: IntegrationStatus;
  category: "design" | "security" | "context" | "ai-ml" | "research";
  features: string[];
  skills: string[];
  quickstart: string;
  docs?: string;
}

const integrations: Integration[] = [
  {
    id: "impeccable",
    name: "Impeccable",
    tagline: "The design language that makes your AI harness better at design",
    description:
      "17 design skills that give Claude professional design vocabulary — /polish, /audit, /bolder, /colorize, /animate and more. Each skill is a focused design command with curated anti-patterns, typography rules, color theory, and motion guidance.",
    source: "https://github.com/pbakaus/impeccable",
    stars: "—",
    lang: "Markdown",
    status: "installed",
    category: "design",
    features: [
      "17 specialized design commands (polish, audit, bolder, colorize, animate…)",
      "7 reference guides: typography, color, motion, spatial, interaction, responsive, UX writing",
      "Anti-pattern library — what NOT to do for each design dimension",
      "Works with Claude Code, Cursor, Gemini CLI, VS Code Copilot",
      "Project-aware via /teach-impeccable setup command",
    ],
    skills: ["ui-polish"],
    quickstart: "/ui-polish",
    docs: "https://impeccable.style",
  },
  {
    id: "promptfoo",
    name: "Promptfoo",
    tagline: "Automated LLM security testing and red teaming",
    description:
      "Open-source framework for finding vulnerabilities in AI applications before they reach production. Covers 50+ vulnerability types including prompt injection, jailbreaks, PII leaks, and business logic violations. Used by 127 Fortune 500 companies.",
    source: "https://github.com/promptfoo/promptfoo",
    stars: "300K+ devs",
    lang: "TypeScript",
    status: "available",
    category: "security",
    features: [
      "50+ vulnerability plugins: injection, jailbreaks, PII, harmful content",
      "CI/CD integration: GitHub Actions, GitLab, Jenkins",
      "RAG-specific tests: context poisoning, data exfiltration",
      "MCP framework support — test agent tool calls",
      "Actionable remediation in PRs + continuous monitoring",
    ],
    skills: ["promptfoo"],
    quickstart: "npx promptfoo@latest redteam setup",
    docs: "https://www.promptfoo.dev/",
  },
  {
    id: "openviking",
    name: "OpenViking",
    tagline: "Filesystem-paradigm context database for AI agents",
    description:
      "Context database that organizes agent memory, resources, and skills under a viking:// filesystem protocol. Tiered loading (L0/L1/L2) reduces token consumption vs flat RAG. Features transparent retrieval tracking and automatic session memory extraction.",
    source: "https://github.com/volcengine/OpenViking",
    stars: "6K+",
    lang: "Python + Go",
    status: "available",
    category: "context",
    features: [
      "Hierarchical context: L0 summary → L1 overview → L2 full detail",
      "viking:// protocol — memories, resources, skills, preferences",
      "Lock high-score directory first, then refine — deterministic retrieval",
      "Visualized retrieval tracking — transparent, debuggable RAG",
      "Auto session memory extraction after each conversation",
    ],
    skills: ["openviking"],
    quickstart: "pip install openviking",
    docs: "https://github.com/volcengine/OpenViking",
  },
  {
    id: "mirofish",
    name: "MiroFish",
    tagline: "Swarm intelligence engine for future prediction",
    description:
      "Multi-agent simulation platform that builds knowledge graphs from seed data and simulates futures with thousands of agents. Used for financial forecasting, public opinion analysis, social dynamics modeling, and strategic scenario planning.",
    source: "https://github.com/666ghj/MiroFish",
    stars: "18K+",
    lang: "Python",
    status: "available",
    category: "ai-ml",
    features: [
      "GraphRAG-based knowledge graph construction from any seed data",
      "Thousands of simulated agents with temporal memory",
      "Parallel simulation runs for confidence estimation",
      "Deep interaction — chat with simulated agents post-run",
      "Docker deployment: frontend :3000, backend API :5001",
    ],
    skills: ["mirofish"],
    quickstart: "docker-compose up -d",
    docs: "https://github.com/666ghj/MiroFish",
  },
  {
    id: "heretic",
    name: "Heretic",
    tagline: "Automatic censorship removal for local LLMs",
    description:
      "Removes refusal/safety-training behavior from open-source transformer models by identifying and nullifying the 'refusal direction' in the residual stream. Fully automatic — no manual labeling or fine-tuning required. For research, red teaming, and local model customization.",
    source: "https://github.com/p-e-w/heretic",
    stars: "11K+",
    lang: "Python",
    status: "available",
    category: "research",
    features: [
      "Automatic refusal direction extraction from residual stream",
      "No fine-tuning — pure weight projection, 10 min on GPU",
      "Works with Llama, Mistral, Gemma, Qwen and most HF models",
      "Pairs with Promptfoo for before/after behavioral comparison",
      "Minimal capability degradation on standard benchmarks",
    ],
    skills: ["heretic"],
    quickstart: "pip install heretic-abliterate",
    docs: "https://github.com/p-e-w/heretic",
  },
];

const statusConfig: Record<IntegrationStatus, { label: string; color: string; dot: string }> = {
  installed: {
    label: "Installed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  available: {
    label: "Available",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  external: {
    label: "External",
    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dot: "bg-slate-400",
  },
};

const categoryConfig: Record<Integration["category"], { label: string; color: string }> = {
  design: { label: "Design", color: "text-purple-400" },
  security: { label: "Security", color: "text-red-400" },
  context: { label: "Context DB", color: "text-amber-400" },
  "ai-ml": { label: "AI / ML", color: "text-cyan-400" },
  research: { label: "Research", color: "text-pink-400" },
};

const categoryIcons: Record<Integration["category"], React.ReactNode> = {
  design: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
      />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  ),
  context: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  ),
  "ai-ml": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  ),
  research: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  ),
};

export default function IntegrationsPage() {
  const totalSkills = integrations.reduce((acc, i) => acc + i.skills.length, 0);
  const installed = integrations.filter((i) => i.status === "installed").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">Integrations</h1>
        <p className="text-[var(--color-text-muted)] mt-2 text-base">
          External tools, frameworks, and ecosystems wired into the UltraThink skill mesh.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Integrations", value: integrations.length },
          { label: "Skills Added", value: totalSkills },
          { label: "Installed", value: installed },
          { label: "Available", value: integrations.length - installed },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
          >
            <div className="text-3xl font-bold text-[var(--color-accent)]">{value}</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Integration cards */}
      <div className="space-y-6">
        {integrations.map((integration) => {
          const status = statusConfig[integration.status];
          const cat = categoryConfig[integration.category];
          const icon = categoryIcons[integration.category];

          return (
            <div
              key={integration.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <div className="p-6 pb-4 flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    integration.category === "design"
                      ? "bg-purple-500/10 text-purple-400"
                      : integration.category === "security"
                        ? "bg-red-500/10 text-red-400"
                        : integration.category === "context"
                          ? "bg-amber-500/10 text-amber-400"
                          : integration.category === "ai-ml"
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-pink-500/10 text-pink-400"
                  }`}
                >
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-[var(--color-text)]">{integration.name}</h2>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    <span className={`text-xs font-medium ${cat.color}`}>{cat.label}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{integration.tagline}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {integration.stars !== "—" && (
                    <span className="text-xs text-[var(--color-text-dim)] px-2 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                      ★ {integration.stars}
                    </span>
                  )}
                  <span className="text-xs text-[var(--color-text-dim)] px-2 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                    {integration.lang}
                  </span>
                </div>
              </div>

              {/* Description + features */}
              <div className="px-6 pb-4 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{integration.description}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-3">
                    Key Features
                  </h3>
                  <ul className="space-y-1.5">
                    {integration.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                        <svg
                          className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Skills pills */}
              {integration.skills.length > 0 && (
                <div className="px-6 pb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-3">
                    Skill Mesh ({integration.skills.length} skill{integration.skills.length !== 1 ? "s" : ""})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {integration.skills.map((skill) => (
                      <Link
                        key={skill}
                        href={`/skills?search=${encodeURIComponent(skill)}`}
                        className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                      >
                        /{skill}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/50 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-[var(--color-text-dim)]">Quickstart: </span>
                  <code className="text-xs text-[var(--color-accent)] font-mono">{integration.quickstart}</code>
                </div>
                <div className="flex gap-2">
                  <a
                    href={integration.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                    </svg>
                    GitHub
                  </a>
                  {integration.docs && integration.docs !== integration.source && (
                    <a
                      href={integration.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                      Docs
                    </a>
                  )}
                  <Link
                    href={`/skills?search=${encodeURIComponent(integration.id)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
                      />
                    </svg>
                    View Skills
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
