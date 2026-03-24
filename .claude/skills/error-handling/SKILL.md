---
name: error-handling
description: Error handling patterns, retry strategies, circuit breakers, graceful degradation, and user-facing error communication
layer: utility
category: development
triggers:
  - "error handling"
  - "retry strategy"
  - "circuit breaker"
  - "graceful degradation"
  - "error boundary"
  - "fault tolerance"
  - "exception handling"
inputs:
  - error_context: Where and how errors occur (API, database, UI, third-party service)
  - reliability_requirement: How critical is this operation (best-effort vs. must-succeed)
  - user_impact: How errors affect the end user
outputs:
  - error_strategy: Comprehensive error handling approach
  - retry_policy: When and how to retry failed operations
  - fallback_plan: Degradation path when retries are exhausted
  - error_types: Typed error hierarchy for the system
  - user_communication: How to present errors to users
linksTo:
  - logging
  - api-designer
  - ui-ux-pro
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - logging
  - api-designer
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Error Handling

## Purpose

This skill provides systematic approaches to handling errors across the entire stack — from database operations through API layers to user interfaces. It covers error classification, retry strategies, circuit breakers, graceful degradation, and the critical art of communicating errors to users without exposing internal details.

## Key Concepts

### Error Classification

Every error falls into one of these categories, and each demands a different response:

```
TRANSIENT (retry-safe):
  - Network timeout
  - Database connection pool exhaustion
  - Rate limit (429)
  - Service temporarily unavailable (503)
  - DNS resolution failure
  RESPONSE: Retry with exponential backoff

PERMANENT (do NOT retry):
  - Validation error (400)
  - Authentication failure (401)
  - Authorization failure (403)
  - Resource not found (404)
  - Business rule violation (409/422)
  RESPONSE: Return error to caller immediately

BUG (should never happen in production):
  - Null pointer / undefined access
  - Type mismatch
  - Assertion failure
  - Out of bounds
  RESPONSE: Log with full context, alert, return 500

CATASTROPHIC (system-level):
  - Out of memory
  - Disk full
  - Cascading failure
  - Data corruption
  RESPONSE: Alert immediately, activate fallback, page on-call
```

### The Error Handling Hierarchy

```
LEVEL 1 — PREVENT: Design errors out of the system
  - Type safety (TypeScript strict mode)
  - Input validation at boundaries
  - Database constraints (NOT NULL, UNIQUE, FK, CHECK)
  - Compile-time checks over runtime checks

LEVEL 2 — DETECT: Catch errors as close to the source as possible
  - Try/catch at integration boundaries
  - Error boundaries in React components
  - Health checks for dependencies
  - Schema validation at API entry points

LEVEL 3 — RECOVER: Automatically recover when possible
  - Retry transient failures
  - Fall back to cached data
  - Degrade gracefully (show partial results)
  - Redirect to alternative service

LEVEL 4 — REPORT: Make errors visible and actionable
  - Structured logging with context
  - Error tracking (Sentry, Datadog)
  - Alerting for critical errors
  - User-facing error messages

LEVEL 5 — LEARN: Prevent recurrence
  - Post-incident reviews
  - Automated tests for discovered bugs
  - Monitoring improvements
  - Runbook updates
```

## Patterns

### Pattern 1: Result Type (Errors as Values)

Instead of throwing exceptions, return errors as values:

```typescript
// Define a Result type
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// Use it in functions
async function createOrder(input: CreateOrderInput): Promise<Result<Order, OrderError>> {
  // Validate
  const validation = validateOrderInput(input);
  if (!validation.ok) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', details: validation.errors } };
  }

  // Check inventory
  const available = await checkInventory(input.items);
  if (!available.ok) {
    return { ok: false, error: { code: 'INSUFFICIENT_INVENTORY', items: available.unavailable } };
  }

  // Create order
  try {
    const order = await db.order.create({ data: input });
    return { ok: true, data: order };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { ok: false, error: { code: 'DUPLICATE_ORDER', message: 'Order already exists' } };
    }
    throw err; // Re-throw unexpected errors — these are bugs
  }
}

// Caller handles the result explicitly
const result = await createOrder(input);
if (!result.ok) {
  switch (result.error.code) {
    case 'VALIDATION_ERROR':
      return res.status(400).json({ error: result.error });
    case 'INSUFFICIENT_INVENTORY':
      return res.status(409).json({ error: result.error });
    case 'DUPLICATE_ORDER':
      return res.status(409).json({ error: result.error });
  }
}
return res.status(201).json(result.data);
```

