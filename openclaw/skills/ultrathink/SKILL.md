---
name: ultrathink
description: "UltraThink Workflow OS — 4-layer skill mesh with persistent memory and privacy hooks for complex engineering tasks. Routes prompts through intent detection to activate the right domain skills automatically."
metadata:
  openclaw:
    emoji: "🧠"
    homepage: "https://github.com/InugamiDev/ultrathink-oss"
    requires:
      bins:
        - node
      env:
        - ULTRATHINK_ROOT
    primaryEnv: ULTRATHINK_ROOT
---

# UltraThink — Workflow OS for AI Agents

You have access to UltraThink's skill mesh — a 4-layer architecture of 125+ skills
that automatically activate based on intent detection.

## Skill Layers

1. **Orchestrators** — End-to-end workflows (cook, ship, gsd-verify, ut-chain)
2. **Hubs** — Multi-step coordinators (plan, debug, refactor, test, scout)
3. **Utilities** — Reusable tools (fix, verify, quality-gate, commit-crafter)
4. **Domain** — Technology specialists (react, nextjs, tailwind, typescript, prisma)

## When to Use

Use UltraThink when the user asks you to:
- Build, debug, refactor, or test code in a project
- Explore or understand a codebase
- Plan an implementation strategy
- Review code quality
- Search project memory for past decisions

## How to Route

1. Detect the intent category: build | debug | refactor | explore | deploy | test | design | plan
2. Match to the appropriate hub skill
3. If the task is complex (multi-step, cross-file), escalate to an orchestrator
4. For technology-specific work, include the relevant domain skill

## Intent → Skill Mapping

| Intent | Primary Skill | Supporting Skills |
|--------|--------------|-------------------|
| build | cook | react, nextjs, typescript |
| debug | debug | scout, fix, sequential-thinking |
| refactor | refactor | quality-gate, typescript |
| test | test | vitest, testing-patterns |
| explore | scout | onboard, code-explainer |
| plan | plan | brainstorm, problem-solving |
| deploy | ship | verify, cicd |
| review | code-review | quality-gate, security-scanner |

## Memory Integration

When the `ultrathink-memory` MCP server is available:
1. Before starting work, search memory for relevant context: `memory-search`
2. After completing work, save key decisions: `memory-save`
3. For recurring projects, recall full context: `memory-recall`

## Safety Rules

1. Never expose `.env`, credentials, API keys, or database connection strings
2. Never execute destructive operations without explicit user confirmation
3. Always cite file paths when referencing code
4. For suggest-only mode: provide diffs, never auto-apply
