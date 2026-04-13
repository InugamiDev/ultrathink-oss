---
name: commerce-kit
description: "Unified commerce + payments toolkit — Stripe integration (Checkout, subscriptions, webhooks, Connect, payment intents), subscription billing/metering/invoicing, e-commerce patterns (cart, inventory, pricing, order lifecycle), Shopify Storefront + Admin API with headless commerce, affiliate commission calculation. Full revenue stack."
layer: domain
category: payments
triggers: ["affiliate program", "affiliate research", "billing", "billing portal", "checkout", "checkout flow", "commission", "commission calculator", "dunning", "e-commerce", "ecommerce", "inventory", "invoice", "liquid template", "niche finder", "order management", "payment", "payment intent", "plan management", "pricing", "pricing tiers", "product catalog", "recurring billing", "shopify", "shopify api", "shopify app", "shopify hydrogen", "shopping cart", "storefront api", "stripe", "stripe connect", "stripe webhook", "subscription", "usage metering"]
---

# commerce-kit

Unified commerce + payments toolkit — Stripe integration (Checkout, subscriptions, webhooks, Connect, payment intents), subscription billing/metering/invoicing, e-commerce patterns (cart, inventory, pricing, order lifecycle), Shopify Storefront + Admin API with headless commerce, affiliate commission calculation. Full revenue stack.


## Absorbs

- `stripe`
- `billing`
- `ecommerce`
- `shopify`
- `commission-calculator`


---

## From `stripe`

> Stripe integration including Checkout, subscriptions, webhooks, Connect, payment intents, and billing portal

# Stripe Integration Specialist

## Purpose

Implement secure and robust Stripe payment integrations including Checkout sessions, payment intents, subscriptions, webhooks, billing portal, and Stripe Connect for marketplace scenarios.

## Key Patterns

### Stripe Client Setup

```typescript
// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia", // Pin to your account's version; see https://docs.stripe.com/api/versioning
  typescript: true,
});
```

### Checkout Session (One-Time Payment)

```typescript
// app/api/checkout/route.ts
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priceId, quantity = 1 } = await request.json();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    client_reference_id: session.user.id,
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      userId: session.user.id,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

### Subscription Checkout

```typescript
// app/api/subscribe/route.ts
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priceId } = await request.json();

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(session.user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await saveStripeCustomerId(session.user.id, customerId);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: session.user.id },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return new Response("Webhook handler error", { status: 500 });
  }
}

// Handler implementations
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id;
  if (!userId) return;

  if (session.mode === "subscription") {
    await db.update(users).set({
      stripeCustomerId: session.customer as string,
      subscriptionStatus: "active",
    }).where(eq(users.id, userId));
  }

  if (session.mode === "payment") {
    // Fulfill one-time purchase
    await fulfillOrder(userId, session);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  await db.update(users).set({
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    plan: plan,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  }).where(eq(users.id, userId));
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await db.update(users).set({
    subscriptionStatus: "canceled",
    plan: "free",
  }).where(eq(users.id, userId));
}
```

### Billing Portal

```typescript
// app/api/billing/portal/route.ts
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customerId = await getStripeCustomerId(session.user.id);
  if (!customerId) return NextResponse.json({ error: "No billing account" }, { status: 400 });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

### Payment Intent (Custom Payment Flow)

```typescript
// Create payment intent for custom UI
export async function POST(request: Request) {
  const { amount, currency = "usd" } = await request.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: { /* your metadata */ },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
```

## Best Practices

### Webhooks
- Always verify webhook signatures with `stripe.webhooks.constructEvent`
- Make webhook handlers idempotent (events can be delivered more than once)
- Store the `event.id` to deduplicate
- Use `event.data.object` instead of fetching from the API (reduces latency)
- Return 200 quickly; do heavy processing asynchronously
- Handle `invoice.payment_failed` to notify users and prevent churn

