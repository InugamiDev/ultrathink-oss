---
name: logging
description: Structured logging, log levels, observability patterns, distributed tracing, and monitoring integration
layer: utility
category: development
triggers:
  - "add logging"
  - "structured logging"
  - "log levels"
  - "observability"
  - "distributed tracing"
  - "monitoring"
  - "debug logging"
  - "audit trail"
inputs:
  - context: Where logging is needed (API, service, worker, UI)
  - requirements: Compliance, debugging, performance monitoring, audit
  - stack: Technology stack and existing logging infrastructure
outputs:
  - logging_strategy: Log level assignments, format, and destinations
  - implementation: Logger configuration and usage code
  - structured_schema: Log event schema with required fields
  - alerting_rules: What to alert on and thresholds
  - retention_policy: Log retention and rotation recommendations
linksTo:
  - error-handling
  - api-designer
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - error-handling
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - logging_output: Produces log entries to configured destinations
---

# Logging

## Purpose

This skill designs logging systems that make applications observable, debuggable, and auditable. It covers structured logging formats, log level semantics, distributed tracing, alert configuration, and the balance between capturing enough information to diagnose issues and not drowning in noise.

## Key Concepts

### Log Level Semantics

Each level has a precise meaning. Using the wrong level creates noise and masks real problems.

```
FATAL (60):
  MEANING: Application cannot continue. Process will exit.
  EXAMPLES:
    - Cannot connect to database on startup
    - Critical configuration missing
    - Unrecoverable state corruption
  ACTION: Page on-call immediately. Process restart required.
  FREQUENCY: Should NEVER appear in normal operation.

ERROR (50):
  MEANING: An operation failed and could not be recovered.
  EXAMPLES:
    - API request failed after all retries
    - Payment processing failed
    - Data integrity violation detected
  ACTION: Alert team, investigate within hours.
  FREQUENCY: Rare — high error rate indicates a systemic problem.

WARN (40):
  MEANING: Something unexpected happened but the system recovered.
  EXAMPLES:
    - Retry succeeded after initial failure
    - Cache miss forcing database query
    - Deprecated API called by client
    - Rate limit approaching threshold
  ACTION: Review periodically, investigate if frequency increases.
  FREQUENCY: Occasional — spikes warrant investigation.

INFO (30):
  MEANING: Normal operational events worth recording.
  EXAMPLES:
    - Request handled: method, path, status, duration
    - User action: login, order placed, settings changed
    - Service started/stopped
    - Scheduled job completed
  ACTION: None (baseline for dashboards).
  FREQUENCY: Every significant operation.

DEBUG (20):
  MEANING: Detailed information for development and troubleshooting.
  EXAMPLES:
    - SQL queries executed
    - Cache hit/miss details
    - Request/response bodies (sanitized)
    - Function entry/exit with parameters
  ACTION: Enable when debugging specific issues.
  FREQUENCY: High — disabled in production by default.

TRACE (10):
  MEANING: Extremely detailed execution flow.
  EXAMPLES:
    - Every function call in a code path
    - Loop iterations
    - Middleware chain execution
  ACTION: Enable only for deep debugging.
  FREQUENCY: Very high — never enabled in production.
```

### Structured Logging vs Unstructured

```
BAD (unstructured):
  console.log('User 123 placed order 456 for $99.99 at 2026-03-02T10:30:00Z');
  // Cannot be parsed, filtered, or aggregated by machines

GOOD (structured):
  logger.info('Order placed', {
    userId: '123',
    orderId: '456',
    amount: 9999,
    currency: 'USD',
    timestamp: '2026-03-02T10:30:00Z',
  });
  // Produces JSON: {"level":"info","message":"Order placed","userId":"123",...}
  // Can be queried: SELECT * FROM logs WHERE userId = '123' AND orderId = '456'
```

### Structured Log Schema

Every log entry should include these base fields:

