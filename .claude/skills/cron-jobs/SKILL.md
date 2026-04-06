---
name: cron-jobs
description: Scheduled task patterns — Vercel Cron, node-cron, BullMQ schedulers, Inngest scheduled functions, and crontab syntax
layer: utility
category: backend
triggers:
  - "cron job"
  - "scheduled task"
  - "cron schedule"
  - "recurring job"
  - "periodic task"
  - "vercel cron"
  - "background scheduler"
  - "crontab"
inputs:
  - Task to schedule (function, endpoint, script)
  - Schedule frequency and timing
  - Infrastructure (Vercel, self-hosted, serverless)
outputs:
  - Cron configuration (vercel.json, crontab, or code-based)
  - Job handler with idempotency and error handling
  - Monitoring and retry strategy
linksTo:
  - vercel
  - message-queues
  - monitoring
  - nodejs
linkedFrom:
  - ship
  - optimize
  - vercel
preferredNextSkills:
  - monitoring
  - message-queues
fallbackSkills:
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Modifies vercel.json or system crontab
  - Creates scheduled job entries in external services
---

# Cron Jobs Skill

## Purpose

Implement scheduled and recurring tasks across different runtimes: Vercel Cron for serverless, node-cron for long-running servers, BullMQ for Redis-backed job queues, and Inngest for event-driven scheduling. Includes crontab syntax reference.

## Crontab Syntax Reference

```
 ┌─────────── minute (0-59)
 │ ┌─────────── hour (0-23)
 │ │ ┌─────────── day of month (1-31)
 │ │ │ ┌─────────── month (1-12)
 │ │ │ │ ┌─────────── day of week (0-6, Sun=0)
 │ │ │ │ │
 * * * * *

Common patterns:
  */5 * * * *      Every 5 minutes
  0 * * * *        Every hour (on the hour)
  0 */6 * * *      Every 6 hours
  0 0 * * *        Daily at midnight
  0 9 * * 1-5      Weekdays at 9 AM
  0 0 1 * *        First day of each month
  0 0 * * 0        Every Sunday at midnight
```

## Vercel Cron

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/cron/digest", "schedule": "0 9 * * 1" },
    { "path": "/api/cron/sync", "schedule": "*/15 * * * *" }
  ]
}
```

```typescript
// app/api/cron/cleanup/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    const deleted = await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const duration = Date.now() - startTime;
    console.log(`Cron cleanup: deleted ${deleted.count} sessions in ${duration}ms`);
    return Response.json({ success: true, deleted: deleted.count, duration });
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
```

## node-cron (Long-Running Servers)

```typescript
// jobs/scheduler.ts
import cron from "node-cron";

// Validate before scheduling
if (!cron.validate("0 */6 * * *")) {
  throw new Error("Invalid cron expression");
}

const cleanupJob = cron.schedule("0 */6 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running cleanup...`);
  try {
    await cleanupExpiredData();
  } catch (error) {
    console.error("Cleanup job failed:", error);
    // Send alert to monitoring
  }
}, {
  timezone: "America/New_York",
  runOnInit: false,
});

// Graceful shutdown
process.on("SIGTERM", () => {
  cleanupJob.stop();
  process.exit(0);
});
```

## BullMQ Repeatable Jobs

```typescript
// jobs/queue.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const schedulerQueue = new Queue("scheduled-tasks", { connection });

// Add repeatable jobs
await schedulerQueue.add("daily-report", { type: "revenue" }, {
  repeat: { pattern: "0 8 * * *" }, // 8 AM daily
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
});

await schedulerQueue.add("hourly-sync", { source: "stripe" }, {
  repeat: { every: 3_600_000 }, // Every hour in ms
});

// Worker processes the jobs
const worker = new Worker("scheduled-tasks", async (job) => {
  switch (job.name) {
    case "daily-report":
      await generateReport(job.data.type);
      break;
    case "hourly-sync":
      await syncData(job.data.source);
      break;
  }
}, {
  connection,
  concurrency: 3,
  limiter: { max: 5, duration: 1000 },
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});
```

## Inngest Scheduled Functions

```typescript
// inngest/functions.ts
import { inngest } from "./client";

export const weeklyDigest = inngest.createFunction(
  { id: "weekly-digest", name: "Send Weekly Digest" },
  { cron: "0 9 * * 1" }, // Mondays at 9 AM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({ where: { digestEnabled: true } });
    });

    // Fan out: send digest to each user (auto-retried on failure)
    for (const user of users) {
      await step.run(`send-digest-${user.id}`, async () => {
        const content = await buildDigest(user.id);
        await sendEmail(user.email, "Weekly Digest", content);
      });
    }

    return { sent: users.length };
  }
);
```

## Best Practices

1. **Always verify authorization** -- Vercel Cron sends `CRON_SECRET`; validate it
2. **Make jobs idempotent** -- cron may fire twice; running the same job again must be safe
3. **Log start, end, and duration** -- essential for debugging missed or slow runs
4. **Set timeouts** -- Vercel serverless has a 60s limit (300s on Pro); plan accordingly
5. **Use dead-letter queues** -- capture failed jobs for later inspection (BullMQ, Inngest)
6. **Avoid overlapping runs** -- use distributed locks if a job must not run concurrently
7. **Monitor job health** -- alert on consecutive failures, not just single errors

## Choosing a Scheduler

| Approach | Best For | Limitations |
|----------|----------|-------------|
| **Vercel Cron** | Serverless Next.js, simple schedules | Max 60s execution, no sub-minute, limited to HTTP GET |
| **node-cron** | Self-hosted Node servers | Stops if process dies, single-instance only |
| **BullMQ** | Redis-backed, high-throughput, retries | Requires Redis, more setup |
| **Inngest** | Complex workflows, fan-out, auto-retry | External service dependency |
| **QStash** | Serverless, no infrastructure | HTTP-based, payload size limits |
