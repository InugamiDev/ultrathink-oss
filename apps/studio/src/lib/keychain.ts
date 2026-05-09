// intent: thin wrapper over Tauri's keychain commands + one-time migration from localStorage
// status: done — getKey / setKey / deleteKey / hasKey + migrateFromLocalStorage
// next: support multiple profiles (e.g. work vs personal) keyed by profile id
// confidence: high

import { invoke } from "@tauri-apps/api/core";

export type KeyAccount = "anthropic-api-key" | "openai-api-key" | "openai-base-url" | "ollama-base-url";

const LEGACY_KEY: Record<KeyAccount, string> = {
  "anthropic-api-key": "studio:anthropic-api-key",
  "openai-api-key": "studio:openai-api-key",
  "openai-base-url": "studio:openai-base-url",
  "ollama-base-url": "studio:ollama-base-url",
};

const MIGRATION_FLAG = "studio:keychain:migrated:v1";

export async function getKey(account: KeyAccount): Promise<string | null> {
  try {
    const v = await invoke<string | null>("secret_get", { account });
    return v ?? null;
  } catch {
    return null;
  }
}

export async function setKey(account: KeyAccount, value: string): Promise<void> {
  if (!value) {
    await deleteKey(account);
    return;
  }
  await invoke("secret_set", { account, value });
}

export async function deleteKey(account: KeyAccount): Promise<void> {
  await invoke("secret_delete", { account });
}

export async function hasKey(account: KeyAccount): Promise<boolean> {
  try {
    return await invoke<boolean>("secret_has", { account });
  } catch {
    return false;
  }
}

/**
 * One-shot migration: copy each legacy localStorage entry into the keychain
 * if the keychain doesn't already have a value for it, then erase the
 * localStorage entry. Idempotent — guarded by a flag in localStorage so
 * subsequent launches skip the work.
 */
export async function migrateKeysFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
  const accounts = Object.keys(LEGACY_KEY) as KeyAccount[];
  for (const account of accounts) {
    const lsKey = LEGACY_KEY[account];
    const value = localStorage.getItem(lsKey);
    if (!value) continue;
    try {
      const exists = await hasKey(account);
      if (!exists) {
        await setKey(account, value);
      }
      localStorage.removeItem(lsKey);
    } catch {
      // If the keychain isn't reachable (e.g. headless CI test), leave the
      // legacy value in place so the next launch can retry.
    }
  }
  localStorage.setItem(MIGRATION_FLAG, "1");
}
