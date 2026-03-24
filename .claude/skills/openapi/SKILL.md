---
name: openapi
description: OpenAPI 3.1 specification authoring, Swagger UI integration, client SDK generation, schema validation, and API-first design workflow
layer: domain
category: documentation
triggers:
  - "openapi"
  - "swagger"
  - "api spec"
  - "api specification"
  - "openapi schema"
  - "client sdk generation"
  - "api documentation"
  - "swagger ui"
  - "api-first"
inputs:
  - API endpoints and their request/response shapes
  - Authentication method (Bearer, API key, OAuth2)
  - Target language(s) for client SDK generation
  - Existing codebase framework (Next.js, Express, FastAPI, etc.)
outputs:
  - OpenAPI 3.1 specification (YAML or JSON)
  - Swagger UI or Scalar integration code
  - Generated client SDK (TypeScript, Python, etc.)
  - Request/response validation middleware
  - CI/CD spec linting configuration
linksTo:
  - api-designer
  - typescript-frontend
  - docs-writer
  - testing-patterns
linkedFrom:
  - api-designer
  - ship
  - docs-writer
preferredNextSkills:
  - api-designer
  - testing-patterns
  - typescript-frontend
fallbackSkills:
  - docs-writer
  - code-review
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# OpenAPI Specification Skill

## Purpose

OpenAPI is the industry standard for describing REST APIs. This skill covers writing OpenAPI 3.1 specs, integrating interactive documentation (Swagger UI, Scalar), generating type-safe client SDKs, validating requests/responses against the spec, and embedding spec linting into CI. An API-first approach catches contract mismatches before code is written.

## Key Concepts

### OpenAPI 3.1 Structure

```
openapi: 3.1.0
info:                  → API metadata (title, version, description)
servers:               → Base URLs for environments
paths:                 → Endpoints and their operations
  /resource:
    get:               → Operation (method + path)
      parameters:      → Query, path, header, cookie params
      requestBody:     → Request payload schema
      responses:       → Response schemas by status code
components:
  schemas:             → Reusable data models (JSON Schema)
  securitySchemes:     → Auth definitions
  parameters:          → Reusable parameters
  responses:           → Reusable response objects
security:              → Global security requirements
tags:                  → Logical grouping of operations
```

### OpenAPI 3.1 vs 3.0

| Feature | 3.0 | 3.1 |
|---------|-----|-----|
| JSON Schema compatibility | Subset (divergent) | Full JSON Schema 2020-12 |
| `type` as array | Not supported | `type: ["string", "null"]` |
| `$ref` siblings | Ignored | Allowed alongside `$ref` |
| Webhooks | Not supported | `webhooks` top-level key |
| `const` keyword | Not supported | Supported |

## Workflow

### Step 1: Write the Spec (API-First)

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: Acme API
  version: 1.0.0
  description: |
    The Acme API provides programmatic access to manage products,
    orders, and customers.
  contact:
    name: API Support
    email: api@acme.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.acme.com/v1
    description: Production
  - url: https://staging-api.acme.com/v1
    description: Staging
  - url: http://localhost:3000/api/v1
    description: Local development

security:
  - bearerAuth: []

tags:
  - name: Products
    description: Product catalog management
  - name: Orders
    description: Order lifecycle management

paths:
  /products:
    get:
      operationId: listProducts
      tags: [Products]
      summary: List all products
      description: Returns a paginated list of products with optional filtering.
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: category
          in: query
          schema:
            type: string
            enum: [electronics, clothing, books]
          description: Filter by product category
        - name: search
          in: query
          schema:
            type: string
            minLength: 2
            maxLength: 100
          description: Full-text search across name and description
      responses:
        '200':
          description: Paginated list of products
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'

    post:
      operationId: createProduct
      tags: [Products]
      summary: Create a new product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
            example:
              name: "Wireless Headphones"
              price: 79.99
              category: electronics
              description: "Noise-cancelling Bluetooth headphones"
      responses:
        '201':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '409':
          description: Product with this SKU already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '422':
          $ref: '#/components/responses/ValidationError'

  /products/{productId}:
    get:
      operationId: getProduct
      tags: [Products]
      summary: Get a product by ID
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  schemas:
    Product:
      type: object
      required: [id, name, price, category, createdAt]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 200
        price:
          type: number
          format: float
          minimum: 0
          exclusiveMinimum: true
        category:
          type: string
          enum: [electronics, clothing, books]
        description:
          type: ["string", "null"]
          maxLength: 2000
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: ["string", "null"]
          format: date-time

    CreateProductRequest:
      type: object
      required: [name, price, category]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200
        price:
          type: number
          minimum: 0
          exclusiveMinimum: true
        category:
          type: string
          enum: [electronics, clothing, books]
        description:
          type: string
          maxLength: 2000

    ProductListResponse:
      type: object
      required: [data, pagination]
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Product'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      required: [page, limit, total, totalPages]
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string

  responses:
    Unauthorized:
      description: Missing or invalid authentication
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error:
              code: UNAUTHORIZED
              message: Invalid or expired token
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

### Step 2: Serve Interactive Documentation

#### Option A: Scalar (Modern, Recommended)

