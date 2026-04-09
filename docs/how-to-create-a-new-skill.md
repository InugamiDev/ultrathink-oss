# How to Create a New Skill

## Overview

This guide walks through creating a new skill for UltraThink, from folder structure to YAML frontmatter to testing and registration.

**A skill is NOT just a markdown file.** It's a folder — containing `SKILL.md`, plus optional `references/`, `scripts/`, `assets/`, `templates/`, and `config.json`. The agent can explore and use everything in the folder. Think of it as a complete knowledge package.

### Progressive Disclosure (Token Economy)

Skills load in 3 layers to minimize context usage:

| Layer | When Loaded | Token Cost |
|-------|-------------|------------|
| **L1 — Metadata** | At startup (always) | ~100 tokens per skill (name + description only) |
| **L2 — SKILL.md body** | When skill is triggered | Keep under 500 lines |
| **L3 — Reference files** | When agent decides to read them | Zero until accessed |

This is why skill-based context is more efficient than dumping everything into `CLAUDE.md`. Context window is a shared resource — every token competes with conversation history and reasoning space.

## Step 1: Decide the Layer

Before writing anything, determine which layer your skill belongs to:

| Layer | When to Use | Examples |
|-------|-------------|---------|
| **Orchestrator** (Layer 1) | End-to-end workflow that composes multiple hubs | cook, ship, team |
| **Workflow Hub** (Layer 2) | Multi-step process for a specific domain | plan, debug, test |
| **Utility Provider** (Layer 3) | Reusable, stateless capability | research, mermaid, regex-builder |
| **Domain Specialist** (Layer 4) | Deep expertise in a specific technology | react, postgresql, docker |

The layer determines:
- What skills you can link to (prefer calling same-layer or lower-layer skills)
- What skills can call you (higher-layer skills delegate to lower-layer ones)
- How much state and orchestration logic to include

## Step 1b: Identify the Category

