# /forge — Product Builder Pipeline

> Single meta-command that orchestrates the full product-building lifecycle.
> `idea → clarify → feasibility → plan → build → validate → improve → ship`

## Trigger

- Keywords: "forge", "build product", "build app", "create app", "ship", "from idea to product"
- When user has a product idea and wants structured execution

## Mode

Forge runs in **guided mode**: step-by-step, plain language, explains each phase before executing.

## State

Forge state persists at `~/.ultrathink/forge/projects/<hash>.json` where hash = first 8 chars of SHA256 of the project working directory path.

**Read state at session start.** If forge-state exists for current project, resume from last stage.

**State format (JSON — never Markdown):**
```json
{
  "project": "descriptive-slug",
  "project_path": "/absolute/path",
  "stage": "clarify|feasibility|plan|build|validate|improve|ship|complete",
  "created": "ISO-8601",
  "updated": "ISO-8601",
  "spec": {
    "target_user": "",
    "problem": "",
    "value_prop": "",
    "stack": "",
    "feasibility_score": null,
    "complexity_score": null
  },
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "features": [
        { "id": "1.1", "name": "Feature name", "passes": false }
      ]
    }
  ],
  "current_phase": 1,
  "current_feature": "1.1",
  "evaluation": {
    "functionality": null,
    "design": null,
    "craft": null,
    "originality": null,
    "overall": null
  },
  "history": []
}
```

## Phase 1: CLARIFY

Ask the user 3-5 targeted questions to understand the product:
1. **Who** is the target user?
2. **What** specific problem does this solve?
3. **Why** is this better than existing solutions?
4. **What** is the MVP scope? (what's the ONE thing it must do?)
5. **What** stack preference? (or let forge decide)

Explain why each question matters. Use plain language.

Output: Update `spec` in forge-state.json.

## Phase 2: FEASIBILITY

Score the idea:
- **Tech complexity** (1-5): How hard to build?
- **Novelty** (1-5): Does this exist already? What's new?
- **Time estimate**: Realistic timeline with the chosen stack
- **Risk factors**: What could go wrong?

Output: Update `spec.feasibility_score` and `spec.complexity_score`.

## Phase 3: PLAN

Generate a phased roadmap:
- 3-5 phases, each with 5-10 atomic features
- Each feature has a clear pass/fail test
- Order by dependency (build foundations first)
- Assign features to sprints

Use existing skills: invoke `/plan` for task decomposition, `/scout` for tech research.

Show one phase at a time. Explain what each feature does in plain language. Ask "Ready to proceed?" before continuing.

Output: Update `phases` array in forge-state.json. Each feature starts with `"passes": false`.

## Phase 4: BUILD

For each feature in the current phase:
1. Read the feature spec from forge-state
2. Build it (write code, create files, install deps)
3. Run the project's test command
4. If tests pass → set `feature.passes = true`, commit, move to next
5. If tests fail → fix and retry (max 3 attempts per feature)

Chain existing skills as needed: `/react`, `/nextjs`, `/tailwindcss`, `/drizzle`, `/api-designer`, etc.

**One feature at a time.** Never build multiple features simultaneously.
**Commit after each feature.** Message: `feat(forge): <phase>.<feature> — <description>`

Before building each feature, explain what you're about to do and why.

Output: Update `phases[n].features[m].passes` after each feature.

## Phase 5: VALIDATE

Run the evaluator against the current phase:
1. `npm run build` — must succeed
2. `npm run test` — must pass
3. Structural checks: files exist, routes respond, no console errors

Scoring (0-1 each):
- **Functionality**: Does it work as specified?
- **Design**: Is the UI/UX acceptable?
- **Craft**: Code quality, no console.log, proper error handling
- **Originality**: Does it deliver the unique value prop?

Output: Update `evaluation` in forge-state.json.

## Phase 6: IMPROVE

Fix validation failures:
1. Read evaluation scores and failure details
2. Prioritize by impact (functionality > design > craft > originality)
3. Fix issues one at a time
4. Re-validate after fixes

Loop: IMPROVE → VALIDATE until passing or max 3 improvement cycles.

## Phase 7: SHIP

Prepare for deployment:
1. Generate/update README.md with setup instructions
2. Create PR if on a feature branch
3. List deployment steps for the chosen stack
4. Generate launch checklist

Walk through each step. Explain what deployment means. Help with any unfamiliar steps.

Output: Set `stage: "complete"` in forge-state.json.

## Resuming

When starting a new session in a project that has forge-state:
1. Read `~/.ultrathink/forge/projects/<hash>.json`
2. Display current stage and progress
3. Ask: "Continue from [stage]?" or "Start fresh?"

## Forge Utility Functions

To compute project hash:
```bash
echo -n "$PWD" | shasum -a 256 | cut -c1-8
```

To read forge state:
```bash
HASH=$(echo -n "$PWD" | shasum -a 256 | cut -c1-8)
STATE="$HOME/.ultrathink/forge/projects/${HASH}.json"
```
