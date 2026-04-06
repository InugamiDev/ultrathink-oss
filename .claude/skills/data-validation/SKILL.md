---
name: data-validation
description: Data validation patterns — runtime validation, schema validation, form validation, API input validation
layer: domain
category: backend
triggers:
  - "data validation"
  - "input validation"
  - "schema validation"
  - "runtime validation"
  - "validate input"
inputs:
  - "API endpoint input validation requirements"
  - "Form validation schema design"
  - "Runtime type checking needs"
  - "Shared validation between client and server"
outputs:
  - "Zod schema definitions with transforms"
  - "API input validation middleware"
  - "Shared client/server validation patterns"
  - "Custom validation rules and error messages"
linksTo:
  - zod
  - forms
  - api-designer
linkedFrom:
  - forms
  - api-designer
preferredNextSkills:
  - zod
  - forms
fallbackSkills:
  - api-designer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Data Validation Patterns

## Purpose

Implement robust data validation at every boundary — API inputs, form submissions, environment variables, external data, and database writes. Covers Zod schema design, shared client/server validation, custom validators, and validation error handling.

## Key Patterns

### Zod Schema Design

**Basic schemas with transforms:**

```typescript
// schemas/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(150, 'Invalid age')
    .optional(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});

// Infer TypeScript types from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update schema — make all fields optional, omit password
export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

**Complex schemas with refinements:**

```typescript
// schemas/order.ts
const lineItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().length(2).default('US'),
});

export const createOrderSchema = z
  .object({
    items: z.array(lineItemSchema).min(1, 'Order must have at least one item'),
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional(),
    couponCode: z
      .string()
      .regex(/^[A-Z0-9]{4,12}$/, 'Invalid coupon format')
      .optional(),
    useSameAddress: z.boolean().default(true),
  })
  .refine(
    (data) => data.useSameAddress || data.billingAddress !== undefined,
    {
      message: 'Billing address required when not using shipping address',
      path: ['billingAddress'],
    }
  )
  .transform((data) => ({
    ...data,
    billingAddress: data.useSameAddress ? data.shippingAddress : data.billingAddress!,
  }));
```

### API Input Validation

**Next.js API route with Zod:**

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserSchema } from '@/schemas/user';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate and transform input
  const result = createUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        errors: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
      { status: 422, headers: { 'Content-Type': 'application/problem+json' } }
    );
  }

  // result.data is fully typed and transformed
  const user = await createUser(result.data);
  return NextResponse.json(user, { status: 201 });
}
```

**Reusable validation middleware:**

```typescript
// lib/validate.ts
import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (request: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const body = await request.json().catch(() => ({}));
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          type: 'https://api.example.com/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          errors: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 422 }
      );
    }

    return handler(request, result.data);
  };
}

// Usage
export const POST = withValidation(createUserSchema, async (request, data) => {
  const user = await createUser(data); // data is typed as CreateUserInput
  return NextResponse.json(user, { status: 201 });
});
```

### Query Parameter Validation

```typescript
// schemas/query.ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = paginationSchema.extend({
  q: z.string().min(1).max(200).optional(),
  category: z.string().uuid().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
}).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  { message: 'minPrice must be less than maxPrice', path: ['minPrice'] }
);

// Usage in API route
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const result = searchSchema.safeParse(params);

  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { page, limit, sort, order, q, category } = result.data;
  // ...
}
```

### Environment Variable Validation

```typescript
// env.ts — validate at startup, crash early on missing config
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_SECRET: z.string().min(32, 'API_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Validate once at module load — app crashes immediately if env is invalid
export const env = envSchema.parse(process.env);

// Type-safe environment access everywhere
// import { env } from '@/env';
// env.DATABASE_URL  // string (guaranteed)
// env.REDIS_URL     // string | undefined
```

### Shared Client/Server Validation

```typescript
// schemas/contact-form.ts — shared between client and server
import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.enum(['general', 'support', 'billing', 'partnership']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  attachments: z
    .array(z.object({
      name: z.string(),
      size: z.number().max(5 * 1024 * 1024, 'File must be under 5MB'),
      type: z.string().regex(/^(image|application\/pdf)/, 'Only images and PDFs allowed'),
    }))
    .max(3, 'Maximum 3 attachments')
    .optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
```

