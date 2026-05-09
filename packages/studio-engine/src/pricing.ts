// intent: single source of truth for model pricing — both providers + Rust read this
// status: done — anthropic-direct + openai-compat now import from here
// next: hot-reload from a remote JSON for new model launches without redeploy
//
// All prices are USD per 1,000,000 tokens.
// Cached input is the price for tokens served from a cached prefix (~10% of
// input price for Anthropic prompt-cache reads, similar for OpenAI gpt-5).
// Output is what the model emits.
//
// IMPORTANT: when this table changes, also update apps/studio/src-tauri/src/lib.rs
// `pricing_for()`. Drift will mean Rust + TS report different costs.
// The vitest test `tests/pricing.test.ts` enforces the table is non-empty
// and well-formed.

export interface ModelPricing {
  /** $/1M input tokens (uncached portion) */
  input: number;
  /** $/1M output tokens */
  output: number;
  /** $/1M cached-input tokens (0 if not supported / unknown) */
  cachedInput: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude 4 family — Apr 2026
  "claude-opus-4-7": { input: 5.0, output: 25.0, cachedInput: 0.5 },
  "claude-opus-4-6": { input: 15.0, output: 75.0, cachedInput: 1.5 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cachedInput: 0.1 },
  "claude-haiku-4-4": { input: 1.0, output: 5.0, cachedInput: 0.1 },
  // Anthropic Claude 3 legacy
  "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0, cachedInput: 0.08 },

  // OpenAI gpt-5 family — Apr 2026
  "gpt-5": { input: 10.0, output: 30.0, cachedInput: 1.0 },
  "gpt-5-mini": { input: 0.15, output: 0.6, cachedInput: 0.015 },
  "gpt-5-nano": { input: 0.05, output: 0.2, cachedInput: 0.005 },
  "gpt-5-codex": { input: 1.25, output: 10.0, cachedInput: 0.13 },
  "gpt-5-codex-mini": { input: 0.625, output: 5.0, cachedInput: 0.06 },
  "gpt-5-codex-high": { input: 2.5, output: 20.0, cachedInput: 0.25 },

  // OpenAI gpt-4 + o-series legacy
  "gpt-4o": { input: 2.5, output: 10.0, cachedInput: 0.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cachedInput: 0.015 },
  "gpt-4-turbo": { input: 10.0, output: 30.0, cachedInput: 0 },
  o3: { input: 2.0, output: 8.0, cachedInput: 0.5 },
  "o3-mini": { input: 1.1, output: 4.4, cachedInput: 0.55 },
  "o4-mini": { input: 1.1, output: 4.4, cachedInput: 0.275 },
};

/**
 * Compute total USD cost for a turn.
 * input includes the cached portion; we bill cached-vs-uncached separately.
 */
export function computeCost(model: string, input: number, output: number, cached: number): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  const billedInput = Math.max(0, input - cached);
  return (billedInput / 1_000_000) * p.input + (output / 1_000_000) * p.output + (cached / 1_000_000) * p.cachedInput;
}

/** Aliases the CLI accepts that map to canonical model ids. */
export function resolveAlias(model?: string): string {
  if (!model) return "claude-sonnet-4-6";
  switch (model.toLowerCase()) {
    case "opus":
      return "claude-opus-4-7";
    case "sonnet":
      return "claude-sonnet-4-6";
    case "haiku":
      return "claude-haiku-4-5";
    default:
      return model;
  }
}
