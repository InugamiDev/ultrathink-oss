"use client";

// intent: Public campaign page for Builder tier — application form + status check
// status: done
// next: Wire up real API endpoints when backend is ready
// confidence: high

import { useState } from "react";
import {
  Rocket,
  Puzzle,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  Sparkles,
  Brain,
  Lock,
  Gauge,
  Shield,
} from "lucide-react";

const PROOF_TYPES = [
  { value: "project", label: "Ship a Project" },
  { value: "skill", label: "Contribute a Skill" },
  { value: "contribution", label: "Make a Contribution" },
] as const;

type ProofType = (typeof PROOF_TYPES)[number]["value"];

interface ApplicationForm {
  handle: string;
  email: string;
  proofType: ProofType | "";
  proofUrl: string;
  description: string;
}

interface StatusResult {
  status: "pending" | "approved" | "rejected" | string;
  appliedAt?: string;
  message?: string;
}

const BUILDER_FEATURES = [
  { icon: <Brain className="w-5 h-5" />, label: "Auto-decisions", desc: "Context-aware routing without prompts" },
  { icon: <Sparkles className="w-5 h-5" />, label: "Identity graph", desc: "Persistent preference learning" },
  { icon: <Lock className="w-5 h-5" />, label: "Vault sync", desc: "Encrypted cross-device memory" },
  { icon: <Gauge className="w-5 h-5" />, label: "Forge phase gates", desc: "Multi-stage build orchestration" },
  { icon: <Shield className="w-5 h-5" />, label: "Evaluator", desc: "Automated quality scoring" },
];

const EARN_PATHS = [
  {
    icon: <Rocket className="w-8 h-8" />,
    title: "Ship a Project",
    desc: "Build and ship 1 project using UltraThink OSS. Share the repo link as proof.",
    tag: "project",
  },
  {
    icon: <Puzzle className="w-8 h-8" />,
    title: "Contribute a Skill",
    desc: "Create and submit 1 skill to the UltraThink skill mesh.",
    tag: "skill",
  },
  {
    icon: <GitPullRequest className="w-8 h-8" />,
    title: "Make a Contribution",
    desc: "Any approved contribution — bug fix, docs improvement, or community help.",
    tag: "contribution",
  },
];

export default function BuilderCampaignPage() {
  const [form, setForm] = useState<ApplicationForm>({
    handle: "",
    email: "",
    proofType: "",
    proofUrl: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [statusHandle, setStatusHandle] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [statusError, setStatusError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: form.handle,
          email: form.email || undefined,
          proofType: form.proofType,
          proofUrl: form.proofUrl,
          description: form.description || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitResult({ ok: true, message: data.message || "Application submitted!" });
        setForm({ handle: "", email: "", proofType: "", proofUrl: "", description: "" });
      } else {
        setSubmitResult({ ok: false, message: data.error || "Something went wrong. Try again." });
      }
    } catch {
      setSubmitResult({ ok: false, message: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!statusHandle.trim()) return;

    setStatusLoading(true);
    setStatusResult(null);
    setStatusError("");

    try {
      const res = await fetch(`/api/builder/apply?handle=${encodeURIComponent(statusHandle.trim())}`);
      const data = await res.json();

      if (res.ok) {
        setStatusResult(data);
      } else if (res.status === 404) {
        setStatusError("No application found for that handle.");
      } else {
        setStatusError(data.error || "Could not check status.");
      }
    } catch {
      setStatusError("Network error. Check your connection and try again.");
    } finally {
      setStatusLoading(false);
    }
  }

  const inputClasses =
    "w-full px-4 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] " +
    "text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] " +
    "focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] " +
    "transition-colors duration-200";

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-16">
      {/* Hero */}
      <section className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Builder Campaign
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Earn access to <span className="text-[var(--color-accent)]">UltraThink Builder</span>
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
          The next tier of intelligent development. Prove your commitment to the ecosystem and unlock advanced features
          that make Claude your true engineering partner.
        </p>
      </section>

      {/* What you get */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">What you get</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILDER_FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <span className="text-[var(--color-accent)] mt-0.5 shrink-0">{f.icon}</span>
              <div>
                <p className="font-medium text-sm">{f.label}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to earn it */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">How to earn it</h2>
        <p className="text-center text-[var(--color-text-muted)] mb-8">
          Complete any one of these paths, then submit your application below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EARN_PATHS.map((path, i) => (
            <div
              key={path.tag}
              className="relative p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]
                         hover:border-[var(--color-border-hover)] transition-colors duration-200 text-center"
            >
              <span className="absolute top-4 right-4 text-xs font-mono text-[var(--color-text-dim)]">{i + 1}</span>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-4">
                {path.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{path.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{path.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">Apply</h2>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Handle <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Discord or GitHub handle"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="Optional — for key delivery"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Proof type <span className="text-[var(--color-error)]">*</span>
                </label>
                <select
                  required
                  value={form.proofType}
                  onChange={(e) => setForm({ ...form, proofType: e.target.value as ProofType })}
                  className={inputClasses}
                >
                  <option value="">Select...</option>
                  {PROOF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Proof URL <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/..."
                  value={form.proofUrl}
                  onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                rows={3}
                placeholder="Optional — tell us about what you built or contributed"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClasses + " resize-none"}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-[var(--color-accent)] text-black font-semibold
                         hover:bg-[var(--color-accent-hover)] disabled:opacity-50
                         transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>

            {submitResult && (
              <div
                className={`flex items-center gap-2 p-4 rounded-lg text-sm ${
                  submitResult.ok
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                    : "bg-[var(--color-error)]/10 text-[var(--color-error)]"
                }`}
              >
                {submitResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {submitResult.message}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Status check */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-center">Already applied?</h2>
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
          <form onSubmit={handleStatusCheck} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter your handle to check status"
              value={statusHandle}
              onChange={(e) => setStatusHandle(e.target.value)}
              className={inputClasses + " flex-1"}
            />
            <button
              type="submit"
              disabled={statusLoading || !statusHandle.trim()}
              className="px-6 py-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]
                         hover:border-[var(--color-border-hover)] text-sm font-medium
                         disabled:opacity-50 transition-colors duration-200 shrink-0
                         flex items-center justify-center gap-2"
            >
              {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check Status"}
            </button>
          </form>

          {statusResult && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--color-surface-2)] text-sm">
              <p>
                Status:{" "}
                <span
                  className={`font-semibold ${
                    statusResult.status === "approved"
                      ? "text-[var(--color-success)]"
                      : statusResult.status === "rejected"
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-warning)]"
                  }`}
                >
                  {statusResult.status}
                </span>
              </p>
              {statusResult.appliedAt && (
                <p className="text-[var(--color-text-muted)] mt-1">
                  Applied: {new Date(statusResult.appliedAt).toLocaleDateString()}
                </p>
              )}
              {statusResult.message && <p className="text-[var(--color-text-muted)] mt-1">{statusResult.message}</p>}
            </div>
          )}

          {statusError && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {statusError}
            </div>
          )}
        </div>
      </section>

      {/* Activation */}
      <section className="text-center">
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8">
          <Terminal className="w-8 h-8 text-[var(--color-accent)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Have a key?</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">Activate Builder in your terminal:</p>
          <code className="inline-block px-6 py-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-accent)] font-mono text-sm">
            ultrathink upgrade
          </code>
        </div>
      </section>
    </div>
  );
}
