---
name: analytics
description: Event tracking architecture, Plausible Analytics, PostHog, Google Analytics 4, custom analytics pipelines, privacy-first tracking, and A/B testing integration
layer: domain
category: frontend
triggers:
  - "analytics"
  - "event tracking"
  - "plausible"
  - "posthog"
  - "google analytics"
  - "GA4"
  - "page views"
  - "conversion tracking"
  - "A/B testing"
  - "user tracking"
  - "funnel"
inputs:
  - Application framework (Next.js, React, etc.)
  - Privacy requirements (GDPR, CCPA compliance needs)
  - Analytics provider preference (Plausible, PostHog, GA4, custom)
  - Key metrics and conversion goals
  - A/B testing requirements
outputs:
  - Analytics SDK integration code
  - Event taxonomy and naming conventions
  - Privacy-compliant tracking implementation
  - Conversion funnel definitions
  - A/B testing setup
linksTo:
  - nextjs
  - react
  - typescript-frontend
  - api-designer
linkedFrom:
  - ship
  - optimize
  - ui-ux-pro
preferredNextSkills:
  - testing-patterns
  - performance-profiler
  - api-designer
fallbackSkills:
  - typescript-frontend
  - debug
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Analytics & Event Tracking Skill

## Purpose

Analytics transforms user behavior into actionable data. This skill covers integrating analytics providers (Plausible, PostHog, GA4), designing event taxonomies, building privacy-first tracking, setting up conversion funnels, and implementing A/B testing. The focus is on collecting only what matters while respecting user privacy and complying with GDPR/CCPA.

## Key Concepts

### Analytics Provider Comparison

| Feature | Plausible | PostHog | GA4 | Custom |
|---------|-----------|---------|-----|--------|
| Privacy-first | Yes (no cookies) | Configurable | No (requires consent) | You control it |
| Self-hostable | Yes | Yes | No | Yes |
| Session replay | No | Yes | No | Build it |
| Feature flags | No | Yes | No | Build it |
| A/B testing | No | Yes | Yes (Optimize sunset) | Build it |
| Funnels | Basic | Yes | Yes | Build it |
| Cost | $9+/mo or self-host | Free tier + paid | Free (with limits) | Infrastructure cost |
| Cookie-free | Yes | Optional | No | Your choice |
| GDPR compliant (no consent) | Yes (EU hosting) | Self-hosted only | No | If self-hosted |

### Event Taxonomy

Use a consistent naming convention across your entire application:

```
Format: object.action

Examples:
  page.viewed
  button.clicked
  form.submitted
  signup.started
  signup.completed
  checkout.step_completed
  payment.succeeded
  payment.failed
  feature.used
  search.performed
  error.encountered
```

**Rules:**
- Lowercase, dot-separated: `object.action`
- Past tense for completed actions: `form.submitted` not `form.submit`
- Include context as properties, not in the event name: `button.clicked { label: "Buy Now" }` not `buy_now_button.clicked`

## Workflow

### Step 1: Choose Your Provider

```
Need cookie-free, GDPR-compliant out of the box?
  -> Plausible

Need session replay, feature flags, and funnels?
  -> PostHog

Need to integrate with Google Ads / Search Console?
  -> GA4 (with consent banner)

Need full control and own your data?
  -> Custom analytics pipeline
```

### Step 2: Implement the Analytics Layer

#### Plausible (Privacy-First, No Cookies)

```typescript
// lib/analytics/plausible.ts
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN!;
const PLAUSIBLE_API = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST ?? 'https://plausible.io';

export function trackEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  if (window.location.hostname === 'localhost') return;

  // Uses the Plausible Events API — no cookies, no consent needed
  fetch(`${PLAUSIBLE_API}/api/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      n: eventName,     // event name
      u: window.location.href,
      d: PLAUSIBLE_DOMAIN,
      r: document.referrer || null,
      p: props ? JSON.stringify(props) : undefined,
    }),
  }).catch(() => {
    // Silently fail — analytics should never break the app
  });
}

