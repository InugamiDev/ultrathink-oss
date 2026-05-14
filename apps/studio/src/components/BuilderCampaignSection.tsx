// intent: surface Builder Campaign apply, validate, status, and revoke flows in Settings
// status: done
// next: wire against production Builder API when a hosted endpoint exists
// confidence: high

import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";

export const BUILDER_STATUS_QUERY_KEY = ["builder", "status"] as const;

export interface BuilderStatus {
  tier: "oss" | "builder";
  key?: string;
  valid?: boolean;
  expires_at?: string;
}

interface BuilderApplyPayload {
  user_handle: string;
  email?: string;
  proof_type: "project" | "skill" | "contribution";
  proof_url: string;
  proof_description?: string;
}

interface BuilderApplyResponse {
  id: string;
  status: "pending";
}

interface BuilderValidateResponse {
  valid: boolean;
  expires_at?: string;
  error?: string;
}

interface BuilderCampaignSectionProps {
  focus?: boolean;
}

const emptyApplyForm: BuilderApplyPayload = {
  user_handle: "",
  email: "",
  proof_type: "project",
  proof_url: "",
  proof_description: "",
};

export function fetchBuilderStatus(): Promise<BuilderStatus> {
  return invoke<BuilderStatus>("builder_status");
}

export function BuilderCampaignSection({ focus = false }: BuilderCampaignSectionProps) {
  const queryClient = useQueryClient();
  const sectionRef = useRef<HTMLElement | null>(null);
  const { data: status, isLoading, error } = useQuery({
    queryKey: BUILDER_STATUS_QUERY_KEY,
    queryFn: fetchBuilderStatus,
  });
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState<BuilderApplyPayload>(emptyApplyForm);
  const [application, setApplication] = useState<BuilderApplyResponse | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validateBusy, setValidateBusy] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);

  useEffect(() => {
    if (!focus) return;
    sectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    window.setTimeout(() => {
      const target = sectionRef.current?.querySelector<HTMLElement>("input, button");
      target?.focus({ preventScroll: true });
    }, 120);
  }, [focus]);

  const isBuilder = status?.tier === "builder" && Boolean(status.key);
  const active = isBuilder && status?.valid === true;
  const expired =
    isBuilder && status?.valid === false && status.expires_at ? Date.parse(status.expires_at) <= Date.now() : false;

  async function refreshStatus(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: BUILDER_STATUS_QUERY_KEY });
  }

  async function submitApply(e: FormEvent): Promise<void> {
    e.preventDefault();
    setApplyBusy(true);
    setApplyError(null);
    setApplication(null);
    try {
      const result = await invoke<BuilderApplyResponse>("builder_apply", {
        payload: normalizeApplyPayload(applyForm),
      });
      setApplication(result);
      await refreshStatus();
    } catch (err) {
      setApplyError(toMessage(err));
    } finally {
      setApplyBusy(false);
    }
  }

  async function validateKey(key: string): Promise<void> {
    const trimmed = key.trim();
    setValidateBusy(true);
    setValidateError(null);
    try {
      const result = await invoke<BuilderValidateResponse>("builder_validate", { key: trimmed });
      if (!result.valid) {
        setValidateError(result.error ?? "Invalid or expired key");
        await refreshStatus();
        return;
      }
      setKeyInput("");
      await refreshStatus();
    } catch (err) {
      setValidateError(toMessage(err));
    } finally {
      setValidateBusy(false);
    }
  }

  async function revokeKey(): Promise<void> {
    setRevokeBusy(true);
    setValidateError(null);
    try {
      await invoke("builder_revoke");
      setKeyInput("");
      await refreshStatus();
    } catch (err) {
      setValidateError(toMessage(err));
    } finally {
      setRevokeBusy(false);
    }
  }

  return (
    <section ref={sectionRef} style={sectionStyle} aria-label="Builder Campaign">
      <div style={headerStyle}>
        <h2 style={h2Style}>Builder Campaign — Vetted contributor program</h2>
        <p style={leadStyle}>Vetted users get access to gated skills/features. Apply with proof of work.</p>
      </div>

      {isLoading && <div style={mutedStyle}>Loading Builder status...</div>}
      {error && <InlineMessage kind="warn">{toMessage(error)}</InlineMessage>}
      {!isLoading && !active && !isBuilder && (
        <OssState
          applyOpen={applyOpen}
          setApplyOpen={setApplyOpen}
          applyForm={applyForm}
          setApplyForm={setApplyForm}
          application={application}
          applyError={applyError}
          applyBusy={applyBusy}
          submitApply={submitApply}
          keyInput={keyInput}
          setKeyInput={setKeyInput}
          validateBusy={validateBusy}
          validateError={validateError}
          validateKey={() => validateKey(keyInput)}
        />
      )}
      {!isLoading && active && status && (
        <ActiveState
          status={status}
          validateBusy={validateBusy}
          revokeBusy={revokeBusy}
          validateError={validateError}
          revalidate={() => validateKey(status.key ?? "")}
          revokeKey={revokeKey}
        />
      )}
      {!isLoading && isBuilder && !active && status && (
        <InactiveBuilderState
          status={status}
          expired={expired}
          keyInput={keyInput}
          setKeyInput={setKeyInput}
          validateBusy={validateBusy}
          validateError={validateError}
          revalidate={() => validateKey(status.key ?? "")}
          validateNewKey={() => validateKey(keyInput)}
        />
      )}
    </section>
  );
}

