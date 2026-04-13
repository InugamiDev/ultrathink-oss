// intent: provider registry — create the right provider from config.
// status: done
// confidence: high

import type { Provider, ProviderConfig, ProviderKind } from "./types.js";
import { PROVIDER_LABELS } from "./types.js";
import { createClaudeProvider } from "./claude.js";
import { createCodexProvider } from "./codex.js";
import { createLocalProvider } from "./local.js";
import { createCloudProvider } from "./cloud.js";
import { createStubProvider } from "./stub.js";

export { type Provider, type ProviderConfig, type ProviderKind, PROVIDER_LABELS } from "./types.js";

const FACTORIES: Record<ProviderKind, (config: ProviderConfig) => Provider> = {
  claude: createClaudeProvider,
  codex: createCodexProvider,
  local: createLocalProvider,
  cloud: createCloudProvider,
  stub: createStubProvider,
};

export function createProvider(config: ProviderConfig): Provider {
  const factory = FACTORIES[config.kind];
  if (!factory) throw new Error(`Unknown provider: ${config.kind}`);
  return factory(config);
}

export function createProviderFromKind(kind: ProviderKind): Provider {
  return createProvider({ kind, label: PROVIDER_LABELS[kind] });
}

/** Check which providers are available on this machine */
export async function detectProviders(): Promise<{ kind: ProviderKind; available: boolean }[]> {
  const kinds: ProviderKind[] = ["claude", "codex", "local", "cloud", "stub"];
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const provider = createProvider({ kind, label: PROVIDER_LABELS[kind] });
      const available = await provider.available();
      return { kind, available };
    })
  );
  return results;
}
