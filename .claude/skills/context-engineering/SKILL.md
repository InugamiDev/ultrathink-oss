---
name: context-engineering
description: Context window optimization, token budget management, and information compression for AI-assisted workflows
layer: utility
category: meta
triggers:
  - "context window"
  - "token limit"
  - "too much context"
  - "compress this"
  - "summarize for context"
  - "optimize prompt"
  - "context budget"
inputs:
  - content: The raw content to be managed within context constraints
  - budget: Target token count or percentage of context window
  - priority: Which information is most critical to retain
outputs:
  - optimized_context: Compressed/prioritized content fitting the budget
  - context_map: What was included, excluded, and why
  - retrieval_plan: How to recover excluded information when needed
linksTo:
  - sequential-thinking
  - docs-seeker
  - repomix
linkedFrom:
  - orchestrator
  - planner
preferredNextSkills:
  - docs-seeker
  - repomix
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Context Engineering

## Purpose

Context engineering is the discipline of maximizing the signal-to-noise ratio within a finite context window. Every token spent on irrelevant information is a token unavailable for reasoning. This skill provides strategies for curating, compressing, and structuring information so that AI agents operate with maximum relevant context and minimum waste.

## Key Concepts

### Context Window Economics

Think of the context window as a budget:

| Budget Zone | Allocation | Content Type |
|-------------|------------|--------------|
| **System** (10-15%) | Fixed | System prompt, persona, rules |
| **Task** (20-30%) | Per-task | Current task instructions, requirements |
| **Reference** (30-40%) | Selective | Code, docs, examples relevant to task |
| **Working Memory** (15-25%) | Dynamic | Conversation history, intermediate results |
| **Output Reserve** (10-15%) | Reserved | Space for the model to generate response |

### Information Density Spectrum

```
LOW DENSITY ←————————————————→ HIGH DENSITY
Raw source code    → Annotated snippets → Interface signatures → Natural language summary
Full documentation → Relevant sections  → Key API signatures   → Capability checklist
Complete git log   → Recent commits     → Change summary       → Diff of key files
```

### The Relevance Hierarchy

Not all context is equal. Prioritize:

1. **Direct** — Code/docs the task directly modifies or depends on
2. **Adjacent** — Code/docs one degree removed (callers, callees, types)
3. **Structural** — Architecture, patterns, conventions in the codebase
4. **Historical** — Why things are the way they are (git blame, ADRs)
5. **General** — Language/framework reference (use external tools instead)

## Strategies

### Strategy 1: Layered Context Loading

Load context in layers, from most to least critical:

```
LAYER 0 — ALWAYS PRESENT:
  - Task description and acceptance criteria
  - Key constraints and requirements
  - Output format specification

LAYER 1 — LOAD FIRST:
  - Files being directly modified
  - Type definitions and interfaces used
  - Test files for the target code

LAYER 2 — LOAD IF BUDGET ALLOWS:
  - Adjacent files (importers/importees)
  - Configuration files (tsconfig, package.json)
  - Similar implementations for pattern reference

LAYER 3 — LOAD ON DEMAND:
  - Documentation and READMEs
  - Git history for changed files
  - CI/CD configuration

LAYER 4 — EXTERNAL RETRIEVAL:
  - Library documentation (use Context7)
  - Stack Overflow / community solutions (use web search)
  - Full repository structure (use repomix)
```

### Strategy 2: Progressive Summarization

Transform verbose content into increasingly dense representations:

```
LEVEL 0 — RAW (100% tokens):
  Full source file with all comments and implementations

LEVEL 1 — TRIMMED (60% tokens):
  Remove imports, empty lines, obvious implementations
  Keep signatures, complex logic, comments

LEVEL 2 — SKELETON (30% tokens):
  Type signatures, function signatures, class structure
  Remove all implementation bodies

LEVEL 3 — MANIFEST (10% tokens):
  File purpose, exported API surface, dependencies list

LEVEL 4 — TAG (2% tokens):
  "auth-service: JWT auth with role-based access control"
```

### Strategy 3: Contextual Anchoring

Place the most critical information at natural attention points:

```
STRUCTURE:
  [TASK DEFINITION — highest attention]
  [KEY CONSTRAINTS — high attention]
  [REFERENCE CODE — medium attention, scannable]
  [SUPPORTING CONTEXT — lower attention]
  [OUTPUT INSTRUCTIONS — refreshed attention at end]
```

