# Coding Levels

## Overview

UltraThink adapts its communication style based on the user's **coding level**. This is not about skill limitations -- it controls how much explanation, context, and teaching accompanies the output. A `beginner` sees detailed walkthroughs; an `expert` sees terse, decision-focused output.

The active coding level is set in `.claude/ck.json` under `codingLevel`.

## The Four Levels

### `beginner`

**For**: People learning to code or new to the technology being used.

**Behavior**:
- Explain every concept used in the code
- Add inline comments liberally
- Suggest learning resources (docs, tutorials)
- Walk through execution flow step by step
- Use simple patterns over advanced ones
- Warn about common pitfalls with explanations
- Show what happens when you change something (cause and effect)
- Break complex operations into small, named steps

**Example output**:

```typescript
// We're creating a function that fetches user data from our API.
// 'async' means this function can wait for network operations.
// 'Promise<User>' means it eventually returns a User object.
async function getUser(id: string): Promise<User> {
  // fetch() is a built-in browser/Node API for making HTTP requests.
  // We use template literals (backticks) to insert the 'id' into the URL.
  const response = await fetch(`/api/users/${id}`);

  // response.ok is true when the HTTP status is 200-299 (success).
  // If the server returns an error (404, 500, etc.), we throw an error.
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  // .json() parses the response body from JSON text into a JavaScript object.
  // We cast it as User because TypeScript doesn't know the shape of API responses.
  return response.json() as Promise<User>;
}
```

**Skill interaction**: Skill outputs include learning notes alongside the work product.

### `intermediate`

**For**: Developers who know the basics but are still building expertise.

**Behavior**:
- Explain non-obvious design choices
- Brief comments for complex logic only
- Reference relevant documentation sections
- Show alternative approaches when meaningful
- Introduce patterns gradually with context
- Note trade-offs between options
- Mention "why" for architectural choices

**Example output**:

```typescript
// Using a generic error boundary rather than per-route handling
// because this is a single-page dashboard with consistent error UI.
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json() as Promise<User>;
}
```

**Skill interaction**: Skill outputs include brief context for decisions made.

### `practical-builder` (default)

**For**: Working developers who want results with minimal ceremony.

**Behavior**:
- Focus on working implementation
- Minimal explanation -- only for surprising or non-standard choices
- Provide code with brief step markers
- Skip basics, jump to the interesting parts
- Mention trade-offs concisely
- No inline comments unless the logic is genuinely tricky

**Example output**:

```typescript
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`Failed: ${response.status}`);
  return response.json() as Promise<User>;
}
```

**Skill interaction**: Skill outputs are action-focused -- what was done and what to do next.

### `expert`

**For**: Senior developers who think in systems and want to focus on the hard parts.

**Behavior**:
- Terse, dense output
- Code speaks for itself -- no hand-holding
- Focus on trade-offs, edge cases, and performance
- Use advanced patterns freely (generics, discriminated unions, etc.)
- Discuss architectural implications
- Challenge assumptions when relevant
- Surface non-obvious failure modes and race conditions
- Offer critique, not just implementation

**Example output**:

```typescript
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<User>;
}
// Consider: retry with exponential backoff for transient 5xx.
// Race condition if called concurrently with the same id — deduplicate with Map<string, Promise<User>>.
```

**Skill interaction**: Skill outputs are minimal, focusing on decisions and open questions.

## Switching Levels

### Via ck.json

Edit `.claude/ck.json`:

```json
{
  "codingLevel": "expert"
}
```

### Via Dashboard

Go to `localhost:3333/settings` and change the Coding Level dropdown.

### Temporary Overrides

You don't need to change the config for temporary adjustments:

- **Increase verbosity**: Ask "why?" or "explain" -- the system temporarily increases explanation depth.
- **Decrease verbosity**: Say "just do it" or "skip the explanation" -- the system temporarily reduces explanation depth.

These overrides reset at the end of the session. Persistent changes require editing `ck.json`.

## How Skills Respect Levels

Skills declared in `.claude/skills/` should adapt their output based on the coding level:

| Level | Skill Output Style |
|-------|-------------------|
| `beginner` | Include learning notes, explain concepts, suggest resources |
| `intermediate` | Include brief context for non-obvious decisions |
| `practical-builder` | Action-focused, minimal explanation |
| `expert` | Decisions and trade-offs only |

This is enforced by the teaching rules in `.claude/references/teaching.md`.

## Coding Level in Memory

When the coding level is changed, the change can be persisted to memory so that future sessions maintain consistency. The memory stores this as a `preference` category memory:

```json
{
  "content": "User prefers expert coding level with minimal explanation",
  "category": "preference",
  "importance": 6,
  "scope": "global"
}
```

## Comparison Table

| Aspect | Beginner | Intermediate | Practical | Expert |
|--------|----------|-------------|-----------|--------|
| Inline comments | Extensive | Selective | Minimal | None |
| Concept explanations | Yes | For non-obvious | No | No |
| Alternative approaches | No (too confusing) | Sometimes | Briefly | Only for trade-offs |
| Error handling detail | Step-by-step | Explained | Code only | Code + edge cases |
| Pattern complexity | Simple only | Gradual introduction | Standard | Advanced freely |
| Output length | Longest | Medium | Short | Shortest |
| Architectural discussion | Never | When relevant | Brief mentions | Primary focus |

## Related Documentation

- [ck.json Config](./ck-json-config.md) -- Setting the coding level
- [Agents Catalog](./agents-catalog.md) -- How agents adapt to levels
- [Claude Workflow Overview](./claude-workflow-overview.md) -- System overview
