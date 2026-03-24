---
name: error-monitoring
description: Error monitoring architecture — error aggregation, alerting rules, SLOs, and incident response automation.
layer: utility
category: observability
triggers:
  - "error monitoring"
  - "error aggregation"
  - "alert rules"
  - "slo"
  - "incident response"
  - "on-call"
inputs:
  - "Error monitoring architecture requirements"
  - "Alerting rule definitions"
  - "SLO/SLI configuration"
  - "Incident response automation needs"
outputs:
  - "Error monitoring pipeline designs"
  - "Alerting rule configurations"
  - "SLO definitions and error budgets"
  - "Incident response runbooks and automation"
linksTo:
  - sentry
  - monitoring
  - logging
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Error Monitoring

## Purpose

Design and implement production error monitoring systems. Covers error aggregation, intelligent alerting, SLO/SLI definitions, error budgets, incident response automation, and integration with tools like Sentry, PagerDuty, and Grafana.

## Key Patterns

### Error Classification

Classify errors by severity and action required:

| Level | Examples | Response | Alert Channel |
|-------|----------|----------|---------------|
| P0 (Critical) | Full outage, data loss, auth broken | Immediate page | PagerDuty, phone |
| P1 (High) | Degraded service, high error rate | Page within 5 min | PagerDuty, Slack |
| P2 (Medium) | Feature broken, intermittent errors | Triage within 1 hour | Slack channel |
| P3 (Low) | Cosmetic, non-critical edge cases | Next sprint | Ticket auto-created |

```typescript
// Error classification middleware
enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

function classifyError(error: Error, context: RequestContext): ErrorSeverity {
  // Data integrity errors are always critical
  if (error.message.includes('constraint violation') ||
      error.message.includes('data corruption')) {
    return ErrorSeverity.CRITICAL;
  }

  // Auth errors affecting all users
  if (error instanceof AuthError && context.affectedUserCount > 100) {
    return ErrorSeverity.CRITICAL;
  }

  // 5xx errors on critical paths
  if (context.path.startsWith('/api/payments') ||
      context.path.startsWith('/api/auth')) {
    return ErrorSeverity.HIGH;
  }

  // Rate-based classification
  if (context.errorRate > 0.1) return ErrorSeverity.HIGH;
  if (context.errorRate > 0.01) return ErrorSeverity.MEDIUM;

  return ErrorSeverity.LOW;
}
```

### SLO/SLI Definitions

**Define SLIs (Service Level Indicators):**

```typescript
interface SLI {
  name: string;
  description: string;
  metric: string;
  goodEventFilter: string;
  totalEventFilter: string;
}

interface SLO {
  name: string;
  sli: SLI;
  target: number;        // e.g., 0.999 = 99.9%
  window: '7d' | '28d' | '30d';
  burnRateThresholds: BurnRateAlert[];
}

interface BurnRateAlert {
  shortWindow: string;   // e.g., '5m'
  longWindow: string;    // e.g., '1h'
  burnRate: number;       // How fast the error budget is consumed
  severity: 'page' | 'ticket';
}

// Example SLOs
const slos: SLO[] = [
  {
    name: 'API Availability',
    sli: {
      name: 'http_success_rate',
      description: 'Percentage of HTTP requests returning non-5xx',
      metric: 'http_requests_total',
      goodEventFilter: 'status_code!~"5.."',
      totalEventFilter: '',
    },
    target: 0.999, // 99.9%
    window: '30d',
    burnRateThresholds: [
      { shortWindow: '5m', longWindow: '1h', burnRate: 14.4, severity: 'page' },
      { shortWindow: '30m', longWindow: '6h', burnRate: 6, severity: 'page' },
      { shortWindow: '2h', longWindow: '1d', burnRate: 3, severity: 'ticket' },
      { shortWindow: '6h', longWindow: '3d', burnRate: 1, severity: 'ticket' },
    ],
  },
  {
    name: 'API Latency',
    sli: {
      name: 'http_latency_p99',
      description: 'Percentage of requests completing within 500ms',
      metric: 'http_request_duration_seconds',
      goodEventFilter: 'le="0.5"',
      totalEventFilter: '',
    },
    target: 0.99, // 99%
    window: '30d',
    burnRateThresholds: [
      { shortWindow: '5m', longWindow: '1h', burnRate: 14.4, severity: 'page' },
      { shortWindow: '30m', longWindow: '6h', burnRate: 6, severity: 'ticket' },
    ],
  },
];
```