The model attends more strongly to the beginning and end of context. Place critical constraints in both locations.

### Strategy 4: Deduplication

Aggressively remove redundant information:

- **Type + Implementation**: If you include the implementation, you don't need separate type declarations (types are visible in the code)
- **Tests + Requirements**: Well-written tests ARE requirements; don't duplicate them in prose
- **Comments + Code**: If the code is self-documenting, strip the comments
- **Multiple Examples**: One good example > three mediocre ones

### Strategy 5: Reference Pointers Instead of Content

When full content is too expensive, use pointers:

```
INSTEAD OF: [500-line utility file pasted in full]
USE: "See utils/validation.ts — exports: validateEmail(), validatePhone(),
     validateAddress(). All return Result<T, ValidationError>. Uses zod schemas."

INSTEAD OF: [Full API documentation]
USE: "POST /api/orders — accepts OrderCreateDTO, returns Order.
     See OpenAPI spec at docs/api.yaml for full schema."
```

The model can request the full content if needed, but often the pointer suffices.

## Compression Techniques

### Code Compression

```
BEFORE (high token cost):
import { useState, useEffect, useCallback } from 'react';
import { fetchUser } from '../api/users';
import { User } from '../types/user';

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUser(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return { user, loading, error, refetch: loadUser };
}

AFTER (compressed — retains all semantic information):
// hooks/useUser.ts — fetches user by ID, returns {user, loading, error, refetch}
// Pattern: standard async data hook with error handling
// Dependencies: fetchUser() from api/users, User type
export function useUser(userId: string): { user: User|null, loading: boolean, error: Error|null, refetch: () => Promise<void> }
```

### Document Compression

```
BEFORE: [2000-word API documentation]

AFTER:
API: User Service (REST, JSON)
ENDPOINTS:
  GET    /users/:id      → User          (200, 404)
  POST   /users          → User          (201, 400, 409)
  PATCH  /users/:id      → User          (200, 400, 404)
  DELETE /users/:id      → void          (204, 404)
AUTH: Bearer token, roles: admin, user
RATE LIMIT: 100/min per token
PAGINATION: cursor-based, max 100 per page
SPECIAL: Soft delete only. email must be unique. name max 100 chars.
```

## Context Budget Templates

### Template: Bug Fix (Small Context)

```
BUDGET: ~4K tokens reference
INCLUDE:
  - Error message and stack trace (verbatim)
  - The failing function/component (full source)
  - Relevant type definitions (signatures only)
  - Test that reproduces the bug (if exists)
EXCLUDE:
  - Unrelated files in the same module
  - Full dependency source code
  - Historical context (load on demand)
```

### Template: Feature Implementation (Medium Context)

```
BUDGET: ~12K tokens reference
INCLUDE:
  - Feature requirements / acceptance criteria
  - Files to be modified (full source)
  - Adjacent files (signatures/skeleton)
  - Relevant test files (full source)
  - Type definitions used across the feature
  - Similar existing features (one example, compressed)
EXCLUDE:
  - Framework documentation (use Context7)
  - Unrelated modules
  - CI/CD configuration
```

### Template: Architecture Review (Large Context)

```
BUDGET: ~25K tokens reference
INCLUDE:
  - Directory tree (depth 3)
  - All configuration files (full)
  - Key module entry points (signatures)
  - Database schema (full)
  - API route definitions (full)
  - Dependency manifest (package.json)
  - Architecture Decision Records (compressed)
EXCLUDE:
  - Individual component implementations
  - Test files (reference their existence only)
  - Static assets, generated files
```

## Anti-Patterns

1. **Kitchen sink**: Dumping entire files "just in case." Every token has a cost — include only what the task requires.
2. **Stale context**: Carrying forward outdated information from earlier in the conversation. Refresh references when the conversation shifts topics.
3. **Duplicate formats**: Including the same information as code AND documentation AND tests. Pick the most information-dense format.
4. **Ignoring output reserve**: Filling the entire context window leaves no room for the model to reason and generate. Always reserve 10-15%.
5. **Over-compression**: Compressing so aggressively that the model lacks enough detail to produce correct code. Signatures are not enough when the implementation details matter.

## Integration Notes

- Use **repomix** to generate compressed repository representations for large-scope tasks.
- Use **docs-seeker** to retrieve external documentation instead of pasting it into context.
- Feed context maps to the **orchestrator** so it can make informed decisions about tool routing.
- When context is exhausted, use **sequential-thinking** to reason about what to prioritize.
