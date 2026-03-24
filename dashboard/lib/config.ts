import { readFileSync } from "fs";
import { join } from "path";

export interface UltraThinkConfig {
  project: string;
  version: string;
  codingLevel: string;
  dashboard: { port: number };
  memory: {
    provider: string;
    autoRecall: boolean;
    writePolicy: string;
    compactionThreshold: number;
  };
  privacyHook: {
    enabled: boolean;
    sensitivityLevel: string;
    logEvents: boolean;
  };
  kanban: { defaultBoard: string };
  uiTest: { viewports: string[]; reportDir: string };
}

let cachedConfig: UltraThinkConfig | null = null;

export function getConfig(): UltraThinkConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = join(process.cwd(), "../.claude/ck.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    cachedConfig = JSON.parse(raw) as UltraThinkConfig;
    return cachedConfig;
  } catch {
    // Return defaults if config not found
    return {
      project: "ultrathink",
      version: "1.0.0",
      codingLevel: "practical-builder",
      dashboard: { port: 3333 },
      memory: {
        provider: "neon",
        autoRecall: true,
        writePolicy: "selective",
        compactionThreshold: 100,
      },
      privacyHook: {
        enabled: true,
        sensitivityLevel: "standard",
        logEvents: true,
      },
      kanban: { defaultBoard: "main" },
      uiTest: { viewports: ["375x667", "768x1024", "1440x900"], reportDir: "./reports/ui-tests" },
    };
  }
}
