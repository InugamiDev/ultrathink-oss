---
name: billing
description: Subscription billing, usage metering, invoicing, plan management, and payment lifecycle
layer: domain
category: payments
triggers:
  - "billing"
  - "subscription"
  - "pricing plans"
  - "usage metering"
  - "invoicing"
  - "subscription billing"
  - "plan management"
  - "upgrade downgrade"
inputs:
  - pricing_model: Flat rate | tiered | usage-based | per-seat | hybrid
  - payment_provider: Stripe | Paddle | LemonSqueezy (optional, defaults to Stripe)
  - requirements: Trial periods, proration, metering, invoicing needs
outputs:
  - billing_architecture: Subscription and billing system design
  - pricing_table: Plan definitions with features and limits
  - webhook_handlers: Payment event processing
  - metering_system: Usage tracking and aggregation
linksTo:
  - stripe
  - api-designer
  - data-modeling
  - error-handling
linkedFrom:
  - ecommerce
  - cook
  - plan
preferredNextSkills:
  - stripe
  - data-modeling
fallbackSkills:
  - stripe
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May create Stripe products and prices
  - May process payments
  - Handles sensitive financial data
---

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
