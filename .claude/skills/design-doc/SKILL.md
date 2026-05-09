---
name: design-doc
description: Org-Bench Google-bipartite winning mechanism — the 4-section design-doc gate that every non-trivial change passes through. Use when the Director defines new work, when an Integrator reviews a lane (code/quality/devops), when the Director approves, or when a Worker is about to start coding and needs the spec. Tools live in the `design-doc` MCP server. Triggers on phrases like "design doc", "design review", "approve revision", "lane verdict", "what does this issue require", "is this approved yet".
---

# design-doc — the gate

UltraThink projects do not start coding until a **design-doc** for the issue passes a 3-lane review (code, quality, devops) and the Director seals it. This skill loads when you are about to create, review, approve, or consume a design-doc.

## The 4-section format (mandatory)

Every design-doc has exactly these four sections. They go into the `sections` arg of `doc_create`:

1. **what** — The positive scope. *"Add a `/api/billing/refund` endpoint that calls Stripe `refunds.create` and writes a `refund_events` row."*
2. **whatNot** — Out-of-scope guardrails. *"Does NOT touch the existing `charges` flow. Does NOT add UI. Does NOT modify webhook handler."*
3. **riskGuardrails** — Known risks + the levers that contain them. *"Risk: double-refund. Guardrail: idempotency key on (charge_id, requestId), 24h TTL. Rollback: feature flag `billing.refund.v1`, kill-switch via Statsig."*
4. **verificationSteps** — Concrete, runnable checks. *"1) `pnpm test billing/refund`. 2) `psql -c 'SELECT count(*) FROM refund_events WHERE created_at > now() - interval ''1 hour'''`. 3) curl with idempotency key twice → second returns 200 + same event id."*

If any section is vague ("it should work", "test thoroughly"), the lane reviewer must return `verdict='changes-requested'`.

## When to call each tool

| Role | Call | When |
|---|---|---|
| Director | `doc_create` | After scoping an issue. Pass `baseRevisionId` on subsequent edits to avoid lost-update races. |
| Integrator (code lane) | `doc_review` with `lane='code'` | Reads the doc, checks scope realism + verification feasibility. |
| Integrator (quality lane) | `doc_review` with `lane='quality'` | Checks edge cases, test plan, risk inventory. |
| Integrator (devops lane) | `doc_review` with `lane='devops'` | Checks rollback, monitoring, deploy story. |
| Director | `doc_approve` | After all 3 lanes return `verdict='approve'`. The MCP refuses if any lane is `changes-requested`/`block` or missing. |
| Worker | `doc_get` with `revision='approved'` | **Before** writing any code on the issue. Pulls the sealed sections so the worker codes against an immutable spec. |

The MCP enforces (b) of `doc_approve` server-side: it queries `design_doc_reviews` for the active (non-superseded) verdicts on the revision and rejects if any lane ≠ `approve`. It also enforces (a): `approverAgentId` must equal `PAPERCLIP_DIRECTOR_AGENT_ID` env on the server.

## Anti-patterns (auto-reject these)

- **Vague verification** — "test it works" is not a verificationStep. Demand commands, queries, or HTTP calls.
- **Theatrical reviews** — A lane reviewer who comments "looks good" without naming a specific risk that was checked is rubber-stamping. Reject the verdict and ask which specific failure modes were considered.
- **Approving with one lane red** — The Director should never call `doc_approve` if `aggregateLaneVerdicts` shows a non-green lane. The MCP will refuse, but don't even try.
- **Skipping `doc_get`** — A worker who starts coding without first calling `doc_get` with `revision='approved'` is operating off stale assumptions. Always re-pull the sealed revision.
- **Editing scope mid-implementation** — If reality forces a scope change, the Director must call `doc_create` again (Paperclip auto-bumps revision_number), then re-run the 3-lane review on the new revision. Do not silently widen scope.

## Soft-gate caveat (important)

This is a **soft gate**: the design-doc MCP records review/approval state, but it cannot stop a worker from coding without calling `doc_get`. Workers must voluntarily invoke `doc_get` before starting. Hard enforcement (Paperclip refusing checkout until an approval row exists) requires the Phase 4 Paperclip fork. Until then, treat this skill's discipline as load-bearing.

## Storage at a glance

- Doc body lives in **Paperclip** (`PUT /api/issues/:issueId/documents/design-doc`, JSON-encoded sections in body, `baseRevisionId` for versioning, auto-incrementing `revision_number`).
- Review/approval state lives in **UltraThink Neon** (`design_doc_reviews`, `design_doc_approvals`).
- Review rows denormalize `paperclip_issue_id` + `revision_number` so we can recover review history via the `(issue_id, revision_number)` tuple even if Paperclip's doc UUIDs reset on a fresh export/import.
