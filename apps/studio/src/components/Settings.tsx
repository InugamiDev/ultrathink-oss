// intent: settings panel — UI/UX-pro-max pass: real hierarchy, status pills, no fake URLs
// status: done (skills sync, prereqs grid, defaults, telemetry, reset, about)
// next: keyboard nav, search, profile picker
// confidence: high

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openInShell } from "@tauri-apps/plugin-shell";
import { getKey, setKey, deleteKey, type KeyAccount } from "../lib/keychain.js";
import { ModelPicker } from "./ModelPicker.js";

const ONBOARDING_KEYS = [
  "studio:onboarded:v1",
  "studio:onboarded:v2",
  "studio:onboarded:v3",
  "studio:onboarded:v4",
  "studio:onboarded:v5",
];
const TELEMETRY_KEY = "studio:telemetry";
const MODEL_KEY = "studio:default-model";
const ADAPTER_KEY = "studio:adapter";

type AdapterId = "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";

const ADAPTER_LABELS: Record<AdapterId, string> = {
  claude: "Claude Code CLI — full skill mesh + MCP + memory",
  codex: "OpenAI Codex CLI",
  "anthropic-direct": "Anthropic API (direct, no CLI)",
  "openai-compat": "OpenAI-compatible (OpenRouter / Groq / LM Studio)",
  ollama: "Ollama (local — free, private, slower)",
};

const ADAPTER_DEFAULTS: Record<AdapterId, string> = {
  claude: "claude-sonnet-4-6",
  // Codex CLI maps a different model name when authenticated via ChatGPT
  // account vs API key (`gpt-5-codex` is API-key only). Empty string means
  // "let codex pick its default" — works for both auth paths.
  codex: "",
  "anthropic-direct": "claude-sonnet-4-6",
  "openai-compat": "gpt-5",
  ollama: "llama3.2",
};

interface SettingsProps {
  onClose: () => void;
}

interface SkillStatus {
  installed: boolean;
  skillCount: number;
  source: string | null;
  discoveredOrigin: "linked" | "repo" | "claude-config" | null;
  discoveredPath: string | null;
}

interface CliPrereq {
  name: string;
  bin: string;
  ok: boolean;
  version: string | null;
  installHint: string;
}