### Prometheus Alerting Rules

```yaml
# prometheus/alerts/slo.yml
groups:
  - name: slo-burn-rate
    rules:
      # Fast burn — page immediately
      - alert: APIHighErrorBurnRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
          ) > (14.4 * (1 - 0.999))
          and
          (
            sum(rate(http_requests_total{status_code=~"5.."}[1h]))
            / sum(rate(http_requests_total[1h]))
          ) > (14.4 * (1 - 0.999))
        for: 2m
        labels:
          severity: page
        annotations:
          summary: "API error budget burning fast (14.4x)"
          description: "Error rate {{ $value | humanizePercentage }} over 5m window"
          runbook_url: "https://wiki.internal/runbooks/api-high-error-rate"

      # Slow burn — create ticket
      - alert: APISlowErrorBurnRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[2h]))
            / sum(rate(http_requests_total[2h]))
          ) > (3 * (1 - 0.999))
          and
          (
            sum(rate(http_requests_total{status_code=~"5.."}[1d]))
            / sum(rate(http_requests_total[1d]))
          ) > (3 * (1 - 0.999))
        for: 5m
        labels:
          severity: ticket
        annotations:
          summary: "API error budget burning slowly (3x)"
          runbook_url: "https://wiki.internal/runbooks/api-slow-error-burn"

  - name: resource-alerts
    rules:
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "Memory usage above 90% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "Disk space below 10% on {{ $labels.instance }}"
```

### Error Budget Tracking

```typescript
interface ErrorBudget {
  sloTarget: number;           // e.g., 0.999
  windowDays: number;          // e.g., 30
  totalRequests: number;
  failedRequests: number;
  budgetRemaining: number;     // Percentage of budget remaining
  budgetConsumedRate: number;  // Budget consumed per day
  estimatedExhaustionDays: number | null;
}

function calculateErrorBudget(
  sloTarget: number,
  windowDays: number,
  totalRequests: number,
  failedRequests: number,
  daysSinceWindowStart: number
): ErrorBudget {
  const allowedFailures = totalRequests * (1 - sloTarget);
  const budgetUsed = failedRequests / allowedFailures;
  const budgetRemaining = Math.max(0, 1 - budgetUsed);
  const budgetConsumedRate = budgetUsed / daysSinceWindowStart;
  const daysLeft = budgetRemaining > 0
    ? budgetRemaining / budgetConsumedRate
    : null;

  return {
    sloTarget,
    windowDays,
    totalRequests,
    failedRequests,
    budgetRemaining,
    budgetConsumedRate,
    estimatedExhaustionDays: daysLeft,
  };
}

// Example: 99.9% SLO, 30-day window, 10M requests, 5000 failures, day 15
// Allowed: 10000 failures. Used: 5000/10000 = 50%. At this rate, exhausted by day 30.
```

### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,
  sampleRate: 1.0,         // Capture 100% of errors
  tracesSampleRate: 0.1,   // Sample 10% of transactions

  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    // Drop known noisy errors
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return null;
    }

    return event;
  },

  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],
});

