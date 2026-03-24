---
name: ecommerce
description: E-commerce architecture patterns including cart, inventory, pricing, checkout, and order management
layer: domain
category: payments
triggers:
  - "ecommerce"
  - "e-commerce"
  - "online store"
  - "shopping cart"
  - "checkout flow"
  - "inventory management"
  - "product catalog"
  - "order management"
inputs:
  - requirements: Product types, pricing model, fulfillment needs
  - platform: Custom | Shopify | Medusa | Saleor (optional)
  - scale: Expected product count, order volume, geographic regions
outputs:
  - architecture: E-commerce system design with domain models
  - cart_implementation: Cart management with edge cases
  - checkout_flow: Multi-step checkout with payment integration
  - inventory_strategy: Stock management and reservation patterns
  - pricing_engine: Pricing rules, discounts, and tax calculation
linksTo:
  - stripe
  - shopify
  - api-designer
  - data-modeling
  - redis
linkedFrom:
  - cook
  - plan
  - shopify
preferredNextSkills:
  - stripe
  - data-modeling
fallbackSkills:
  - api-designer
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# E-Commerce Skill

## Purpose

Design and implement e-commerce systems covering the full lifecycle: product catalog, cart management, inventory tracking, checkout flow, payment processing, and order fulfillment. This skill handles the domain complexity of pricing rules, tax calculation, stock reservations, and order state machines.

## Key Concepts

### E-Commerce Domain Model

```
CATALOG:
  Product       -> name, description, images, SEO metadata
  Variant       -> size, color, SKU, price, weight
  Category      -> hierarchical product organization
  Collection    -> curated product groupings

PRICING:
  Price         -> amount (cents), currency, variant
  Discount      -> percentage or fixed, conditions, validity period
  Tax           -> rate by jurisdiction, product category
  Shipping Rate -> weight-based, zone-based, flat rate

CART & CHECKOUT:
  Cart          -> line items, totals, expiry
  Line Item     -> variant, quantity, unit price
  Checkout      -> shipping address, payment method, order preview
  Order         -> confirmed purchase with payment reference

FULFILLMENT:
  Inventory     -> stock levels per variant per location
  Reservation   -> temporary hold during checkout
  Shipment      -> tracking number, carrier, status
  Return        -> RMA, refund, restock
```

### Order State Machine

```
          +-> confirmed +-> processing +-> shipped +-> delivered
         /                                              |
draft --+                                               +-> returned
         \                                              |
          +-> cancelled                   +-> partially_returned
                                          |
                         shipped ---------+-> refunded
```

## Patterns

### Cart Management

```typescript
// Cart with server-side validation
interface CartItem {
  variantId: string;
  quantity: number;
  // These are COMPUTED, not stored:
  unitPriceCents: number;
  totalCents: number;
  product: { name: string; image: string; slug: string };
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  expiresAt: Date;  // Carts expire after 7 days
}

async function addToCart(cartId: string, variantId: string, quantity: number): Promise<Cart> {
  // 1. Validate variant exists and is available
  const variant = await db.variant.findUnique({
    where: { id: variantId },
    include: { product: true, inventory: true },
  });
  if (!variant) throw new NotFoundError('Variant', variantId);
  if (!variant.product.isActive) throw new AppError('Product is not available', 'PRODUCT_UNAVAILABLE', 400);

  // 2. Check stock
  if (variant.inventory.available < quantity) {
    throw new AppError('Insufficient stock', 'INSUFFICIENT_STOCK', 409, true, {
      available: variant.inventory.available,
      requested: quantity,
    });
  }

  // 3. Add or update line item
  const existingItem = await db.cartItem.findFirst({
    where: { cartId, variantId },
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (variant.inventory.available < newQuantity) {
      throw new AppError('Cannot add more of this item', 'INSUFFICIENT_STOCK', 409);
    }
    await db.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId, variantId, quantity },
    });
  }

  // 4. Recalculate cart totals
  return recalculateCart(cartId);
}
```

### Inventory Reservation

