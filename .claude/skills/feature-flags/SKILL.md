---
name: feature-flags
description: Feature flags patterns including LaunchDarkly, Statsig, Vercel Edge Config, environment-based toggles, gradual rollouts, and user targeting
layer: utility
category: backend
triggers:
  - "feature flag"
  - "feature toggle"
  - "LaunchDarkly"
  - "Statsig"
  - "Edge Config flags"
  - "gradual rollout"
  - "canary release"
  - "user targeting"
  - "A/B test flag"
inputs: [feature name, rollout strategy, targeting rules, flag provider]
outputs: [flag implementation, targeting config, rollout plan, cleanup checklist]
linksTo: [vercel, monitoring, cicd]
linkedFrom: [ship, optimize, cook]
preferredNextSkills: [monitoring, cicd]
fallbackSkills: [vercel, env-vars]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add SDK dependency (LaunchDarkly, Statsig, @vercel/edge-config)
  - May modify middleware or layout for provider wrappers
---

# Feature Flags Skill

## Purpose

Feature flags decouple deployment from release. Ship code to production behind flags, then control visibility through configuration rather than code changes. This skill covers provider-based and DIY flag systems with safe rollout patterns.

## Key Patterns

### Strategy Comparison

| Approach | Best For | Latency | Cost |
|----------|----------|---------|------|
| **Environment variables** | Simple on/off per environment | Zero | Free |
| **Vercel Edge Config** | Edge-fast reads, small flag sets | ~1ms | Free tier available |
| **LaunchDarkly** | Enterprise targeting, analytics | ~20ms | Paid |
| **Statsig** | A/B testing + flags combined | ~15ms | Free tier available |
| **Database flags** | Custom rules, full ownership | Varies | Self-hosted |

### Environment-Based Toggles (Simplest)

```typescript
// lib/flags.ts — zero-dependency flags
const flags = {
  newCheckout: process.env.NEXT_PUBLIC_FLAG_NEW_CHECKOUT === "true",
  betaDashboard: process.env.FLAG_BETA_DASHBOARD === "true",
} as const;

export type Flag = keyof typeof flags;
export function isEnabled(flag: Flag): boolean {
  return flags[flag];
}

// Usage in component
if (isEnabled("newCheckout")) {
  return <NewCheckoutFlow />;
}
```

### Vercel Edge Config Flags

```typescript
import { get } from "@vercel/edge-config";

export async function getFlag(key: string): Promise<boolean> {
  const value = await get<boolean>(key);
  return value ?? false;
}

// In Server Component
export default async function Page() {
  const showBanner = await getFlag("promo-banner");
  return showBanner ? <PromoBanner /> : null;
}

// In Middleware (edge-fast)
import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/edge-config";

export async function middleware(req: NextRequest) {
  const maintenanceMode = await get<boolean>("maintenance");
  if (maintenanceMode) {
    return NextResponse.rewrite(new URL("/maintenance", req.url));
  }
  return NextResponse.next();
}
```

### Gradual Rollout with User Targeting

```typescript
interface FlagRule {
  enabled: boolean;
  rolloutPercent: number;
  allowlist: string[];
  denylist: string[];
}

function evaluateFlag(rule: FlagRule, userId: string): boolean {
  if (!rule.enabled) return false;
  if (rule.denylist.includes(userId)) return false;
  if (rule.allowlist.includes(userId)) return true;

  // Deterministic hash for consistent assignment
  const hash = simpleHash(userId) % 100;
  return hash < rule.rolloutPercent;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (const char of str) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
```

### LaunchDarkly Integration

```typescript
import { init, LDClient } from "@launchdarkly/node-server-sdk";

let ldClient: LDClient;

export async function getLDClient() {
  if (!ldClient) {
    ldClient = init(process.env.LAUNCHDARKLY_SDK_KEY!);
    await ldClient.waitForInitialization();
  }
  return ldClient;
}

export async function getFlag(key: string, user: { key: string; email?: string }) {
  const client = await getLDClient();
  return client.variation(key, user, false);
}
```

## Best Practices

- **Short-lived flags**: Remove flags within 2 sprints of full rollout. Stale flags are tech debt.
- **Naming convention**: Use kebab-case with context prefix: `checkout-new-flow`, `dashboard-v2`.
- **Default to off**: New flags should default to `false` so deployment alone changes nothing.
- **Server-side evaluation**: Evaluate flags server-side when possible to avoid layout shift.
- **Monitor after rollout**: Track error rates and latency per flag variant before going 100%.
- **Flag cleanup checklist**: Remove flag check, remove old code path, remove flag from provider, update tests.
