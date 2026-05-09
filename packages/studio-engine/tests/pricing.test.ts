// intent: regression — every model in MODEL_PRICING also has an entry in lib.rs's pricing_for()
// status: done — parses the Rust source as text + asserts the keys match
// next: build-time codegen so the Rust file is generated FROM pricing.ts (zero drift)

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MODEL_PRICING, computeCost } from "../src/pricing.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUST_LIB = resolve(__dirname, "..", "..", "..", "apps", "studio", "src-tauri", "src", "lib.rs");

describe("pricing — single source of truth", () => {
  it("MODEL_PRICING has well-formed entries", () => {
    for (const [model, p] of Object.entries(MODEL_PRICING)) {
      expect(model.length).toBeGreaterThan(0);
      expect(p.input).toBeGreaterThanOrEqual(0);
      expect(p.output).toBeGreaterThanOrEqual(0);
      expect(p.cachedInput).toBeGreaterThanOrEqual(0);
      // Cached should be cheaper than uncached input (otherwise the cache makes no sense)
      expect(p.cachedInput).toBeLessThanOrEqual(p.input);
      // Output is almost always more expensive than input
      if (p.input > 0) expect(p.output).toBeGreaterThanOrEqual(p.input);
    }
  });

  it("computeCost is monotonic in tokens", () => {
    const small = computeCost("claude-haiku-4-5", 100, 50, 0);
    const large = computeCost("claude-haiku-4-5", 10000, 5000, 0);
    expect(large).toBeGreaterThan(small);
  });

  it("computeCost respects cache discount", () => {
    const uncached = computeCost("claude-opus-4-7", 1000, 100, 0);
    const cached = computeCost("claude-opus-4-7", 1000, 100, 1000);
    expect(cached).toBeLessThan(uncached);
  });

  it("computeCost returns 0 for unknown model (no crash)", () => {
    expect(computeCost("future-model-2030", 1000, 1000, 0)).toBe(0);
  });

  it("every TS model id appears in the Rust lib.rs pricing table", () => {
    const rustSource = readFileSync(RUST_LIB, "utf8");
    const missing: string[] = [];
    for (const model of Object.keys(MODEL_PRICING)) {
      // Rust uses `"<model>" =>` in match arms.
      const pattern = `"${model}" =>`;
      if (!rustSource.includes(pattern)) missing.push(model);
    }
    if (missing.length > 0) {
      throw new Error(
        `These models are in MODEL_PRICING (TS) but not in pricing_for() (Rust): ${missing.join(", ")}.\n` +
          `Drift means CAR cost computation diverges from the sidecar's. Update apps/studio/src-tauri/src/lib.rs to match.`
      );
    }
    expect(missing).toEqual([]);
  });
});
