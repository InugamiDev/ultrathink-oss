---
name: api-toolkit
description: "Unified API design + ops toolkit — REST/GraphQL design with OpenAPI specs, error handling (RFC 7807, codes, retry-after), versioning (URL/header/query, deprecation, migration), caching (HTTP headers, ETag, SWR, CDN), rate design, throttling, API gateway routing, request composition/aggregation. Single entry point for API contract + operational concerns."
layer: domain
category: backend
triggers: ["API endpoint", "API error handling", "API versioning", "GraphQL schema", "OpenAPI spec", "REST API", "api caching", "api deprecation", "api error", "api error handling", "api gateway", "api proxy", "api version", "api versioning", "breaking change", "cache control", "cache headers", "cdn cache", "design API", "error codes api", "error response", "etag", "gateway pattern", "ingress", "isr", "pagination", "problem details", "rfc 7807", "service mesh", "stale while revalidate", "v1 v2"]
---

# api-toolkit

Unified API design + ops toolkit — REST/GraphQL design with OpenAPI specs, error handling (RFC 7807, codes, retry-after), versioning (URL/header/query, deprecation, migration), caching (HTTP headers, ETag, SWR, CDN), rate design, throttling, API gateway routing, request composition/aggregation. Single entry point for API contract + operational concerns.


## Absorbs

- `api-designer`
- `api-error-handling`
- `api-versioning`
- `api-caching`
- `api-rate-design`
- `api-throttling`
- `api-gateway`
- `api-composition`


---

## From `api-designer`

> REST and GraphQL API design with OpenAPI specifications, versioning strategies, pagination, and error contracts

# API Designer

## Purpose

This skill designs APIs that are consistent, predictable, well-documented, and a pleasure to consume. It covers REST API design with OpenAPI specifications, GraphQL schema design, error handling contracts, pagination strategies, versioning, and authentication patterns.

## Key Concepts

### REST Design Principles

```
1. RESOURCES, NOT ACTIONS:
   Good: GET /users/123         (fetch user)
   Bad:  GET /getUser?id=123    (RPC-style)

2. HTTP METHODS HAVE MEANING:
   GET    -> Read (idempotent, safe)
   POST   -> Create (not idempotent)
   PUT    -> Full replace (idempotent)
   PATCH  -> Partial update (idempotent)
   DELETE -> Remove (idempotent)

3. STATUS CODES HAVE MEANING:
   2xx -> Success
   3xx -> Redirect
   4xx -> Client error (your fault)
   5xx -> Server error (our fault)

4. URLS ARE NOUNS, NOT VERBS:
   Good: POST /orders           (create order)
   Bad:  POST /createOrder

5. COLLECTIONS ARE PLURAL:
   Good: /users, /orders, /products
   Bad:  /user, /order, /product

6. NESTING FOR RELATIONSHIPS:
   /users/123/orders        (orders belonging to user 123)
   /orders/456/items        (items in order 456)
   Limit nesting to 2 levels max
```

### HTTP Status Code Guide

```
SUCCESS:
  200 OK            -> GET, PUT, PATCH (with response body)
  201 Created       -> POST (resource created, include Location header)
  204 No Content    -> DELETE, PUT/PATCH (no response body needed)

CLIENT ERRORS:
  400 Bad Request   -> Malformed request, validation failure
  401 Unauthorized  -> Missing or invalid authentication
  403 Forbidden     -> Authenticated but not authorized
  404 Not Found     -> Resource does not exist
  405 Not Allowed   -> HTTP method not supported for this resource
  409 Conflict      -> Resource state conflict (duplicate, version mismatch)
  422 Unprocessable -> Request is well-formed but semantically invalid
  429 Too Many Req  -> Rate limit exceeded

SERVER ERRORS:
  500 Internal Error -> Unexpected server failure
  502 Bad Gateway    -> Upstream service failure
  503 Unavailable    -> Service temporarily down (maintenance, overload)
  504 Gateway Timeout -> Upstream service timeout
```

### GraphQL Schema Design

```graphql
# Types map to domain resources
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  posts(first: Int = 10, after: String): PostConnection!
  createdAt: DateTime!
}

# Connections for pagination (Relay spec)
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Input types for mutations
input CreateUserInput {
  email: String!
  name: String!
  role: Role = MEMBER
}

# Mutations return payloads, not raw types
type CreateUserPayload {
  user: User
  userErrors: [UserError!]!
}

type UserError {
  field: [String!]
  message: String!
  code: UserErrorCode!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}
```

## API Design Workflow

### Phase 1: Resource Identification

```
DOMAIN: E-commerce platform

RESOURCES:
  users       -> Customer accounts
  products    -> Items for sale
  orders      -> Purchase transactions
  order-items -> Line items within an order
  reviews     -> Product reviews by users
  categories  -> Product categorization

RELATIONSHIPS:
  user -> has many -> orders
  order -> has many -> order-items
  order-item -> belongs to -> product
  product -> has many -> reviews
  product -> belongs to many -> categories
```

