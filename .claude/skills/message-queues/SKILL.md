---
name: message-queues
description: Message queue patterns with RabbitMQ, Redis Streams, BullMQ, dead letter queues, exactly-once delivery, and event-driven architectures
layer: domain
category: backend
triggers:
  - "message queue"
  - "rabbitmq"
  - "redis streams"
  - "bullmq"
  - "bull"
  - "event driven"
  - "pub sub"
  - "dead letter queue"
  - "job queue"
  - "task queue"
  - "background jobs"
inputs:
  - "Async processing requirements"
  - "Event-driven architecture needs"
  - "Job scheduling specifications"
outputs:
  - "Queue topology designs"
  - "Producer/consumer implementations"
  - "Retry and dead letter configurations"
linksTo:
  - redis
  - microservices
  - nodejs
  - python
  - golang
linkedFrom:
  - error-handling
  - logging
  - monitoring
preferredNextSkills:
  - redis
  - microservices
  - nodejs
fallbackSkills:
  - websockets
  - redis
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Message Queues Domain Skill

## Purpose

Provide expert-level guidance on message queue patterns, including RabbitMQ exchange topologies, Redis Streams consumer groups, BullMQ job processing, dead letter queues, retry strategies, exactly-once semantics, and event-driven architecture design.

## When to Use What

| Technology | Best For | Ordering | Persistence | Throughput |
|-----------|----------|----------|-------------|------------|
| **BullMQ** | Job queues in Node.js apps | FIFO per queue | Redis-backed | High |
| **Redis Streams** | Event logs, lightweight pub/sub | Per-stream | Configurable | Very high |
| **RabbitMQ** | Complex routing, multi-consumer | Per-queue | Durable | High |
| **Kafka** | Event sourcing, high-volume streaming | Per-partition | Durable | Extreme |
| **SQS** | Serverless, AWS-native | Best-effort | Managed | High |

## Key Patterns

### 1. BullMQ (Node.js)

```typescript
import { Queue, Worker, QueueScheduler, FlowProducer } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null, // Required by BullMQ
});

// Define typed job data
interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

interface EmailJobResult {
  messageId: string;
  deliveredAt: string;
}

// Queue with default job options
const emailQueue = new Queue<EmailJobData, EmailJobResult>('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: { age: 24 * 3600 }, // Keep completed for 24h
    removeOnFail: { age: 7 * 24 * 3600 },  // Keep failed for 7 days
  },
});

// Producer: Add jobs
async function sendEmail(data: EmailJobData, opts?: { delay?: number; priority?: number }) {
  return emailQueue.add('send', data, {
    delay: opts?.delay,
    priority: opts?.priority, // Lower = higher priority
    jobId: `email-${data.to}-${Date.now()}`, // Idempotency key
  });
}

// Worker: Process jobs
const emailWorker = new Worker<EmailJobData, EmailJobResult>(
  'email',
  async (job) => {
    job.log(`Processing email to ${job.data.to}`);
    job.updateProgress(10);

    const html = await renderTemplate(job.data.template, job.data.variables);
    job.updateProgress(50);

    const result = await mailer.send({
      to: job.data.to,
      subject: job.data.subject,
      html,
    });
    job.updateProgress(100);

    return { messageId: result.id, deliveredAt: new Date().toISOString() };
  },
  {
    connection,
    concurrency: 5,           // Process 5 jobs in parallel
    limiter: {
      max: 100,               // Max 100 jobs
      duration: 60_000,       // Per minute (rate limiting)
    },
  }
);

// Event handlers
emailWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Email sent successfully');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message, attempts: job?.attemptsMade }, 'Email failed');
});

// Scheduled/recurring jobs
await emailQueue.add('daily-digest', { template: 'digest' }, {
  repeat: {
    pattern: '0 9 * * *', // Every day at 9 AM
    tz: 'America/New_York',
  },
});

// Job flows (parent-child dependencies)
const flow = new FlowProducer({ connection });

await flow.add({
  name: 'generate-report',
  queueName: 'reports',
  data: { reportId: '123' },
  children: [
    { name: 'fetch-data', queueName: 'data', data: { source: 'analytics' } },
    { name: 'fetch-data', queueName: 'data', data: { source: 'billing' } },
  ],
});
```

### 2. Redis Streams

