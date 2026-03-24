---
name: sentry
description: Sentry error tracking SDK integration, source maps, breadcrumbs, performance monitoring, custom contexts, and alerting for JavaScript/TypeScript applications
layer: domain
category: observability
triggers:
  - "sentry"
  - "error tracking"
  - "error monitoring"
  - "source maps"
  - "breadcrumbs"
  - "performance monitoring sentry"
  - "crash reporting"
  - "sentry alert"
inputs:
  - Application framework (Next.js, React, Node.js, etc.)
  - Deployment environment (Vercel, AWS, Docker, etc.)
  - Current error handling patterns
  - Performance budgets and SLOs
outputs:
  - Sentry SDK installation and configuration code
  - Source map upload setup (CI/CD integration)
  - Custom error boundary and context implementation
  - Alert rule recommendations
  - Performance monitoring configuration
linksTo:
  - monitoring
  - cicd
  - nextjs
  - vercel
linkedFrom:
  - ship
  - debug
  - optimize
preferredNextSkills:
  - monitoring
  - cicd
  - debug
fallbackSkills:
  - debug
  - monitoring
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Sentry Error Tracking Skill

## Purpose

Sentry transforms invisible runtime errors into actionable issues with full stack traces, breadcrumbs, and user context. This skill covers SDK setup for Next.js and Node.js, source map configuration, performance monitoring (tracing), custom contexts, alert rules, and best practices for keeping noise low and signal high.

## Key Concepts

### Sentry Data Flow

```
App Error → SDK captures → Enriches (breadcrumbs, context, tags)
  → Serializes → Sends to Sentry ingest
  → Source maps resolve minified stack traces
  → Grouped into Issues → Alerts fire → Team notified
```

### Core Terminology

| Term | Meaning |
|------|---------|
| **DSN** | Data Source Name — the URL Sentry SDK sends events to |
| **Event** | A single error or transaction sent to Sentry |
| **Issue** | A group of similar events (fingerprinted) |
| **Breadcrumb** | A trail of actions leading up to an error |
| **Scope** | Current context (user, tags, extras) attached to events |
| **Transaction** | A performance span representing a unit of work |
| **Span** | A timed operation within a transaction |
| **Release** | A version identifier for correlating deploys with errors |

## Workflow

### Step 1: Install and Configure (Next.js)

```bash
npx @sentry/wizard@latest -i nextjs
```

This creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and updates `next.config.js`.

#### sentry.client.config.ts

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay (captures user interactions leading to errors)
  replaysSessionSampleRate: 0.01,  // 1% of all sessions
  replaysOnErrorSampleRate: 1.0,    // 100% of sessions with errors

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],

  beforeSend(event, hint) {
    // Drop events from browser extensions
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some((f) => f.filename?.includes('extensions://'))) {
      return null;
    }
    return event;
  },
});
```

#### sentry.server.config.ts

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: 0.1,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.prismaIntegration(),      // If using Prisma
    Sentry.httpIntegration(),
  ],

  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
```

#### next.config.js (withSentryConfig)

```javascript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // your existing config
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: 'your-org',
  project: 'your-project',
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps then delete them from the bundle
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically instrument API routes and server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,

  // Hide source maps from the client
  hideSourceMaps: true,

  // Tunnel events through your domain to avoid ad blockers
  tunnelRoute: '/monitoring-tunnel',

  silent: !process.env.CI, // Only log in CI
});
```

### Step 2: Enrich Events with Context

#### Setting User Context

```typescript
// After authentication, identify the user
import * as Sentry from '@sentry/nextjs';

export function setUserContext(user: { id: string; email: string; plan: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    segment: user.plan, // 'free', 'pro', 'enterprise'
  });
}

// On logout, clear user context
export function clearUserContext() {
  Sentry.setUser(null);
}
```

#### Custom Breadcrumbs

```typescript
// Track important user actions that aren't auto-captured
function trackCheckoutStep(step: string, data: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: 'checkout',
    message: `Checkout step: ${step}`,
    data,
    level: 'info',
  });
}

// Usage
trackCheckoutStep('add-to-cart', { productId: '123', quantity: 2 });
trackCheckoutStep('enter-shipping', { country: 'US' });
trackCheckoutStep('payment-submitted', { method: 'stripe' });
// If payment fails, the breadcrumbs show the full journey
```

#### Tagging for Filtering

