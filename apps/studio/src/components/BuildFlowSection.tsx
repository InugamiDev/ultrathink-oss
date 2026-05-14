// intent: replace the Builder Campaign "apply for a vetted key" form with a
//         GSD-style clarification flow — walks the user through a handful of
//         questions, then composes a structured prompt they can copy into chat
// status: done — 6-step form, generates a plain-language prompt, copy-to-clipboard
// next: integrate with the active chat session (drop generated prompt directly
//       into ChatPanel's textarea instead of clipboard)
// confidence: high
//
// Pattern is borrowed from established prompt-engineering practice:
//   - product / outcome (what)
//   - audience (who it's for)
//   - problem (why it matters)
//   - constraints (stack, time, scope)
//   - existing state (what's done)
//   - inspiration (examples)
// These six axes are what every "5W1H" / GSD spec template collapses to. The
// generated prompt closes with an explicit ask so the agent knows what to
// produce next (plan / code / both).

import { useState } from "react";

interface Step {
  key: keyof Answers;
  label: string;
  hint: string;
  placeholder: string;
  multiline?: boolean;
}

interface Answers {
  outcome: string;
  audience: string;
  problem: string;
  constraints: string;
  done: string;
  inspiration: string;
}

const STEPS: Step[] = [
  {
    key: "outcome",
    label: "What are you trying to build?",
    hint: "One sentence. Imagine telling a coworker over coffee.",
    placeholder: "a Stripe-style invoice dashboard for solo consultants",
    multiline: false,
  },
  {
    key: "audience",
    label: "Who's it for?",
    hint: "Be concrete — one persona, not 'everyone'.",
    placeholder: "indie freelancers who currently track invoices in Google Sheets",
    multiline: false,
  },
  {
    key: "problem",
    label: "What problem does it solve?",
    hint: "What does the user gain that they don't have today?",
    placeholder: "they keep forgetting overdue invoices and lose ~3 weeks of cash flow per year",
    multiline: true,
  },
  {
    key: "constraints",
    label: "Stack + constraints",
    hint: "Existing project? New? Budget? Deadline? Required tech?",
    placeholder: "Next.js 15 app router, Postgres via Drizzle, must ship to Vercel free tier",
    multiline: true,
  },
  {
    key: "done",
    label: "What's already done?",
    hint: "Honest inventory of what exists vs what's vapor.",
    placeholder: "auth + projects table are wired; invoices model is just a sketch",
    multiline: true,
  },
  {
    key: "inspiration",
    label: "Reference points",
    hint: "Apps / patterns you want this to feel like. Skip if none.",
    placeholder: "Linear's command bar density, Stripe's invoice email aesthetic",
    multiline: true,
  },
];

const EMPTY: Answers = {
  outcome: "",
  audience: "",
  problem: "",
  constraints: "",
  done: "",
  inspiration: "",
};

function composePrompt(a: Answers): string {
  const lines: string[] = [];
  lines.push("## Build brief\n");
  if (a.outcome.trim()) lines.push(`**What:** ${a.outcome.trim()}`);
  if (a.audience.trim()) lines.push(`**Who:** ${a.audience.trim()}`);
  if (a.problem.trim()) lines.push(`**Why:** ${a.problem.trim()}`);
  if (a.constraints.trim()) lines.push(`**Stack / constraints:** ${a.constraints.trim()}`);
  if (a.done.trim()) lines.push(`**Already done:** ${a.done.trim()}`);
  if (a.inspiration.trim()) lines.push(`**References:** ${a.inspiration.trim()}`);
  lines.push("");
  lines.push("## Ask");
  lines.push(
    "Propose the smallest sensible next step. Outline the plan in 3–5 bullets first, then implement only the minimum that makes the next demoable thing real. Flag any assumption you make so I can correct course before you've built too much on a wrong premise."
  );
  return lines.join("\n");
}

