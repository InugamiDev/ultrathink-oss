// intent: spawn phase workers using the configured provider. The provider
//         abstraction replaces the old stub/claude duality with a pluggable system.
// status: done
// confidence: high

import { randomUUID } from "node:crypto";
import type { Phase } from "../pipeline/phases.js";
import { bus } from "./bus.js";
import { createProvider, type Provider } from "../providers/index.js";
import { loadConfig } from "../config.js";

export type SpawnOptions = {
  phase: Phase;
  skill?: string;
  prompt: string;
};

let activeProvider: Provider | null = null;

/** Get or create the active provider from user config */
export function getProvider(): Provider {
  if (!activeProvider) {
    const config = loadConfig();
    activeProvider = createProvider(config.provider);
  }
  return activeProvider;
}

/** Switch to a different provider at runtime */
export function setActiveProvider(provider: Provider): void {
  activeProvider = provider;
}

export async function runWorker(opts: SpawnOptions): Promise<{ id: string; success: boolean }> {
  const id = randomUUID().slice(0, 8);
  const provider = getProvider();
  bus.send({ type: "worker:start", id, phase: opts.phase, skill: opts.skill });

  return provider.spawn(
    id,
    {
      phase: opts.phase,
      prompt: opts.prompt,
      skill: opts.skill,
    },
    (ev) => bus.send(ev)
  );
}