### Phase 2: Endpoint Design

```
RESOURCE: orders

LIST:     GET    /api/v1/orders                  -> 200 OrderList
CREATE:   POST   /api/v1/orders                  -> 201 Order
READ:     GET    /api/v1/orders/:id              -> 200 Order
UPDATE:   PATCH  /api/v1/orders/:id              -> 200 Order
DELETE:   DELETE /api/v1/orders/:id              -> 204 (no body)

SUB-RESOURCES:
  GET    /api/v1/orders/:id/items               -> 200 OrderItemList
  POST   /api/v1/orders/:id/items               -> 201 OrderItem

ACTIONS (non-CRUD operations):
  POST   /api/v1/orders/:id/cancel              -> 200 Order
  POST   /api/v1/orders/:id/refund              -> 200 Refund

FILTERING:
  GET    /api/v1/orders?status=pending&sort=-created_at&limit=20
```

### Phase 3: Request/Response Schema

```yaml
Order:
  type: object
  required: [id, userId, status, items, total, createdAt]
  properties:
    id:
      type: string
      format: uuid
    userId:
      type: string
      format: uuid
    status:
      type: string
      enum: [draft, pending, confirmed, shipped, delivered, cancelled]
    items:
      type: array
      items:
        $ref: "#/components/schemas/OrderItem"
    total:
      type: object
      properties:
        amount:
          type: integer
          description: "Amount in smallest currency unit (cents)"
        currency:
          type: string
    createdAt:
      type: string
      format: date-time
```

## Error Response Contract

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid fields",
    "details": [
      {
        "field": "items[0].quantity",
        "message": "Must be a positive integer",
        "value": -1
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2026-03-02T10:30:00Z",
    "docs": "https://api.example.com/docs/errors#VALIDATION_ERROR"
  }
}
```

### Error Code Catalog

```
AUTHENTICATION:
  AUTH_REQUIRED          401  "Authentication is required"
  AUTH_INVALID_TOKEN     401  "The provided token is invalid or expired"
  AUTH_INSUFFICIENT_SCOPE 403 "Token lacks required scope: {scope}"

VALIDATION:
  VALIDATION_ERROR       400  "Request validation failed" (with details[])
  INVALID_JSON           400  "Request body is not valid JSON"
  MISSING_FIELD          400  "Required field '{field}' is missing"

RESOURCES:
  NOT_FOUND              404  "Resource '{type}' with id '{id}' not found"
  ALREADY_EXISTS         409  "Resource with {field}='{value}' already exists"

STATE:
  INVALID_STATE          409  "Cannot {action} when status is {status}"
  RATE_LIMITED           429  "Rate limit exceeded. Retry after {seconds} seconds"

SERVER:
  INTERNAL_ERROR         500  "An unexpected error occurred"
  SERVICE_UNAVAILABLE    503  "Service temporarily unavailable"
```

## Pagination Strategies

### Cursor-Based (Recommended)

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIwfQ",
    "prevCursor": "eyJpZCI6MTAxfQ"
  }
}
```

Advantages: Consistent under concurrent writes, performant (no OFFSET), works with real-time data.
Disadvantages: Cannot jump to arbitrary page, cursor is opaque.

### Offset-Based (Simple but fragile)

```json
{
  "data": [],
  "pagination": {
    "total": 1547,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

Advantages: Simple, can jump to any page, client knows total count.
Disadvantages: Slow for large offsets, inconsistent if data changes between pages.

## Versioning Strategies

### URL Path Versioning (Recommended)

```
/api/v1/users
/api/v2/users
```

Explicit, easy to route, easy to document.

### Version Lifecycle

```
ACTIVE:       v3 (current)     -- Full support, new features
MAINTAINED:   v2 (previous)    -- Security fixes, critical bugs only
DEPRECATED:   v1 (legacy)      -- 6-month sunset notice, read-only
SUNSET:       v0 (removed)     -- Returns 410 Gone with upgrade guide
```

## OpenAPI Specification Template

```yaml
openapi: "3.1.0"
info:
  title: Example API
  version: "1.0.0"
  description: API for managing orders and products.

servers:
  - url: https://api.example.com/v1
    description: Production

security:
  - bearerAuth: []

paths:
  /orders:
    get:
      operationId: listOrders
      summary: List orders
      tags: [Orders]
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        "200":
          description: List of orders
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Anti-Patterns

1. **Verbs in URLs**: `/createUser`, `/deleteOrder` -- use HTTP methods instead
2. **Inconsistent naming**: Mixing camelCase and snake_case in the same API
3. **Exposing internal IDs**: Auto-increment database IDs leak information -- use UUIDs
4. **No pagination**: Returning unbounded lists will crash clients or servers
5. **Inconsistent error format**: Different error shapes from different endpoints
6. **Breaking changes without versioning**: Removing or renaming fields breaks consumers
7. **Over-nesting**: `/users/123/orders/456/items/789/reviews` is too deep -- flatten or use query parameters