### Security
- Never expose the secret key to the client; use publishable key only
- Use Checkout or Payment Elements (not raw card fields) for PCI compliance
- Store customer IDs in your database, not full card details
- Use webhook secrets per environment (test vs live)

### Subscriptions
- Always store `subscriptionStatus` and `currentPeriodEnd` locally
- Handle trial periods explicitly
- Use the billing portal for self-service plan changes
- Implement grace periods for failed payments (dunning)
- Sync subscription state from webhooks, not from client-side Checkout completion

### Testing
- Use Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Use test card numbers: `4242424242424242` (success), `4000000000000002` (decline)
- Test webhook events: `stripe trigger checkout.session.completed`

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Trusting client redirect for subscription status | Always use webhooks as source of truth |
| Not verifying webhook signatures | Use `constructEvent` with webhook secret |
| Non-idempotent webhook handlers | Check if event already processed |
| Hardcoding prices | Use Price IDs from Stripe dashboard, store in env vars |
| Missing `invoice.payment_failed` handler | Handle it to notify users, prevent churn |
| Not handling subscription `past_due` | Implement dunning flow |

## Examples

### Stripe CLI Commands

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed

# View recent events
stripe events list --limit 10

# Create test products
stripe products create --name="Pro Plan" --description="Full access"
stripe prices create --product=prod_xxx --unit-amount=2999 --currency=usd --recurring[interval]=month
```

### Price Configuration Pattern

```typescript
// lib/plans.ts
export const PLANS = {
  free: { name: "Free", priceId: null, features: ["5 projects", "1GB storage"] },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: ["Unlimited projects", "100GB storage", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: ["Everything in Pro", "SSO", "Custom contracts"],
  },
} as const;

export function getPlanFromPriceId(priceId: string) {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key;
  }
  return "free";
}
```


---

## From `billing`

> Subscription billing, usage metering, invoicing, plan management, and payment lifecycle

# Billing Skill

## Purpose

Design and implement subscription billing systems covering plan management, usage metering, proration, invoicing, and payment lifecycle. This skill handles the complexity of SaaS billing: trials, upgrades, downgrades, cancellations, dunning, and revenue recognition.

## Key Concepts

### Pricing Models

```
FLAT RATE:
  $29/month for all features
  Simple, predictable revenue
  Example: Basecamp

PER-SEAT:
  $10/user/month
  Revenue scales with team size
  Example: Slack, GitHub

TIERED:
  Free: 0-100 requests
  Pro: 101-10,000 requests at $0.01/request
  Enterprise: 10,001+ at $0.005/request
  Revenue scales with usage
  Example: Twilio, AWS

USAGE-BASED:
  Pay only for what you use
  $0.002 per API call
  Example: OpenAI, Vercel

HYBRID:
  Base subscription + usage overage
  $49/month includes 10,000 requests, then $0.005 each
  Example: Most modern SaaS
```

### Subscription Lifecycle

```
          trial_started
               |
               v
TRIALING ---> ACTIVE ---> PAST_DUE ---> CANCELED
    |           |              |              |
    |           v              v              v
    |        PAUSED       (dunning)      EXPIRED
    |           |              |
    |           v              v
    +----> CANCELED        CANCELED
```

### Billing Events

```
SUBSCRIPTION:
  subscription.created      -> Provision access
  subscription.updated      -> Handle plan change
  subscription.deleted      -> Revoke access
  subscription.trial_ending -> Send reminder email

PAYMENT:
  invoice.paid              -> Confirm payment, extend access
  invoice.payment_failed    -> Start dunning, notify user
  invoice.upcoming          -> Send preview, check payment method

CUSTOMER:
  customer.subscription.updated -> Sync plan to database
  checkout.session.completed    -> Complete purchase flow
