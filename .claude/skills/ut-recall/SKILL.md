---
name: ut-recall
version: 1.0.0
layer: utility
triggers:
  - /ut-recall
  - what do you remember
  - recall memories
  - search memory
description: Query the UltraThink persistent brain for stored memories
linksTo:
  - ut-remember
linkedFrom:
  - scout
  - debug
  - plan
preferredNextSkills:
  - ut-remember
---

# ut-recall — Explicit Memory Query

## Purpose

Search and retrieve memories from the UltraThink persistent brain. This is the **manual query** — memories are already auto-recalled on session start, but this lets you dig deeper or search for specific topics.

## Usage

```
/ut-recall [query]           — Search memories by text
/ut-recall --category <cat>  — Filter by category
/ut-recall --stats           — Show memory statistics
```

## Behavior

1. Run the memory-runner CLI to query the database:
   ```bash
   cd <ultrathink-root> && npx tsx memory/scripts/memory-runner.ts search '<query>'
   ```

2. Alternatively, use the existing `searchMemories()` API directly by reading from the database.

3. Format results clearly for the user.

## Query Strategies

### Text Search
Search memory content with ILIKE matching:
```
/ut-recall authentication   → finds memories about auth decisions
/ut-recall bun npm          → finds package manager preferences
```

### Category Filter
```
/ut-recall --category decision     → all architectural decisions
/ut-recall --category preference   → all user preferences
/ut-recall --category solution     → all bug fixes and workarounds
```

### Stats
Show memory database overview:
- Total memories by category
- Average importance
- Recent session count
- Top tags

## Output Format

Present results as a concise list:

```
Found 3 memories:

1. [decision] Chose Drizzle over Prisma for type-safe queries (importance: 8)
   Tags: #architecture #database
   Saved: 2024-12-15

2. [preference] User prefers bun over npm (importance: 9)
   Tags: #preference #tooling
   Saved: 2024-12-14

3. [convention] Components use PascalCase, hooks use camelCase (importance: 6)
   Tags: #convention #frontend
   Saved: 2024-12-13
```

## When Auto-Recall Isn't Enough

The auto-recall system loads top memories by scope and importance on session start. Use `/ut-recall` when:

- You need memories from a **different project scope**
- You want to search by **specific keywords**
- You want to see **all memories** in a category
- You want **memory statistics**
- Auto-recall didn't surface what you're looking for (low importance memories)