## Best Practices

- Use **data-modeling** to align API resource schemas with database schemas
- Use **error-handling** to implement the error response contract in application code
- Use **mermaid** to generate sequence diagrams documenting key API flows
- Generate OpenAPI specs and validate them with tools like `spectral` or `openapi-generator`
- Keep request/response schemas tight: require what you need, reject what you do not
- Use `additionalProperties: false` in JSON Schema to prevent extra fields sneaking through


---

## From `api-error-handling`

> API error handling patterns — error codes, RFC 7807 Problem Details, error boundaries, retry logic

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


---

## From `api-versioning`

> API versioning strategies — URL path, header, query parameter approaches. Version lifecycle management, deprecation policies, backward compatibility, and migration planning

# API Versioning Specialist

## Purpose

API versioning is the discipline of evolving an API without breaking existing consumers. A wrong versioning strategy causes client outages, support burden, and migration nightmares. This skill covers the three major strategies, when to use each, how to implement version routing, deprecation lifecycle, and backward-compatible evolution patterns that often avoid versioning entirely.

## Key Concepts

### The Three Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL Path** | `/api/v2/users` | Explicit, easy to route, cacheable | URL pollution, hard to sunset |
| **Header** | `Accept: application/vnd.api.v2+json` | Clean URLs, content negotiation | Hidden, harder to test in browser |
| **Query Param** | `/api/users?version=2` | Easy to test, explicit | Pollutes query string, cache key issues |

### When to Version vs Evolve

```
Can you make the change WITHOUT breaking existing clients?
  |-- YES -> Do NOT version. Use backward-compatible evolution.
  |   |-- Add new fields (old clients ignore them)
  |   |-- Add new endpoints
  |   |-- Add optional parameters
  |   +-- Use feature flags
  +-- NO -> Version the API.
      |-- Removing or renaming fields
      |-- Changing field types
      |-- Changing response structure
      |-- Changing authentication flow
      +-- Changing error format
```

### Version Lifecycle

```
+----------+     +----------+     +----------+     +----------+
|  Active   |---->|  Stable  |---->|Deprecated|---->|  Sunset  |
| (latest)  |     |(supported)|    |(warnings) |    |(removed) |
+----------+     +----------+     +----------+     +----------+
   v3 (now)         v2               v1              v0
```

## Workflow

### Step 1: Choose a Strategy

**Use URL Path Versioning when:**
- Building a public API with many third-party consumers
- Consumers need to pin to specific versions easily
- You want maximum visibility and simplicity

**Use Header Versioning when:**
- Building an internal API or platform API
- You want clean URLs for REST purity
- Content negotiation is already part of your architecture

**Use Query Param Versioning when:**
- Rapid prototyping or internal tools
- You need easy version switching in browser/curl testing
- API gateway handles routing and can strip the param

### Step 2: Implement Version Routing

#### URL Path Versioning (Express/Node.js)

```typescript
// routes/v1/users.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const users = await db.user.findMany();
  // v1 response format
  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
  });
});

export default router;
```

```typescript
// routes/v2/users.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const users = await db.user.findMany({ include: { profile: true } });
  // v2 response format — different structure
  res.json({
    data: users.map((u) => ({
      id: u.id,
      fullName: u.name,        // renamed field
      email: u.email,
      profile: u.profile,       // new nested object
      createdAt: u.createdAt,   // new field
    })),
    meta: {
      total: users.length,
      version: 'v2',
    },
  });
});

export default router;
```

```typescript
// app.ts — mount versioned routes
import express from 'express';
import v1Users from './routes/v1/users';
import v2Users from './routes/v2/users';

const app = express();

app.use('/api/v1/users', v1Users);
app.use('/api/v2/users', v2Users);

// Default latest version redirect
app.use('/api/users', (req, res) => {
  res.redirect(308, `/api/v2/users${req.url}`);
});
```

#### Header-Based Versioning (Next.js API Routes)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const version = parseApiVersion(request);

  switch (version) {
    case 1:
      return handleV1(request);
    case 2:
      return handleV2(request);
    default:
      return NextResponse.json(
        { error: `Unsupported API version: ${version}` },
        { status: 400 }
      );
  }
}

function parseApiVersion(request: NextRequest): number {
  // Check Accept header: application/vnd.myapi.v2+json
  const accept = request.headers.get('accept') ?? '';
  const match = accept.match(/application\/vnd\.myapi\.v(\d+)\+json/);
  if (match) return parseInt(match[1], 10);

  // Check custom header fallback
  const versionHeader = request.headers.get('x-api-version');
  if (versionHeader) return parseInt(versionHeader, 10);

  // Default to latest stable
  return 2;
}