function OssState({
  applyOpen,
  setApplyOpen,
  applyForm,
  setApplyForm,
  application,
  applyError,
  applyBusy,
  submitApply,
  keyInput,
  setKeyInput,
  validateBusy,
  validateError,
  validateKey,
}: {
  applyOpen: boolean;
  setApplyOpen: (v: boolean) => void;
  applyForm: BuilderApplyPayload;
  setApplyForm: (v: BuilderApplyPayload) => void;
  application: BuilderApplyResponse | null;
  applyError: string | null;
  applyBusy: boolean;
  submitApply: (e: FormEvent) => void;
  keyInput: string;
  setKeyInput: (v: string) => void;
  validateBusy: boolean;
  validateError: string | null;
  validateKey: () => void;
}) {
  return (
    <div style={twoColumnStyle}>
      <div style={cardStyle}>
        <div style={cardTitleStyle}>Apply</div>
        {application ? (
          <InlineMessage kind="success">Pending review: {application.id}</InlineMessage>
        ) : (
          <>
            {!applyOpen && (
              <button style={secondaryButtonStyle} onClick={() => setApplyOpen(true)}>
                Open application
              </button>
            )}
            {applyOpen && (
              <form onSubmit={submitApply} style={formStyle}>
                <LabeledInput
                  label="User handle"
                  value={applyForm.user_handle}
                  onChange={(user_handle) => setApplyForm({ ...applyForm, user_handle })}
                  required
                />
                <LabeledInput
                  label="Email"
                  value={applyForm.email ?? ""}
                  onChange={(email) => setApplyForm({ ...applyForm, email })}
                  type="email"
                />
                <label style={labelStyle}>
                  Proof type
                  <select
                    value={applyForm.proof_type}
                    onChange={(e) => setApplyForm({ ...applyForm, proof_type: e.target.value as BuilderApplyPayload["proof_type"] })}
                    style={inputStyle}
                  >
                    <option value="project">project</option>
                    <option value="skill">skill</option>
                    <option value="contribution">contribution</option>
                  </select>
                </label>
                <LabeledInput
                  label="Proof URL"
                  value={applyForm.proof_url}
                  onChange={(proof_url) => setApplyForm({ ...applyForm, proof_url })}
                  type="url"
                  required
                />
                <label style={labelStyle}>
                  Proof description
                  <textarea
                    value={applyForm.proof_description ?? ""}
                    onChange={(e) => setApplyForm({ ...applyForm, proof_description: e.target.value })}
                    style={{ ...inputStyle, minHeight: "82px", resize: "vertical" }}
                  />
                </label>
                <button style={primaryButtonStyle} disabled={applyBusy}>
                  {applyBusy ? "Submitting..." : "Submit application"}
                </button>
                {applyError && <InlineMessage kind="warn">{applyError}</InlineMessage>}
              </form>
            )}
          </>
        )}
      </div>

      <div style={cardStyle}>
        <div style={cardTitleStyle}>Already have a key?</div>
        <div style={rowStyle}>
          <input
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Builder key"
            style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
            spellCheck={false}
            autoComplete="off"
          />
          <button style={secondaryButtonStyle} disabled={validateBusy || !keyInput.trim()} onClick={validateKey}>
            {validateBusy ? "Checking..." : "Validate"}
          </button>
        </div>
        {validateError && <InlineMessage kind="warn">{validateError}</InlineMessage>}
      </div>
    </div>
  );
}

function ActiveState({
  status,
  validateBusy,
  revokeBusy,
  validateError,
  revalidate,
  revokeKey,
}: {
  status: BuilderStatus;
  validateBusy: boolean;
  revokeBusy: boolean;
  validateError: string | null;
  revalidate: () => void;
  revokeKey: () => void;
}) {
  return (
    <div style={cardStyle}>
      <div style={statusRowStyle}>
        <Badge kind="success">BUILDER ACTIVE</Badge>
        <span style={keyStyle}>{maskKey(status.key)}</span>
      </div>
      <div style={mutedStyle}>Expires at: {relativeTime(status.expires_at)}</div>
      <div style={buttonRowStyle}>
        <button style={secondaryButtonStyle} disabled={validateBusy} onClick={revalidate}>
          {validateBusy ? "Checking..." : "Re-validate now"}
        </button>
        <button style={dangerButtonStyle} disabled={revokeBusy} onClick={revokeKey}>
          {revokeBusy ? "Removing..." : "Revoke / remove key"}
        </button>
      </div>
      {validateError && <InlineMessage kind="warn">{validateError}</InlineMessage>}
    </div>
  );
}

