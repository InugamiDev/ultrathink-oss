---
name: cursor-rules
description: Cursor IDE .cursorrules configuration, AI coding assistant customization, project-specific rules, and context management
layer: domain
category: tooling
triggers:
  - ".cursorrules"
  - "cursor rules"
  - "cursor ide"
  - "cursor config"
  - "ai coding assistant"
  - "cursor context"
  - "cursor instructions"
inputs:
  - "Project stack and conventions for rule generation"
  - "Existing .cursorrules needing optimization"
  - "Team coding standards to encode as rules"
  - "Framework-specific guidance requirements"
outputs:
  - "Complete .cursorrules files"
  - "Project-specific AI assistant rules"
  - "Context management strategies"
  - "Rule templates for common stacks"
linksTo:
  - code-review
  - context-engineering
  - prompt-engineering
linkedFrom:
  - onboard
  - code-review
preferredNextSkills:
  - context-engineering
  - code-review
fallbackSkills:
  - prompt-engineering
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Cursor IDE Rules Configuration

## Purpose

Guide the creation and optimization of `.cursorrules` files (and `.cursor/rules/*.mdc` for Cursor v2) that configure Cursor IDE's AI coding assistant with project-specific conventions, patterns, and constraints. Ensures the AI generates code consistent with your team's standards.

## Key Patterns

### Basic .cursorrules Structure

```text
# Project: MyApp
# Stack: Next.js 15, TypeScript, Tailwind v4, Drizzle ORM, Neon Postgres

## Code Style
- Use TypeScript strict mode. No `any` types.
- Prefer `const` over `let`. Never use `var`.
- Use named exports, not default exports.
- Use arrow functions for callbacks, function declarations for top-level.
- File naming: kebab-case for files, PascalCase for components.

## React/Next.js Conventions
- Use Server Components by default. Add "use client" only when needed.
- Use the App Router. No Pages Router patterns.
- Colocate components with their routes in the app/ directory.
- Use Suspense boundaries around async components.
- Forms: use Server Actions with useActionState for mutations.

## Styling
- Use Tailwind CSS v4 with CSS-first config. No tailwind.config.js.
- Follow the golden ratio spacing scale: 0.625rem, 0.8125rem, 1rem, 1.625rem, 2.625rem, 4.25rem.
- Minimum button padding: px-6 py-4. Minimum text: text-base (1rem).
- All interactive elements need hover/focus states and transitions.

## Database
- Use Drizzle ORM with Neon Postgres.
- Define schemas in src/db/schema/.
- Use prepared statements for repeated queries.
- Always use transactions for multi-step mutations.

## Error Handling
- Never silently catch errors. Log or re-throw.
- Use Result types for expected failures: { success: true, data } | { success: false, error }.
- Validate all external input with Zod at API boundaries.

## Do NOT
- Add analytics tracking to components.
- Use default exports.
- Use CSS-in-JS or styled-components.
- Use `useEffect` for data fetching (use Server Components or TanStack Query).
- Commit .env files.
```

### Cursor v2 Rule Files (.cursor/rules/*.mdc)

**Modular rules with glob-based activation:**

```markdown
<!-- .cursor/rules/react-components.mdc -->
---
description: React component conventions
globs: ["src/components/**/*.tsx", "src/app/**/*.tsx"]
alwaysApply: false
---

# React Component Rules

- Use functional components only.
- Props interface named `{ComponentName}Props`.
- Destructure props in the function signature.
- Export as named export.

Template:
\`\`\`tsx
interface {Name}Props {
  // props
}

export function {Name}({ ...props }: {Name}Props) {
  return (
    <div>
      {/* implementation */}
    </div>
  );
}
\`\`\`
```

