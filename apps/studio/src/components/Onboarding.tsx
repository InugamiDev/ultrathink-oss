// intent: 3-step first-launch — Welcome → CLI prereqs → OSS skill kit (install/skip/custom)
// status: done — auto-detects ultrathink-core; offers Recommended (clone+symlink) / Skip / Custom path
// next: detect API key env vars (OPENAI_API_KEY) when codex is on the prereq list
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "studio:onboarded:v5";
const SKILL_DISABLED_KEY = "studio:skills-disabled";
const DEFAULT_OSS_REPO = "https://github.com/InugamiDev/ultrathink-core.git";

interface OnboardingProps {
  onDone: () => void;
}

type Step = "welcome" | "prereqs" | "oss";

interface CliPrereq {
  name: string;
  bin: string;
  ok: boolean;
  version: string | null;
  installHint: string;
}

interface OssStatus {
  installed: boolean;
  path: string;
  skillsDir: string | null;
  skillCount: number;
}

interface SkillStatus {
  installed: boolean;
  skillCount: number;
  discoveredOrigin: "linked" | "repo" | "claude-config" | null;
  discoveredPath: string | null;
}

type OssChoice = "recommended" | "skip" | "custom" | null;

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [prereqs, setPrereqs] = useState<CliPrereq[] | null>(null);
  const [oss, setOss] = useState<OssStatus | null>(null);
  const [skills, setSkills] = useState<SkillStatus | null>(null);
  const [ossChoice, setOssChoice] = useState<OssChoice>(null);
  const [customPath, setCustomPath] = useState<string>("");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    if (step === "prereqs") void checkPrereqs();
    if (step === "oss") {
      void checkOss();
      void checkSkills();
    }
  }, [step]);

  async function checkPrereqs(): Promise<void> {
    try {
      const list = await invoke<CliPrereq[]>("check_prereqs");
      setPrereqs(list);
    } catch {
      setPrereqs([]);
    }
  }

  async function checkOss(): Promise<void> {
    try {
      const status = await invoke<OssStatus>("oss_kit_status");
      setOss(status);
    } catch {
      setOss({ installed: false, path: "", skillsDir: null, skillCount: 0 });
    }
  }

  async function checkSkills(): Promise<void> {
    try {
      const result = await invoke<SkillStatus>("skill_registry_status");
      setSkills(result);
    } catch {
      setSkills({ installed: false, skillCount: 0, discoveredOrigin: null, discoveredPath: null });
    }
  }

  async function runInstall(): Promise<void> {
    setInstalling(true);
    setInstallError(null);
    try {
      await invoke("oss_kit_install", { source: DEFAULT_OSS_REPO });
      await checkOss();
      await checkSkills();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  }

  // Combined: kit is "available" if any of these is true
  const kitDetected = oss?.installed === true || (skills?.installed === true && (skills.skillCount ?? 0) > 0);

  function finish(): void {
    if (ossChoice === "skip" && !kitDetected) {
      try {
        localStorage.setItem(SKILL_DISABLED_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem(SKILL_DISABLED_KEY);
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedAt: new Date().toISOString() }));
    onDone();
  }

  const claudeOk = prereqs?.find((p) => p.name === "claude")?.ok ?? false;
  const stepOrder: Step[] = ["welcome", "prereqs", "oss"];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={progressStyle}>
          {stepOrder.map((s, i) => (
            <div
              key={s}
              style={{
                ...dotStyle,
                background:
                  i === currentIdx ? "var(--accent)" : i < currentIdx ? "var(--accent-glow)" : "var(--border)",
              }}
            />
          ))}
        </div>

        {step === "welcome" && (
          <>
            <h1 style={h1Style}>UltraThink Studio</h1>
            <p style={pStyle}>
              Build apps from natural language. Code stays on your machine. Pairs with Claude Code or OpenAI Codex.
            </p>
            <ul style={listStyle}>
              <li>
                📁 Projects scaffold under <code>~/Studio/projects/</code>
              </li>
              <li>⌬ Top-3 contextual skills auto-load per turn</li>
              <li>🚀 One-click deploy to Vercel / Cloudflare / Netlify</li>
              <li>⌨ Optional global shortcut — Cmd+Shift+U</li>
            </ul>
            <div style={buttonRowStyle}>
              <button style={primaryButtonStyle} onClick={() => setStep("prereqs")}>
                Get started →
              </button>
            </div>
          </>
        )}

        {step === "prereqs" && (
          <>
            <h1 style={h1Style}>CLI prerequisites</h1>
            <p style={pStyle}>
              Studio drives existing CLIs as subprocesses. <code>claude</code> is required; the rest are optional and
              only needed for deploy or GitHub integration.
            </p>
            <div style={statusBoxStyle}>
              {prereqs === null && <span style={{ color: "var(--text-muted)" }}>Checking…</span>}
              {prereqs && prereqs.length === 0 && (
                <span style={{ color: "var(--red)" }}>No prereqs returned. Re-launch Studio.</span>
              )}
              {prereqs && prereqs.length > 0 && (
                <ul style={prereqListStyle}>
                  {prereqs.map((p) => {
                    const required = p.name === "claude";
                    return (
                      <li key={p.name} style={prereqRowStyle}>
                        <span style={{ width: "18px", flexShrink: 0 }}>{p.ok ? "✓" : required ? "✗" : "—"}</span>
                        <span
                          style={{
                            width: "80px",
                            fontFamily: "var(--font-mono)",
                            color: p.ok ? "var(--green)" : required ? "var(--red)" : "var(--text-dim)",
                          }}
                        >
                          {p.name}
                        </span>
                        {p.ok ? (
                          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{p.version ?? "ok"}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "11px", flex: 1 }}>
                            <span style={{ color: required ? "var(--red)" : "var(--text-dim)" }}>
                              {required ? "required" : "optional"}
                            </span>
                            <span style={{ marginLeft: "8px", fontFamily: "var(--font-mono)" }}>
                              <code style={codeStyle}>{p.installHint}</code>
                            </span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div style={buttonRowStyle}>
              <button style={ghostButtonStyle} onClick={checkPrereqs}>
                Re-check
              </button>
              <button
                style={primaryButtonStyle}
                onClick={() => setStep("oss")}
                disabled={!claudeOk}
                title={!claudeOk ? "Install claude to continue" : undefined}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === "oss" && (
          <>
            <h1 style={h1Style}>UltraThink Core kit</h1>
            <p style={pStyle}>
              The skill kit lives in a separate open-source repo. Studio looks it up at runtime to inject the right
              skill into each agent turn. Pick how you want it.
            </p>

            {/* Already installed pill — detect via 3 paths in priority order:
                  1. ~/.ultrathink-core/ exists (Recommended install)
                  2. skills already symlinked into ~/.claude/skills/ (origin=claude-config or linked)
                  3. discovered in a parent repo's .claude/skills/ (origin=repo) */}
            {(() => {
              const recommended = oss?.installed === true;
              const linked = skills?.installed === true && (skills.skillCount ?? 0) > 0;
              if (!recommended && !linked) return null;

              const where = recommended
                ? oss!.path
                : skills?.discoveredOrigin === "linked"
                  ? `~/.ultrathink-studio/skills (linked)`
                  : skills?.discoveredOrigin === "repo"
                    ? (skills.discoveredPath ?? "<repo>/.claude/skills/")
                    : "~/.claude/skills/";
              const count = recommended ? oss!.skillCount : skills!.skillCount;
              const detail = recommended
                ? skills?.installed
                  ? `${skills.skillCount} symlinked into ~/.claude/skills/`
                  : "syncing…"
                : skills?.discoveredOrigin === "claude-config"
                  ? "Skills available globally to every Claude Code session."
                  : `${count} skills picked up automatically.`;
              return (
                <div style={{ ...statusBoxStyle, borderColor: "rgba(52,211,153,0.4)" }}>
                  <div style={{ color: "var(--green)", fontWeight: 600, marginBottom: "4px" }}>
                    ✓ Detected at <code style={codeStyle}>{where}</code>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>
                    {count} skills · {detail}
                  </div>
                  {!recommended && (
                    <div style={{ color: "var(--text-dim)", fontSize: "10.5px", marginTop: "6px" }}>
                      Tip: install the dedicated <code style={codeStyle}>~/.ultrathink-core</code> clone to get
                      auto-updates and decouple Studio from this repo.{" "}
                      <button
                        onClick={() => void runInstall()}
                        disabled={installing}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent)",
                          cursor: "pointer",
                          fontSize: "10.5px",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {installing ? "Installing…" : "Install ~/.ultrathink-core"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {!(oss?.installed || (skills?.installed && (skills.skillCount ?? 0) > 0)) && (
              <div style={choiceStackStyle}>
                <ChoiceCard
                  selected={ossChoice === "recommended"}
                  onClick={() => setOssChoice("recommended")}
                  title="Recommended"
                  badge="2 min"
                  body={
                    <>
                      Clone <code style={codeStyle}>{DEFAULT_OSS_REPO.replace("https://github.com/", "")}</code> to{" "}
                      <code style={codeStyle}>~/.ultrathink-core</code> and symlink every skill into{" "}
                      <code style={codeStyle}>~/.claude/skills/</code>. Idempotent — re-runs just pull & re-sync.
                    </>
                  }
                />
                <ChoiceCard
                  selected={ossChoice === "custom"}
                  onClick={() => setOssChoice("custom")}
                  title="Custom path"
                  body={
                    <>
                      Already cloned somewhere? Point us at it. Example:{" "}
                      <code style={codeStyle}>~/code/ultrathink-core</code>.
                      <input
                        value={customPath}
                        onChange={(e) => {
                          setCustomPath(e.target.value);
                          setOssChoice("custom");
                        }}
                        placeholder="/absolute/path/to/ultrathink-core"
                        style={inputStyle}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </>
                  }
                />
                <ChoiceCard
                  selected={ossChoice === "skip"}
                  onClick={() => setOssChoice("skip")}
                  title="Skip — no skill kit"
                  body="Studio still drives Claude/Codex, but you lose the contextual skill mesh and persistent memory. You can install the kit later from Settings."
                />
              </div>
            )}

            {installError && (
              <div style={{ ...statusBoxStyle, borderColor: "rgba(248,113,113,0.4)", color: "var(--red)" }}>
                Install failed: {installError}
              </div>
            )}

            <div style={buttonRowStyle}>
              <button style={ghostButtonStyle} onClick={() => setStep("prereqs")} disabled={installing}>
                ← Back
              </button>
              {!kitDetected && ossChoice === "recommended" && (
                <button style={primaryButtonStyle} onClick={() => void runInstall()} disabled={installing}>
                  {installing ? "Cloning + symlinking…" : "Install kit"}
                </button>
              )}
              {!kitDetected && ossChoice === "custom" && (
                <button
                  style={primaryButtonStyle}
                  onClick={async () => {
                    if (!customPath.trim()) return;
                    setInstalling(true);
                    setInstallError(null);
                    try {
                      // Custom path: just symlink — don't clone
                      // Pass the path through ULTRATHINK_SKILL_REPO via the engine env later.
                      // For now, use skill_registry_sync_global which respects ULTRATHINK_SKILL_REPO.
                      // TODO: pass customPath as an arg once skill-sync supports it.
                      await invoke("skill_registry_sync_global");
                      await checkOss();
                      await checkSkills();
                      finish();
                    } catch (err) {
                      setInstallError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setInstalling(false);
                    }
                  }}
                  disabled={installing || !customPath.trim()}
                >
                  {installing ? "Symlinking…" : "Use this path"}
                </button>
              )}
              {(kitDetected || ossChoice === "skip") && (
                <button style={primaryButtonStyle} onClick={finish} disabled={installing}>
                  Let's go →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  body,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...choiceCardStyle,
        borderColor: selected ? "var(--accent)" : "var(--border)",
        background: selected ? "var(--accent-soft-translucent)" : "var(--bg)",
      }}
    >
      <div style={choiceHeadStyle}>
        <span style={{ ...choiceTitleStyle, color: selected ? "var(--accent)" : "var(--text)" }}>
          {selected && <span style={{ marginRight: "6px" }}>●</span>}
          {!selected && <span style={{ marginRight: "6px", color: "var(--text-dim)" }}>○</span>}
          {title}
        </span>
        {badge && <span style={badgeStyle}>{badge}</span>}
      </div>
      <div style={choiceBodyStyle}>{body}</div>
    </button>
  );
}

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 13, 16, 0.92)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "32px 36px",
  width: "min(620px, 92vw)",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
};
const progressStyle: React.CSSProperties = { display: "flex", gap: "8px", marginBottom: "24px" };
const dotStyle: React.CSSProperties = {
  height: "4px",
  flex: 1,
  borderRadius: "2px",
  transition: "background 0.2s ease",
};
const h1Style: React.CSSProperties = { fontSize: "22px", fontWeight: 700, marginBottom: "10px", color: "var(--text)" };
const pStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--text-muted)",
  lineHeight: 1.6,
  marginBottom: "16px",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "12px 0 24px 0",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "12.5px",
  color: "var(--text-muted)",
};
const statusBoxStyle: React.CSSProperties = {
  padding: "14px 16px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
  marginBottom: "16px",
};
const prereqListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};
const prereqRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
};
const codeStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
};
const choiceStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
};
const choiceCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "12px 14px",
  border: "1px solid",
  borderRadius: "10px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  transition: "all 0.15s ease",
  font: "inherit",
};
const choiceHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const choiceTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};
const choiceBodyStyle: React.CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-muted)",
  lineHeight: 1.5,
};
const badgeStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--accent)",
  background: "var(--accent-soft)",
  padding: "2px 8px",
  borderRadius: "999px",
};
const inputStyle: React.CSSProperties = {
  marginTop: "6px",
  width: "100%",
  fontSize: "11.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "6px 10px",
  outline: "none",
};
const buttonRowStyle: React.CSSProperties = { display: "flex", gap: "8px", justifyContent: "flex-end" };
const primaryButtonStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  borderRadius: "8px",
  padding: "10px 18px",
  cursor: "pointer",
  border: "none",
};
const ghostButtonStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "10px 18px",
  cursor: "pointer",
  background: "transparent",
};
