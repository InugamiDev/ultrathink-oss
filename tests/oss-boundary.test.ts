import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");

// intent: preserve a guard around the retired OSS exporter without asserting an obsolete split.
// status: done
// next: delete this test when scripts/build-oss.sh is archived or removed.
// blockers: none
// confidence: high
describe("retired OSS export boundary", () => {
  it("keeps the legacy exporter clearly deprecated", () => {
    const script = readFileSync(resolve(ROOT, "scripts/build-oss.sh"), "utf-8");

    expect(script).toContain("# status: deprecated");
    expect(script).not.toContain("private distribution");
    expect(script).not.toContain("InugamiDev/ultrathink-oss");
    expect(script).not.toContain("gh repo create InuVerse/ultrathink-oss");
  });
});
