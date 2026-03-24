---
name: idempotency
description: Idempotency patterns — idempotency keys, dedup, at-least-once, exactly-once
layer: domain
category: architecture
triggers:
  - idempotency
  - idempotent
  - duplicate request
  - retry safety
  - exactly once
  - at least once
  - deduplication
linksTo:
  - api-designer
  - message-queues
  - webhooks
linkedFrom:
  - api-designer
  - webhooks
riskLevel: high
---

# Idempotency

## Overview

An idempotent operation produces the same result regardless of how many times it is executed. This is critical for payment processing, webhook handlers, queue consumers, and any API that may receive retried requests due to network failures or client timeouts.

## When to Use

- POST/PUT endpoints that create or mutate resources (especially financial transactions)
- Webhook receivers where the sender retries on timeout
- Message queue consumers with at-least-once delivery
- Any operation where duplicate execution causes data corruption or double-charging

## Key Patterns

### Idempotency Key in API Requests

The client sends a unique key; the server stores the result and returns it on replay.

```typescript
// Middleware: idempotency key check
async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;
  if (!key) return next(); // non-idempotent path

  const cached = await db.query(
    `SELECT status_code, body FROM idempotency_keys WHERE key = $1 AND endpoint = $2`,
    [key, req.path]
  );

  if (cached.rows.length > 0) {
    const { status_code, body } = cached.rows[0];
    return res.status(status_code).json(JSON.parse(body));
  }

  // Acquire lock to prevent concurrent duplicates
  const lock = await db.query(
    `INSERT INTO idempotency_keys (key, endpoint, locked_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key, endpoint) DO NOTHING
     RETURNING key`,
    [key, req.path]
  );

  if (lock.rows.length === 0) {
    return res.status(409).json({ error: 'Request in progress' });
  }

  // Capture the response to store it
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    db.query(
      `UPDATE idempotency_keys SET status_code = $1, body = $2, completed_at = NOW()
       WHERE key = $3 AND endpoint = $4`,
      [res.statusCode, JSON.stringify(body), key, req.path]
    );
    return originalJson(body);
  };

  next();
}
```

### Database Schema

```sql
CREATE TABLE idempotency_keys (
  key         TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  status_code INT,
  body        JSONB,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  PRIMARY KEY (key, endpoint)
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys (expires_at);
```

### Message Queue Deduplication

```typescript
async function processMessage(message: QueueMessage) {
  const messageId = message.attributes.messageId;

  // Atomic insert-or-skip
  const result = await db.query(
    `INSERT INTO processed_messages (message_id, processed_at)
     VALUES ($1, NOW())
     ON CONFLICT (message_id) DO NOTHING
     RETURNING message_id`,
    [messageId]
  );

  if (result.rows.length === 0) {
    console.log(`Skipping duplicate message: ${messageId}`);
    return; // already processed
  }

  await handleBusinessLogic(message.body);
}
```

### Natural Idempotency Keys

Use deterministic identifiers derived from the operation itself:

```typescript
// Instead of a random UUID, derive from the operation
import { createHash } from 'crypto';

function deriveIdempotencyKey(userId: string, action: string, amount: number, date: string) {
  return createHash('sha256')
    .update(`${userId}:${action}:${amount}:${date}`)
    .digest('hex');
}
```

## Pitfalls

- **Missing expiry**: Idempotency keys stored forever waste space. Expire them after 24-48 hours.
- **No locking**: Two concurrent requests with the same key can both pass the check. Use INSERT ... ON CONFLICT or advisory locks.
- **Storing only success**: If a request fails, the retry should re-execute, not replay the error. Only cache successful (2xx) responses.
- **GET endpoints**: GET is naturally idempotent — don't add idempotency key overhead to read operations.
- **Client-generated keys**: Always validate key format (UUID v4) and enforce uniqueness per endpoint, not globally.
