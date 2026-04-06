---
name: api-documentation
description: API documentation best practices — Swagger UI, Redoc, interactive examples, and auto-generation from code.
layer: domain
category: documentation
triggers:
  - "api docs"
  - "api documentation"
  - "swagger ui"
  - "redoc"
  - "api reference"
  - "interactive api docs"
inputs:
  - "API endpoints to document"
  - "OpenAPI spec files or code annotations"
  - "Documentation hosting requirements"
  - "Auto-generation tooling questions"
outputs:
  - "OpenAPI-based documentation setup"
  - "Swagger UI / Redoc configurations"
  - "Auto-generation pipeline from code"
  - "Interactive API documentation sites"
linksTo:
  - openapi
  - api-designer
  - docs-writer
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# API Documentation

## Purpose

Produce clear, interactive, and maintainable API documentation. Covers OpenAPI spec authoring, Swagger UI and Redoc hosting, auto-generation from TypeScript/Python code, and documentation-as-code workflows.

## Key Patterns

### OpenAPI 3.1 Spec Structure

```yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
  description: |
    Production API for managing users and orders.

    ## Authentication
    All endpoints require a Bearer token in the `Authorization` header.

    ## Rate Limits
    - 100 requests/minute per API key
    - 429 response when exceeded
  contact:
    email: api-support@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      operationId: listUsers
      summary: List all users
      description: Returns a paginated list of users. Supports cursor-based pagination.
      tags:
        - Users
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
          description: Pagination cursor from previous response
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
              example:
                data:
                  - id: "usr_abc123"
                    name: "Jane Doe"
                    email: "jane@example.com"
                next_cursor: "eyJpZCI6MTAwfQ=="
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id:
          type: string
          example: "usr_abc123"
        name:
          type: string
          example: "Jane Doe"
        email:
          type: string
          format: email

    UserListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        next_cursor:
          type: string
          nullable: true

  responses:
    Unauthorized:
      description: Missing or invalid authentication token
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: "Invalid or expired token"

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

### Swagger UI Setup (Next.js)

```typescript
// app/api/docs/route.ts — Serve the OpenAPI spec
import { NextResponse } from 'next/server';
import spec from '@/openapi.json';

export async function GET() {
  return NextResponse.json(spec);
}
```

```tsx
// app/docs/page.tsx — Swagger UI page
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  return (
    <div className="py-16">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
```

### Redoc Setup

```html
<!-- Static HTML approach -->
<!doctype html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css?family=Inter:300,400,600"
      rel="stylesheet"
    />
  </head>
  <body>
    <redoc spec-url="/api/docs"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
```

```tsx
// React component approach
'use client';

import { useEffect, useRef } from 'react';

export default function RedocDocs() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-expect-error — Redoc loaded via script tag
    if (window.Redoc && containerRef.current) {
      // @ts-expect-error
      window.Redoc.init('/api/docs', {
        theme: {
          colors: { primary: { main: '#3b82f6' } },
          typography: { fontSize: '1rem', fontFamily: 'Inter, sans-serif' },
        },
      }, containerRef.current);
    }
  }, []);

  return <div ref={containerRef} />;
}
```

### Auto-Generation from TypeScript (Zod + OpenAPI)

```typescript
import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Register schemas
const UserSchema = registry.register(
  'User',
  z.object({
    id: z.string().openapi({ example: 'usr_abc123' }),
    name: z.string().openapi({ example: 'Jane Doe' }),
    email: z.string().email().openapi({ example: 'jane@example.com' }),
  })
);

// Register endpoints
registry.registerPath({
  method: 'get',
  path: '/users',
  summary: 'List all users',
  tags: ['Users'],
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UserSchema),
            next_cursor: z.string().nullable(),
          }),
        },
      },
    },
  },
});

// Generate the spec
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

const generator = new OpenApiGeneratorV31(registry.definitions);
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: { title: 'My API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/v1' }],
});
```

### Auto-Generation from Python (FastAPI)

```python
from fastapi import FastAPI, Query
from pydantic import BaseModel, EmailStr

app = FastAPI(
    title="My API",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",     # Redoc at /redoc
    openapi_url="/openapi.json",
)

class User(BaseModel):
    id: str
    name: str
    email: EmailStr

    model_config = {
        "json_schema_extra": {
            "examples": [{"id": "usr_abc123", "name": "Jane Doe", "email": "jane@example.com"}]
        }
    }

class UserListResponse(BaseModel):
    data: list[User]
    next_cursor: str | None = None

@app.get("/users", response_model=UserListResponse, tags=["Users"])
async def list_users(
    cursor: str | None = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """Returns a paginated list of users. Supports cursor-based pagination."""
    ...
```

### Documentation-as-Code CI Pipeline

```yaml
# .github/workflows/api-docs.yml
name: API Docs
on:
  push:
    paths:
      - 'src/api/**'
      - 'openapi/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate OpenAPI spec
        run: npx tsx scripts/generate-openapi.ts > openapi.json

      - name: Validate spec
        run: npx @redocly/cli lint openapi.json

      - name: Check for breaking changes
        run: npx oasdiff breaking openapi-previous.json openapi.json

      - name: Build Redoc static site
        run: npx @redocly/cli build-docs openapi.json -o docs/index.html

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

### Inline Code Examples

Always include request/response examples in docs:

```yaml
# Good: Examples show real data shapes
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
            examples:
              basic:
                summary: Minimal user creation
                value:
                  name: "Jane Doe"
                  email: "jane@example.com"
              full:
                summary: User with all optional fields
                value:
                  name: "Jane Doe"
                  email: "jane@example.com"
                  avatar_url: "https://example.com/avatar.jpg"
                  metadata:
                    source: "signup_form"
```

## Best Practices

1. **Single source of truth** — Generate docs from code (Zod schemas, Pydantic models, JSDoc) rather than maintaining a separate spec file.
2. **Include realistic examples** — Every schema and endpoint should have concrete example values, not placeholder text.
3. **Document error responses** — Show all possible error codes, not just the happy path.
4. **Use tags to group endpoints** — Organize by resource (Users, Orders) not by HTTP method.
5. **Version your API docs** — Docs should match the deployed API version; use CI to enforce spec validity.
6. **Add authentication instructions** — Document how to obtain and use tokens at the top of the spec.
7. **Detect breaking changes in CI** — Use `oasdiff` or `openapi-diff` to catch breaking changes before merge.
8. **Provide SDKs or code snippets** — Show curl, JavaScript, and Python examples for each endpoint.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Manually maintained spec | Drift between docs and implementation | Generate spec from code with CI validation |
| No examples | Users cannot understand expected shapes | Add `example` to every schema property |
| Missing error documentation | Users surprised by error formats | Document all error codes and response bodies |
| Stale docs after refactor | 404s and wrong schemas frustrate consumers | CI pipeline regenerates + validates on every push |
| Too many nested $refs | Swagger UI becomes hard to navigate | Inline small schemas; use $ref only for reusable types |
| No authentication docs | Users cannot make their first API call | Add auth section to spec `info.description` |
