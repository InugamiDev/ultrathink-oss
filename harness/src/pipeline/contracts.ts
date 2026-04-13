// intent: typed contracts for each phase's output — workers MUST return these.
// status: done
// next: wire real workers to parse agent output into these shapes.
// confidence: high

import { z } from "zod";

export const ClarifyOutput = z.object({
  target_user: z.string(),
  problem: z.string(),
  value_prop: z.string(),
  stack: z.string(),
  scope_notes: z.string().optional(),
});
export type ClarifyOutput = z.infer<typeof ClarifyOutput>;

export const PlanOutput = z.object({
  phases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      must_haves: z.array(z.string()),
      plan_file: z.string().optional(),
    })
  ),
  total_tasks: z.number(),
});
export type PlanOutput = z.infer<typeof PlanOutput>;

export const BuildOutput = z.object({
  artifacts: z.array(z.string()),
  waves_completed: z.number(),
});
export type BuildOutput = z.infer<typeof BuildOutput>;

export const ValidateOutput = z.object({
  pass: z.boolean(),
  must_have_results: z.array(
    z.object({
      id: z.string(),
      pass: z.boolean(),
      note: z.string().optional(),
    })
  ),
});
export type ValidateOutput = z.infer<typeof ValidateOutput>;

export const ShipOutput = z.object({
  committed: z.boolean(),
  released: z.boolean(),
  notes: z.string().optional(),
});
export type ShipOutput = z.infer<typeof ShipOutput>;
