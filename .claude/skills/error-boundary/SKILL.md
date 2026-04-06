---
name: error-boundary
description: React Error Boundaries including class-based ErrorBoundary, Next.js App Router error.tsx, fallback UI design, error recovery, retry patterns, and error reporting integration
layer: domain
category: frontend
triggers:
  - "error boundary"
  - "ErrorBoundary"
  - "error.tsx"
  - "error fallback"
  - "error recovery"
  - "react error handling"
  - "crash recovery"
  - "retry on error"
inputs:
  - Error scope (page, component, global)
  - Recovery strategy (retry, redirect, fallback content)
  - Error reporting service (Sentry, LogRocket, custom)
outputs:
  - ErrorBoundary component implementations
  - error.tsx / global-error.tsx files
  - Error reporting integration code
  - Retry and recovery patterns
linksTo:
  - react
  - nextjs
  - monitoring
  - ui-ux-pro
linkedFrom:
  - testing-patterns
  - streaming
preferredNextSkills:
  - monitoring
  - testing-patterns
fallbackSkills:
  - react
  - nextjs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# React Error Boundaries Skill

## Purpose

Prevent a single component crash from taking down the entire application. Error boundaries catch rendering errors, display fallback UI, enable recovery, and report errors to monitoring services.

## Error Boundary Types

| Type | Scope | File | Framework |
|------|-------|------|-----------|
| **Class ErrorBoundary** | Any component tree | Custom component | React 16+ |
| **error.tsx** | Route segment | `app/[route]/error.tsx` | Next.js App Router |
| **global-error.tsx** | Entire app (root layout) | `app/global-error.tsx` | Next.js App Router |
| **Suspense + ErrorBoundary** | Async boundaries | Composition | React 18+ |

## Key Patterns

### 1. Reusable Class-Based ErrorBoundary

```tsx
'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.reset);
      }
      return this.props.fallback ?? <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="p-6 rounded-xl border border-red-200 bg-red-50">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-2 text-red-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-4 text-base rounded-lg bg-red-600 text-white
                   hover:bg-red-700 transition-all duration-200
                   focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
      >
        Try again
      </button>
    </div>
  );
}
```

### 2. Next.js App Router error.tsx

```tsx
// app/dashboard/error.tsx -- catches errors in the dashboard route segment
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to error monitoring
    reportError(error);
  }, [error]);

  return (
    <div role="alert" className="p-8 rounded-2xl border shadow-sm max-w-lg mx-auto mt-16">
      <h2 className="text-xl font-bold">Dashboard Error</h2>
      <p className="mt-2 text-gray-600">
        {error.digest
          ? 'An unexpected error occurred. Our team has been notified.'
          : error.message}
      </p>
      <button
        onClick={reset}
        className="mt-6 px-6 py-4 text-base rounded-lg bg-blue-600 text-white
                   hover:bg-blue-700 transition-all duration-200
                   focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
      >
        Try again
      </button>
    </div>
  );
}
```

### 3. Global Error Handler (Root Layout Crash)

```tsx
// app/global-error.tsx -- only catches errors in root layout
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="p-8 rounded-2xl border shadow-sm max-w-md text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-4 text-gray-600">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              className="mt-6 px-6 py-4 text-base rounded-lg bg-blue-600 text-white
                         hover:bg-blue-700 transition-all duration-200
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### 4. Retry with Exponential Backoff

```tsx
'use client';
import { useCallback, useState } from 'react';

function useRetryableQuery<T>(fetcher: () => Promise<T>, maxRetries = 3) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fetcher();
        setData(result);
        setRetryCount(0);
        setIsLoading(false);
        return result;
      } catch (err) {
        if (attempt === maxRetries) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setRetryCount(attempt);
          setIsLoading(false);
          throw err;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }, [fetcher, maxRetries]);

  return { data, error, isLoading, retryCount, execute };
}
```

### 5. Granular Boundaries with Suspense

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-6 py-16">
      {/* Each widget isolated -- one crash does not affect others */}
      <ErrorBoundary fallback={(err, reset) => <WidgetError error={err} reset={reset} />}>
        <Suspense fallback={<WidgetSkeleton />}>
          <RevenueChart />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={(err, reset) => <WidgetError error={err} reset={reset} />}>
        <Suspense fallback={<WidgetSkeleton />}>
          <UserStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={(err, reset) => <WidgetError error={err} reset={reset} />}>
        <Suspense fallback={<WidgetSkeleton />}>
          <RecentOrders />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

## Error Reporting Integration

```typescript
// lib/error-reporting.ts
export function reportError(error: Error, context?: Record<string, unknown>) {
  // Sentry
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }

  // Fallback: POST to your own endpoint
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }),
  }).catch(() => {});
}
```

## Best Practices

1. **Wrap every independent UI section** in its own ErrorBoundary -- sidebar, main content, widgets
2. **Always provide a reset/retry action** -- do not show dead-end error screens
3. **Use `error.digest`** in Next.js to distinguish server errors (hide details) from client errors
4. **Report errors to monitoring** in `componentDidCatch` or `useEffect` in error.tsx
5. **Combine ErrorBoundary + Suspense** for async components -- catch both loading and error states
6. **Show contextual fallbacks** -- a chart error should show a chart-sized placeholder, not a full-page error
7. **Do not catch errors in event handlers** with ErrorBoundary -- use try/catch instead

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No ErrorBoundary at all | One bad component crashes the entire app | Add boundaries at route and widget level |
| Only a global boundary | Entire page replaced by error UI for a small widget crash | Use granular boundaries per section |
| ErrorBoundary around event handlers | Errors in onClick/onSubmit are not caught | Use try/catch inside event handlers |
| Forgetting `'use client'` on error.tsx | Next.js build error | error.tsx must be a Client Component |
| No error reporting | Errors happen silently in production | Integrate Sentry or custom error endpoint |
