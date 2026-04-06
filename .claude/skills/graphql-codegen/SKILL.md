---
name: graphql-codegen
description: "GraphQL code generation — typed operations, fragment colocation, and schema-first development."
layer: domain
category: tooling
triggers:
  - "graphql codegen"
  - "codegen"
  - "typed graphql"
  - "fragment colocation"
  - "gql.tada"
inputs:
  - "GraphQL schema or operation definitions"
  - "Code generation configuration needs"
  - "Type-safe query/mutation patterns"
  - "Fragment colocation strategy questions"
outputs:
  - "GraphQL codegen configuration files"
  - "Typed operations and fragment definitions"
  - "Custom scalar type mappings"
  - "Client-side cache integration patterns"
linksTo:
  - graphql
  - typescript-patterns
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# GraphQL Code Generation Patterns

## Purpose

Provide expert guidance on GraphQL code generation for type-safe client operations, fragment colocation, schema-first development, and integration with TypeScript. Covers GraphQL Codegen, gql.tada, and typed-document-node approaches.

## Key Patterns

### GraphQL Codegen Setup

**codegen.ts configuration:**

```typescript
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.GRAPHQL_SCHEMA_URL || "./schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**/*"],
  ignoreNoDocuments: true,
  generates: {
    "./src/gql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: { unmaskFunctionName: "getFragmentData" },
      },
      config: {
        scalars: {
          DateTime: "string",
          UUID: "string",
          JSON: "Record<string, unknown>",
          Decimal: "string",
        },
        enumsAsTypes: true,
        skipTypename: false,
        dedupeFragments: true,
        nonOptionalTypename: true,
      },
    },
    "./src/gql/schema.ts": {
      plugins: ["typescript"],
      config: {
        enumsAsTypes: true,
        futureProofEnums: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ["prettier --write"],
  },
};

export default config;
```

**package.json scripts:**

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

### Fragment Colocation

Colocate fragments with the components that use them:

```typescript
// components/UserCard.tsx
import { graphql, type FragmentType, getFragmentData } from "@/gql";

export const UserCardFragment = graphql(`
  fragment UserCard on User {
    id
    name
    email
    avatarUrl
    role
    createdAt
  }
`);

interface UserCardProps {
  user: FragmentType<typeof UserCardFragment>;
}

export function UserCard({ user: userRef }: UserCardProps) {
  const user = getFragmentData(UserCardFragment, userRef);

  return (
    <div className="p-6 rounded-xl shadow-sm border">
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="w-12 h-12 rounded-full"
      />
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-sm text-gray-600">{user.email}</p>
    </div>
  );
}
```

**Parent component composes fragments:**

```typescript
// pages/TeamPage.tsx
import { graphql } from "@/gql";
import { useQuery } from "@urql/react";
import { UserCard, UserCardFragment } from "@/components/UserCard";

const TeamQuery = graphql(`
  query TeamMembers($teamId: ID!) {
    team(id: $teamId) {
      id
      name
      members {
        ...UserCard
      }
    }
  }
`);

export function TeamPage({ teamId }: { teamId: string }) {
  const [{ data, fetching }] = useQuery({
    query: TeamQuery,
    variables: { teamId },
  });

  if (fetching) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data?.team?.members.map((member) => (
        <UserCard key={member.id} user={member} />
      ))}
    </div>
  );
}
```

### Typed Operations

**Query with variables and error handling:**

