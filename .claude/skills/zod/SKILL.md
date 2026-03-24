# Zod

> TypeScript-first schema validation with static type inference.

## When to Use
- Validating API request/response bodies
- Form validation with react-hook-form
- Environment variable validation
- Runtime type checking at system boundaries

## Core Patterns

### Schema Definition
```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user", "moderator"]),
  tags: z.array(z.string()).default([]),
});

type User = z.infer<typeof UserSchema>;
```

### Validation
```typescript
// parse() throws on failure, safeParse() returns result object
const result = UserSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.flatten()); // { fieldErrors: { email: ["Invalid email"] } }
}
```

### Common Combinators
- `.transform()` — transform after validation
- `.refine()` — custom validation logic
- `.superRefine()` — multi-field validation with path
- `z.discriminatedUnion()` — tagged unions
- `z.intersection()` — combine schemas
- `.passthrough()` / `.strict()` — unknown key handling

### Integration
- **react-hook-form**: `zodResolver(schema)` in useForm
- **tRPC**: schemas as input/output validators
- **Next.js**: server action validation
- **Env vars**: `z.object({...}).parse(process.env)` at startup