export function BuildFlowSection() {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [composed, setComposed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const step = STEPS[stepIdx];

  function reset(): void {
    setActive(false);
    setStepIdx(0);
    setAnswers(EMPTY);
    setComposed(null);
    setCopied(false);
  }

  function next(): void {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setComposed(composePrompt(answers));
    }
  }

  function back(): void {
    if (composed) {
      setComposed(null);
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  }

  async function copy(): Promise<void> {
    if (!composed) return;
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select the textarea so the user can ⌘C manually.
      const ta = document.getElementById("buildflow-output") as HTMLTextAreaElement | null;
      ta?.select();
    }
  }

  if (!active) {
    return (
      <section style={sectionStyle}>
        <header style={headStyle}>
          <h2 style={titleStyle}>Build flow</h2>
          <p style={subtitleStyle}>
            Stuck on what to ask the agent? Six quick questions and you'll have a structured prompt ready to paste into
            Build. Think of it as a one-page spec — like GSD without the ceremony.
          </p>
        </header>
        <button type="button" onClick={() => setActive(true)} style={primaryBtnStyle}>
          Start a build brief
        </button>
      </section>
    );
  }

  if (composed) {
    return (
      <section style={sectionStyle}>
        <header style={headStyle}>
          <h2 style={titleStyle}>Build flow — ready</h2>
          <p style={subtitleStyle}>Review, edit if you want, then copy into the Build chat.</p>
        </header>
        <textarea
          id="buildflow-output"
          value={composed}
          onChange={(e) => setComposed(e.target.value)}
          style={{ ...inputStyle, minHeight: "180px", fontFamily: "var(--font-mono)", fontSize: "12px" }}
        />
        <div style={btnRowStyle}>
          <button type="button" onClick={copy} style={primaryBtnStyle}>
            {copied ? "Copied ✓" : "Copy to clipboard"}
          </button>
          <button type="button" onClick={back} style={secondaryBtnStyle}>
            ← Edit answers
          </button>
          <button type="button" onClick={reset} style={{ ...secondaryBtnStyle, marginLeft: "auto" }}>
            Start over
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <header style={headStyle}>
        <h2 style={titleStyle}>
          Build flow · step {stepIdx + 1} / {STEPS.length}
        </h2>
        <div style={progressBarStyle}>
          <div style={{ ...progressFillStyle, width: `${((stepIdx + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>
      <label style={labelStyle}>
        <span style={questionStyle}>{step.label}</span>
        <span style={hintStyle}>{step.hint}</span>
        {step.multiline ? (
          <textarea
            autoFocus
            value={answers[step.key]}
            onChange={(e) => setAnswers((a) => ({ ...a, [step.key]: e.target.value }))}
            placeholder={step.placeholder}
            style={{ ...inputStyle, minHeight: "80px" }}
          />
        ) : (
          <input
            type="text"
            autoFocus
            value={answers[step.key]}
            onChange={(e) => setAnswers((a) => ({ ...a, [step.key]: e.target.value }))}
            placeholder={step.placeholder}
            style={inputStyle}
          />
        )}
      </label>
      <div style={btnRowStyle}>
        <button type="button" onClick={back} disabled={stepIdx === 0} style={secondaryBtnStyle}>
          ← Back
        </button>
        <button type="button" onClick={next} style={primaryBtnStyle}>
          {stepIdx === STEPS.length - 1 ? "Generate prompt →" : "Next →"}
        </button>
        <button type="button" onClick={reset} style={{ ...secondaryBtnStyle, marginLeft: "auto" }}>
          Cancel
        </button>
      </div>
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  background: "var(--bg-elevated)",
  marginBottom: "var(--space-4)",
};
const headStyle: React.CSSProperties = { marginBottom: "var(--space-3)" };
const titleStyle: React.CSSProperties = { fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0 };
const subtitleStyle: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" };
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "var(--space-3)",
};
const questionStyle: React.CSSProperties = { fontSize: "13px", color: "var(--text)", fontWeight: 600 };
const hintStyle: React.CSSProperties = { fontSize: "11.5px", color: "var(--text-dim)" };
const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: "13px",
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  outline: "none",
  resize: "vertical",
};
const btnRowStyle: React.CSSProperties = { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" };
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  border: "1px solid var(--accent)",
  padding: "6px 14px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
  fontSize: "12px",
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "6px 14px",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
const progressBarStyle: React.CSSProperties = {
  height: "3px",
  background: "var(--border)",
  borderRadius: "999px",
  overflow: "hidden",
  marginTop: "8px",
};
const progressFillStyle: React.CSSProperties = {
  height: "100%",
  background: "var(--accent)",
  transition: "width 200ms ease",
};