async function handleV1(request: NextRequest) {
  const users = await db.user.findMany();
  const response = NextResponse.json({ users });

  // Add deprecation warning
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', 'Sat, 01 Nov 2025 00:00:00 GMT');
  response.headers.set('Link', '</api/v2/users>; rel="successor-version"');

  return response;
}

async function handleV2(request: NextRequest) {
  const users = await db.user.findMany({ include: { profile: true } });
  return NextResponse.json({
    data: users,
    meta: { version: 'v2' },
  });
}
```

#### API Gateway Routing (nginx)

```nginx
# Version routing at the gateway level
upstream api_v1 {
    server api-v1.internal:3000;
}

upstream api_v2 {
    server api-v2.internal:3000;
}

server {
    listen 80;

    # URL path versioning
    location /api/v1/ {
        proxy_pass http://api_v1/;
        add_header X-API-Deprecated "true";
        add_header Sunset "Sat, 01 Nov 2025 00:00:00 GMT";
    }

    location /api/v2/ {
        proxy_pass http://api_v2/;
    }

    # Header-based versioning
    location /api/ {
        set $backend "api_v2";

        if ($http_x_api_version = "1") {
            set $backend "api_v1";
        }

        proxy_pass http://$backend/;
    }
}
```

### Step 3: Implement Deprecation Headers

```typescript
// middleware/deprecation.ts
import { Request, Response, NextFunction } from 'express';

interface DeprecationConfig {
  version: string;
  sunsetDate: string;       // ISO 8601
  successorUrl?: string;
  migrationGuideUrl?: string;
}

const deprecatedVersions: Record<string, DeprecationConfig> = {
  v1: {
    version: 'v1',
    sunsetDate: '2025-11-01T00:00:00Z',
    successorUrl: '/api/v2',
    migrationGuideUrl: 'https://docs.example.com/api/migration/v1-to-v2',
  },
};

export function deprecationMiddleware(req: Request, res: Response, next: NextFunction) {
  const versionMatch = req.path.match(/\/api\/(v\d+)\//);
  if (!versionMatch) return next();

  const version = versionMatch[1];
  const config = deprecatedVersions[version];

  if (config) {
    res.set('Deprecation', 'true');
    res.set('Sunset', new Date(config.sunsetDate).toUTCString());

    const links: string[] = [];
    if (config.successorUrl) {
      links.push(`<${config.successorUrl}>; rel="successor-version"`);
    }
    if (config.migrationGuideUrl) {
      links.push(`<${config.migrationGuideUrl}>; rel="deprecation"`);
    }
    if (links.length > 0) {
      res.set('Link', links.join(', '));
    }

    // Log deprecated version usage for tracking migration progress
    console.warn(`Deprecated API ${version} called: ${req.method} ${req.path}`, {
      clientId: req.headers['x-client-id'],
      userAgent: req.headers['user-agent'],
    });
  }

  next();
}
```

### Step 4: Backward-Compatible Evolution (Avoid Versioning)

```typescript
// Strategy 1: Additive changes — add fields, never remove
interface UserResponseV1 {
  id: string;
  name: string;
  email: string;
}

// Just add new fields — old clients ignore them
interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;     // NEW — old clients ignore
  role: string;          // NEW — old clients ignore
}

// Strategy 2: Response shaping via fields parameter
// GET /api/users?fields=id,name,email,avatarUrl
router.get('/users', async (req, res) => {
  const fields = req.query.fields?.split(',') ?? null;
  const users = await db.user.findMany();

  const shaped = users.map((user) => {
    if (!fields) return user;
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => fields.includes(key))
    );
  });

  res.json({ data: shaped });
});

// Strategy 3: Feature flags in API responses
router.get('/users', async (req, res) => {
  const includeProfile = req.query.include?.includes('profile');
  const users = await db.user.findMany({
    include: includeProfile ? { profile: true } : undefined,
  });
  res.json({ data: users });
});
```

### Step 5: Migration Plan Template

```markdown
## API Migration: v1 -> v2

### Timeline
| Phase | Date | Action |
|-------|------|--------|
| Announce | 2025-01-15 | Email consumers, update docs |
| Dual-run | 2025-01-15 | v1 and v2 both active |
| Deprecate | 2025-06-01 | v1 returns Deprecation headers |
| Sunset warning | 2025-09-01 | v1 returns 299 Warning header |
| Sunset | 2025-11-01 | v1 returns 410 Gone |

### Breaking Changes
1. name field renamed to fullName
2. Response wrapper changed from { users: [] } to { data: [], meta: {} }
3. Date fields changed from Unix timestamps to ISO 8601

