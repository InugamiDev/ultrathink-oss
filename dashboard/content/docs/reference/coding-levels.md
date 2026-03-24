# Coding Levels

UltraThink adapts its communication style based on the user's **coding level**. This controls how much explanation accompanies output -- not skill limitations.

Set in `.claude/ck.json` under `codingLevel`.

## The Four Levels

### `beginner`

**For**: People learning to code or new to the technology.

- Explain every concept used
- Add inline comments liberally
- Suggest learning resources
- Walk through execution flow step by step
- Use simple patterns over advanced ones
- Break complex operations into small, named steps

```typescript
// We're creating a function that fetches user data from our API.
// 'async' means this function can wait for network operations.
async function getUser(id: string): Promise<User> {
  // fetch() is a built-in API for making HTTP requests.
  const response = await fetch(`/api/users/${id}`);

  // response.ok is true when the status is 200-299 (success).
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  // .json() parses the response body from JSON into an object.
  return response.json() as Promise<User>;
}
```

### `intermediate`

**For**: Developers who know the basics but are building expertise.

- Explain non-obvious design choices
- Brief comments for complex logic only
- Reference relevant documentation
- Show alternative approaches when meaningful
- Note trade-offs between options

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

### `practical-builder` (default)

**For**: Working developers who want results with minimal ceremony.

- Focus on working implementation
- Minimal explanation -- only for surprising choices
- Skip basics, jump to the interesting parts
- No inline comments unless genuinely tricky

```typescript
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`Failed: ${response.status}`);
  return response.json() as Promise<User>;
}
```

### `expert`

**For**: Senior developers who think in systems.

- Terse, dense output
- Code speaks for itself
- Focus on trade-offs, edge cases, performance
- Use advanced patterns freely
- Challenge assumptions, surface failure modes

```typescript
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<User>;
}
// Consider: retry with exponential backoff for transient 5xx.
// Race condition if called concurrently with same id
// — deduplicate with Map<string, Promise<User>>.
```

## Comparison Table

| Aspect | Beginner | Intermediate | Practical | Expert |
|--------|----------|-------------|-----------|--------|
| Inline comments | Extensive | Selective | Minimal | None |
| Concept explanations | Yes | For non-obvious | No | No |
| Alternative approaches | No | Sometimes | Briefly | Only for trade-offs |
| Error handling detail | Step-by-step | Explained | Code only | Code + edge cases |
| Pattern complexity | Simple only | Gradual | Standard | Advanced freely |
| Output length | Longest | Medium | Short | Shortest |
| Architectural discussion | Never | When relevant | Brief | Primary focus |

## Switching Levels

### Via ck.json

```json
{ "codingLevel": "expert" }
```

### Via Dashboard

Settings page at `localhost:3333/settings`, Coding Level dropdown.

### Temporary Overrides

- **Increase verbosity**: Ask "why?" or "explain"
- **Decrease verbosity**: Say "just do it" or "skip the explanation"

These reset at session end. Persistent changes require editing `ck.json`.

## How Skills Respect Levels

| Level | Skill Output Style |
|-------|-------------------|
| `beginner` | Include learning notes, explain concepts, suggest resources |
| `intermediate` | Brief context for non-obvious decisions |
| `practical-builder` | Action-focused, minimal explanation |
| `expert` | Decisions and trade-offs only |

Enforced by teaching rules in `.claude/references/teaching.md`.