```typescript
// Tags are indexed and searchable in Sentry UI
Sentry.setTag('feature', 'checkout');
Sentry.setTag('api_version', 'v2');
Sentry.setTag('tenant', tenantId);

// Transaction-level tags
Sentry.withScope((scope) => {
  scope.setTag('payment_provider', 'stripe');
  scope.setExtra('cart_items', cartItems.length);
  Sentry.captureException(error);
});
```

### Step 3: Custom Error Boundaries (React)

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

export class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, eventId: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack },
      },
      tags: {
        boundary: this.props.context ?? 'unknown',
      },
    });
    this.setState({ eventId });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage in layout
<SentryErrorBoundary
  context="dashboard"
  fallback={<ErrorFallback />}
>
  <DashboardContent />
</SentryErrorBoundary>
```

### Step 4: Performance Monitoring

```typescript
// Manual transaction for background jobs
import * as Sentry from '@sentry/node';

async function processEmailQueue() {
  return Sentry.startSpan(
    {
      name: 'process-email-queue',
      op: 'queue.process',
    },
    async (span) => {
      const emails = await fetchPendingEmails();
      span.setAttribute('email.count', emails.length);

      for (const email of emails) {
        await Sentry.startSpan(
          {
            name: `send-email-${email.type}`,
            op: 'email.send',
          },
          async (childSpan) => {
            childSpan.setAttribute('email.recipient', email.to);
            await sendEmail(email);
          }
        );
      }
    }
  );
}
```

### Step 5: Source Maps in CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Create Sentry Release
  uses: getsentry/action-release@v3
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
  with:
    environment: production
    version: ${{ github.sha }}
    sourcemaps: '.next'
    url_prefix: '~/_next'
    set_commits: auto
```

### Step 6: Alert Configuration

```
Recommended Alert Rules:

1. **New Issue Alert** (Critical)
   Condition: A new issue is created
   Action: Slack #alerts + PagerDuty (business hours only)

2. **High Volume Alert** (Warning)
   Condition: An issue is seen > 100 times in 1 hour
   Action: Slack #alerts

3. **Regression Alert** (Critical)
   Condition: A resolved issue reappears
   Action: Slack #alerts + assign to last resolver

4. **Performance Alert**
   Condition: p95 transaction duration > 3s for 5 minutes
   Action: Slack #performance

5. **Error Rate Spike**
   Condition: Error rate > 5% of transactions for 10 minutes
   Action: Slack #alerts + PagerDuty
```

## Best Practices

1. **Set a meaningful release** — Use the git SHA so Sentry can link errors to commits and detect regressions across deploys.
2. **Keep sample rates low in production** — 10% `tracesSampleRate` is enough for most apps. 100% will blow your quota.
3. **Use `beforeSend` to scrub PII** — Never send passwords, tokens, or full credit card numbers to Sentry.
4. **Tunnel Sentry events through your domain** — Ad blockers block `sentry.io`. The `tunnelRoute` option in `@sentry/nextjs` routes events through `/monitoring-tunnel`.
5. **Delete source maps after upload** — Source maps expose your original code. Upload them to Sentry, then strip them from the deployed bundle.
6. **Filter browser extension errors** — Extensions inject code that throws errors your team cannot fix. Drop them in `beforeSend`.
7. **Use Sentry.withScope for contextual captures** — Avoid polluting the global scope with tags that only apply to specific operations.
8. **Set `ignoreErrors` for known noise** — ResizeObserver errors, network failures, and chunk loading errors are usually not actionable.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Missing source maps** | Stack traces show minified code (`a.js:1:2345`) | Configure `withSentryConfig` with `sourcemaps.deleteSourcemapsAfterUpload: true`; verify upload in CI logs |
| **Quota exhaustion** | Sentry stops ingesting events mid-month | Lower `tracesSampleRate`, add `beforeSend` filtering, set rate limits in project settings |
| **PII in error payloads** | User emails/tokens visible in Sentry UI | Scrub headers and request bodies in `beforeSend`; enable Sentry's server-side data scrubbing |
| **Ad blockers blocking Sentry** | Client-side errors never arrive | Use `tunnelRoute` to proxy events through your own domain |
| **Extension noise drowning real errors** | Issue list full of errors from Grammarly, LastPass, etc. | Filter frames with `extensions://` in `beforeSend` |
| **No release set** | Cannot track regressions or link to commits | Set `release` to `VERCEL_GIT_COMMIT_SHA` or CI commit hash |
| **Over-alerting** | Team ignores Sentry notifications | Tune alert thresholds; use "issue frequency" alerts instead of "every new event" |
| **Capturing expected errors** | Validation errors (400s) flood Sentry | Only call `captureException` for unexpected errors; let expected errors flow through normal response handling |