```typescript
import Redis from 'ioredis';

const redis = new Redis();

// Producer: Add events to stream
async function publishEvent(stream: string, event: Record<string, string>) {
  // MAXLEN ~ 10000 trims stream approximately (more efficient than exact)
  return redis.xadd(stream, 'MAXLEN', '~', '10000', '*', ...Object.entries(event).flat());
}

await publishEvent('orders', {
  type: 'order.created',
  orderId: '12345',
  userId: 'user-1',
  total: '9999',
  timestamp: Date.now().toString(),
});

// Consumer group: Reliable, multi-consumer processing
const GROUP = 'order-processors';
const CONSUMER = `worker-${process.pid}`;
const STREAM = 'orders';

// Create consumer group (idempotent with MKSTREAM)
try {
  await redis.xgroup('CREATE', STREAM, GROUP, '0', 'MKSTREAM');
} catch {
  // Group already exists
}

// Process loop
async function consumeStream() {
  while (true) {
    // Read new messages (> means undelivered to this consumer)
    const entries = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER,
      'COUNT', '10',
      'BLOCK', '5000', // Block for 5s if no messages
      'STREAMS', STREAM, '>'
    );

    if (!entries) continue;

    for (const [, messages] of entries) {
      for (const [id, fields] of messages) {
        try {
          const event = Object.fromEntries(
            fields.reduce((acc, val, i) => {
              if (i % 2 === 0) acc.push([val, fields[i + 1]]);
              return acc;
            }, [] as [string, string][])
          );

          await processEvent(event);

          // Acknowledge successful processing
          await redis.xack(STREAM, GROUP, id);
        } catch (error) {
          logger.error({ id, error }, 'Failed to process event');
          // Message will be re-delivered (pending entries list)
        }
      }
    }
  }
}

// Claim stale messages (for crash recovery)
async function claimStaleMessages() {
  // Find messages pending for more than 5 minutes
  const pending = await redis.xpending(STREAM, GROUP, '-', '+', '100');

  for (const [id, consumer, idleTime] of pending) {
    if (idleTime > 5 * 60 * 1000) {
      const claimed = await redis.xclaim(
        STREAM, GROUP, CONSUMER,
        5 * 60 * 1000, // Min idle time
        id
      );
      logger.info({ id, previousConsumer: consumer }, 'Claimed stale message');
    }
  }
}
```

### 3. Dead Letter Queue Pattern

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoff: 'fixed' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 5,
  backoff: 'exponential',
  baseDelay: 1000,
  maxDelay: 60_000,
};

async function processWithDLQ<T>(
  message: T,
  processor: (msg: T) => Promise<void>,
  dlqQueue: Queue,
  policy: RetryPolicy = DEFAULT_RETRY,
  attempt = 1,
) {
  try {
    await processor(message);
  } catch (error) {
    if (attempt >= policy.maxAttempts) {
      // Send to Dead Letter Queue
      await dlqQueue.add('dead-letter', {
        originalMessage: message,
        error: error instanceof Error ? error.message : String(error),
        attempts: attempt,
        failedAt: new Date().toISOString(),
      });
      logger.error({ message, attempt, error }, 'Message moved to DLQ');
      return;
    }

    // Calculate retry delay
    const delay = policy.backoff === 'exponential'
      ? Math.min(policy.baseDelay * Math.pow(2, attempt - 1), policy.maxDelay)
      : policy.baseDelay;

    logger.warn({ message, attempt, delay, error }, 'Retrying message');

    // Re-queue with delay
    setTimeout(() => processWithDLQ(message, processor, dlqQueue, policy, attempt + 1), delay);
  }
}
```

### 4. Idempotent Consumer

```typescript
// Prevent duplicate processing using an idempotency key
class IdempotentConsumer {
  constructor(private redis: Redis, private ttl: number = 86400) {}

  async process<T>(
    messageId: string,
    handler: () => Promise<T>,
  ): Promise<T | null> {
    // Try to acquire processing lock
    const acquired = await this.redis.set(
      `idempotency:${messageId}`,
      'processing',
      'EX', this.ttl,
      'NX' // Only set if not exists
    );

    if (!acquired) {
      // Already processed or in progress
      const status = await this.redis.get(`idempotency:${messageId}`);
      if (status === 'completed') {
        logger.debug({ messageId }, 'Duplicate message, already processed');
        return null;
      }
      // Still processing by another consumer -- skip
      return null;
    }

    try {
      const result = await handler();
      await this.redis.set(`idempotency:${messageId}`, 'completed', 'EX', this.ttl);
      return result;
    } catch (error) {
      await this.redis.del(`idempotency:${messageId}`);
      throw error;
    }
  }
}
```

## Best Practices

1. **Make consumers idempotent** -- messages may be delivered more than once
2. **Use dead letter queues** for messages that fail after max retries
3. **Set message TTL** to prevent queue buildup from stale messages
4. **Use consumer groups** for load balancing across multiple workers
5. **Implement backpressure** -- limit concurrency, use rate limiters
6. **Monitor queue depth** -- alert when messages accumulate
7. **Use exponential backoff** for retries, not fixed delays
8. **Include correlation IDs** in messages for distributed tracing
9. **Schema-version your messages** for backward compatibility
10. **Test failure scenarios** -- simulate crashes, slow consumers, network partitions

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Assuming exactly-once delivery | Duplicate processing | Idempotent consumers with deduplication keys |
| No dead letter queue | Poison messages block the queue | Configure DLQ with max retry policy |
| Unbounded retry loops | Infinite resource consumption | Set max attempts with exponential backoff |
| Large message payloads | Memory pressure, slow delivery | Store payload in S3/DB, pass reference in message |
| Not acknowledging messages | Message re-delivery storm | Always ACK after successful processing |
| Synchronous processing of dependent events | Cascading failures | Use separate queues, saga pattern |
| No monitoring/alerting | Silent queue buildup | Monitor queue depth, consumer lag, failure rate |
