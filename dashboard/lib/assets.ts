// Asset Pipeline — Types & Helpers
// Backend: Puter.js (free, zero-setup image generation)
// https://github.com/nicholasgasior/puter — MIT License

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

// ── Types ──

export type Backend = "puter";
export type AssetStatus = "pending" | "generating" | "completed" | "failed";

export interface AssetEntry {
  id: string;
  prompt: string;
  negativePrompt?: string;
  style?: string;
  dimensions?: string;
  status: AssetStatus;
  outputPath?: string;
  outputUrl?: string;
  error?: string;
  retries: number;
  generatedAt?: string;
}

export interface AssetManifest {
  id: string;
  name: string;
  description?: string;
  backend: Backend;
  assets: AssetEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendConfig {
  puter: {
    model: string;
    testMode: boolean;
  };
}

export interface PipelineStatus {
  manifestId: string;
  backend: Backend;
  total: number;
  completed: number;
  failed: number;
  generating: number;
  pending: number;
}

// ── Storage ──

const MANIFESTS_DIR = "/tmp/ultrathink-assets/manifests";
const CONFIG_PATH = "/tmp/ultrathink-assets/config.json";
const OUTPUT_DIR = "/tmp/ultrathink-assets/output";

function ensureDirs() {
  mkdirSync(MANIFESTS_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ── Manifest CRUD ──

export function listManifests(): AssetManifest[] {
  ensureDirs();
  try {
    const files = readdirSync(MANIFESTS_DIR).filter((f) => f.endsWith(".json"));
    return files
      .map((f) => {
        try {
          return JSON.parse(readFileSync(join(MANIFESTS_DIR, f), "utf-8")) as AssetManifest;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as AssetManifest[];
  } catch {
    return [];
  }
}

export function getManifest(id: string): AssetManifest | null {
  ensureDirs();
  const path = join(MANIFESTS_DIR, `${id}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function saveManifest(manifest: AssetManifest): void {
  ensureDirs();
  manifest.updatedAt = new Date().toISOString();
  writeFileSync(join(MANIFESTS_DIR, `${manifest.id}.json`), JSON.stringify(manifest, null, 2));
}

export function deleteManifest(id: string): boolean {
  const path = join(MANIFESTS_DIR, `${id}.json`);
  try {
    if (existsSync(path)) {
      unlinkSync(path);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Backend Config ──

const defaultConfig: BackendConfig = {
  puter: {
    model: "gemini-3.1-flash-image-preview",
    testMode: false,
  },
};

export function getBackendConfig(): BackendConfig {
  ensureDirs();
  try {
    return { ...defaultConfig, ...JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) };
  } catch {
    return defaultConfig;
  }
}

export function saveBackendConfig(config: Partial<BackendConfig>): BackendConfig {
  ensureDirs();
  const current = getBackendConfig();
  const merged = {
    puter: { ...current.puter, ...config.puter },
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

// ── Pipeline Status ──

export function getManifestStatus(manifest: AssetManifest): PipelineStatus {
  const assets = manifest.assets;
  return {
    manifestId: manifest.id,
    backend: manifest.backend,
    total: assets.length,
    completed: assets.filter((a) => a.status === "completed").length,
    failed: assets.filter((a) => a.status === "failed").length,
    generating: assets.filter((a) => a.status === "generating").length,
    pending: assets.filter((a) => a.status === "pending").length,
  };
}

// ── Helpers ──

export function generateId(): string {
  return `ast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getOutputDir(): string {
  ensureDirs();
  return OUTPUT_DIR;
}