Skills fall into 9 functional categories (per Anthropic's internal taxonomy):

| Category | What It Does | Examples |
|----------|--------------|---------|
| **Library & API Reference** | Teaches the agent about internal libs, SDKs, or APIs it can't know from training data | `billing-lib`, `frontend-design`, domain-specific skills |
| **Product Verification** | Tests and verifies code is working correctly. Often uses Playwright, tmux, or test runners | `test`, `verify`, `test-ui` |
| **Data Fetching & Analysis** | Connects to data stack, monitoring dashboards, credentials | `analytics`, `monitoring`, `research` |
| **Business Process** | Automates repetitive team workflows into a single command | `standup-post`, `weekly-recap`, `pr-writer` |
| **Code Scaffolding** | Generates boilerplate for specific patterns in the codebase | `bootstrap`, `landing-gen`, `component-patterns` |
| **Code Quality & Review** | Enforces code standards, can run via hooks or CI | `code-review`, `audit`, `quality-gate` |
| **CI/CD & Deployment** | Fetches, pushes, deploys code, babysits PRs | `ship`, `cicd`, `github-actions` |
| **Runbooks** | Takes symptoms (alert, error, Slack thread) and walks through investigation | `debug`, `oncall-runner`, `troubleshoot` |
| **Infrastructure Ops** | Maintenance and operational procedures with destructive-action guardrails | `kubernetes`, `terraform`, `migrate` |

The category with the highest value-add is **Library & API Reference** — it fills knowledge gaps the model genuinely doesn't have, rather than repeating what it already knows.

## Step 2: Create the Directory

```bash
mkdir -p .claude/skills/my-skill-name
```

Use kebab-case for the directory name. This name becomes the skill's identifier.

## Step 3: Write the SKILL.md

Create `.claude/skills/my-skill-name/SKILL.md` with two sections: YAML frontmatter (metadata) and Markdown body (instructions).

### Frontmatter Template

```yaml
---
name: my-skill-name
description: One-sentence description of what the skill does
layer: utility          # orchestrator | hub | utility | domain
category: tooling       # orchestration | workflow | utility | frontend | backend | database | devops | security | ai | docs
triggers:
  - "/my-skill"
  - "natural language trigger phrase"
  - "another way to invoke this"
inputs:
  - inputName: Description of the input
  - optionalInput: Description (optional)
outputs:
  - outputName: Description of what the skill produces
linksTo:
  - skill-name-1       # Skills this skill may invoke
  - skill-name-2
linkedFrom:
  - parent-skill-1     # Skills that may invoke this skill
  - parent-skill-2
preferredNextSkills:
  - suggested-next      # Skills to suggest after this completes
fallbackSkills:
  - fallback-skill      # Skills to try if this one gets stuck
riskLevel: low          # low | medium | high
memoryReadPolicy: selective    # always | selective | none
memoryWritePolicy: selective   # always | selective | none
sideEffects:
  - Description of side effects (file creation, network calls, etc.)
---
```

### Frontmatter Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Skill identifier (must match directory name) |
| `description` | Yes | string | One-sentence description |
| `layer` | Yes | string | `orchestrator`, `hub`, `utility`, or `domain` |
| `category` | Yes | string | Classification category |
| `triggers` | Yes | string[] | Command and natural language triggers |
| `inputs` | Yes | object[] | Expected inputs with descriptions |
| `outputs` | Yes | object[] | Expected outputs with descriptions |
| `linksTo` | Yes | string[] | Skills this skill can invoke |
| `linkedFrom` | Yes | string[] | Skills that can invoke this skill |
| `preferredNextSkills` | No | string[] | Suggested follow-up skills |
| `fallbackSkills` | No | string[] | Recovery skills for stuck states |
| `riskLevel` | No | string | `low` (default), `medium`, `high` |
| `memoryReadPolicy` | No | string | `selective` (default), `always`, `none` |
| `memoryWritePolicy` | No | string | `selective` (default), `always`, `none` |
| `sideEffects` | No | string[] | Side effects the skill may cause |

### Body Template

After the frontmatter closing `---`, write the skill instructions in Markdown:

```markdown
# My Skill Name

## Purpose

Clear, concise explanation of what this skill does and when to use it.
Include what makes it different from similar skills.

## Workflow

### Phase 1: [Name]

1. **Step description** -- What to do and why
2. **Step description** -- Details on execution
3. **Step description** -- Expected output

### Phase 2: [Name]

1. **Step description** -- ...
2. **Step description** -- ...

## Decision Points

| Condition | Action |
|-----------|--------|
| Input is simple | Skip Phase 2, go directly to output |
| Input is complex | Invoke sequential-thinking for analysis |
| Error occurs | Invoke fallback skill |

## Usage

**Best for**:
- Scenario 1
- Scenario 2

**Not ideal for**:
- Scenario where another skill is better (use X instead)

## Examples

### Example 1: Simple case
```
User: /my-skill Do the simple thing
Workflow: Phase 1 only, produces output in 2 steps
```

### Example 2: Complex case
```
User: /my-skill Do the complex thing with constraints
Workflow: Phase 1 -> Phase 2 -> invoke linked skill -> output
```

## Guardrails

- Constraint 1: Always do X before Y
- Constraint 2: Never invoke Z without user confirmation
- Constraint 3: Limit scope to avoid bloat
```

## Step 4: Define Links

Think carefully about links. Your skill should declare:

### `linksTo` -- What you call

List skills your workflow explicitly invokes. Be honest -- only list skills you actually use in the workflow body.

**Good**:
```yaml
linksTo:
  - scout       # I search the codebase during Phase 1
  - test        # I run tests during Phase 3
```

**Bad**:
```yaml
linksTo:
  - every-skill-that-might-be-relevant  # Don't list things you don't actually call
```

### `linkedFrom` -- What calls you

List skills that invoke your skill. Check their `linksTo` to verify -- this should be bidirectional.

### `preferredNextSkills` -- What comes next

After your skill finishes, what should the user do next? This is a recommendation, not a requirement.

### `fallbackSkills` -- Recovery options

If your skill gets stuck (missing context, unexpected error, scope exceeded), what skill can help?

## Step 5: Verify Consistency

Check that your links are bidirectional:

1. If you list `scout` in `linksTo`, go to `scout/SKILL.md` and verify your skill is in its `linkedFrom`
2. If you list `cook` in `linkedFrom`, go to `cook/SKILL.md` and verify your skill is in its `linksTo`

If they are not bidirectional, update both files.

## Step 6: Test the Skill

Test your skill by invoking it through its triggers:

```
/my-skill <test input>
```

Verify:
- The trigger is recognized
- The workflow phases execute in order
- Linked skills are invoked correctly
- Memory policies are respected
- Output matches the declared format

## Step 7: Add to Dashboard

The dashboard's Skills page reads skill metadata from the `.claude/skills/` directory. After creating your skill:

1. Reload the dashboard (or restart `npm run dashboard:dev`)
2. Navigate to the Skills page
3. Verify your skill appears in the catalog
4. Check the skill graph for correct link visualization

## Complete Example: A Code Audit Skill

```yaml
---
name: code-audit
description: Systematic code quality audit targeting specific files or modules
layer: hub
category: workflow
triggers:
  - "/audit-code"
  - "audit this code"
  - "review code quality"
inputs:
  - target: File path, directory, or glob pattern to audit
  - focus: Specific concerns to prioritize (optional)
outputs:
  - report: Structured audit report with findings and recommendations
  - metrics: Code quality metrics (complexity, duplication, coverage)
linksTo:
  - scout
  - security-scanner
  - performance-profiler
  - testing-patterns
linkedFrom:
  - cook
  - audit
preferredNextSkills:
  - fix
  - refactor
fallbackSkills:
  - scout
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Reads many files during analysis
  - May run static analysis tools
---

# Code Audit

## Purpose

Perform a systematic code quality audit on targeted files or modules.
Unlike `code-review` (which focuses on recent changes/diffs), code-audit
examines existing code regardless of when it was last modified.

## Workflow

### Phase 1: Scope

1. **Identify targets** -- Resolve the input path/glob to a concrete file list
2. **Check memory** -- Recall any previous audit findings for these files
3. **Classify** -- Group files by type (components, utilities, API routes, etc.)

### Phase 2: Analyze

4. **Invoke `scout`** -- Map dependencies and usage patterns for the target files
5. **Invoke `security-scanner`** -- Run security checks on the targets
6. **Invoke `performance-profiler`** -- Check for performance anti-patterns
7. **Run complexity analysis** -- Measure cyclomatic complexity and function length

### Phase 3: Report

8. **Compile findings** -- Aggregate results from all analysis passes
9. **Score** -- Assign overall quality score (A through F)
10. **Write report** -- Structured Markdown with findings, metrics, recommendations

## Guardrails

- Read only -- never modify audited files
- Limit scope to avoid auditing the entire codebase (max 50 files per run)
- Save significant findings to memory for future reference
```

## Best Practices

### 1. Don't teach the model what it already knows

The model already knows React, TypeScript, SQL, etc. Focus your skill on information that pushes it *away from its defaults* — internal APIs, team conventions, edge cases specific to your codebase.

**Bad**: "React components should use hooks instead of classes"
**Good**: "Our `useAnalytics` hook requires a `trackingId` from the campaign config, not a hardcoded string"

### 2. Build a Gotchas section

The highest-value section in any skill. List failure points the agent commonly hits. Update this over time as you discover new ones.

```markdown
## Gotchas

- `billing.createInvoice()` silently fails if `currency` is not ISO 4217 — always validate
- The staging API returns 200 with an error body (not 4xx) — check `response.data.error`
- Import from `@internal/billing` not `billing` — the bare import pulls the deprecated v1
```

### 3. Use the file system for progressive disclosure

The entire skill folder is your context engineering surface. Tell the agent what files exist and let it read them when needed — zero tokens until accessed.

```
.claude/skills/billing/
├── SKILL.md              # Core instructions (L2, loaded on trigger)
├── references/
│   ├── api.md            # Function signatures + usage (L3, on demand)
│   └── edge-cases.md     # Known failure scenarios (L3, on demand)
├── scripts/
│   ├── validate.sh       # Validation script the agent can run
│   └── scaffold.ts       # Template generator
├── assets/
│   └── template.md       # Output template
└── config.json           # User-specific config (API keys, project IDs)
```

In SKILL.md, reference these files:
```markdown
For API signatures, read `references/api.md`.
For edge cases and known failures, read `references/edge-cases.md`.
Use `scripts/scaffold.ts` to generate the initial file structure.
```

### 4. Write descriptions for the model, not humans

The `description` field is scanned by the agent at startup to decide which skill matches. It's a trigger condition, not a summary. Include concrete terms the user would say.

**Bad**: `"A comprehensive code quality tool"`
**Good**: `"Run when user says 'review this code', 'check quality', 'audit PR', or 'find bugs in'. Multi-pass review with security + performance + style checks."`

Research shows: well-optimized descriptions improve activation rate from ~20% to ~50%. Adding examples pushes it to ~90%.

### 5. Don't railroad the agent

Skills get reused across many situations. Give the agent the information it needs but let it adapt. Avoid over-prescriptive step-by-step instructions for simple tasks.

**Bad**: "Step 1: Open the file. Step 2: Find line 42. Step 3: Change X to Y."
**Good**: "The billing config lives in `src/config/billing.ts`. The `taxRate` field must match the region's legal requirement — check `references/tax-rates.md` for current values."

### 6. Store data in the skill folder

Skills can persist data between sessions. From simple append-only logs to structured data:

```markdown
## Memory

This skill maintains `standups.log` — an append-only history of generated standup posts.
Read the last 5 entries before generating a new one to maintain consistency and avoid repetition.
```

For stable persistence across upgrades, use `${CLAUDE_PLUGIN_DATA}` (if available) instead of the skill directory.

### 7. Include scripts the agent can compose

Providing helper scripts and libraries is one of the most powerful patterns. The agent spends turns composing rather than reconstructing boilerplate.

```
scripts/
├── fetch-metrics.ts    # Helper: fetch from Grafana API
├── format-report.ts    # Helper: format findings into markdown
└── run-checks.sh       # Helper: run all static analysis tools
```

The agent reads these, understands the interfaces, and composes them together for the specific task.

### 8. On-demand hooks

Skills can include hooks that only activate when the skill is invoked and last for the session:

```markdown
## Hooks

When this skill is active, enable these safety hooks:
- **PreToolUse**: Block `rm -rf`, `DROP TABLE`, `force-push`, `kubectl delete`
- **PreToolUse**: Block all Edit/Write outside the target directory
```

Useful for skills that touch production or sensitive systems.

### 9. Config for user-specific setup

If your skill needs API keys, project IDs, or other user-specific config:

```markdown
## Setup

This skill requires `config.json` in the skill directory:
\`\`\`json
{
  "grafana_url": "https://grafana.internal",
  "dashboard_id": "api-latency",
  "slack_channel": "#oncall"
}
\`\`\`

If `config.json` doesn't exist, ask the user for these values before proceeding.
```

## Related Documentation

- [Skills Catalog](./skills-catalog.md) -- All existing skills for reference
- [Skill Linking Model](./skill-linking-model.md) -- How links work in detail
- [How to Link Skills](./how-to-link-skills.md) -- Guide for setting up links
- [How to Add a New Command](./how-to-add-a-new-command.md) -- Creating a command for your skill
