---
name: api-error-handling
description: API error handling patterns — error codes, RFC 7807 Problem Details, error boundaries, retry logic
layer: domain
category: backend
triggers:
  - "api error"
  - "error response"
  - "problem details"
  - "rfc 7807"
  - "api error handling"
  - "error codes api"
inputs:
  - "API requiring structured error responses"
  - "Error handling middleware design"
  - "Client-side retry logic requirements"
  - "Error code taxonomy for an API"
outputs:
  - "RFC 7807 Problem Details implementation"
  - "Error handling middleware"
  - "Typed error classes with error codes"
  - "Client-side retry and error recovery patterns"
linksTo:
  - error-handling
  - api-designer
  - zod
linkedFrom:
  - api-designer
  - error-handling
preferredNextSkills:
  - error-handling
  - api-designer
fallbackSkills:
  - zod
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# API Error Handling

## Purpose

Design consistent, machine-readable API error responses using RFC 7807 Problem Details, typed error classes, structured error codes, and resilient client-side error handling with retry logic. Covers both server-side error production and client-side error consumption.

## Key Patterns

### RFC 7807 Problem Details

**Standard error response format:**

```typescript
// types/error.ts
interface ProblemDetails {
  type: string;        // URI reference identifying the error type
  title: string;       // Short, human-readable summary
  status: number;      // HTTP status code
  detail?: string;     // Human-readable explanation specific to this occurrence
  instance?: string;   // URI reference for this specific occurrence
  [key: string]: unknown; // Extension fields
}

// Example response:
// {
//   "type": "https://api.example.com/errors/insufficient-funds",
//   "title": "Insufficient Funds",
//   "status": 422,
//   "detail": "Account balance is $10.00 but transaction requires $25.00",
//   "instance": "/transactions/txn_abc123",
//   "balance": 1000,
//   "required": 2500,
//   "currency": "USD"
// }
```

### Typed Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: `https://api.example.com/errors/${this.code}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      instance,
      ...this.details,
    };
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('not-found', 404, `${resource} with ID '${id}' not found`, {
      resource,
      resourceId: id,
    });
    this.name = 'Not Found';
  }
}

export class ValidationError extends AppError {
  constructor(errors: Array<{ field: string; message: string }>) {
    super('validation-error', 422, 'Request validation failed', {
      errors,
    });
    this.name = 'Validation Error';
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, conflictField: string) {
    super('conflict', 409, `${resource} with this ${conflictField} already exists`, {
      resource,
      conflictField,
    });
    this.name = 'Conflict';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('rate-limit-exceeded', 429, 'Too many requests', {
      retryAfter,
    });
    this.name = 'Rate Limit Exceeded';
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    // Never expose internal details to clients
    super('internal-error', 500, message);
    this.name = 'Internal Error';
  }
}
```

### Error Handling Middleware (Next.js)

```typescript
// lib/api-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors';

type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