```

## Patterns

### Plan and Entitlement System

```typescript
// Define plans and their entitlements
interface Plan {
  id: string;
  name: string;
  stripePriceId: string;
  monthlyPriceCents: number;
  limits: {
    apiCalls: number;      // -1 = unlimited
    storage: number;       // bytes, -1 = unlimited
    seats: number;
    projects: number;
  };
  features: string[];
}

const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    stripePriceId: '',
    monthlyPriceCents: 0,
    limits: { apiCalls: 1000, storage: 100_000_000, seats: 1, projects: 3 },
    features: ['Basic analytics', 'Community support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    stripePriceId: 'price_pro_monthly',
    monthlyPriceCents: 2900,
    limits: { apiCalls: 100_000, storage: 10_000_000_000, seats: 10, projects: -1 },
    features: ['Advanced analytics', 'Priority support', 'Custom domains', 'API access'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    stripePriceId: 'price_enterprise_monthly',
    monthlyPriceCents: 9900,
    limits: { apiCalls: -1, storage: -1, seats: -1, projects: -1 },
    features: ['All Pro features', 'SSO/SAML', 'Dedicated support', 'SLA', 'Audit logs'],
  },
};

// Check entitlements
async function checkLimit(orgId: string, resource: string): Promise<boolean> {
  const org = await getOrg(orgId);
  const plan = PLANS[org.planId];
  const limit = plan.limits[resource as keyof Plan['limits']];
  if (limit === -1) return true; // Unlimited

  const currentUsage = await getUsage(orgId, resource);
  return currentUsage < limit;
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }
  }

  return new Response('OK', { status: 200 });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  await db.organization.update({
    where: { stripeCustomerId: sub.customer as string },
    data: {
      planId: getPlanIdFromPriceId(sub.items.data[0].price.id),
      subscriptionStatus: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}
```

### Usage Metering

```typescript
// Track API usage with batched writes
class UsageMeter {
  private buffer: Map<string, number> = new Map();
  private flushInterval: NodeJS.Timer;

  constructor(private readonly flushIntervalMs: number = 60_000) {
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  record(orgId: string, metric: string, count: number = 1) {
    const key = `${orgId}:${metric}`;
    this.buffer.set(key, (this.buffer.get(key) ?? 0) + count);
  }

  async flush() {
    const entries = Array.from(this.buffer.entries());
    this.buffer.clear();

    for (const [key, count] of entries) {
      const [orgId, metric] = key.split(':');
      await db.usage.upsert({
        where: { orgId_metric_period: { orgId, metric, period: getCurrentPeriod() } },
        create: { orgId, metric, count, period: getCurrentPeriod() },
        update: { count: { increment: count } },
      });
    }
  }
}

// Report usage to Stripe for metered billing
async function reportUsageToStripe(orgId: string, metric: string) {
  const usage = await getUsageForCurrentPeriod(orgId, metric);
  const org = await getOrg(orgId);

  await stripe.subscriptionItems.createUsageRecord(
    org.stripeSubscriptionItemId,
    {
      quantity: usage.count,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'set',
    },
  );
}
```

## Best Practices

1. **Stripe is the source of truth for billing** -- your database mirrors it via webhooks
2. **Always verify webhook signatures** -- prevent spoofed payment events
3. **Handle webhooks idempotently** -- Stripe may send the same event multiple times
4. **Use Checkout Sessions for new subscriptions** -- do not build custom payment forms
5. **Implement dunning** -- automated retry and notification for failed payments
6. **Prorate on plan changes** -- Stripe handles this; enable proration in subscription updates
7. **Grace period on cancellation** -- allow access until the current period ends
8. **Entitlement checks at the API layer** -- enforce limits in middleware, not UI
9. **Track usage in batches** -- do not hit the database on every API call
10. **Test with Stripe CLI** -- `stripe listen --forward-to` for local webhook testing

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Database as billing source of truth | Data drift from Stripe | Sync via webhooks, Stripe is authoritative |
| No webhook signature verification | Spoofed payment events | Always verify with endpoint secret |
| Immediate access revocation | Angry customers who paid | Grant access until period end |
| No idempotency on webhooks | Duplicate processing | Check event ID before processing |
| Usage limits checked only in UI | Users bypass via API | Enforce limits in server middleware |
| No dunning flow | Revenue loss on failed payments | Retry payments, notify users, eventual downgrade |


---

## From `ecommerce`

> E-commerce architecture patterns including cart, inventory, pricing, checkout, and order management

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


---

## From `shopify`

> Shopify Storefront API, Admin API, Liquid templates, custom app development, and headless commerce

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


---

## From `commission-calculator`

> >

# Commission Calculator

Project realistic monthly affiliate earnings based on traffic estimates, platform
conversion rates, and program commission structures. Helps affiliates decide which
programs are worth their time before investing months of content creation.

## Stage

This skill belongs to Stage S1: Research

## When to Use

- User wants to project income before choosing a program
- User wants to compare the earnings potential of 2+ programs
- User is setting income goals and needs realistic benchmarks
- User is deciding whether a niche is worth entering based on earning potential
- User asks "how many page views / subscribers / followers do I need to make X"

## Input Schema

```
{
  programs: [
    {
      name: string            # (required) "HeyGen"
      reward_value: string    # (required) "30%" or "$50"
      reward_type: string     # (required) "cps_recurring" | "cps_one_time" | "cpl" | "cpa"
      reward_duration: string # (optional) "12 months" | "lifetime" | "first purchase"
      cookie_days: number     # (optional, default: 30) 30
      avg_product_price: number # (optional) Monthly plan price in USD. Needed for % commissions
    }
  ]
  traffic: {
    monthly_visitors: number  # (optional) Estimated monthly website visitors or video views
    email_subscribers: number # (optional) Email list size
    social_followers: number  # (optional) Followers on primary platform
  }
  platform: string            # (optional) "blog" | "youtube" | "tiktok" | "email" | "twitter"
  scenario: string            # (optional, default: "realistic") "conservative" | "realistic" | "optimistic"
  goal: string                # (optional) Target income, e.g., "$500/mo" or "$1000/mo"
  time_horizon: string        # (optional, default: "90 days") "30 days" | "90 days" | "12 months"
}
```

## Workflow

### Step 1: Gather Program Details

If program details are missing, pull from list.affitor.com (see `references/list-affitor-api.md`).

Key fields to extract: `reward_value`, `reward_type`, `cookie_days`.

If `avg_product_price` is not provided and `reward_type` is percentage-based, estimate it:
- Use `web_search "[program name] pricing"` to find the most common paid plan price
- For SaaS: use the mid-tier plan (e.g., $49/mo on a $19/$49/$99 structure)
- Note the assumption in output so user can adjust

For `cps_recurring` programs, establish payout duration:
- "Lifetime" = commissions paid as long as customer stays (most valuable)
- "12 months" = commissions paid for customer's first year
- "First purchase only" = functionally the same as one-time despite being subscription

### Step 2: Gather Traffic Estimates

If traffic data is not provided, prompt the user OR use platform benchmarks:

| Channel | Benchmark Ranges |
|---------|-----------------|
| New blog (0-6 months) | 500-2,000 visitors/mo |
| Growing blog (6-18 months) | 2,000-20,000 visitors/mo |
| Established blog (18+ months) | 20,000-200,000+ visitors/mo |
| YouTube channel (<1K subs) | 200-2,000 views/mo |
| YouTube channel (1K-10K subs) | 2,000-50,000 views/mo |
| TikTok (<10K followers) | 1,000-20,000 views/video |
| Twitter/X (<5K followers) | 50-500 impressions/tweet |
| Email list (<1K subscribers) | 200-400 opens/send |
| Email list (1K-10K subscribers) | 2,000-7,000 opens/send |

If user won't provide traffic, use "realistic" scenario benchmarks for their stated
platform and growth stage.

### Step 3: Apply Conversion Rate Assumptions

Use these industry-standard conversion rates as defaults. Adjust based on traffic quality
("buyer intent" content converts 5-10x better than informational content):

| Platform + Content Type | Click-through Rate | Affiliate Conversion |
|------------------------|-------------------|---------------------|
| Blog — product review | 3-6% | 2-5% |
| Blog — best-of listicle | 1.5-3% | 1-3% |
| Blog — tutorial/how-to | 0.5-1.5% | 0.5-2% |
| YouTube — dedicated review | 5-10% | 3-6% |
| YouTube — tutorial with mention | 1-3% | 1-3% |
| TikTok — product demo | 0.5-2% (bio link) | 0.5-2% |
| Email — dedicated send | 10-20% | 3-8% |
| Twitter/X — thread CTA | 0.5-2% | 0.5-2% |

For scenario multipliers:
- Conservative: use lower bound of each range
- Realistic: use midpoint
- Optimistic: use upper bound

### Step 4: Calculate Monthly and Projected Earnings

**Formula:**

```
Monthly clicks = Monthly visitors × Click-through rate
Monthly conversions = Monthly clicks × Affiliate conversion rate
Monthly commission = Monthly conversions × Commission per sale

Commission per sale:
  - Percentage-based: avg_product_price × (reward_value / 100)
  - Fixed: reward_value (as number)

For recurring (monthly SaaS) over time_horizon:
  Month 1 revenue = Month 1 conversions × commission_per_sale
  Month 2 revenue = (Month 1 conversions + Month 2 conversions) × commission_per_sale
  Month N = sum of all active subscribers × commission_per_sale
  [Cap at reward_duration if not lifetime]
```

Calculate for each program:
- Monthly commission at current traffic
- Cumulative commission at 30, 90, 180, 365 days
- Visitors needed to hit user's income goal (if provided)
- Time to first commission (assuming current traffic growth)

### Step 5: Side-by-Side Comparison (Multiple Programs)

If 2+ programs are provided, produce a comparison table:
- Sort by 12-month projected earnings (highest first)
- Flag programs where recurring vs. one-time makes a dramatic difference
- Call out programs with short cookie windows — lower conversion rates assumed
- Note programs with minimum payout thresholds that could delay first payment

### Step 6: Reverse Calculation (If Goal Provided)

If user states an income goal (e.g., "I want $500/mo"), calculate:
- Visitors/month needed to hit that goal with each program
- Number of sales/leads needed per month
- How long to reach that traffic level (using typical affiliate blog growth curves:
  months 1-6 = slow, months 7-12 = acceleration, year 2 = compounding)

### Step 7: Sanity Check and Context

Add context so user isn't misled by numbers:
1. These are projections, not guarantees. Real results vary significantly.
2. High-quality, buying-intent traffic converts 3-5x better than general traffic.
3. First sales often take 2-3 months even with good traffic (cookie window, indecision).
4. Recurring programs feel slow at first but compound — show the Year 1 vs Year 2 difference.

## Output Schema

```
{
  projections: [
    {
      program_name: string         # "HeyGen"
      reward_type: string          # "cps_recurring"
      commission_per_sale: number  # 14.40 (USD)
      monthly_30d: number          # Estimated month 1 earnings
      monthly_90d: number          # Estimated month 3 earnings
      monthly_12m: number          # Estimated month 12 earnings
      cumulative_12m: number       # Total year 1 earnings
      sales_needed_for_goal: number | null  # If goal provided
      visitors_needed_for_goal: number | null
    }
  ]
  assumptions: {
    monthly_visitors: number
    ctr: number
    conversion_rate: number
    scenario: string
    avg_product_price: number | null
  }
  top_program: string      # Name of highest-earning program at 12 months
  insight: string          # 2-3 sentence key takeaway
}
```

## Output Format

```
## Commission Calculator: [Program(s)]

### Assumptions Used

| Input | Value | Source |
|-------|-------|--------|
| Monthly visitors | [X] | [User-provided / estimated for [platform]] |
| Click-through rate | [X%] | [Platform benchmark — scenario] |
| Affiliate conversion | [X%] | [Platform benchmark — scenario] |
| Product price | $[X]/mo | [User-provided / web research] |
| Scenario | [Conservative / Realistic / Optimistic] | — |

---

### Earnings Projections

| Program | Per Sale | Month 1 | Month 3 | Month 6 | Year 1 Total |
|---------|----------|---------|---------|---------|-------------|
| [Program A] | $[X] | $[X] | $[X] | $[X] | $[X] |
| [Program B] | $[X] | $[X] | $[X] | $[X] | $[X] |

*[Note on recurring vs. one-time difference if applicable]*

---

### To Hit Your Goal of $[X]/mo

| Program | Sales Needed/Mo | Visitors Needed/Mo | Est. Time to Reach |
|---------|----------------|-------------------|-------------------|
| [Program A] | [X] | [X] | [X months] |
| [Program B] | [X] | [X] | [X months] |

---

### Key Insight

[2-3 sentences summarizing which program wins, why recurring compounds so much,
and what realistic first 90 days looks like]

---

## Next Steps

1. Run `affiliate-program-search` to verify these programs are on list.affitor.com
2. Run `niche-opportunity-finder` if you want to compare across niches, not just programs
3. Start creating content — your first sale typically comes at [estimated timeframe]
```

## Error Handling

- **No traffic data provided:** Use conservative benchmarks and label them clearly.
  Ask user for rough estimate ("Do you have any traffic yet, or are you starting from zero?")
- **Commission is percentage but no product price:** Use web_search to estimate.
  If still unknown, run calculator with $50, $100, $200 placeholders and show sensitivity.
- **Program not found on list.affitor.com:** Use web_search to find official affiliate
  program page. Extract commission from there.
- **Unrealistic goal stated (e.g., "$10K/month in 30 days"):** Complete the calculation,
  then honestly flag the traffic required (e.g., "This would require 2M visitors/month —
  more realistic in year 2-3 with consistent publishing.")
- **One-time vs. recurring confusion:** Always clarify the distinction. Show side-by-side
  year 1 earnings for a hypothetical one-time equivalent vs. recurring to illustrate.

## Examples

**Example 1:**
User: "How much can I make promoting HeyGen with a 5,000 visitor/month blog?"
→ Fetch HeyGen data: 30% recurring, 60-day cookie
→ Estimate: $39/mo avg plan × 30% = $11.70/conversion
→ 5,000 visitors × 3% CTR × 3% conversion = 4.5 sales/mo = $52.65/mo at month 1
→ By month 12 (compounding): ~$280/mo steady state
→ Year 1 total: ~$1,890

**Example 2:**
User: "Compare earnings: ConvertKit vs Mailchimp affiliate, I have 2,000 email subscribers"
→ Email channel: 15% open rate, 15% CTR on dedicated send, 5% conversion
→ ConvertKit: $29/mo avg plan, 30% recurring → $8.70/conversion
→ Mailchimp: one-time 20% up to $150 per referral (verify via web_search)
→ Calculate both at 90d and 12m. Show compounding advantage of ConvertKit.

**Example 3:**
User: "I want to make $1,000/month from affiliate marketing, how long will it take?"
→ Ask: what niche/programs? what platform? current traffic?
→ If starting from zero: model blog growth curve (months 1-6 = 0-2K visitors)
→ With realistic programs (30% recurring SaaS): need ~8,000-15,000 visitors/mo
→ Typical timeline: 8-14 months from zero to $1K/mo with consistent publishing

## References

- `references/list-affitor-api.md` — fetch live program data for commission structures
- `shared/references/affiliate-glossary.md` — reward_type definitions