export function Settings({ onClose }: SettingsProps) {
  const [skills, setSkills] = useState<SkillStatus | null>(null);
  const [prereqs, setPrereqs] = useState<CliPrereq[]>([]);
  const [telemetry, setTelemetry] = useState<"opt-in" | "opt-out">(
    () => (localStorage.getItem(TELEMETRY_KEY) as "opt-in" | "opt-out") ?? "opt-out"
  );
  const [model, setModel] = useState<string>(() => localStorage.getItem(MODEL_KEY) ?? "");
  const [adapter, setAdapter] = useState<AdapterId>(
    () => (localStorage.getItem(ADAPTER_KEY) as AdapterId | null) ?? "claude"
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; ms?: number; msg?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ linked: number; skipped: number; failed: number } | null>(null);

  useEffect(() => {
    void refreshAll();
    // Hydrate keychain values into the form state once. Values stay in memory
    // only for the lifetime of the panel — close/reopen re-reads from keychain.
    void (async () => {
      const [a, o, ob, lb] = await Promise.all([
        getKey("anthropic-api-key"),
        getKey("openai-api-key"),
        getKey("openai-base-url"),
        getKey("ollama-base-url"),
      ]);
      if (a) setApiKey(a);
      if (o) setOpenaiApiKey(o);
      if (ob) setOpenaiBaseUrl(ob);
      if (lb) setOllamaBaseUrl(lb);
    })();
  }, []);

  async function refreshAll(): Promise<void> {
    try {
      const s = await invoke<SkillStatus>("skill_registry_status");
      setSkills(s);
    } catch {
      setSkills(null);
    }
    try {
      const p = await invoke<CliPrereq[]>("check_prereqs");
      setPrereqs(p);
    } catch {
      setPrereqs([]);
    }
  }

  async function syncToGlobal(): Promise<void> {
    setBusy("sync");
    setSyncResult(null);
    try {
      const result = await invoke<{ linked?: number; skipped?: number; failed?: number; message?: string }>(
        "skill_registry_sync_global"
      );
      if (result?.linked !== undefined) {
        setSyncResult({
          linked: result.linked ?? 0,
          skipped: result.skipped ?? 0,
          failed: result.failed ?? 0,
        });
      }
      await refreshAll();
    } catch (err) {
      setSyncResult({ linked: 0, skipped: 0, failed: -1 });
      console.error(err);
    } finally {
      setBusy(null);
    }
  }

  function setTelemetryChoice(v: "opt-in" | "opt-out"): void {
    setTelemetry(v);
    localStorage.setItem(TELEMETRY_KEY, v);
  }
  function setDefaultModel(v: string): void {
    setModel(v);
    if (v) localStorage.setItem(MODEL_KEY, v);
    else localStorage.removeItem(MODEL_KEY);
  }
  function setAgentAdapter(v: AdapterId): void {
    setAdapter(v);
    localStorage.setItem(ADAPTER_KEY, v);
    setTestResult(null);
  }
  function persistKeychain(account: KeyAccount, setter: (v: string) => void, v: string): void {
    setter(v);
    const trimmed = v.trim();
    if (trimmed) void setKey(account, trimmed).catch((err) => console.error("[keychain set]", err));
    else void deleteKey(account).catch((err) => console.error("[keychain delete]", err));
  }
  function persistApiKey(v: string): void {
    persistKeychain("anthropic-api-key", setApiKey, v);
  }
  function persistOpenAiKey(v: string): void {
    persistKeychain("openai-api-key", setOpenaiApiKey, v);
  }
  function persistOpenAiBase(v: string): void {
    persistKeychain("openai-base-url", setOpenaiBaseUrl, v);
  }
  function persistOllamaBase(v: string): void {
    persistKeychain("ollama-base-url", setOllamaBaseUrl, v);
  }

  async function testConnection(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    const startedAt = Date.now();
    try {
      if (adapter === "anthropic-direct") {
        const key = apiKey || "";
        if (!key) throw new Error("No API key set");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: model || "claude-haiku-4-5",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
      } else if (adapter === "openai-compat") {
        const key = openaiApiKey || "";
        if (!key) throw new Error("No API key set");
        const base = openaiBaseUrl || "https://api.openai.com/v1";
        const r = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else if (adapter === "ollama") {
        const base = ollamaBaseUrl || "http://localhost:11434";
        const r = await fetch(`${base}/api/tags`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else if (adapter === "claude") {
        const status = await invoke<{ ok: boolean; version: string | null }>("check_claude_cli");
        if (!status.ok) throw new Error("`claude` CLI not on PATH");
      } else if (adapter === "codex") {
        const status = await invoke<{ ok: boolean; version: string | null }>("check_codex_cli");
        if (!status.ok) {
          throw new Error("`codex` CLI not on PATH — `npm i -g @openai/codex`");
        }
      }
      setTestResult({ ok: true, ms: Date.now() - startedAt });
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  function resetOnboarding(): void {
    for (const k of ONBOARDING_KEYS) localStorage.removeItem(k);
    onClose();
    location.reload();
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h1 style={h1Style}>Settings</h1>
            <p style={subtitleStyle}>Studio configuration · stored locally</p>
          </div>
          <button style={closeButtonStyle} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* SKILLS */}
        <Section title="Skill registry" hint="232 UltraThink skills loaded contextually per build turn">
          <SkillStatusCard status={skills} />
          <ButtonRow>
            <SecondaryButton onClick={refreshAll} disabled={busy !== null}>
              Re-scan
            </SecondaryButton>
            <PrimaryButton onClick={syncToGlobal} disabled={busy !== null}>
              {busy === "sync" ? "Syncing…" : "Sync skills → ~/.claude/skills/"}
            </PrimaryButton>
          </ButtonRow>
          {syncResult && (
            <Pill kind={syncResult.failed < 0 ? "danger" : "success"}>
              {syncResult.failed < 0
                ? "Sync failed — check logs"
                : `Linked ${syncResult.linked} · skipped ${syncResult.skipped} · failed ${syncResult.failed}`}
            </Pill>
          )}
          <Hint>
            "Sync" symlinks every skill from <code>{"<repo>/.claude/skills/"}</code> into
            <code>{" ~/.claude/skills/"}</code>, so any Claude Code session anywhere on your machine — including
            Studio's project spawns — can pick them up.
          </Hint>
          {skills?.source && (
            <Hint>
              Remote source configured: <code>{skills.source}</code>
            </Hint>
          )}
        </Section>

        {/* PREREQS */}
        <Section title="Required CLIs" hint="Studio relies on these. Click any one to copy the install command.">
          <div style={prereqGridStyle}>
            {prereqs.map((p) => (
              <PrereqCard key={p.name} prereq={p} />
            ))}
          </div>
        </Section>

        {/* DEFAULTS */}
        <Section title="Defaults">
          <Field
            label="Agent backend"
            hint="Switch backends — model list updates and Build mode spawns the matching CLI."
          >
            <select
              value={adapter}
              onChange={(e) => {
                const next = e.target.value as AdapterId;
                setAgentAdapter(next);
                setDefaultModel(ADAPTER_DEFAULTS[next]);
              }}
              style={inputStyle}
            >
              {(Object.keys(ADAPTER_LABELS) as AdapterId[]).map((id) => (
                <option key={id} value={id}>
                  {ADAPTER_LABELS[id]}
                </option>
              ))}
            </select>
          </Field>

          <Hint>API keys + base URLs configured below in the "API keys" section.</Hint>

          <Field label="Default model" hint="Empty = let the agent pick. Override per-session in chat.">
            <ModelPicker
              adapter={adapter}
              value={model}
              onChange={setDefaultModel}
              placeholder={ADAPTER_DEFAULTS[adapter]}
            />
          </Field>

          <Field label="Test connection" hint="Pings the configured endpoint with a 1-token request.">
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <button
                onClick={() => void testConnection()}
                disabled={testing}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 16px",
                  cursor: testing ? "wait" : "pointer",
                }}
              >
                {testing ? (
                  <>
                    <span className="ut-spinner" />
                    Testing…
                  </>
                ) : (
                  "Run test"
                )}
              </button>
              {testResult?.ok && (
                <span style={{ color: "var(--green)", fontSize: "12px" }}>✓ Connected · {testResult.ms}ms</span>
              )}
              {testResult && !testResult.ok && (
                <span style={{ color: "var(--red)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  ✗ {testResult.msg}
                </span>
              )}
            </div>
          </Field>
        </Section>

        {/* API KEYS — always visible, not conditional on adapter */}
        <Section
          title="API keys"
          hint="Stored in localStorage on this device. Falls back to env vars if blank. Used by the matching adapter only."
        >
          <Field label="Anthropic">
            <KeyInput
              value={apiKey}
              onChange={persistApiKey}
              show={showApiKey}
              setShow={setShowApiKey}
              placeholder="sk-ant-…  (env: ANTHROPIC_API_KEY)"
            />
          </Field>
          <Field label="OpenAI / OpenRouter / Groq">
            <KeyInput
              value={openaiApiKey}
              onChange={persistOpenAiKey}
              show={showApiKey}
              setShow={setShowApiKey}
              placeholder="sk-…  (env: OPENAI_API_KEY)"
            />
          </Field>
          <Field label="OpenAI base URL" hint="Override for OpenRouter / Groq / LM Studio. Blank = openai.com.">
            <input
              value={openaiBaseUrl}
              onChange={(e) => persistOpenAiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
          <Field label="Ollama base URL" hint="Local model server. Default: http://localhost:11434.">
            <input
              value={ollamaBaseUrl}
              onChange={(e) => persistOllamaBase(e.target.value)}
              placeholder="http://localhost:11434"
              style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
        </Section>

        {/* SESSIONS */}
        <SessionsSection />

        {/* PRIVACY */}
        <Section
          title="Privacy"
          hint="Telemetry is intentionally disabled in this build. Once a self-hosted GlitchTip endpoint exists this toggle will go live with strict scrubbing (no prompts, no code, no keys)."
        >
          <RadioCard
            checked={telemetry === "opt-out"}
            onChange={() => setTelemetryChoice("opt-out")}
            label="No telemetry (current behavior)"
            sublabel="Nothing leaves your machine. This is what the app does today regardless of the toggle below."
          />
          <RadioCard
            checked={telemetry === "opt-in"}
            onChange={() => setTelemetryChoice("opt-in")}
            label="Send error reports (not yet wired)"
            sublabel="Will send: app version, OS, stack trace. Never: prompt content, code, API keys. Backend: TODO."
          />
        </Section>

        {/* DATA */}
        <Section title="Data" hint="All Studio state lives in ~/.ultrathink-studio/.">
          <ButtonRow>
            <SecondaryButton onClick={() => openInShell(`${homeDir()}/.ultrathink-studio`).catch(() => undefined)}>
              Open data directory
            </SecondaryButton>
            <SecondaryButton
              onClick={async () => {
                try {
                  const result = await invoke<unknown>("diagnose_spawn");
                  await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                  setBusy("diagnose-copied");
                  setTimeout(() => setBusy(null), 1500);
                } catch (e) {
                  setBusy(`diagnose failed: ${e}`);
                }
              }}
            >
              {busy === "diagnose-copied" ? "✓ Copied to clipboard" : "Export diagnostics"}
            </SecondaryButton>
          </ButtonRow>
        </Section>

        {/* RESET */}
        <Section title="Reset">
          <ButtonRow>
            <DangerGhostButton onClick={resetOnboarding}>Reset onboarding</DangerGhostButton>
            <DangerGhostButton
              onClick={async () => {
                if (
                  !confirm(
                    "Clear ALL stored adapter settings, API keys, and shortcut prefs? This won't touch projects or memory."
                  )
                )
                  return;
                for (const k of [
                  ADAPTER_KEY,
                  MODEL_KEY,
                  TELEMETRY_KEY,
                  "studio:debug",
                  "studio:debug:height",
                  "studio:skills-disabled",
                  "studio:keychain:migrated:v1",
                ]) {
                  localStorage.removeItem(k);
                }
                await Promise.all([
                  deleteKey("anthropic-api-key").catch(() => {}),
                  deleteKey("openai-api-key").catch(() => {}),
                  deleteKey("openai-base-url").catch(() => {}),
                  deleteKey("ollama-base-url").catch(() => {}),
                ]);
                onClose();
              }}
            >
              Clear all preferences
            </DangerGhostButton>
          </ButtonRow>
          <Hint>
            "Reset onboarding" re-runs the wizard. "Clear all preferences" wipes API keys + adapter choice. Neither
            touches projects or session logs.
          </Hint>
        </Section>

        {/* ABOUT */}
        <Section title="About">
          <Hint>
            UltraThink Studio v0.1.0 ·{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openInShell("https://github.com/InugamiDev/ultrathink-core").catch(() => undefined);
              }}
              style={{ color: "var(--accent)" }}
            >
              github.com/InugamiDev/ultrathink-core
            </a>
            <br />
            Shortcuts: <kbd style={kbdStyle}>⌘`</kbd> debug terminal · <kbd style={kbdStyle}>⌘/</kbd> shortcut cheat
            sheet · <kbd style={kbdStyle}>⌘⇧U</kbd> summon
          </Hint>
        </Section>
      </div>
    </div>
  );
}

function homeDir(): string {
  // Best-effort — Tauri doesn't expose os.homedir() to the webview directly.
  // We rely on the `Open data directory` shell call accepting absolute paths.
  return "~";
}

function SessionsSection() {
  const [sessions, setSessions] = useState<Array<{ sessionId: string; lastModified: string; sizeBytes: number }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    invoke<typeof sessions>("list_sessions")
      .then((rows) => {
        setSessions(rows ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return (
    <Section title="Recent sessions" hint="Per-session event logs at ~/.ultrathink-studio/sessions/.">
      {loading && <Hint>Loading…</Hint>}
      {!loading && sessions.length === 0 && <Hint>No sessions yet — first prompt creates a log.</Hint>}
      {!loading && sessions.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "11.5px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {sessions.slice(0, 8).map((s) => (
            <div
              key={s.sessionId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                padding: "4px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{s.sessionId.slice(0, 12)}…</span>
              <span style={{ color: "var(--text-dim)" }}>
                {(s.sizeBytes / 1024).toFixed(1)}KB · {new Date(s.lastModified).toLocaleString()}
              </span>
            </div>
          ))}
          {sessions.length > 8 && <Hint>+ {sessions.length - 8} more</Hint>}
        </div>
      )}
    </Section>
  );
}

const kbdStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "1px 6px",
  fontSize: "10px",
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};

// --- subcomponents ---

function SkillStatusCard({ status }: { status: SkillStatus | null }) {
  if (status === null) {
    return (
      <Card>
        <span style={{ color: "var(--text-muted)" }}>Scanning…</span>
      </Card>
    );
  }
  if (status.installed) {
    return (
      <Card>
        <Row>
          <BigNumber>{status.skillCount}</BigNumber>
          <div>
            <Pill kind="success">✓ skills detected</Pill>
            <div style={{ marginTop: "6px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              from{" "}
              <strong style={{ color: "var(--text)" }}>
                {status.discoveredOrigin === "linked"
                  ? "linked registry"
                  : status.discoveredOrigin === "repo"
                    ? "repo .claude/skills/"
                    : "~/.claude/skills/"}
              </strong>
            </div>
            {status.discoveredPath && <PathLine>{status.discoveredPath}</PathLine>}
          </div>
        </Row>
      </Card>
    );
  }
  return (
    <Card>
      <Pill kind="warn">⚠ No skills detected</Pill>
      <Hint style={{ marginTop: "8px" }}>
        Tried (in order): linked registry → repo's <code>.claude/skills/</code> →<code>{" ~/.claude/skills/"}</code>.
        Click <strong>Sync</strong> below to symlink UltraThink's skills into the global location.
      </Hint>
    </Card>
  );
}

function PrereqCard({ prereq }: { prereq: CliPrereq }) {
  return (
    <div style={prereqCardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{prereq.bin}</span>
        {prereq.ok ? (
          <span style={{ color: "var(--green)", fontSize: "11px" }}>✓ {prereq.version?.slice(0, 18) ?? "ok"}</span>
        ) : (
          <span style={{ color: "var(--amber)", fontSize: "11px" }}>not found</span>
        )}
      </div>
      {!prereq.ok && (
        <code
          onClick={() => navigator.clipboard.writeText(prereq.installHint)}
          style={prereqInstallStyle}
          title="Click to copy"
        >
          {prereq.installHint}
        </code>
      )}
    </div>
  );
}

// --- primitives ---

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={h2Style}>{title}</h2>
        {hint && <p style={sectionHintStyle}>{hint}</p>}
      </div>
      <div style={sectionBodyStyle}>{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={cardInnerStyle}>{children}</div>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>{children}</div>;
}

function ButtonRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{children}</div>;
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={primaryBtnStyle}>
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={secondaryBtnStyle}>
      {children}
    </button>
  );
}

function DangerGhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={dangerBtnStyle}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
      {hint && <span style={fieldHintStyle}>{hint}</span>}
    </div>
  );
}

function KeyInput({
  value,
  onChange,
  show,
  setShow,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (b: boolean) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, fontFamily: "var(--font-mono)", flex: 1 }}
        spellCheck={false}
        autoComplete="off"
      />
      <button
        onClick={() => setShow(!show)}
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "0 var(--space-3)",
          cursor: "pointer",
        }}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function RadioCard({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sublabel: string;
}) {
  return (
    <label style={{ ...radioCardStyle, ...(checked ? radioCardActiveStyle : null) }}>
      <input type="radio" checked={checked} onChange={onChange} style={{ marginTop: "2px" }} />
      <span>
        <strong style={{ color: "var(--text)" }}>{label}</strong>
        <div style={{ color: "var(--text-muted)", fontSize: "11.5px", marginTop: "3px" }}>{sublabel}</div>
      </span>
    </label>
  );
}

function Pill({ kind, children }: { kind: "success" | "warn" | "danger"; children: React.ReactNode }) {
  const palette =
    kind === "success"
      ? { bg: "rgba(52,211,153,0.12)", fg: "var(--green)", border: "rgba(52,211,153,0.3)" }
      : kind === "warn"
        ? { bg: "rgba(251,191,36,0.12)", fg: "var(--amber)", border: "rgba(251,191,36,0.3)" }
        : { bg: "rgba(248,113,113,0.12)", fg: "var(--red)", border: "rgba(248,113,113,0.3)" };
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "999px",
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function BigNumber({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "32px",
        fontWeight: 800,
        color: "var(--accent)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        minWidth: "56px",
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...hintStyle, ...style }}>{children}</div>;
}

function PathLine({ children }: { children: React.ReactNode }) {
  return <div style={pathLineStyle}>{children}</div>;
}

// --- styles ---

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(8, 9, 12, 0.84)",
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  overflowY: "auto",
  padding: "32px",
};
const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, var(--bg-card), var(--bg-elevated))",
  border: "1px solid var(--border)",
  borderRadius: "20px",
  padding: 0,
  width: "min(680px, 92vw)",
  maxHeight: "calc(100vh - 64px)",
  overflowY: "auto",
  boxShadow: "0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  padding: "24px 28px 20px 28px",
  borderBottom: "1px solid var(--border)",
  position: "sticky",
  top: 0,
  background: "var(--bg-card)",
  zIndex: 1,
  borderRadius: "20px 20px 0 0",
};
const h1Style: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "var(--text)",
  margin: 0,
  letterSpacing: "-0.02em",
};
const subtitleStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
  margin: "2px 0 0 0",
};
const closeButtonStyle: React.CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  width: "32px",
  height: "32px",
  color: "var(--text-muted)",
  fontSize: "18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const sectionStyle: React.CSSProperties = {
  padding: "24px 28px",
  borderBottom: "1px solid var(--border)",
};
const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: "14px",
};
const h2Style: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "var(--text)",
  textTransform: "none",
  margin: 0,
};
const sectionHintStyle: React.CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-dim)",
  margin: "3px 0 0 0",
  lineHeight: 1.5,
};
const sectionBodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};
const cardInnerStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "14px 16px",
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text)",
};
const fieldHintStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-dim)",
  lineHeight: 1.5,
};
const hintStyle: React.CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-muted)",
  lineHeight: 1.55,
};
const pathLineStyle: React.CSSProperties = {
  marginTop: "6px",
  fontSize: "10.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-dim)",
  background: "var(--bg-elevated)",
  padding: "5px 8px",
  borderRadius: "5px",
  border: "1px solid var(--border)",
  overflow: "auto",
  whiteSpace: "nowrap",
};
const inputStyle: React.CSSProperties = {
  fontSize: "12.5px",
  padding: "9px 12px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--text)",
  width: "100%",
  cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  border: "none",
  transition: "transform 0.08s ease",
};
const secondaryBtnStyle: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 500,
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  background: "var(--bg)",
};
const dangerBtnStyle: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 500,
  color: "var(--red)",
  border: "1px solid rgba(248,113,113,0.3)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  background: "transparent",
};
const radioCardStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  padding: "12px 14px",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "13px",
  alignItems: "flex-start",
  background: "var(--bg)",
  transition: "border-color 0.12s ease, background 0.12s ease",
};
const radioCardActiveStyle: React.CSSProperties = {
  borderColor: "var(--accent)",
  background: "rgba(167,139,250,0.06)",
};
const prereqGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
};
const prereqCardStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};
const prereqInstallStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10.5px",
  color: "var(--text-dim)",
  background: "var(--bg-elevated)",
  padding: "5px 8px",
  borderRadius: "5px",
  border: "1px solid var(--border)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