```typescript
// Reserve inventory during checkout (prevent overselling)
async function reserveInventory(orderId: string, items: Array<{ variantId: string; quantity: number }>) {
  return db.$transaction(async (tx) => {
    for (const item of items) {
      const inventory = await tx.inventory.findUnique({
        where: { variantId: item.variantId },
      });

      if (!inventory || inventory.available < item.quantity) {
        throw new AppError('Insufficient stock', 'INSUFFICIENT_STOCK', 409, true, {
          variantId: item.variantId,
          available: inventory?.available ?? 0,
          requested: item.quantity,
        });
      }

      // Decrement available, increment reserved
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          available: { decrement: item.quantity },
          reserved: { increment: item.quantity },
        },
      });

      // Create reservation record
      await tx.reservation.create({
        data: {
          orderId,
          variantId: item.variantId,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });
    }
  });
}

// Release expired reservations (cron job every 5 minutes)
async function releaseExpiredReservations() {
  const expired = await db.reservation.findMany({
    where: { expiresAt: { lt: new Date() }, released: false },
  });

  for (const reservation of expired) {
    await db.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { variantId: reservation.variantId },
        data: {
          available: { increment: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { released: true },
      });
    });
  }
}
```

### Pricing Engine

```typescript
interface PricingContext {
  items: Array<{ variantId: string; quantity: number; unitPriceCents: number }>;
  couponCode?: string;
  shippingAddress?: Address;
  customerId?: string;
}

interface PricingResult {
  subtotalCents: number;
  discounts: Array<{ code: string; amountCents: number; description: string }>;
  discountTotalCents: number;
  taxCents: number;
  taxRate: number;
  shippingCents: number;
  totalCents: number;
}

async function calculatePricing(ctx: PricingContext): Promise<PricingResult> {
  // 1. Calculate subtotal
  const subtotalCents = ctx.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity, 0
  );

  // 2. Apply discounts
  const discounts = await applyDiscounts(ctx.items, ctx.couponCode, ctx.customerId);
  const discountTotalCents = discounts.reduce((sum, d) => sum + d.amountCents, 0);

  // 3. Calculate tax (on discounted subtotal)
  const taxableAmount = subtotalCents - discountTotalCents;
  const taxRate = ctx.shippingAddress
    ? await getTaxRate(ctx.shippingAddress)
    : 0;
  const taxCents = Math.round(taxableAmount * taxRate);

  // 4. Calculate shipping
  const shippingCents = ctx.shippingAddress
    ? await calculateShipping(ctx.items, ctx.shippingAddress)
    : 0;

  return {
    subtotalCents,
    discounts,
    discountTotalCents,
    taxCents,
    taxRate,
    shippingCents,
    totalCents: subtotalCents - discountTotalCents + taxCents + shippingCents,
  };
}
```

## Best Practices

1. **Store prices in cents** -- integer arithmetic avoids floating-point rounding errors
2. **Validate prices server-side** -- never trust client-submitted prices
3. **Reserve inventory at checkout** -- prevent overselling with time-limited reservations
4. **Snapshot prices in orders** -- store the price at purchase time, not a reference to current price
5. **Use state machines for orders** -- enforce valid transitions (draft->confirmed, not delivered->draft)
6. **Calculate tax based on shipping address** -- tax jurisdictions depend on destination
7. **Handle currency consistently** -- store currency code with every monetary amount
8. **Soft delete products** -- never hard delete; orders reference products forever
9. **Idempotent checkout** -- payment processing must handle retries without double-charging
10. **Separate catalog from inventory** -- product information and stock levels are different concerns

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Float for money | Rounding errors in totals | Use integer cents |
| No inventory reservation | Overselling, disappointed customers | Reserve during checkout with TTL |
| Price from client | Customers can modify prices | Always compute prices server-side |
| No order price snapshot | Price changes affect past orders | Store prices at order creation time |
| Hard-deleted products | Broken order history | Soft delete with `deleted_at` |
| No checkout idempotency | Double charges on retry | Use idempotency keys with Stripe |