```typescript
import { graphql } from "@/gql";
import { useQuery } from "@urql/react";

const OrdersQuery = graphql(`
  query Orders($filters: OrderFiltersInput!, $pagination: PaginationInput!) {
    orders(filters: $filters, pagination: $pagination) {
      edges {
        node {
          id
          status
          totalFormatted
          createdAt
          items {
            id
            product {
              name
            }
            quantity
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`);

export function useOrders(filters: OrderFiltersInput, cursor?: string) {
  return useQuery({
    query: OrdersQuery,
    variables: {
      filters,
      pagination: { first: 20, after: cursor },
    },
  });
}
```

**Mutation with optimistic update:**

```typescript
import { graphql } from "@/gql";
import { useMutation } from "@urql/react";

const UpdateOrderStatusMutation = graphql(`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      order {
        id
        status
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`);

export function useUpdateOrderStatus() {
  const [result, executeMutation] = useMutation(UpdateOrderStatusMutation);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { data, error } = await executeMutation({
      input: { orderId, status },
    });

    if (error) throw error;
    if (data?.updateOrderStatus.errors?.length) {
      throw new Error(data.updateOrderStatus.errors[0].message);
    }

    return data!.updateOrderStatus.order;
  };

  return { updateStatus, loading: result.fetching };
}
```

### gql.tada (Alternative Approach)

For projects preferring runtime inference over code generation:

```typescript
// utils/graphql.ts
import { initGraphQLTada } from "gql.tada";
import type { introspection } from "@/graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    UUID: string;
    JSON: Record<string, unknown>;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
```

```typescript
// No codegen step needed — types inferred at write-time
import { graphql, readFragment, type FragmentOf } from "@/utils/graphql";

const UserFragment = graphql(`
  fragment UserFields on User {
    id
    name
    email
  }
`);

// TypeScript knows the shape automatically
type User = FragmentOf<typeof UserFragment>;
```

### Custom Scalar Handling

```typescript
// codegen.ts scalar config
config: {
  scalars: {
    DateTime: {
      input: "string",            // what the server accepts
      output: "string",           // what the server returns
    },
    Money: {
      input: "{ amount: number; currency: string }",
      output: "{ amount: number; currency: string }",
    },
    Upload: "File",
    Void: "void",
  },
}
```

### Document Caching with Persisted Queries

```typescript
// codegen.ts — generate persisted query hashes
generates: {
  "./src/gql/": {
    preset: "client",
    presetConfig: {
      persistedDocuments: true,  // generates documentId for each operation
    },
  },
  "./persisted-documents.json": {
    plugins: ["persisted-operations"],
  },
}
```

```typescript
// Client setup with automatic persisted queries
import { createClient, fetchExchange } from "@urql/core";
import { persistedExchange } from "@urql/exchange-persisted";

const client = createClient({
  url: "/graphql",
  exchanges: [
    persistedExchange({
      preferGetForPersistedQueries: true,
      enforcePersistedQueries: true,
    }),
    fetchExchange,
  ],
});
```

### Testing Generated Types

```typescript
// test/helpers/graphql.ts — type-safe mock factories
import type { OrdersQuery } from "@/gql/graphql";

type OrderNode = NonNullable<
  OrdersQuery["orders"]
>["edges"][number]["node"];

export function buildMockOrder(overrides: Partial<OrderNode> = {}): OrderNode {
  return {
    __typename: "Order",
    id: "order-1",
    status: "PENDING",
    totalFormatted: "$99.00",
    createdAt: new Date().toISOString(),
    items: [],
    ...overrides,
  };
}
```

## Best Practices

1. **Use the `client` preset** — It generates a single `graphql()` function with fragment masking, simplifying imports.
2. **Colocate fragments with components** — Each component declares exactly the data it needs. Parent queries compose child fragments.
3. **Enable fragment masking** — Enforces component boundaries by preventing parent components from accessing child fragment fields directly.
4. **Map custom scalars explicitly** — Always configure scalar type mappings to avoid `any` types in generated output.
5. **Run codegen in CI** — Add `graphql-codegen` to your CI pipeline and fail on type errors.
6. **Use `enumsAsTypes` over TypeScript enums** — String union types are more ergonomic than TS enums.
7. **Deduplicate fragments** — Enable `dedupeFragments` to avoid duplicate fragment definitions in operations.
8. **Use persisted queries in production** — Reduces payload size and prevents arbitrary query execution.
9. **Watch mode during development** — Run `codegen:watch` alongside your dev server for instant type updates.
10. **Test with generated types** — Build mock factories using generated types to keep tests in sync with the schema.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Stale generated types | Types out of sync with schema | Run codegen in CI, use watch mode locally |
| Missing scalar mappings | Custom scalars typed as `any` | Configure all custom scalars in codegen config |
| No fragment colocation | Monolithic queries that over-fetch | Split into component-level fragments |
| Importing from wrong path | Using raw `gql` tag instead of generated | Always import `graphql` from `@/gql` |
| Fragment name collisions | Two fragments with the same name | Prefix fragments with component name: `UserCard` not `User` |
| Ignoring fragment masking | Accessing fields not in the component's fragment | Use `getFragmentData()` to unmask properly |
| No persisted queries | Arbitrary queries accepted by server | Enable persisted documents and enforce on server |
| Circular fragment deps | Codegen fails on circular references | Restructure fragments to avoid cycles |
