# Inngest

> Durable workflow engine — event-driven background jobs, retries, scheduling, and step functions.

## When to Use
- Background jobs that must survive failures (email sequences, data pipelines)
- Event-driven workflows triggered by app events (user.signup, order.created)
- Scheduled/cron tasks without separate infrastructure
- Multi-step processes needing automatic retries per step
- Fan-out patterns (one event triggers many functions)

## Core Patterns

### Basic Function
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app" });

export const syncUser = inngest.createFunction(
  { id: "sync-user", retries: 3 },
  { event: "user/created" },
  async ({ event, step }) => {
    const profile = await step.run("fetch-profile", () =>
      fetchProfile(event.data.userId)
    );
    await step.run("sync-to-crm", () => syncToCRM(profile));
    return { synced: true };
  }
);
```

### Step Primitives
```typescript
inngest.createFunction(
  { id: "onboarding-flow" },
  { event: "user/signup" },
  async ({ event, step }) => {
    await step.run("send-welcome", () => sendEmail(event.data.email));
    await step.sleep("wait-1d", "1 day");
    const opened = await step.waitForEvent("wait-for-open", {
      event: "email/opened",
      match: "data.userId",
      timeout: "3 days",
    });
    if (!opened) await step.run("send-nudge", () => sendNudge(event.data.email));
  }
);
```

### Cron & Throttling
```typescript
// Cron schedule
inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 9 * * *" },
  async ({ step }) => { await step.run("generate", () => buildReport()); }
);

// Throttle: max 10 per user per hour
inngest.createFunction(
  { id: "send-notification", throttle: { key: "event.data.userId", count: 10, period: "1h" } },
  { event: "notify/send" },
  async ({ event }) => { /* ... */ }
);
```

### Framework Serve (Next.js)
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { syncUser, onboardingFlow } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({ client: inngest, functions: [syncUser, onboardingFlow] });
// Mount at app/api/inngest/route.ts
```

## Key Features
- **Steps**: `step.run()` (durable exec), `step.sleep()`, `step.sleepUntil()`, `step.waitForEvent()`
- **Retries**: Per-function or per-step, exponential backoff by default
- **Fan-out**: Multiple functions trigger on the same event independently
- **Concurrency**: `{ concurrency: { limit: 5, key: "event.data.tenantId" } }`
- **Cancellation**: `{ cancelOn: [{ event: "user/deleted", match: "data.userId" }] }`
- **Batching**: `{ batchEvents: { maxSize: 100, timeout: "5s" } }` for bulk processing
- **Sending events**: `await inngest.send({ name: "user/created", data: { userId } })`
- **Dev server**: `npx inngest-cli@latest dev` for local testing with UI at localhost:8288