```markdown
<!-- .cursor/rules/api-routes.mdc -->
---
description: API route conventions for Next.js App Router
globs: ["src/app/api/**/*.ts"]
alwaysApply: false
---

# API Route Rules

- Export named HTTP method handlers: GET, POST, PUT, DELETE.
- Validate request body with Zod.
- Return NextResponse.json() with appropriate status codes.
- Wrap handlers in try/catch with structured error responses.
- Use { status: number, data?: T, error?: string } response shape.

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSchema.parse(body);
    const result = await createItem(data);
    return NextResponse.json({ status: 200, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ status: 400, error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ status: 500, error: 'Internal error' }, { status: 500 });
  }
}
\`\`\`
```

```markdown
<!-- .cursor/rules/database.mdc -->
---
description: Database schema and query conventions
globs: ["src/db/**/*.ts"]
alwaysApply: false
---

# Database Rules

- Use Drizzle ORM. Import from 'drizzle-orm'.
- Schema files in src/db/schema/, one per domain.
- Use pgTable for table definitions.
- Always include createdAt and updatedAt timestamps.
- Use uuid for primary keys.
- Name foreign keys explicitly: `{table}_{column}_fk`.
```

### Context-Aware Rules

**Include project structure context:**

```text
## Project Structure
src/
  app/           # Next.js App Router pages and layouts
  components/    # Shared UI components
    ui/          # Primitive components (Button, Input, Card)
    features/    # Feature-specific composed components
  db/
    schema/      # Drizzle table definitions
    queries/     # Reusable query functions
  lib/           # Utility functions and shared logic
  hooks/         # Custom React hooks

## Key Files
- src/db/schema/index.ts — re-exports all schemas
- src/lib/utils.ts — cn() helper, formatters
- src/components/ui/index.ts — barrel export for UI primitives

## When generating new files:
- Components go in src/components/features/{feature-name}/
- API routes go in src/app/api/{resource}/route.ts
- DB queries go in src/db/queries/{domain}.ts
```

### Stack-Specific Templates

**Next.js + Supabase template:**

```text
# Stack: Next.js 15 + Supabase + Tailwind v4

## Supabase Client
- Server: use createServerClient from @supabase/ssr in server components/actions
- Client: use createBrowserClient from @supabase/ssr in client components
- Never expose service_role key in client code

## Auth
- Use Supabase Auth with PKCE flow
- Protect routes with middleware.ts
- Access user via supabase.auth.getUser() in server components

## Database
- Use Supabase client for queries, not raw SQL
- Enable RLS on all tables
- Type-generate with: npx supabase gen types typescript
```

## Best Practices

1. **Be specific, not generic** -- Rules like "write clean code" are useless. Specify exact patterns, naming conventions, and file locations.
2. **Include counter-examples** -- "Do NOT" sections prevent the most common AI mistakes for your stack.
3. **Reference actual project paths** -- Tell the AI where files live so it generates correct imports and placements.
4. **Use glob-scoped rules (v2)** -- Apply different rules to different file types. API routes need different guidance than UI components.
5. **Keep rules under 2000 tokens** -- Long rules get diluted. Prioritize the most impactful conventions.
6. **Update rules as the project evolves** -- Treat `.cursorrules` as living documentation. Review monthly.
7. **Include code templates** -- Show the exact pattern you want, not just a description of it.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Rules too generic | AI ignores vague instructions like "use best practices" | Specify exact patterns with code examples |
| Contradictory rules | AI picks one randomly or produces hybrid | Audit rules for conflicts; use scoped rules to avoid overlap |
| No negative examples | AI uses anti-patterns not explicitly forbidden | Add a "Do NOT" section for common mistakes |
| Rules too long | Key instructions buried in noise | Prioritize top 10 rules; split into scoped `.mdc` files |
| Missing import paths | AI guesses wrong import locations | Specify exact import paths and barrel exports |
| No project structure | AI creates files in wrong directories | Include directory tree with descriptions |
| Stale rules | Rules reference removed patterns or old APIs | Review and update `.cursorrules` when dependencies change |
| Rules only in `.cursorrules` | Cursor v2 supports richer scoped rules | Migrate to `.cursor/rules/*.mdc` for glob-based activation |
