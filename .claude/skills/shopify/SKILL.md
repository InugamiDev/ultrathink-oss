---
name: shopify
description: Shopify Storefront API, Admin API, Liquid templates, custom app development, and headless commerce
layer: domain
category: payments
triggers:
  - "shopify"
  - "shopify api"
  - "liquid template"
  - "shopify app"
  - "storefront api"
  - "shopify hydrogen"
inputs: [store requirements, product catalog, theme preferences, app functionality]
outputs: [Storefront API queries, Admin API integrations, Liquid templates, app configs, Hydrogen components]
linksTo: [ecommerce, stripe, react, nextjs]
linkedFrom: [ecommerce, ship]
preferredNextSkills: [ecommerce, stripe, react]
fallbackSkills: [ecommerce]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [store modifications, product updates, order processing]
---

# Shopify Specialist

## Purpose

Build and integrate with Shopify using the Storefront API, Admin API, Liquid templating, Hydrogen/Oxygen, and custom app development. This skill covers headless commerce with Next.js, theme customization, and Shopify App Bridge.

## Key Patterns

### Storefront API Client

```typescript
// lib/shopify.ts
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

interface ShopifyResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 60 },
    }
  );

  const json: ShopifyResponse<T> = await response.json();

  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join(", "));
  }

  return json.data;
}
```

### Product Queries

```typescript
// Fetch all products
const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: BEST_SELLING) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 4) {
            edges {
              node {
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function getProducts(first = 20) {
  const data = await shopifyFetch<{ products: ProductConnection }>(
    PRODUCTS_QUERY,
    { first }
  );
  return data.products.edges.map((edge) => edge.node);
}

// Fetch single product by handle
const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      seo {
        title
        description
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            quantityAvailable
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;
```

### Cart Management (Storefront API)

```typescript
const CREATE_CART_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    handle
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADD_TO_CART_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product {
                    title
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createCart(variantId: string, quantity: number = 1) {
  const data = await shopifyFetch(CREATE_CART_MUTATION, {
    input: {
      lines: [{ merchandiseId: variantId, quantity }],
    },
  });
  return data;
}

export async function addToCart(cartId: string, variantId: string, quantity: number = 1) {
  const data = await shopifyFetch(ADD_TO_CART_MUTATION, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  return data;
}
```

### Admin API (Server-Side Only)

```typescript
// lib/shopify-admin.ts (NEVER expose to client)
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

export async function shopifyAdminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// Fulfill an order
const FULFILL_ORDER_MUTATION = `
  mutation FulfillOrder($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreateV2(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;
```

## Best Practices

### API Usage
- Use Storefront API for public-facing data (products, collections, cart)
- Use Admin API only server-side for order management and inventory
- Cache product data with ISR or `next.revalidate`
- Paginate using cursor-based pagination (`after` + `endCursor`)
- Request only the fields you need in GraphQL queries

### Cart Management
- Store cart ID in a cookie or localStorage
- Use optimistic UI updates for add-to-cart actions
- Handle `userErrors` from mutations gracefully
- Redirect to `checkoutUrl` for Shopify-hosted checkout

### Headless Commerce
- Use `productByHandle` for SEO-friendly URLs
- Generate sitemaps from product and collection handles
- Implement structured data (JSON-LD) for product pages
- Use Shopify CDN URLs for images (already optimized)

### Webhooks
- Verify HMAC signature on all incoming webhooks
- Register webhooks via Admin API or Shopify CLI
- Handle order creation, fulfillment, and refund events
- Make handlers idempotent

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Exposing Admin API token to client | Only use Admin API in server-side code |
| Not handling pagination | Use `pageInfo.hasNextPage` and `endCursor` |
| Stale product data | Use ISR with appropriate revalidation intervals |
| Missing variant selection | Always pass `merchandiseId` (variant ID) to cart |
| Not handling sold-out variants | Check `availableForSale` before add-to-cart |
| Webhook HMAC not verified | Always verify with the shared secret |

## Examples

### Collection Page

```typescript
// app/collections/[handle]/page.tsx
import { shopifyFetch } from "@/lib/shopify";

const COLLECTION_QUERY = `
  query Collection($handle: String!, $first: Int!) {
    collectionByHandle(handle: $handle) {
      title
      description
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default async function CollectionPage({ params }: { params: { handle: string } }) {
  const { handle } = await params;
  const data = await shopifyFetch(COLLECTION_QUERY, { handle, first: 20 });
  const collection = data.collectionByHandle;

  return (
    <section>
      <h1>{collection.title}</h1>
      <p>{collection.description}</p>
      {/* Render products */}
    </section>
  );
}
```

### Webhook Verification

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  const hash = createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(body, "utf8")
    .digest("base64");

  return timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}
```