**Client-side (React Hook Form + Zod):**

```tsx
// components/contact-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema, type ContactFormData } from '@/schemas/contact-form';

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // ...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-base font-medium mb-2">Name</label>
        <input
          id="name"
          {...register('name')}
          className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-base font-medium mb-2">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-4 text-base rounded-lg bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

**Server-side (same schema):**

```typescript
// app/api/contact/route.ts
import { contactFormSchema } from '@/schemas/contact-form';
import { withValidation } from '@/lib/validate';

export const POST = withValidation(contactFormSchema, async (request, data) => {
  // data is already validated with the same schema used on the client
  await sendEmail(data);
  return NextResponse.json({ success: true });
});
```

### Custom Validators

```typescript
// schemas/validators.ts
import { z } from 'zod';

// Slug validator
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
  .min(1)
  .max(200);

// Phone number (E.164)
export const phoneNumber = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (use E.164 format: +1234567890)');

// URL that must be HTTPS in production
export const secureUrl = z
  .string()
  .url()
  .refine(
    (url) => process.env.NODE_ENV !== 'production' || url.startsWith('https://'),
    'HTTPS required in production'
  );

// Date string that parses to valid Date
export const dateString = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

// Currency amount in cents (avoid floating point)
export const currencyAmount = z
  .number()
  .int('Amount must be in cents (integer)')
  .nonnegative('Amount cannot be negative');

// JSON string that parses to object
export const jsonString = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON string' });
      return z.NEVER;
    }
  });
```

### Validation Error Formatting

```typescript
// lib/format-errors.ts
import { ZodError } from 'zod';

// Flat field-level errors for forms
export function flattenErrors(error: ZodError): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (!flat[path]) {
      flat[path] = issue.message; // First error per field
    }
  }
  return flat;
}

// Structured errors for API responses
export function formatApiErrors(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
    ...(e.code === 'invalid_enum_value' && {
      expected: (e as any).options,
      received: (e as any).received,
    }),
  }));
}
```

## Best Practices

1. **Validate at every boundary** — API inputs, form submissions, environment variables, webhook payloads, and external API responses. Never trust incoming data.
2. **Single source of truth** — Define Zod schemas once, share between client and server. Infer TypeScript types from schemas with `z.infer`.
3. **Use `safeParse`, not `parse`** — `safeParse` returns a result object; `parse` throws. Prefer `safeParse` in API handlers for controlled error responses.
4. **Transform during validation** — Use `.trim()`, `.toLowerCase()`, `.transform()` to normalize data as part of validation.
5. **Validate environment at startup** — Crash immediately if required env vars are missing. Do not discover missing config at runtime.
6. **Coerce query parameters** — URL params are always strings. Use `z.coerce.number()` for numeric query params.
7. **Prefer specific error messages** — `"Password must be at least 8 characters"` beats `"Invalid input"`.
8. **Never validate only on the client** — Client-side validation is for UX (fast feedback). Server-side validation is for security. Always do both.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Client-only validation | Malicious users bypass client checks | Always validate server-side, even if client validates too |
| Exposing Zod errors directly | Raw error structure confuses API consumers | Format errors into consistent API error shape |
| Using `parse` in API handlers | Unhandled ZodError crashes the endpoint | Use `safeParse` and return 422 with formatted errors |
| Missing `trim()` on strings | `" admin@test.com "` passes email validation but fails lookups | Always `.trim()` string inputs |
| Floating-point currency | `0.1 + 0.2 !== 0.3` causes billing bugs | Use integer cents: `z.number().int()` for amounts |
| No max length on strings | Unbounded input allows DoS via massive payloads | Set `.max()` on all string fields |
| Duplicating schemas | Client and server schemas diverge over time | Define once in `schemas/`, import everywhere |
| Not validating arrays | Array of 1M items accepted | Add `.max()` to array schemas and `.max()` to string items within |