function InactiveBuilderState({
  status,
  expired,
  keyInput,
  setKeyInput,
  validateBusy,
  validateError,
  revalidate,
  validateNewKey,
}: {
  status: BuilderStatus;
  expired: boolean;
  keyInput: string;
  setKeyInput: (v: string) => void;
  validateBusy: boolean;
  validateError: string | null;
  revalidate: () => void;
  validateNewKey: () => void;
}) {
  return (
    <div style={cardStyle}>
      <div style={statusRowStyle}>
        <Badge kind="warn">{expired ? "BUILDER KEY EXPIRED" : "BUILDER KEY INVALID"}</Badge>
        <span style={keyStyle}>{maskKey(status.key)}</span>
      </div>
      {status.expires_at && <div style={mutedStyle}>Expired: {relativeTime(status.expires_at)}</div>}
      <div style={buttonRowStyle}>
        <button style={secondaryButtonStyle} disabled={validateBusy} onClick={revalidate}>
          {validateBusy ? "Checking..." : "Re-validate"}
        </button>
      </div>
      <div style={rowStyle}>
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="Paste new key"
          style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
          spellCheck={false}
          autoComplete="off"
        />
        <button style={secondaryButtonStyle} disabled={validateBusy || !keyInput.trim()} onClick={validateNewKey}>
          Validate
        </button>
      </div>
      {validateError && <InlineMessage kind="warn">{validateError}</InlineMessage>}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        style={inputStyle}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  );
}

function Badge({ kind, children }: { kind: "success" | "warn"; children: React.ReactNode }) {
  const palette =
    kind === "success"
      ? { bg: "rgba(52,211,153,0.13)", fg: "var(--green)", border: "rgba(52,211,153,0.35)" }
      : { bg: "rgba(251,191,36,0.13)", fg: "var(--amber)", border: "rgba(251,191,36,0.35)" };
  return (
    <span style={{ ...badgeStyle, background: palette.bg, color: palette.fg, borderColor: palette.border }}>
      {children}
    </span>
  );
}

function InlineMessage({ kind, children }: { kind: "success" | "warn"; children: React.ReactNode }) {
  return (
    <div style={{ ...messageStyle, color: kind === "success" ? "var(--green)" : "var(--amber)" }}>{children}</div>
  );
}

function normalizeApplyPayload(form: BuilderApplyPayload): BuilderApplyPayload {
  return {
    user_handle: form.user_handle.trim(),
    email: form.email?.trim() || undefined,
    proof_type: form.proof_type,
    proof_url: form.proof_url.trim(),
    proof_description: form.proof_description?.trim() || undefined,
  };
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Builder action failed";
}

function maskKey(key?: string): string {
  if (!key) return "no key";
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function relativeTime(value?: string): string {
  if (!value) return "unknown";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  const deltaMs = time - Date.now();
  const abs = Math.abs(deltaMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const [unit, size] = units.find(([, unitMs]) => abs >= unitMs) ?? ["second", 1_000];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(deltaMs / size), unit);
}

const sectionStyle: CSSProperties = {
  padding: "24px 28px",
  borderBottom: "1px solid var(--border)",
};
const headerStyle: CSSProperties = {
  marginBottom: "14px",
};
const h2Style: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "var(--text)",
  margin: 0,
};
const leadStyle: CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-dim)",
  margin: "3px 0 0 0",
  lineHeight: 1.5,
};
const twoColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "12px",
};
const cardStyle: CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};
const cardTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--text)",
};
const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};
const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text)",
};
const inputStyle: CSSProperties = {
  fontSize: "12.5px",
  padding: "9px 12px",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--text)",
  width: "100%",
};
const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "8px",
  alignItems: "center",
};
const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};
const primaryButtonStyle: CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 600,
  color: "var(--bg)",
  background: "var(--accent)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  border: "none",
};
const secondaryButtonStyle: CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 500,
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  background: "var(--bg-elevated)",
};
const dangerButtonStyle: CSSProperties = {
  fontSize: "12.5px",
  fontWeight: 500,
  color: "var(--red)",
  border: "1px solid rgba(248,113,113,0.3)",
  borderRadius: "8px",
  padding: "9px 16px",
  cursor: "pointer",
  background: "transparent",
};
const statusRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};
const badgeStyle: CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  padding: "4px 9px",
  borderRadius: "999px",
  border: "1px solid",
};
const keyStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  fontSize: "11.5px",
};
const mutedStyle: CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-muted)",
  lineHeight: 1.5,
};
const messageStyle: CSSProperties = {
  fontSize: "11.5px",
  lineHeight: 1.45,
  fontFamily: "var(--font-mono)",
};