function handleError(error: unknown, request: NextRequest): NextResponse {
  const instance = request.nextUrl.pathname;

  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      error.toProblemDetails(instance),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/problem+json',
          ...(error.code === 'rate-limit-exceeded' && {
            'Retry-After': String((error.details as any)?.retryAfter ?? 60),
          }),
        },
      }
    );
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const details: ProblemDetails = {
      type: 'https://api.example.com/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'Request body failed validation',
      instance,
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    };
    return NextResponse.json(details, {
      status: 422,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }

  // Unknown errors — log internally, return generic response
  console.error('Unhandled API error:', error);

  const details: ProblemDetails = {
    type: 'https://api.example.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance,
  };
  return NextResponse.json(details, {
    status: 500,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
```

**Using the middleware:**

```typescript
// app/api/products/[id]/route.ts
import { withErrorHandling } from '@/lib/api-handler';
import { NotFoundError } from '@/lib/errors';

export const GET = withErrorHandling(async (request, { params }) => {
  const { id } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
  });

  if (!product) throw new NotFoundError('Product', id);

  return NextResponse.json(product);
});
```

### Error Code Taxonomy

```typescript
// lib/error-codes.ts
export const ErrorCodes = {
  // Authentication (1xxx)
  AUTH_REQUIRED: 'auth-required',
  AUTH_INVALID_TOKEN: 'auth-invalid-token',
  AUTH_TOKEN_EXPIRED: 'auth-token-expired',
  AUTH_INSUFFICIENT_PERMISSIONS: 'auth-insufficient-permissions',

  // Validation (2xxx)
  VALIDATION_FAILED: 'validation-error',
  VALIDATION_MISSING_FIELD: 'validation-missing-field',
  VALIDATION_INVALID_FORMAT: 'validation-invalid-format',

  // Resource (3xxx)
  RESOURCE_NOT_FOUND: 'not-found',
  RESOURCE_CONFLICT: 'conflict',
  RESOURCE_GONE: 'gone',

  // Rate Limiting (4xxx)
  RATE_LIMIT_EXCEEDED: 'rate-limit-exceeded',
  QUOTA_EXCEEDED: 'quota-exceeded',

  // Business Logic (5xxx)
  INSUFFICIENT_FUNDS: 'insufficient-funds',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  FEATURE_DISABLED: 'feature-disabled',

  // Server (9xxx)
  INTERNAL_ERROR: 'internal-error',
  SERVICE_UNAVAILABLE: 'service-unavailable',
  DEPENDENCY_FAILURE: 'dependency-failure',
} as const;
```

### Client-Side Error Handling with Retry

```typescript
// lib/api-client.ts
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;    // ms
  maxDelay: number;     // ms
  retryableStatuses: number[];
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = DEFAULT_RETRY
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return await response.json();
      }

      // Parse Problem Details error
      const contentType = response.headers.get('Content-Type') ?? '';
      if (contentType.includes('application/problem+json')) {
        const problem: ProblemDetails = await response.json();

        // Check if retryable
        if (retryConfig.retryableStatuses.includes(problem.status)) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : exponentialBackoff(attempt, retryConfig);

          if (attempt < retryConfig.maxRetries) {
            await sleep(delay);
            continue;
          }
        }

        throw new ApiClientError(problem);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;

      if (error instanceof ApiClientError) throw error;

      // Network error — retry
      if (attempt < retryConfig.maxRetries) {
        await sleep(exponentialBackoff(attempt, retryConfig));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Request failed after all retries');
}

function exponentialBackoff(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.1 * Math.random(); // 10% jitter
  return Math.min(delay + jitter, config.maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiClientError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiClientError';
  }
}
```

### React Error Handling with TanStack Query

```typescript
// hooks/use-api-error.ts
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useApiErrorHandler() {
  const queryClient = useQueryClient();

  return (error: unknown) => {
    if (error instanceof ApiClientError) {
      const { problem } = error;

      switch (problem.status) {
        case 401:
          // Redirect to login
          queryClient.clear();
          window.location.href = '/login';
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error(problem.detail ?? 'Resource not found');
          break;
        case 422:
          // Validation errors — handled by form
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        default:
          toast.error(problem.detail ?? 'Something went wrong');
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }
  };
}
```

## Best Practices

1. **Always return `application/problem+json`** — Use RFC 7807 for all error responses. Clients can parse errors consistently.
2. **Never expose stack traces** — Log full errors server-side; return only safe, user-facing messages to clients.
3. **Use specific error codes** — `auth-token-expired` is actionable; `error` is not. Clients need codes to handle errors programmatically.
4. **Include `Retry-After` for 429s** — Tell clients exactly when to retry instead of making them guess.
5. **Validate early, fail fast** — Use Zod at the API boundary to catch bad input before business logic runs.
6. **Use exponential backoff with jitter** — Prevents retry storms. Always cap with a max delay.
7. **Separate client errors from server errors** — 4xx = client's fault (do not retry), 5xx = server's fault (may retry).
8. **Log correlation IDs** — Include a request ID in error responses and logs for debugging: `instance: "/api/orders/req_abc123"`.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Generic error messages | Client cannot determine what went wrong or how to fix it | Use specific error codes and detailed messages |
| Exposing internal errors | Stack traces and DB errors leak implementation details | Catch all errors; return generic 500 for unknowns |
| No retry logic for transient failures | Temporary network/server issues cause permanent failures | Implement retry with exponential backoff for 5xx and 429 |
| Retrying non-idempotent requests | POST retries create duplicate resources | Only auto-retry GET/PUT/DELETE; use idempotency keys for POST |
| Inconsistent error format | Different endpoints return errors in different shapes | Use middleware to normalize all errors to Problem Details |
| Swallowing errors silently | Bugs hidden, users confused by blank failures | Always surface errors to users; always log server-side |
| Missing validation error field paths | User does not know which field failed | Include `field` path in validation error details |
| Caching error responses | CDN serves 500 to all users until TTL expires | Set `Cache-Control: no-store` on all error responses |
