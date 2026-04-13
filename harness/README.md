# @ultrathink/harness

> Intention-driven TUI that drives UltraThink skills through a fixed
> `clarify → plan → build → validate → ship` pipeline. You don't type
> commands — you choose intentions, and AI workers execute them.

## Why

The harness is the **control layer** between user intent and the skill mesh.
It enforces a state machine, dispatches workers, and renders live progress.
No free-form prompts, no raw commands — only intentions the FSM accepts from
the current phase.

## Layers

```
┌───────────────────────────────────────────────┐
│  TUI (Ink)                                    │
│  ├─ screens (home, intent-picker, pipeline)   │
│  └─ ui      (phase-bar, worker-panel)         │
├───────────────────────────────────────────────┤
│  Actions                                      │
│  start_project, build_feature,                │
│  fix_failure, continue_pipeline, ship_now     │
├───────────────────────────────────────────────┤
│  Pipeline FSM                                 │
│  intent × phase → next phase (or rejected)    │
├───────────────────────────────────────────────┤
│  Skill Mesh bridge                            │
│  reads .claude/skills/_registry.json,         │
│  shortlists skills per phase/intent           │
├───────────────────────────────────────────────┤
│  Worker Bus                                   │
│  stub | claude CLI child process              │
│  emits worker:start|action|done|error events  │
└───────────────────────────────────────────────┘
```

## Run

```bash
# dev
cd harness && npm run dev

# or from the monorepo root
npm run harness
npm run harness:expert

# with real Claude workers instead of stubs
ULTRATHINK_HARNESS_MODE=claude npm run harness
```

## Phases and allowed intentions

| Phase    | Allowed intentions                                                    |
|----------|-----------------------------------------------------------------------|
| idle     | start_project                                                         |
| clarify  | answer_clarify, redo, modify, improve, give_feedback, abort           |
| plan     | approve_plan, reject_plan, redo, modify, improve, give_feedback, abort|
| build    | continue_pipeline, build_feature, fix_failure, redo, modify, improve, give_feedback |
| validate | continue_pipeline, fix_failure, redo, modify, improve, give_feedback  |
| ship     | ship_now, redo, modify, improve, give_feedback, abort                 |
| done     | start_project                                                         |
| failed   | continue_pipeline, fix_failure, abort                                 |

Every intention not in the table is rejected with a warning entry in the log.

### Feedback loop

Every live phase (clarify, plan, build, validate, ship) supports a self-loop
so the user can iterate on the worker output without leaving the phase:

- **`redo`** (`d`) — rerun the current phase from scratch with the original intent
- **`modify`** (`m`) — rerun with additional feedback that revises the output
- **`improve`** (`i`) — polish/refine the existing output without starting over
- **`give_feedback`** (`t`) — tell the worker something without forcing a full rerun

`modify` and `give_feedback` open an inline text input. `improve` accepts
optional emphasis text. `redo` runs immediately with no input. Each loop
re-runs skill selection against the phase so the shortlist refreshes.

## Skills integration

The harness reads `.claude/skills/_registry.json` directly — 232 skills from
the private UltraThink core, or 388 from ultrathink-oss. At run start, it
scores every skill against the user's intent (keyword overlap on name,
description, triggers — plus layer boosting for orchestrators and hubs).

Phase anchors guarantee the right skill is always present:

| Phase    | Anchor skills     |
|----------|-------------------|
| clarify  | forge             |
| plan     | gsd               |
| build    | gsd               |
| validate | gsd               |
| ship     | ship, gsd         |

Even if the user's intent doesn't naturally score `gsd`, it's injected with
a phase-boost weight so the correct orchestrator always leads the shortlist.

The shortlist renders in-screen with layer color-coding. The first skill in
the list becomes the worker's skill anchor — the spawner injects
`~/.claude/skills/<skill>/SKILL.md` into the worker's prompt.

## Worker modes

- **stub** (default): emits synthetic worker events — useful for iterating on
  the UI without spawning real agents.
- **claude**: spawns `claude -p --output-format stream-json` as a child process
  per phase. Parses tool use and text events into worker actions.

Flip with `ULTRATHINK_HARNESS_MODE=claude`.

## Data

Runs persist to `~/.ultrathink/harness/runs/<id>.json`. The id is a
12-char sha256 prefix of `<projectPath>:<createdAt>`.

## Integration points

- **Skill registry**: `harness/src/skills/registry.ts` loads
  `.claude/skills/_registry.json` directly. No duplication.
- **gsd skill**: the plan, build, and validate phases are intended to run
  through `gsd` modes. The spawner injects `~/.claude/skills/<skill>/SKILL.md`
  into the worker prompt.
- **forge skill**: the pipeline mirrors forge's phases. Long-term goal is
  bidirectional resume — a run started in the TUI can be picked up by the
  forge skill and vice-versa.
- **memory**: run summaries should be written to `experience/sessions` on
  completion (TODO).

## What's NOT built yet

- Clarify Q&A modal (currently the clarify worker runs as a stub; user answers
  via the `1` hotkey which fires `answer_clarify`)
- Plan approval view with diff of SPEC.md and PLAN.md
- Live tail from Claude worker stdout into a dedicated inspector pane
- Run resume from `listRuns()` — the loader exists but no UI for it
- Memory write on run completion (write `experience/sessions` entry on `ship → done`)
- Bidirectional bridge to the forge skill's state file at
  `~/.ultrathink/forge/projects/<hash>.json`