```json
{
  "timestamp": "2026-03-02T10:30:00.123Z",
  "level": "info",
  "message": "Order placed",
  "service": "order-service",
  "version": "2.1.0",
  "environment": "production",
  "traceId": "abc123def456",
  "spanId": "span789",
  "requestId": "req_xyz",
  "userId": "user_123",
  "duration_ms": 45,
  "metadata": {}
}
```

## Implementation Patterns

### Pattern 1: Logger Configuration (Node.js with Pino)

```typescript
import pino from 'pino';

// Base logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: process.env.SERVICE_NAME || 'unknown',
      version: process.env.APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
  // Pretty print in development, JSON in production
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export { logger };

// Create child loggers with context
const requestLogger = logger.child({
  requestId: req.headers['x-request-id'],
  userId: req.user?.id,
  path: req.path,
  method: req.method,
});
```

### Pattern 2: Request Logging Middleware

```typescript
import { logger } from './logger';

function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  const requestId = req.headers['x-request-id'] || generateId();

  // Attach request-scoped logger
  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.id,
  });

  // Log request start
  req.log.info('Request started');

  // Capture response
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000; // ms

    const logData = {
      statusCode: res.statusCode,
      duration_ms: Math.round(duration * 100) / 100,
      contentLength: res.getHeader('content-length'),
    };

    if (res.statusCode >= 500) {
      req.log.error(logData, 'Request failed (server error)');
    } else if (res.statusCode >= 400) {
      req.log.warn(logData, 'Request failed (client error)');
    } else {
      req.log.info(logData, 'Request completed');
    }
  });

  next();
}
```

### Pattern 3: Distributed Tracing Context

```typescript
// Propagate trace context across services
interface TraceContext {
  traceId: string;    // Shared across entire request chain
  spanId: string;     // Unique to this service's handling
  parentSpanId?: string;
}

function extractTraceContext(headers: Record<string, string>): TraceContext {
  // W3C Trace Context format
  const traceparent = headers['traceparent'];
  if (traceparent) {
    const [version, traceId, parentSpanId, flags] = traceparent.split('-');
    return {
      traceId,
      spanId: generateSpanId(),
      parentSpanId,
    };
  }

  // Generate new trace
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
  };
}

function propagateTraceContext(ctx: TraceContext): Record<string, string> {
  return {
    traceparent: `00-${ctx.traceId}-${ctx.spanId}-01`,
  };
}

// When calling another service
async function callOrderService(ctx: TraceContext, payload: any) {
  const headers = propagateTraceContext(ctx);
  const response = await fetch('https://order-service/api/orders', {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return response;
}
```

### Pattern 4: Audit Logging

For operations that require compliance tracking:

```typescript
interface AuditEvent {
  timestamp: string;
  actor: {
    id: string;
    type: 'user' | 'system' | 'api_key';
    ip?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

class AuditLogger {
  constructor(private readonly logger: Logger) {}

  log(event: AuditEvent): void {
    this.logger.info({
      audit: true, // Flag for filtering
      ...event,
    }, `AUDIT: ${event.actor.type}:${event.actor.id} ${event.action} ${event.resource.type}:${event.resource.id}`);
  }
}

// Usage
auditLogger.log({
  timestamp: new Date().toISOString(),
  actor: { id: userId, type: 'user', ip: req.ip },
  action: 'update',
  resource: { type: 'user', id: targetUserId },
  changes: [
    { field: 'role', oldValue: 'member', newValue: 'admin' },
  ],
  result: 'success',
});
```

### Pattern 5: Contextual Error Logging

```typescript
// Log errors with full context for debugging
function logError(logger: Logger, error: Error, context: Record<string, unknown> = {}) {
  const errorData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Include custom error properties
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }),
      // Include cause chain
      cause: error.cause ? {
        name: (error.cause as Error).name,
        message: (error.cause as Error).message,
      } : undefined,
    },
    ...context,
  };

  if (error instanceof AppError && error.statusCode < 500) {
    logger.warn(errorData, `Client error: ${error.message}`);
  } else {
    logger.error(errorData, `Server error: ${error.message}`);
  }
}
```

## What to Log (and What NOT to Log)

### Always Log