### Pattern 2: Retry with Exponential Backoff

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // cap the backoff
  backoffMultiplier: number;
  jitter: boolean;        // add randomness to prevent thundering herd
  retryableErrors: (error: Error) => boolean;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 10_000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: (err) => {
    if (err instanceof HttpError) {
      return [408, 429, 500, 502, 503, 504].includes(err.status);
    }
    return err.message.includes('ECONNRESET') ||
           err.message.includes('ETIMEDOUT') ||
           err.message.includes('ECONNREFUSED');
  },
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-retryable errors
      if (!config.retryableErrors(lastError)) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
      delay = Math.min(delay, config.maxDelay);

      // Add jitter (0.5x to 1.5x)
      if (config.jitter) {
        delay = delay * (0.5 + Math.random());
      }

      console.warn(`Retry ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms`, {
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const data = await withRetry(() => fetch('https://api.example.com/data'));
```

### Pattern 3: Circuit Breaker

Prevents cascading failures by stopping calls to a failing service:

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation — requests pass through
  OPEN = 'OPEN',           // Failing — requests short-circuited immediately
  HALF_OPEN = 'HALF_OPEN', // Testing — allow one request to probe health
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailure = 0;
  private successCount = 0;

  constructor(
    private readonly name: string,
    private readonly config: {
      failureThreshold: number;     // failures before opening
      resetTimeout: number;         // ms before trying half-open
      successThreshold: number;     // successes in half-open to close
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailure > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new CircuitOpenError(
          `Circuit ${this.name} is OPEN. Try again in ${
            this.config.resetTimeout - (Date.now() - this.lastFailure)
          }ms`
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailure = Date.now();

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }
}

// Usage
const paymentCircuit = new CircuitBreaker('payment-service', {
  failureThreshold: 5,
  resetTimeout: 30_000,
  successThreshold: 3,
});

try {
  const result = await paymentCircuit.execute(() => paymentService.charge(order));
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // Fall back to queuing the payment for later processing
    await paymentQueue.enqueue(order);
    return { status: 'pending', message: 'Payment will be processed shortly' };
  }
  throw error;
}
```

### Pattern 4: React Error Boundaries

```tsx
// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; reset: () => void }> },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} reset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

// Fallback component
function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="p-6 rounded-xl border border-red-200 bg-red-50">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-2 text-red-600">{getUserFriendlyMessage(error)}</p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-4 min-h-[2.625rem] text-base rounded-lg bg-red-600 text-white
                   hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500
                   focus-visible:ring-offset-2 transition-all duration-200"
      >
        Try again
      </button>
    </div>
  );
}

// Usage — wrap feature boundaries
<ErrorBoundary fallback={ErrorFallback}>
  <OrderForm />
</ErrorBoundary>
```

### Pattern 5: Graceful Degradation

```typescript
// Define degradation levels
enum DegradationLevel {
  FULL = 'full',           // All features available
  PARTIAL = 'partial',     // Some features degraded
  MINIMAL = 'minimal',     // Core features only
  EMERGENCY = 'emergency', // Static fallback page
}

// Feature flags for degradation
const featureAvailability = {
  recommendations: async () => {
    try {
      await recommendationService.health();
      return true;
    } catch {
      return false;
    }
  },
  search: async () => {
    try {
      await searchService.health();
      return true;
    } catch {
      return false;
    }
  },
  realTimeUpdates: async () => {
    try {
      await websocketService.health();
      return true;
    } catch {
      return false;
    }
  },
};

// In the component
async function ProductPage({ productId }: { productId: string }) {
  const product = await getProduct(productId); // Core — must work

  // Non-critical features degrade gracefully
  const [recommendations, reviews] = await Promise.allSettled([
    getRecommendations(productId),
    getReviews(productId),
  ]);

  return (
    <div>
      <ProductDetails product={product} />

      {recommendations.status === 'fulfilled' ? (
        <Recommendations items={recommendations.value} />
      ) : (
        <FallbackRecommendations /> // Static/cached alternatives
      )}

      {reviews.status === 'fulfilled' ? (
        <Reviews reviews={reviews.value} />
      ) : (
        <ReviewsUnavailable /> // "Reviews temporarily unavailable"
      )}
    </div>
  );
}
```

## User-Facing Error Communication

### Principles

```
1. NEVER expose internal details (stack traces, SQL errors, file paths)
2. ALWAYS provide an actionable next step
3. USE human language, not error codes (show codes as secondary reference)
4. DIFFERENTIATE between "your mistake" and "our mistake"
5. PRESERVE user's work (don't clear forms on error)
```

### Error Message Templates

```
USER INPUT ERROR:
  Title: "We couldn't process your request"
  Body: "[Specific field] [specific problem]. [How to fix it]."
  Example: "The email address isn't valid. Please check for typos and try again."
  Action: [Fix the field and retry]

AUTHENTICATION ERROR:
  Title: "Please sign in to continue"
  Body: "Your session has expired. Please sign in again to continue where you left off."
  Action: [Sign in button → return to current page]

PERMISSION ERROR:
  Title: "Access restricted"
  Body: "You don't have permission to [action]. Contact your organization admin for access."
  Action: [Contact admin link / Go back]

NOT FOUND:
  Title: "Page not found"
  Body: "The page you're looking for doesn't exist or has been moved."
  Action: [Go to homepage / Search / Go back]

SERVER ERROR:
  Title: "Something went wrong"
  Body: "We're having trouble processing your request. Please try again in a few moments."
  Action: [Retry button] [Contact support link]
  Subtext: "Reference: [requestId] — share this with support if the problem persists."

SERVICE UNAVAILABLE:
  Title: "We're briefly offline for maintenance"
  Body: "We'll be back shortly. Check our status page for updates."
  Action: [Status page link] [Auto-refresh countdown]
```

## Error Handling by Layer

### API Route Handler

```typescript
// Centralized error handler for API routes
function withErrorHandler(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const requestId = req.headers['x-request-id'] || generateRequestId();

      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: error.message, details: error.details, requestId }
        });
      }

      if (error instanceof AuthError) {
        return res.status(401).json({
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required', requestId }
        });
      }

      if (error instanceof NotFoundError) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: error.message, requestId }
        });
      }

      // Unexpected error — log full details, return generic message
      logger.error('Unhandled API error', {
        error: error.message,
        stack: error.stack,
        requestId,
        path: req.url,
        method: req.method,
      });

      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId }
      });
    }
  };
}
```

## Anti-Patterns

1. **Pokemon exception handling**: `catch (e) {}` — catching and ignoring errors hides bugs and causes silent data corruption.
2. **Logging and rethrowing without context**: `catch (e) { log(e); throw e; }` adds noise. Either handle it or let it propagate.
3. **User-facing stack traces**: Exposing `Error: ECONNREFUSED 127.0.0.1:5432` tells attackers about your infrastructure and confuses users.
4. **Retrying non-retryable errors**: Retrying a 400 Validation Error will fail forever. Only retry transient errors.
5. **Unbounded retries**: Retrying without a limit or backoff causes thundering herd problems and amplifies outages.
6. **Error handling as control flow**: Using try/catch for expected conditions (like "user not found") instead of checking first. Reserve exceptions for exceptional situations.

## Integration Notes

- Use **logging** to ensure all errors are captured with sufficient context for debugging.
- Use **api-designer** to define consistent error response contracts across all endpoints.
- Use **ui-ux-pro** to ensure error states in the UI meet visual standards and accessibility requirements.
- Hand off to **sequential-thinking** when debugging complex error chains.