### Migration Steps for Consumers
1. Update response parsing to use data wrapper
2. Rename name references to fullName
3. Update date parsing to handle ISO 8601
4. Change base URL from /api/v1/ to /api/v2/
```

## Best Practices

- Prefer backward-compatible evolution over new versions whenever possible
- Use URL path versioning for public APIs — it is the most widely understood pattern
- Always include `Deprecation`, `Sunset`, and `Link` headers on deprecated versions
- Log deprecated version usage to track migration progress and identify lagging consumers
- Maintain no more than 2 active versions at a time (N and N-1)
- Version the entire API, not individual endpoints (partial versioning creates confusion)
- Set concrete sunset dates and communicate them aggressively
- Use API gateways for version routing in microservice architectures
- Document every breaking change with before/after examples

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Versioning too early or too often | Exhaust backward-compatible options first (additive fields, optional params) |
| No deprecation timeline | Set and publish concrete sunset dates from day one of the new version |
| Breaking changes without migration guide | Provide before/after examples, SDK updates, and a migration checklist |
| Removing old version without usage tracking | Log deprecated calls with client ID; only sunset when usage drops below threshold |
| Different versioning per endpoint | Version the whole API uniformly — partial versioning confuses consumers |
| No default version behavior | Always default unversioned requests to the latest stable version |
| Forgetting to version error formats | Error response structure changes ARE breaking — include in version scope |

## Examples

### Version Discovery Endpoint

```typescript
// GET /api — API root with version discovery
app.get('/api', (req, res) => {
  res.json({
    versions: {
      v1: {
        status: 'deprecated',
        url: '/api/v1',
        sunset: '2025-11-01',
        docs: 'https://docs.example.com/api/v1',
      },
      v2: {
        status: 'stable',
        url: '/api/v2',
        docs: 'https://docs.example.com/api/v2',
      },
      v3: {
        status: 'beta',
        url: '/api/v3',
        docs: 'https://docs.example.com/api/v3',
      },
    },
    current: 'v2',
    latest: 'v3',
  });
});
```

### Sunset Response Handler

```typescript
// Return 410 Gone for fully sunset versions
app.use('/api/v0', (req, res) => {
  res.status(410).json({
    error: 'Gone',
    message: 'API v0 has been sunset as of 2024-06-01.',
    migrationGuide: 'https://docs.example.com/api/migration/v0-to-v2',
    currentVersion: {
      url: '/api/v2',
      docs: 'https://docs.example.com/api/v2',
    },
  });
});
```

### SDK Version Wrapper

```typescript
// Client-side SDK that handles versioning transparently
class ApiClient {
  private baseUrl: string;
  private version: string;

  constructor(options: { baseUrl: string; version?: string }) {
    this.baseUrl = options.baseUrl;
    this.version = options.version ?? 'v2';
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api/${this.version}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    // Check for deprecation warnings
    if (response.headers.get('Deprecation') === 'true') {
      const sunset = response.headers.get('Sunset');
      console.warn(
        `API ${this.version} is deprecated. Sunset: ${sunset}. ` +
        `Please migrate to the latest version.`
      );
    }

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.json();
  }

  getUsers() {
    return this.request<{ data: User[]; meta: Meta }>('/users');
  }
}
```


---

## From `api-caching`

> API caching strategies — HTTP cache headers, ETag, stale-while-revalidate, CDN caching, ISR

# API Caching Strategies

## Purpose

Design and implement effective API caching at every layer — HTTP cache headers, conditional requests with ETags, stale-while-revalidate patterns, CDN edge caching, and Next.js ISR. Reduces latency, lowers origin load, and improves user experience.

## Key Patterns

### HTTP Cache Headers

**Cache-Control directives:**

```typescript
// Next.js API route with proper cache headers
import { NextRequest, NextResponse } from 'next/server';

// Public, cacheable by CDN and browser
export async function GET(request: NextRequest) {
  const data = await fetchProducts();

  return NextResponse.json(data, {
    headers: {
      // CDN + browser cache for 60s, serve stale up to 1 hour while revalidating
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
    },
  });
}

// Private, user-specific data — no CDN caching
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const profile = await fetchProfile(user.id);

  return NextResponse.json(profile, {
    headers: {
      // Browser-only cache, 5 min, must revalidate after
      'Cache-Control': 'private, max-age=300, must-revalidate',
    },
  });
}

