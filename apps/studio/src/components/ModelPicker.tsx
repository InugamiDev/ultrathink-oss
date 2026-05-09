// intent: provider-aware model picker — real <select> with optgroups + custom escape hatch
// status: done — covers claude/codex/anthropic-direct/openai-compat/ollama
// next: live-fetch ollama tags via the local API; live-fetch openrouter catalog
// confidence: high

import { useEffect, useState } from "react";

export type AdapterId = "claude" | "codex" | "anthropic-direct" | "openai-compat" | "ollama";

interface ModelOption {
  value: string;
  label: string;
  hint?: string;
}
interface ModelGroup {
  label: string;
  options: ModelOption[];
}

const CATALOG: Record<AdapterId, ModelGroup[]> = {
  claude: [
    {
      label: "Claude 4 (recommended)",
      options: [
        { value: "claude-opus-4-7", label: "Opus 4.7", hint: "strongest reasoning · $5/$25 per 1M" },
        { value: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "balanced default · $3/$15 per 1M" },
        { value: "claude-haiku-4-5", label: "Haiku 4.5", hint: "fastest, cheapest · $1/$5 per 1M" },
        { value: "claude-opus-4-6", label: "Opus 4.6", hint: "previous opus · $15/$75 per 1M" },
        { value: "claude-sonnet-4-5", label: "Sonnet 4.5", hint: "previous sonnet" },
        { value: "claude-haiku-4-4", label: "Haiku 4.4", hint: "previous haiku" },
      ],
    },
    {
      label: "Claude 3.x (legacy)",
      options: [
        { value: "claude-3-7-sonnet-20250219", label: "Sonnet 3.7" },
        { value: "claude-3-5-sonnet-20241022", label: "Sonnet 3.5" },
        { value: "claude-3-5-haiku-20241022", label: "Haiku 3.5" },
      ],
    },
    {
      label: "CLI aliases",
      options: [
        { value: "opus", label: "opus → 4.7" },
        { value: "sonnet", label: "sonnet → 4.6" },
        { value: "haiku", label: "haiku → 4.5" },
      ],
    },
  ],
  "anthropic-direct": [
    {
      label: "Claude 4 (recommended)",
      options: [
        { value: "claude-opus-4-7", label: "Opus 4.7", hint: "$5/$25 per 1M" },
        { value: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "$3/$15 per 1M" },
        { value: "claude-haiku-4-5", label: "Haiku 4.5", hint: "$1/$5 per 1M" },
        { value: "claude-opus-4-6", label: "Opus 4.6" },
        { value: "claude-sonnet-4-5", label: "Sonnet 4.5" },
        { value: "claude-haiku-4-4", label: "Haiku 4.4" },
      ],
    },
    {
      label: "Claude 3.x (legacy)",
      options: [
        { value: "claude-3-7-sonnet-20250219", label: "Sonnet 3.7" },
        { value: "claude-3-5-sonnet-20241022", label: "Sonnet 3.5" },
        { value: "claude-3-5-haiku-20241022", label: "Haiku 3.5" },
      ],
    },
  ],
  codex: [
    {
      label: "GPT-5 Codex",
      options: [
        { value: "gpt-5-codex", label: "gpt-5-codex", hint: "full coder · $1.25/$10 per 1M" },
        { value: "gpt-5-codex-mini", label: "gpt-5-codex-mini", hint: "cheaper / faster" },
        { value: "gpt-5-codex-high", label: "gpt-5-codex-high", hint: "extended reasoning" },
      ],
    },
    {
      label: "Reasoning",
      options: [
        { value: "o3", label: "o3", hint: "long reasoning" },
        { value: "o3-mini", label: "o3-mini" },
        { value: "o4-mini", label: "o4-mini" },
      ],
    },
  ],
  "openai-compat": [
    {
      label: "OpenAI direct",
      options: [
        { value: "gpt-5", label: "gpt-5", hint: "frontier · $10/$30 per 1M" },
        { value: "gpt-5-mini", label: "gpt-5-mini", hint: "$0.15/$0.6 per 1M" },
        { value: "gpt-5-nano", label: "gpt-5-nano", hint: "cheapest" },
        { value: "gpt-4o", label: "gpt-4o", hint: "multimodal" },
        { value: "gpt-4o-mini", label: "gpt-4o-mini" },
        { value: "gpt-4-turbo", label: "gpt-4-turbo" },
        { value: "o3", label: "o3", hint: "reasoning" },
        { value: "o3-mini", label: "o3-mini" },
        { value: "o4-mini", label: "o4-mini" },
      ],
    },
    {
      label: "OpenRouter (https://openrouter.ai/api/v1)",
      options: [
        { value: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7" },
        { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
        { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
        { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { value: "x-ai/grok-4", label: "Grok 4" },
        { value: "x-ai/grok-3", label: "Grok 3" },
        { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
        { value: "deepseek/deepseek-r1", label: "DeepSeek R1", hint: "reasoning" },
        { value: "qwen/qwen3-coder", label: "Qwen3 Coder" },
        { value: "qwen/qwen3-235b-a22b", label: "Qwen3 235B" },
        { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
        { value: "meta-llama/llama-4-scout", label: "Llama 4 Scout" },
        { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
        { value: "mistralai/mistral-large", label: "Mistral Large" },
      ],
    },
    {
      label: "Groq (https://api.groq.com/openai/v1)",
      options: [
        { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
        { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
        { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
        { value: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B" },
        { value: "moonshotai/kimi-k2-instruct", label: "Kimi K2" },
      ],
    },
  ],
  ollama: [
    {
      label: "Coding-focused",
      options: [
        { value: "qwen2.5-coder:32b", label: "qwen2.5-coder:32b", hint: "strong local coder" },
        { value: "qwen2.5-coder:14b", label: "qwen2.5-coder:14b" },
        { value: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b" },
        { value: "deepseek-coder-v2", label: "deepseek-coder-v2", hint: "16B MoE" },
        { value: "codellama:34b", label: "codellama:34b" },
        { value: "codellama:13b", label: "codellama:13b" },
        { value: "codegemma", label: "codegemma" },
      ],
    },
    {
      label: "Reasoning",
      options: [
        { value: "deepseek-r1:32b", label: "deepseek-r1:32b" },
        { value: "deepseek-r1:14b", label: "deepseek-r1:14b" },
        { value: "deepseek-r1:8b", label: "deepseek-r1:8b" },
      ],
    },
    {
      label: "General",
      options: [
        { value: "llama3.3:70b", label: "llama3.3:70b" },
        { value: "llama3.2", label: "llama3.2", hint: "default 8B" },
        { value: "llama3.2:3b", label: "llama3.2:3b", hint: "smallest" },
        { value: "llama3.1:70b", label: "llama3.1:70b" },
        { value: "llama3.1:8b", label: "llama3.1:8b" },
        { value: "qwen3:32b", label: "qwen3:32b" },
        { value: "qwen3:14b", label: "qwen3:14b" },
        { value: "mistral", label: "mistral" },
        { value: "mixtral", label: "mixtral", hint: "MoE" },
        { value: "phi4", label: "phi4", hint: "Microsoft 14B" },
        { value: "gemma3:27b", label: "gemma3:27b" },
        { value: "gemma3:9b", label: "gemma3:9b" },
      ],
    },
  ],
};

interface ModelPickerProps {
  adapter: AdapterId;
  value: string;
  onChange: (next: string) => void;
  /** Default placeholder shown when value is empty. */
  placeholder?: string;
}

const CUSTOM_SENTINEL = "__custom__";

export function ModelPicker({ adapter, value, onChange, placeholder }: ModelPickerProps) {
  const groups = CATALOG[adapter] ?? [];
  const flat = groups.flatMap((g) => g.options.map((o) => o.value));
  const [custom, setCustom] = useState(value && !flat.includes(value));
  // Keep `custom` in sync if the adapter changes and the saved value is no
  // longer in the new adapter's catalog (e.g. switching claude → ollama).
  useEffect(() => {
    if (value && !flat.includes(value)) setCustom(true);
    else setCustom(false);
  }, [adapter, value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (custom) {
    return (
      <div style={wrapStyle}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "model id (custom)"}
          style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            onChange("");
          }}
          style={linkBtnStyle}
        >
          ← back to list
        </button>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_SENTINEL) {
            setCustom(true);
            return;
          }
          onChange(next);
        }}
        style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
      >
        <option value="">— let the agent pick ({placeholder ?? "default"})</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.hint ? ` · ${o.hint}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_SENTINEL}>Custom model id…</option>
      </select>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  color: "var(--text)",
  fontSize: "12px",
  outline: "none",
};
const linkBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "11px",
  cursor: "pointer",
  padding: "0",
  textDecoration: "underline",
};