```typescript
// app/api/docs/route.ts (Next.js App Router)
import { ApiReference } from '@scalar/nextjs-api-reference';

const config = {
  spec: {
    url: '/openapi.yaml', // Serve from /public/openapi.yaml
  },
  theme: 'kepler',
  layout: 'modern',
  darkMode: true,
  hideModels: false,
  searchHotKey: 'k',
};

export const GET = ApiReference(config);
```

#### Option B: Swagger UI (Classic)

```typescript
// app/api/docs/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    });
  </script>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
```

### Step 3: Generate Type-Safe Client SDKs

```bash
# Install openapi-typescript for TypeScript types
npm install -D openapi-typescript openapi-fetch

# Generate types from spec
npx openapi-typescript ./public/openapi.yaml -o ./src/lib/api/schema.d.ts
```

#### Type-Safe API Client

```typescript
// src/lib/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Middleware: attach auth token
api.use({
  async onRequest({ request }) {
    const token = getAuthToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
});

// Usage — fully typed, autocompleted
const { data, error } = await api.GET('/products', {
  params: {
    query: { category: 'electronics', page: 1, limit: 20 },
  },
});
// data is typed as ProductListResponse
// error is typed as ErrorResponse

const { data: product } = await api.POST('/products', {
  body: {
    name: 'Wireless Mouse',
    price: 29.99,
    category: 'electronics',
  },
});
// body is validated against CreateProductRequest at compile time
```

### Step 4: Request Validation Middleware

```typescript
// middleware/validate-openapi.ts
import { OpenAPIValidator } from 'openapi-backend';
import spec from '../../public/openapi.json';

const validator = new OpenAPIValidator({ definition: spec });

export async function validateRequest(
  req: Request,
  operationId: string
): Promise<{ valid: boolean; errors?: string[] }> {
  const body = req.method !== 'GET' ? await req.json() : undefined;
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);

  const result = validator.validateRequest(
    {
      method: req.method.toLowerCase(),
      path: url.pathname,
      body,
      query,
      headers: Object.fromEntries(req.headers),
    },
    operationId
  );

  if (result.errors) {
    return {
      valid: false,
      errors: result.errors.map((e) => `${e.instancePath}: ${e.message}`),
    };
  }

  return { valid: true };
}
```

### Step 5: Lint the Spec in CI

```yaml
# .github/workflows/lint-api.yml
name: Lint OpenAPI Spec
on:
  pull_request:
    paths:
      - 'public/openapi.yaml'
      - 'openapi/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint OpenAPI spec
        uses: stoplightio/spectral-action@v0.8.11
        with:
          file_glob: 'public/openapi.yaml'
          spectral_ruleset: .spectral.yaml

      - name: Validate spec
        run: npx @redocly/cli lint public/openapi.yaml
```

#### .spectral.yaml (Linting Rules)

```yaml
extends:
  - spectral:oas

rules:
  operation-operationId: error
  operation-description: warn
  operation-tags: error
  oas3-schema: error
  info-contact: warn
  no-$ref-siblings: off  # OpenAPI 3.1 allows $ref siblings

  # Custom rules
  require-pagination:
    description: List endpoints must include pagination parameters
    given: "$.paths[*].get.parameters"
    severity: warn
    then:
      function: schema
      functionOptions:
        schema:
          type: array
          contains:
            properties:
              name:
                enum: [page, cursor, offset]
```

## Best Practices

1. **API-first design** — Write the spec before the implementation. The spec is the contract; code is the implementation detail.
2. **Use `$ref` aggressively** — Extract every schema, parameter, and response into `components/`. Duplication in specs causes drift.
3. **Always include `operationId`** — Client generators use this as the method name. Choose clear, unique names (e.g., `listProducts`, `createOrder`).
4. **Document error responses** — Every endpoint should document 401, 404, 422, and 500 responses with example payloads.
5. **Use `openapi-fetch` over hand-rolled clients** — It provides compile-time type safety derived directly from the spec, eliminating type drift.
6. **Version via URL path** — `/v1/products` is clearer than header-based versioning for most APIs.
7. **Add examples to schemas** — Swagger UI and Scalar render examples in the docs, making them immediately useful for consumers.
8. **Lint in CI** — Use Spectral or Redocly CLI to catch spec issues before merge.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Spec diverges from implementation** | Clients get unexpected responses | Generate types from spec and validate requests against it at runtime |
| **Missing `operationId`** | Generated client methods named `getPathProducts` instead of `listProducts` | Add `operationId` to every operation |
| **Nullable fields using `nullable: true`** | Validation errors in OpenAPI 3.1 | Use `type: ["string", "null"]` instead of `nullable: true` (3.0 syntax) |
| **Circular `$ref` breaking generators** | Code generation crashes or produces infinite types | Break cycles with intermediate schemas or use generators that handle cycles (openapi-typescript does) |
| **No pagination on list endpoints** | Clients fetch unbounded datasets | Always include `page`/`limit` or cursor-based pagination parameters |
| **Hardcoded server URLs** | Spec unusable across environments | Use `servers` array with dev/staging/prod URLs; support env variable override in clients |
| **Giant monolithic spec file** | Unreadable, merge conflicts | Split into multiple files using `$ref: './schemas/product.yaml'` and bundle at build time with `@redocly/cli bundle` |
| **Missing `required` arrays** | Clients treat all fields as optional | Explicitly list required fields on every object schema |