// No caching — real-time data
export async function GET() {
  const liveData = await fetchLiveMetrics();

  return NextResponse.json(liveData, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
```

**Cache-Control cheat sheet:**

| Directive | Meaning |
|-----------|---------|
| `public` | CDN and browser can cache |
| `private` | Browser only, no CDN |
| `s-maxage=N` | CDN cache duration (overrides max-age for CDN) |
| `max-age=N` | Browser cache duration in seconds |
| `stale-while-revalidate=N` | Serve stale for N seconds while fetching fresh |
| `stale-if-error=N` | Serve stale for N seconds if origin errors |
| `no-cache` | Must revalidate before using cached version |
| `no-store` | Never cache |
| `must-revalidate` | Do not serve stale after max-age expires |
| `immutable` | Never changes — skip revalidation (use with hashed URLs) |

### ETag / Conditional Requests

**Server-side ETag generation:**

```typescript
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const data = await fetchProducts();
  const body = JSON.stringify(data);

  // Generate ETag from content hash
  const etag = `"${createHash('md5').update(body).digest('hex')}"`;

  // Check If-None-Match header
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
```

**Weak ETags for semantic equivalence:**

```typescript
// Weak ETag — content is semantically equivalent but may differ in encoding
const weakEtag = `W/"${version}-${lastModified.getTime()}"`;
// Use when minor formatting changes should not invalidate cache
```

### Stale-While-Revalidate Pattern

**Application-level SWR (not HTTP header):**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { maxAge: number; staleWhileRevalidate: number }
): Promise<T> {
  const cached = await redis.get<CacheEntry<T>>(key);
  const now = Date.now();

  if (cached) {
    const age = now - cached.timestamp;

    if (age < opts.maxAge * 1000) {
      // Fresh — return immediately
      return cached.data;
    }

    if (age < (opts.maxAge + opts.staleWhileRevalidate) * 1000) {
      // Stale but within revalidation window — return stale, refresh in background
      refreshCache(key, fetcher).catch(console.error);
      return cached.data;
    }
  }

  // Expired or no cache — fetch fresh
  const data = await fetcher();
  await redis.set(key, { data, timestamp: now } satisfies CacheEntry<T>, {
    ex: opts.maxAge + opts.staleWhileRevalidate,
  });
  return data;
}

async function refreshCache<T>(key: string, fetcher: () => Promise<T>) {
  const data = await fetcher();
  await redis.set(key, { data, timestamp: Date.now() }, { ex: 3600 });
}

// Usage
const products = await swrFetch(
  'products:featured',
  () => db.query.products.findMany({ where: eq(products.featured, true) }),
  { maxAge: 60, staleWhileRevalidate: 300 }
);
```

### CDN Caching with Vercel / Cloudflare

**Vercel edge caching:**

```typescript
// Next.js App Router — cached at Vercel's edge
export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function ProductsPage() {
  const products = await fetchProducts(); // cached at build + revalidated
  return <ProductList products={products} />;
}

// On-demand revalidation via webhook
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag } = await request.json();

  if (tag) {
    revalidateTag(tag); // Invalidate all fetches with this tag
  } else if (path) {
    revalidatePath(path); // Invalidate specific page
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

**Fetch with cache tags (Next.js):**

```typescript
// Tag-based cache invalidation
const products = await fetch('https://api.example.com/products', {
  next: {
    tags: ['products'],
    revalidate: 3600,
  },
});

// Later, invalidate all product caches
revalidateTag('products');
```

**Cloudflare Cache API (Workers):**

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);

    // Check cache
    let response = await cache.match(cacheKey);
    if (response) return response;

    // Fetch from origin
    response = await fetch(request);
    response = new Response(response.body, response);
    response.headers.set('Cache-Control', 'public, s-maxage=600');

    // Store in cache (non-blocking)
    const ctx = (globalThis as any).waitUntil;
    ctx?.(cache.put(cacheKey, response.clone()));

    return response;
  },
};
```

### Cache Invalidation Strategies

**Pattern: Event-driven invalidation:**

```typescript
// When product is updated, invalidate related caches
async function updateProduct(id: string, data: ProductUpdate) {
  await db.update(products).set(data).where(eq(products.id, id));

  // Invalidate specific product cache
  await redis.del(`product:${id}`);

  // Invalidate list caches that include this product
  await redis.del('products:featured');
  await redis.del(`products:category:${data.categoryId}`);

  // Trigger CDN revalidation
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/revalidate`, {
    method: 'POST',
    headers: {
      'x-revalidation-secret': process.env.REVALIDATION_SECRET!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tag: 'products' }),
  });
}
```

**Pattern: Cache key versioning:**

```typescript
// Bust cache by changing key version
const CACHE_VERSION = 'v2';

