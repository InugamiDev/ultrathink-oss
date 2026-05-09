# Naming Convention (M6)

UltraThink uses one rule for displaying actors across every surface:

| Actor type | Render as          | Example              |
|------------|--------------------|----------------------|
| Agent      | `Name [Title]`     | `Steven [CEO]`       |
| Human      | `Name`             | `Daniel`             |
| System     | `system`           | `system`             |

The convention is **data-level, not display-level** — the bracket form is
produced by a single helper, never assembled ad-hoc by callers.

## Why this exists

When a feed mixes agents and humans (Discord, dashboard activity log, CLI
output), readers need an at-a-glance signal for "is this a person or a
process?". Brackets give that signal without color, icons, or extra columns,
and they survive plain-text channels (logs, copy-paste, terminals).

## Where it MUST be applied

- Dashboard activity rows, task assignee chips, comment authors
- Discord embed `author.name` and inline mentions
- CLI output (`ut tasks ls`, `ut log tail`, etc.)
- Any rendered text that originates from an `Actor` value

## Where it MAY be omitted

- Internal debug logs that print raw IDs (`agent:49da6c47…`)
- Database columns (we store name + title separately, format on read)
- Telemetry / metrics labels (cardinality concerns)

## Single source of truth

```ts
import { formatActor } from '@/lib/actor'
formatActor({ type: 'agent', id, name: 'Steven', title: 'CEO' }) // "Steven [CEO]"
formatActor({ type: 'human', id, name: 'Daniel' })               // "Daniel"
```

File: `dashboard/lib/actor.ts`. Do **not** duplicate this helper. The Discord
bot and CLI import from the same module (or a re-export of it).

## Adding a new agent

1. Create the agent in Paperclip with a clean role label as `title`.
2. Title rules:
   - Short (1–3 words): `CEO`, `Code Integrator`, `Engineer`
   - No descriptions, no em-dashes, no "owns X / does Y" prose
   - Title-cased, no trailing punctuation
3. The agent's `name` is the human-readable first name (`Steven`), not
   `Steven - CEO` or `steven_ceo`.

## Adding a new human

1. Insert a row into `humans` (`memory/migrations/022_humans.sql`).
2. Set `name` to the display name. **Do not set a title** — humans render
   without brackets by design.
3. Optional: `discord_user_id`, `email`, `github_username` for cross-surface
   identity resolution.

## Wall of bad

These renderings are **wrong**. Do not ship them.

- `Steven (CEO)`           — parens instead of brackets
- `[Steven] CEO`           — brackets on the name, not the title
- `Steven-CEO`             — hyphen-joined, no space, no brackets
- `Mira_Code_Integrator`   — underscored, snake_case
- `Steven [CEO] - Director — sets goals…` — title bloat from old schema
- `Daniel [Human]`         — humans never get a bracket, that's the whole point
- `system [System]`        — system actor renders as the literal `system`
- `Steven CEO`             — no separator at all, ambiguous
- `STEVEN [CEO]`           — shouting; preserve the stored casing

If you see one of these in the wild, the call site is bypassing
`formatActor()`. Fix the call site, don't patch the string.