export function trackPageview() {
  trackEvent('pageview');
}
```

```typescript
// app/layout.tsx — Script tag approach (simpler)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            data-api={`${process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST}/api/event`}
            src={`${process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST}/js/script.js`}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### PostHog (Full Product Analytics)

```typescript
// lib/analytics/posthog.ts
import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // Only create profiles for identified users
    capture_pageview: false,             // We handle this manually for SPA
    capture_pageleave: true,
    persistence: 'localStorage',         // Avoid cookies if possible
    autocapture: false,                  // Explicit tracking only — less noise
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });

  initialized = true;
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

export function trackPageview() {
  posthog.capture('$pageview');
}

export function resetUser() {
  posthog.reset();
}

// Feature flags
export function isFeatureEnabled(flag: string): boolean {
  return posthog.isFeatureEnabled(flag) ?? false;
}

export function getFeatureFlagPayload(flag: string): unknown {
  return posthog.getFeatureFlagPayload(flag);
}
```

```typescript
// components/providers/posthog-provider.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, trackPageview } from '@/lib/analytics/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    trackPageview();
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

#### GA4 (With Consent Management)

```typescript
// lib/analytics/ga4.ts
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!;

// Only load GA after user consents
export function loadGA4() {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // Manual page views for SPA
  });
}

export function trackPageview(url: string) {
  window.gtag?.('event', 'page_view', {
    page_location: url,
  });
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number>
) {
  window.gtag?.('event', eventName, params);
}

export function trackConversion(conversionId: string, value?: number) {
  window.gtag?.('event', 'conversion', {
    send_to: conversionId,
    value,
    currency: 'USD',
  });
}

// Type augmentation
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
```

#### Custom Analytics (Own Your Data)

```typescript
// lib/analytics/custom.ts
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  pathname: string;
  referrer: string;
}

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

class AnalyticsClient {
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private endpoint: string) {
    this.sessionId = crypto.randomUUID();
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  track(name: string, properties?: Record<string, unknown>) {
    this.queue.push({
      name,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });

    if (this.queue.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  private flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    // Use sendBeacon for reliability on page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        this.endpoint,
        JSON.stringify({ events })
      );
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      }).catch(() => {
        // Re-queue on failure (with limit to prevent memory leak)
        if (this.queue.length < 100) {
          this.queue.push(...events);
        }
      });
    }
  }

  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }
}

export const analytics = new AnalyticsClient('/api/analytics/events');
```

```typescript
// app/api/analytics/events/route.ts — Server-side ingestion
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { events } = await req.json();

  // Enrich with server-side data
  const enrichedEvents = events.map((event: Record<string, unknown>) => ({
    ...event,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    userAgent: req.headers.get('user-agent'),
    country: req.headers.get('x-vercel-ip-country') ?? undefined,
    ingestedAt: Date.now(),
  }));

  // Insert into your database (Postgres, ClickHouse, BigQuery, etc.)
  await db.insert(analyticsEvents).values(enrichedEvents);

  return NextResponse.json({ ok: true }, { status: 202 });
}
```

### Step 3: Unified Analytics Abstraction

```typescript
// lib/analytics/index.ts
// Single interface — swap providers without changing app code
import { trackEvent as plausibleTrack } from './plausible';
import { trackEvent as posthogTrack, identifyUser as posthogIdentify } from './posthog';

type AnalyticsProvider = 'plausible' | 'posthog' | 'ga4' | 'custom';

const ACTIVE_PROVIDERS: AnalyticsProvider[] = ['plausible', 'posthog'];