function cacheKey(resource: string, id: string): string {
  return `${CACHE_VERSION}:${resource}:${id}`;
}
```

### Vary Header — Cache by Request Attributes

```typescript
// Different cached versions for different Accept-Language values
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600',
    'Vary': 'Accept-Language, Accept-Encoding',
  },
});
```

## Best Practices

1. **Cache close to the user** — Browser > CDN edge > application cache > database cache. Each layer reduces latency.
2. **Use `s-maxage` for CDN, `max-age` for browser** — Keep CDN cache long, browser cache short so users see updates after CDN revalidation.
3. **Always set `Vary` for personalized responses** — Without it, CDNs serve the wrong cached version to different users.
4. **Use `stale-while-revalidate`** — Users get instant responses while fresh data loads in background.
5. **Hash-based URLs for static assets** — Use `immutable` directive with content-hashed filenames (`style.a1b2c3.css`).
6. **Invalidate explicitly, not by TTL alone** — Event-driven invalidation (on write) is more reliable than hoping TTL expires at the right time.
7. **Monitor cache hit rates** — Track `x-cache: HIT` vs `MISS` in your CDN. Aim for >90% hit rate on static content.
8. **Never cache errors** — Ensure 4xx/5xx responses have `Cache-Control: no-store` to avoid caching failures.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Missing `Vary` header | CDN serves cached response for wrong user/language | Add `Vary: Cookie` or `Vary: Authorization` for personalized content |
| Caching authenticated responses on CDN | User A sees User B's data | Use `Cache-Control: private` for auth-dependent responses |
| No cache invalidation strategy | Stale data persists until TTL expires | Implement webhook-based or event-driven invalidation |
| Over-caching POST/PUT responses | Mutations return stale data | Only cache GET requests; bust related GET caches on mutation |
| CDN caches error responses | 500 error served to all users for TTL duration | Set `Cache-Control: no-store` on error responses |
| Cache stampede on expiry | All caches expire simultaneously, hammering origin | Use jitter: add random seconds to TTL, or use SWR pattern |
| Forgetting `no-store` on sensitive data | Browser disk-caches private information | Use `Cache-Control: no-store` for PII, tokens, financial data |
| ISR with slow revalidation | First visitor after TTL gets slow response | Use `stale-while-revalidate` so first visitor still gets stale fast |


---

## From `api-gateway`

> API gateway patterns — routing, rate limiting, authentication, request transformation, and service mesh.

# API Gateway Patterns

## Purpose

Provide expert guidance on API gateway architecture, routing strategies, rate limiting, authentication delegation, request/response transformation, circuit breaking, and service mesh integration. Covers both dedicated gateway solutions (Kong, AWS API Gateway) and custom gateway implementations.

## Gateway Responsibilities

An API gateway is the single entry point for all client requests. Core responsibilities:

1. **Routing** — Direct requests to the correct backend service
2. **Authentication** — Validate tokens, API keys before forwarding
3. **Rate Limiting** — Protect backends from overload
4. **Request Transformation** — Modify headers, body, query params
5. **Response Aggregation** — Combine multiple service responses (BFF pattern)
6. **Circuit Breaking** — Fail fast when a backend is unhealthy
7. **Observability** — Centralized logging, metrics, tracing

## Custom Gateway with Node.js

**Express-based gateway skeleton:**

```typescript
// gateway/src/index.ts
import express from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { rateLimiter } from './middleware/rate-limiter';
import { authMiddleware } from './middleware/auth';
import { circuitBreaker } from './middleware/circuit-breaker';
import { requestLogger } from './middleware/logger';

const app = express();

// Global middleware
app.use(requestLogger);
app.use(rateLimiter({ windowMs: 60_000, max: 100 }));

// Service routing
const services: Record<string, Options> = {
  '/api/users': {
    target: process.env.USER_SERVICE_URL,
    pathRewrite: { '^/api/users': '' },
    changeOrigin: true,
  },
  '/api/orders': {
    target: process.env.ORDER_SERVICE_URL,
    pathRewrite: { '^/api/orders': '' },
    changeOrigin: true,
  },
  '/api/products': {
    target: process.env.PRODUCT_SERVICE_URL,
    pathRewrite: { '^/api/products': '' },
    changeOrigin: true,
  },
};

for (const [path, config] of Object.entries(services)) {
  app.use(
    path,
    authMiddleware,
    circuitBreaker(config.target as string),
    createProxyMiddleware(config),
  );
}

// Health check (no auth)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(3000);
```

## Rate Limiting Strategies

**Token bucket per API key:**

```typescript
// gateway/src/middleware/rate-limiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Tiered rate limits by plan
const limiters = {
  free: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:free',
    points: 100,      // requests
    duration: 60,      // per 60 seconds
    blockDuration: 60, // block for 60s when exceeded
  }),
  pro: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:pro',
    points: 1000,
    duration: 60,
  }),
  enterprise: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:enterprise',
    points: 10000,
    duration: 60,
  }),
};

export async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const plan = await getPlanForKey(apiKey); // look up plan
  const limiter = limiters[plan] ?? limiters.free;

  try {
    const result = await limiter.consume(apiKey ?? req.ip);
    // Set standard rate limit headers
    res.set({
      'X-RateLimit-Limit': String(limiter.points),
      'X-RateLimit-Remaining': String(result.remainingPoints),
      'X-RateLimit-Reset': String(Math.ceil(result.msBeforeNext / 1000)),
    });
    next();
  } catch (rateLimiterRes) {
    res.set({
      'Retry-After': String(Math.ceil(rateLimiterRes.msBeforeNext / 1000)),
      'X-RateLimit-Limit': String(limiter.points),
      'X-RateLimit-Remaining': '0',
    });
    res.status(429).json({ error: 'Too many requests' });
  }
}
```

## Authentication Delegation

**JWT validation at the gateway:**

```typescript
// gateway/src/middleware/auth.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL!));