// Structured error context
function captureWithContext(error: Error, context: {
  userId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  Sentry.withScope((scope) => {
    if (context.userId) scope.setUser({ id: context.userId });
    scope.setTag('action', context.action);
    scope.setContext('metadata', context.metadata ?? {});
    scope.setLevel(classifySentrySeverity(error));
    Sentry.captureException(error);
  });
}
```

### Incident Response Automation

```typescript
// Webhook handler for PagerDuty/OpsGenie alerts
interface IncidentPayload {
  alertName: string;
  severity: string;
  description: string;
  source: string;
  timestamp: string;
  labels: Record<string, string>;
}

async function handleIncident(payload: IncidentPayload) {
  // 1. Create incident channel in Slack
  const channel = await slack.conversations.create({
    name: `inc-${Date.now()}-${payload.alertName.toLowerCase().slice(0, 20)}`,
    is_private: false,
  });

  // 2. Post initial context
  await slack.chat.postMessage({
    channel: channel.channel!.id!,
    text: [
      `*Incident: ${payload.alertName}*`,
      `Severity: ${payload.severity}`,
      `Description: ${payload.description}`,
      `Source: ${payload.source}`,
      `Time: ${payload.timestamp}`,
      '',
      '*Runbook:* ' + getRunbookUrl(payload.alertName),
      '*Dashboard:* ' + getDashboardUrl(payload.labels),
    ].join('\n'),
  });

  // 3. Auto-gather diagnostics
  const diagnostics = await gatherDiagnostics(payload);
  await slack.chat.postMessage({
    channel: channel.channel!.id!,
    text: `*Auto-diagnostics:*\n\`\`\`\n${JSON.stringify(diagnostics, null, 2)}\n\`\`\``,
  });

  // 4. Create tracking ticket
  await jira.createIssue({
    project: 'OPS',
    issueType: 'Incident',
    summary: `[${payload.severity}] ${payload.alertName}`,
    description: payload.description,
    priority: severityToPriority(payload.severity),
  });
}

async function gatherDiagnostics(payload: IncidentPayload) {
  return {
    recentErrors: await sentry.getRecentErrors(payload.labels.service, 10),
    errorRate: await prometheus.query(
      `rate(http_requests_total{status_code=~"5..",service="${payload.labels.service}"}[5m])`
    ),
    latencyP99: await prometheus.query(
      `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="${payload.labels.service}"}[5m]))`
    ),
    recentDeploys: await github.getRecentDeployments(payload.labels.service, 3),
  };
}
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: $SLACK_WEBHOOK_URL

route:
  receiver: default
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: page
      receiver: pagerduty
      group_wait: 10s
      repeat_interval: 30m

    - match:
        severity: ticket
      receiver: jira-webhook
      group_wait: 5m
      repeat_interval: 24h

receivers:
  - name: default
    slack_configs:
      - channel: '#alerts-low'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: pagerduty
    pagerduty_configs:
      - service_key: $PAGERDUTY_SERVICE_KEY
        severity: '{{ .GroupLabels.severity }}'

  - name: jira-webhook
    webhook_configs:
      - url: 'https://api.internal/webhooks/create-jira-ticket'

inhibit_rules:
  # If a critical alert fires, suppress the related warning
  - source_match:
      severity: page
    target_match:
      severity: ticket
    equal: ['alertname', 'service']
```

## Best Practices

1. **Alert on symptoms, not causes** — Alert on error rate and latency, not CPU or memory (those are diagnostics).
2. **Use multi-window burn rates** — Avoid noisy alerts by requiring both short and long windows to exceed thresholds.
3. **Define SLOs before building alerts** — SLOs drive alerting thresholds; do not alert on arbitrary numbers.
4. **Every alert needs a runbook** — Link to a document that tells the on-call engineer exactly what to check and do.
5. **Automate incident diagnostics** — Gather recent errors, deploys, and metrics automatically when an alert fires.
6. **Scrub PII from error reports** — Remove auth headers, cookies, and user data before sending to Sentry.
7. **Track error budget weekly** — Review remaining budget in team standup; throttle feature work if budget is low.
8. **De-duplicate aggressively** — Group similar errors by fingerprint; Sentry does this well when configured.
9. **Set alert ownership** — Every alert must have a team owner; orphan alerts get ignored.
10. **Regularly review and prune alerts** — Delete alerts that never fire or always fire; both are signs of miscalibration.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Alerting on every single error | Alert fatigue, on-call burnout | Use error rate thresholds, not absolute counts |
| No SLO targets | Arbitrary alert thresholds with no business justification | Define SLOs with stakeholders first |
| Missing runbooks | On-call guesses what to do at 3am | Require runbook URL in every alert annotation |
| Not scrubbing PII | Compliance violation in error tracking | Use `beforeSend` hooks to remove sensitive data |
| Same alert fires 100 times | Notification flood | Configure `group_by` and `repeat_interval` in Alertmanager |
| No error budget tracking | Cannot make informed release decisions | Dashboard error budget remaining and burn rate |