export function track(event: string, properties?: Record<string, unknown>) {
  for (const provider of ACTIVE_PROVIDERS) {
    switch (provider) {
      case 'plausible':
        plausibleTrack(event, properties as Record<string, string | number | boolean>);
        break;
      case 'posthog':
        posthogTrack(event, properties);
        break;
    }
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (ACTIVE_PROVIDERS.includes('posthog')) {
    posthogIdentify(userId, traits);
  }
}

export { trackPageview } from './plausible';
```

### Step 4: Conversion Funnels

```typescript
// Define funnel steps as a typed constant
const SIGNUP_FUNNEL = [
  'signup.landing_viewed',
  'signup.form_started',
  'signup.email_entered',
  'signup.password_entered',
  'signup.submitted',
  'signup.email_verified',
  'signup.onboarding_started',
  'signup.onboarding_completed',
] as const;

// Track each step
function trackFunnelStep(step: (typeof SIGNUP_FUNNEL)[number], meta?: Record<string, unknown>) {
  track(step, {
    ...meta,
    funnel: 'signup',
    step_index: SIGNUP_FUNNEL.indexOf(step),
    total_steps: SIGNUP_FUNNEL.length,
  });
}

// Usage
trackFunnelStep('signup.form_started', { source: 'hero_cta' });
trackFunnelStep('signup.submitted', { plan: 'pro' });
```

### Step 5: A/B Testing (PostHog)

```typescript
// components/ab-test.tsx
'use client';

import { useEffect, useState } from 'react';
import { isFeatureEnabled, getFeatureFlagPayload } from '@/lib/analytics/posthog';

interface ABTestProps {
  flag: string;
  control: React.ReactNode;
  variant: React.ReactNode;
}

export function ABTest({ flag, control, variant }: ABTestProps) {
  const [isVariant, setIsVariant] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for PostHog to load feature flags
    const check = () => {
      setIsVariant(isFeatureEnabled(flag));
      setReady(true);
    };

    // PostHog may not have loaded flags yet
    if (typeof window !== 'undefined' && window.__POSTHOG_READY__) {
      check();
    } else {
      // Poll briefly for PostHog readiness
      const timer = setTimeout(check, 500);
      return () => clearTimeout(timer);
    }
  }, [flag]);

  if (!ready) return <>{control}</>; // Default to control during load

  return <>{isVariant ? variant : control}</>;
}

// Usage
<ABTest
  flag="new-pricing-page"
  control={<PricingPageV1 />}
  variant={<PricingPageV2 />}
/>
```

## Best Practices

1. **Never block rendering for analytics** — Load scripts with `defer` or `afterInteractive`. Fire events asynchronously. Analytics failures must never break the app.
2. **Use a unified abstraction layer** — Wrap all providers behind a single `track()` function so you can swap providers without changing application code.
3. **Batch events and use `sendBeacon`** — Batching reduces HTTP requests. `sendBeacon` guarantees delivery on page unload, unlike `fetch`.
4. **Respect Do Not Track** — Check `navigator.globalPrivacyControl` and `navigator.doNotTrack`. For Plausible, this is handled automatically.
5. **Keep event names stable** — Changing event names breaks funnels and dashboards. Treat your event taxonomy like a public API.
6. **Track properties, not event variants** — Use `button.clicked { label: "Sign Up" }` instead of `signup_button_clicked`. This keeps your event count manageable.
7. **Separate analytics API from app API** — Analytics ingestion endpoints should not share rate limits or auth with your main API. Use a dedicated route.
8. **Test tracking in development** — Log events to console in dev mode instead of sending to the provider. Verify events fire before deploying.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **Analytics blocking page load** | Lighthouse flags third-party scripts; LCP regresses | Load scripts with `defer` and `afterInteractive`; use `sendBeacon` for events |
| **No consent banner for GA4** | GDPR violation; fines from EU regulators | Use Plausible (no consent needed) or implement a consent banner that gates GA4 loading |
| **Event name proliferation** | Hundreds of uniquely named events, impossible to analyze | Use `object.action` taxonomy with properties for context, not separate event names |
| **Missing page views in SPA** | Only the initial page load is tracked | Manually fire `trackPageview()` on route changes using `usePathname()` |
| **Ad blockers blocking analytics** | 30-40% of events never arrive | Self-host Plausible/PostHog or proxy through your own domain (`/api/analytics/...`) |
| **Tracking PII in event properties** | Privacy violation; data breach liability | Never include email, name, or IP in client-side event properties; enrich server-side if needed |
| **No local development filtering** | Dev/test events pollute production dashboards | Check `process.env.NODE_ENV` or `window.location.hostname` before sending events |
| **Lost events on page unload** | Conversion events at end of flow are undercounted | Use `navigator.sendBeacon()` or `fetch` with `keepalive: true` for critical events |