const PUBLIC_PATHS = ['/health', '/api/auth/login', '/api/auth/register'];

export async function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some((p) => req.originalUrl.startsWith(p))) {
    return next();
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    // Forward user context to downstream services
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-roles'] = (payload.roles as string[])?.join(',');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

## Circuit Breaker

```typescript
// gateway/src/middleware/circuit-breaker.ts
import CircuitBreaker from 'opossum';

const breakers = new Map<string, CircuitBreaker>();

interface BreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

const defaults: BreakerOptions = {
  timeout: 5000,           // 5s request timeout
  errorThresholdPercentage: 50, // open circuit at 50% errors
  resetTimeout: 30000,     // try again after 30s
};

export function circuitBreaker(serviceUrl: string) {
  return (req, res, next) => {
    let breaker = breakers.get(serviceUrl);
    if (!breaker) {
      breaker = new CircuitBreaker(
        async () => next(),
        defaults,
      );

      breaker.on('open', () =>
        console.warn(`Circuit OPEN for ${serviceUrl}`),
      );
      breaker.on('halfOpen', () =>
        console.info(`Circuit HALF-OPEN for ${serviceUrl}`),
      );
      breaker.on('close', () =>
        console.info(`Circuit CLOSED for ${serviceUrl}`),
      );

      breakers.set(serviceUrl, breaker);
    }

    breaker.fire().catch(() => {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceUrl,
      });
    });
  };
}
```

## Request/Response Transformation

```typescript
// gateway/src/middleware/transform.ts

// Add correlation ID for distributed tracing
export function correlationId(req, _res, next) {
  req.headers['x-correlation-id'] =
    req.headers['x-correlation-id'] ?? crypto.randomUUID();
  next();
}

// Strip internal headers from responses
export function stripInternalHeaders(_req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    res.removeHeader('x-internal-service-id');
    res.removeHeader('x-internal-trace');
    return originalSend.call(this, body);
  };
  next();
}

// Response aggregation (BFF pattern)
export async function aggregateUserProfile(req, res) {
  const userId = req.params.id;
  const [user, orders, preferences] = await Promise.allSettled([
    fetch(`${USER_SERVICE}/users/${userId}`).then((r) => r.json()),
    fetch(`${ORDER_SERVICE}/users/${userId}/orders?limit=5`).then((r) => r.json()),
    fetch(`${PREF_SERVICE}/users/${userId}/preferences`).then((r) => r.json()),
  ]);

  res.json({
    user: user.status === 'fulfilled' ? user.value : null,
    recentOrders: orders.status === 'fulfilled' ? orders.value : [],
    preferences: preferences.status === 'fulfilled' ? preferences.value : {},
  });
}
```

## Nginx as API Gateway

```nginx
# nginx.conf
upstream user_service {
    server user-service:3001;
    server user-service:3002;
}

upstream order_service {
    server order-service:3003;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

server {
    listen 80;

    # Global rate limit
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;

    # User service
    location /api/users/ {
        proxy_pass http://user_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Correlation-ID $request_id;

        # Circuit breaker via timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }

    # Order service
    location /api/orders/ {
        proxy_pass http://order_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }
}
```

## Best Practices

1. **Single entry point** — All external traffic routes through the gateway.
2. **No business logic in the gateway** — Only cross-cutting concerns (auth, rate limit, routing).
3. **Validate auth at the gateway** — Forward user context in headers to downstream services.
4. **Use circuit breakers** — Prevent cascading failures when a backend is down.
5. **Set request timeouts** — Prevent slow backends from consuming gateway resources.
6. **Add correlation IDs** — Inject a unique ID at the gateway for distributed tracing.
7. **Rate limit by API key, not just IP** — IP-based limits break for shared networks.
8. **Strip internal headers** — Never leak internal service metadata to clients.
9. **Health check all backends** — Remove unhealthy instances from the routing pool.
10. **Cache at the edge** — Cache GET responses for read-heavy APIs (CDN or gateway-level).

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Gateway as monolith | Single point of failure | Deploy multiple instances behind a load balancer |
| No timeout on proxied requests | Slow backend blocks gateway threads | Set `proxy_read_timeout` and circuit breaker |
| Rate limiting by IP only | Punishes shared networks, misses API key abuse | Rate limit by authenticated identity or API key |
| Missing CORS at gateway | Browsers block API calls | Configure CORS headers at the gateway level |
| No retry budget | Retries amplify load on failing services | Limit total retries per request, use exponential backoff |
| Business logic in gateway | Gateway becomes coupled to services | Keep gateway stateless; only cross-cutting concerns |

