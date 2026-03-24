# Memory Discipline Rules

## Read Policy

- **Auto-recall**: On session start, query memories matching the current project/scope
- **Contextual recall**: Before major decisions, check for relevant past decisions
- **Conflict detection**: If recalled memory contradicts current context, flag it

## Write Policy

- **Selective writes only** — Don't persist everything, only lasting value:
  - Architectural decisions and their rationale
  - Confirmed patterns and conventions
  - Bug solutions that took significant effort
  - User preferences expressed across sessions
  - Key file paths and project structure insights
- **Never persist**:
  - Session-specific debugging state
  - Temporary workarounds
  - Unverified assumptions
  - Duplicate information already in CLAUDE.md or docs

## Memory Fields

Every memory must include:
- `content` — The information being stored
- `category` — One of: `decision`, `pattern`, `preference`, `solution`, `architecture`, `convention`, `insight`
- `importance` — 1-10 scale (10 = critical architectural decision, 1 = minor observation)
- `confidence` — 0.00-1.00 (1.0 = verified fact, 0.5 = educated guess)
- `scope` — Project or file path this applies to

## Compaction Rules

- When memory count exceeds `compactionThreshold` (default: 100):
  1. Group low-importance (1-3) memories by scope
  2. Summarize groups into single summary memories
  3. Archive originals (don't delete)
  4. Update `summaries` table with date ranges
- Never compact importance 8+ memories
- Preserve all `decision` category memories

## Tag Conventions

Use consistent tags:
- `#architecture`, `#pattern`, `#bugfix`, `#preference`
- `#frontend`, `#backend`, `#database`, `#devops`
- `#<project-name>`, `#<feature-name>`
- `#verified`, `#unverified`, `#deprecated`