```
OPERATIONS:
  ✓ HTTP requests (method, path, status, duration)
  ✓ Database queries (in debug mode: query, params, duration)
  ✓ External API calls (service, endpoint, status, duration)
  ✓ Authentication events (login, logout, token refresh, failures)
  ✓ Authorization failures (who tried to access what)
  ✓ Business events (order placed, payment processed, user registered)
  ✓ System events (startup, shutdown, config changes, deployments)
  ✓ Errors and exceptions (with full context and stack traces)
  ✓ Performance anomalies (slow queries, high latency)
```

### Never Log

```
SENSITIVE DATA:
  ✗ Passwords (even hashed)
  ✗ API keys and tokens
  ✗ Credit card numbers
  ✗ Social Security Numbers
  ✗ Personal health information (PHI)
  ✗ Full request/response bodies with PII
  ✗ Session tokens / JWTs (log a hash or prefix only)
  ✗ Database connection strings with credentials

USE REDACTION:
  If you must log a structure that MIGHT contain sensitive fields,
  use automatic redaction (see Pino redact config above).
```

## Alerting Rules

```
P1 — PAGE IMMEDIATELY:
  - Error rate > 5% of requests for 5 minutes
  - Response time p99 > 10 seconds for 5 minutes
  - Any FATAL log entry
  - Zero successful health checks for 2 minutes
  - Database connection pool exhaustion

P2 — ALERT WITHIN 1 HOUR:
  - Error rate > 1% for 15 minutes
  - Response time p95 > 3 seconds for 15 minutes
  - Disk usage > 85%
  - Memory usage > 90%
  - Queue depth growing for 30 minutes

P3 — REVIEW DAILY:
  - Warning rate increase > 50% vs previous day
  - New error types appearing
  - Deprecated API usage
  - 4xx error rate > 10% (suggests client issues)

P4 — REVIEW WEEKLY:
  - Log volume trends
  - Cost of log storage
  - Coverage gaps (services with no logging)
```

## Retention Policy

```
HOT STORAGE (searchable, fast — 7-30 days):
  - All INFO and above
  - DEBUG only if enabled for specific investigation
  - Full structured format

WARM STORAGE (searchable, slower — 30-90 days):
  - WARN and above
  - Aggregated request metrics
  - Audit logs (may need longer per compliance)

COLD STORAGE (archived, retrieval takes time — 1-7 years):
  - ERROR and FATAL only
  - Audit logs (compliance-dependent)
  - Compressed format

DELETION:
  - DEBUG/TRACE: Delete after 7 days
  - INFO: Delete after 30 days
  - WARN: Delete after 90 days
  - ERROR/FATAL: Delete after 1 year (or per compliance)
  - AUDIT: Per regulatory requirement (often 7 years)
```

## Anti-Patterns

1. **Console.log in production**: `console.log` is unstructured, has no levels, cannot be filtered, and cannot be routed. Use a proper logger.
2. **Logging sensitive data**: Passwords, tokens, and PII in logs are security vulnerabilities and compliance violations. Redact automatically.
3. **Log and throw**: Logging an error and then throwing it causes duplicate log entries. Either handle it (log + recover) or propagate it (throw without logging).
4. **String interpolation for log messages**: `logger.info(\`User ${id} did ${action}\`)` prevents structured querying. Use: `logger.info({ userId: id, action }, 'User action')`.
5. **No correlation IDs**: Without request IDs and trace IDs, correlating logs across services is nearly impossible. Always propagate trace context.
6. **Logging everything at INFO**: If everything is important, nothing is important. Use the correct level for each event.
7. **Missing timestamps**: Logs without timestamps are useless for debugging time-dependent issues. Always include ISO 8601 timestamps.

## Integration Notes

- Pair with **error-handling** to ensure all error paths produce properly structured log entries.
- When designing APIs with **api-designer**, include request ID in response headers for client-side log correlation.
- Use structured log data to populate dashboards and drive alerting systems.
- For distributed systems, ensure trace context propagation is implemented at every service boundary.
