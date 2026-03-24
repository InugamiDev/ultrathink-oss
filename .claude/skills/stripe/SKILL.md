---
name: stripe
description: Stripe integration including Checkout, subscriptions, webhooks, Connect, payment intents, and billing portal
layer: domain
category: payments
triggers:
  - "stripe"
  - "payment"
  - "checkout"
  - "subscription"
  - "stripe webhook"
  - "payment intent"
  - "stripe connect"
  - "billing portal"
inputs: [payment requirements, pricing model, product catalog, webhook events]
outputs: [Stripe integration code, webhook handlers, checkout sessions, subscription management]
linksTo: [billing, ecommerce, authentication, encryption]
linkedFrom: [ecommerce, billing, ship]
preferredNextSkills: [billing, ecommerce, authentication]
fallbackSkills: [ecommerce]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [payment processing, subscription changes, webhook registration]
---

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
