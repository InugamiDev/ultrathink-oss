---
name: api-designer
description: REST and GraphQL API design with OpenAPI specifications, versioning strategies, pagination, and error contracts
layer: utility
category: development
triggers:
  - "design API"
  - "REST API"
  - "GraphQL schema"
  - "OpenAPI spec"
  - "API endpoint"
  - "API versioning"
  - "pagination"
  - "API error handling"
inputs:
  - requirements: What the API needs to do
  - resources: Domain entities the API exposes
  - consumers: Who will consume this API (frontend, mobile, third-party)
  - constraints: Rate limits, auth requirements, backward compatibility
outputs:
  - api_design: Endpoint definitions with methods, paths, request/response schemas
  - openapi_spec: OpenAPI 3.1 YAML specification
  - graphql_schema: GraphQL SDL (if applicable)
  - error_catalog: Standardized error responses
  - pagination_strategy: Pagination approach with examples
linksTo:
  - data-modeling
  - error-handling
  - graphql
  - mermaid
linkedFrom:
  - plan
  - cook
  - ecommerce
  - microservices
preferredNextSkills:
  - data-modeling
  - error-handling
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

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
