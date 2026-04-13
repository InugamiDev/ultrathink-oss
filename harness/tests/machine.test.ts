import { describe, expect, it } from "vitest";
import { allowed, next } from "../src/pipeline/machine.js";

describe("pipeline machine", () => {
  it("advances idle → clarify on start_project", () => {
    expect(next("idle", "start_project")).toBe("clarify");
  });

  it("advances clarify → plan on answer_clarify", () => {
    expect(next("clarify", "answer_clarify")).toBe("plan");
  });

  it("advances plan → build on approve_plan", () => {
    expect(next("plan", "approve_plan")).toBe("build");
  });

  it("advances build → validate on continue_pipeline", () => {
    expect(next("build", "continue_pipeline")).toBe("validate");
  });

  it("advances validate → ship on continue_pipeline", () => {
    expect(next("validate", "continue_pipeline")).toBe("ship");
  });

  it("advances ship → done on ship_now", () => {
    expect(next("ship", "ship_now")).toBe("done");
  });

  it("rejects invalid transitions", () => {
    expect(next("idle", "ship_now")).toBeNull();
    expect(next("build", "start_project")).toBeNull();
    expect(next("clarify", "approve_plan")).toBeNull();
  });

  it("allows fix loops from validate → build", () => {
    expect(next("validate", "fix_failure")).toBe("build");
  });

  it("allows plan revision clarify ← plan", () => {
    expect(next("plan", "reject_plan")).toBe("clarify");
  });

  it("allows recovery from failed via continue or fix", () => {
    expect(next("failed", "continue_pipeline")).toBe("clarify");
    expect(next("failed", "fix_failure")).toBe("build");
  });

  it("lists allowed intents for each phase", () => {
    expect(allowed("idle")).toContain("start_project");
    expect(allowed("ship")).toContain("ship_now");
    expect(allowed("build")).toContain("continue_pipeline");
  });

  describe("feedback loop self-transitions", () => {
    const phases = ["clarify", "plan", "build", "validate", "ship"] as const;
    const loopIntents = ["redo", "modify", "improve", "give_feedback"] as const;

    for (const phase of phases) {
      for (const intent of loopIntents) {
        it(`${phase}: ${intent} is a self-loop`, () => {
          expect(next(phase, intent)).toBe(phase);
        });
      }
    }

    it("idle does NOT accept feedback loop intents", () => {
      expect(next("idle", "redo")).toBeNull();
      expect(next("idle", "modify")).toBeNull();
      expect(next("idle", "improve")).toBeNull();
    });

    it("done does NOT accept feedback loop intents", () => {
      expect(next("done", "redo")).toBeNull();
    });
  });
});
