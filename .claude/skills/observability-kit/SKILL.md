---
name: observability-kit
description: "Unified observability toolkit — Prometheus/Grafana/alerting/SLOs, OpenTelemetry instrumentation (traces, metrics, spans, exporters, distributed tracing), Sentry error tracking (SDK, source maps, breadcrumbs, performance monitoring, releases), error monitoring architecture (aggregation, alerting rules, incident response), structured logging patterns (levels, observability, distributed tracing). Single entry point for 'make this observable'."
layer: utility
category: observability
triggers: ["add logging", "alert rules", "alerting", "audit trail", "breadcrumbs", "debug logging", "distributed tracing", "error aggregation", "error monitoring", "error tracking", "grafana", "incident response", "log levels", "logging", "metrics", "monitoring", "observability", "on-call", "opentelemetry", "otel", "prometheus", "sentry", "sentry sdk", "slo", "source maps sentry", "spans", "structured logging", "telemetry", "tracing"]
---

# observability-kit

Unified observability toolkit — Prometheus/Grafana/alerting/SLOs, OpenTelemetry instrumentation (traces, metrics, spans, exporters, distributed tracing), Sentry error tracking (SDK, source maps, breadcrumbs, performance monitoring, releases), error monitoring architecture (aggregation, alerting rules, incident response), structured logging patterns (levels, observability, distributed tracing). Single entry point for 'make this observable'.


## Absorbs

- `monitoring`
- `opentelemetry`
- `sentry`
- `error-monitoring`
- `logging`


---

## From `monitoring`

> Prometheus, Grafana, alerting, SLOs, structured logging, distributed tracing, and observability patterns

# Monitoring & Observability Specialist

## Purpose

Design comprehensive observability systems covering metrics, logging, tracing, alerting, and SLOs. This skill covers Prometheus, Grafana, OpenTelemetry, structured logging, alerting strategies, and dashboard design.

## Key Patterns

### Three Pillars of Observability

1. **Metrics**: Quantitative measurements over time (Prometheus, CloudWatch)
2. **Logs**: Discrete events with context (structured JSON logs)
3. **Traces**: Request flow across services (OpenTelemetry, Jaeger)

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"
  - "recording_rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: "app"
    metrics_path: /metrics
    static_configs:
      - targets: ["app:3000"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

### Application Metrics (Node.js / prom-client)

```typescript
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register });

// Request counter
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

// Request duration
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

// Middleware to track metrics
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const route = req.route?.path || req.path;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationMs);
  });

  next();
}

// Metrics endpoint
export async function getMetrics() {
  return register.metrics();
}
```

### Alert Rules

```yaml
# alerts/app.yml
groups:
  - name: app-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"
          description: "More than 5% of requests are failing for 5+ minutes."

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
          > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 1s ({{ $value | humanizeDuration }})"

      # Pod crash looping
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"

      # Disk space
      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})
          < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10% on {{ $labels.instance }}"
```

### SLO Definition

```yaml
# SLO: 99.9% availability (43.8 min/month error budget)
# SLI: Ratio of successful requests (non-5xx) to total requests

# Recording rule for SLI
groups:
  - name: slo-recording
    rules:
      - record: slo:availability:ratio_rate5m
        expr: |
          1 - (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
          )

      - record: slo:availability:ratio_rate30d
        expr: |
          1 - (
            sum(increase(http_requests_total{status_code=~"5.."}[30d]))
            / sum(increase(http_requests_total[30d]))
          )

  - name: slo-alerts
    rules:
      # Fast burn: 14.4x budget consumption
      - alert: SLOBurnRateFast
        expr: slo:availability:ratio_rate5m < 0.9856
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "SLO burn rate critical - fast burn detected"

      # Slow burn: 1x budget consumption
      - alert: SLOBurnRateSlow
        expr: slo:availability:ratio_rate30d < 0.999
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SLO at risk - slow burn over 30d window"
```

### Structured Logging

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: "my-app",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage
logger.info({ userId: "123", action: "login" }, "User logged in");
logger.error({ err, requestId: "abc" }, "Payment processing failed");
```

## Best Practices

### Metrics Design
- Follow RED method for services: Rate, Errors, Duration
- Follow USE method for resources: Utilization, Saturation, Errors
- Use consistent label naming across services
- Limit cardinality: avoid high-cardinality labels (user IDs, URLs)
- Use histograms over summaries for aggregatable percentiles

### Alerting
- Alert on symptoms, not causes (high latency, not high CPU)
- Use multi-window burn rates for SLO alerts
- Page only on critical user-facing issues
- Use warning severity for non-urgent investigation
- Include runbook links in alert annotations
- Avoid alert fatigue: reduce noise ruthlessly

### Dashboards
- Top-level: Golden signals (latency, traffic, errors, saturation)
- Per-service: RED metrics, dependency health, resource usage
- Infrastructure: Node CPU/memory/disk, pod counts, network
- Business: Signup rate, order volume, payment success rate

### Logging
- Use structured JSON logging (not plaintext)
- Include correlation IDs (request ID, trace ID) in every log
- Redact sensitive fields (tokens, passwords, PII)
- Log at appropriate levels: error for failures, info for key events, debug for development
- Ship logs to a centralized system (Loki, Datadog, CloudWatch)

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| High-cardinality labels | Never use user IDs or full URLs as labels |
| Alert fatigue | Reduce noise; alert on SLO burn rates |
| Missing correlation IDs | Inject request/trace IDs at the entry point |
| Logging PII | Use redaction rules in your logger |
| Monitoring only infra, not app | Instrument application-level metrics (RED) |
| No dashboards for on-call | Create runbook-linked dashboards per service |

## Examples

### Docker Compose Monitoring Stack

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts:/etc/prometheus/alerts
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

volumes:
  prometheus_data:
  grafana_data:
```

### OpenTelemetry Auto-Instrumentation

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: "http://otel-collector:4318/v1/traces" }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: "my-app",
});

sdk.start();
```


---

## From `opentelemetry`

> OpenTelemetry instrumentation for Node.js — traces, metrics, spans, exporters (Jaeger, Honeycomb, Grafana), auto-instrumentation, and Next.js integration

# OpenTelemetry Instrumentation Specialist

## Purpose

Set up comprehensive observability with OpenTelemetry for Node.js and Next.js applications. This skill covers auto-instrumentation, manual span creation, metrics, context propagation across services, and exporter configuration for popular backends.

## Key Concepts

### The Three Signals

| Signal | What It Captures | Use Case |
|--------|-----------------|----------|
| **Traces** | Request flow across services with timing | Debugging latency, understanding call graphs |
| **Metrics** | Numerical measurements over time | Dashboards, alerting, SLOs |
| **Logs** | Discrete events with context | Debugging, audit trails (correlate with trace IDs) |

### Anatomy of a Trace

```
Trace: abc-123
├── Span: HTTP GET /api/orders (server) [250ms]
│   ├── Span: PostgreSQL SELECT (client) [45ms]
│   ├── Span: Redis GET cache:orders (client) [2ms]
│   └── Span: HTTP POST /payments (client) [180ms]
│       ├── Span: Stripe API call (client) [150ms]
│       └── Span: PostgreSQL INSERT (client) [20ms]
```

## Key Patterns

### 1. Auto-Instrumentation Setup (Node.js)

```typescript
// instrumentation.ts -- must run BEFORE application code
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";

const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "my-app",
  [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || "0.0.0",
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || "development",
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/metrics",
    }),
    exportIntervalMillis: 30000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy fs instrumentation
      "@opentelemetry/instrumentation-fs": { enabled: false },
      // Configure HTTP instrumentation
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingPaths: ["/health", "/ready", "/_next/static"],
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk.shutdown().then(
    () => console.log("OTel SDK shut down"),
    (err) => console.error("OTel SDK shutdown error", err)
  );
});
```

### 2. Next.js Integration

```typescript
// instrumentation.ts (Next.js instrumentation file -- project root)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only instrument server-side
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    );

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: "my-nextjs-app",
      }),
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();
  }
}
```

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true, // Enable instrumentation.ts
  },
};
```

### 3. Manual Span Creation

```typescript
import { trace, SpanStatusCode, context, SpanKind } from "@opentelemetry/api";

const tracer = trace.getTracer("my-app", "1.0.0");

// Simple span wrapping an operation
async function processOrder(orderId: string): Promise<Order> {
  return tracer.startActiveSpan(
    "processOrder",
    { attributes: { "order.id": orderId } },
    async (span) => {
      try {
        const order = await fetchOrder(orderId);
        span.setAttribute("order.total", order.total);
        span.setAttribute("order.items_count", order.items.length);

        const result = await validateAndCharge(order);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

// Nested spans (child inherits parent context automatically)
async function validateAndCharge(order: Order): Promise<Order> {
  return tracer.startActiveSpan("validateAndCharge", async (span) => {
    // This creates a child span
    await tracer.startActiveSpan("validateInventory", async (childSpan) => {
      await checkInventory(order.items);
      childSpan.end();
    });

    // Another child span
    await tracer.startActiveSpan("chargePayment", async (childSpan) => {
      childSpan.setAttribute("payment.method", order.paymentMethod);
      await chargeCustomer(order);
      childSpan.end();
    });

    span.end();
    return order;
  });
}

// Client span for outgoing calls
async function callExternalAPI(url: string, payload: unknown): Promise<Response> {
  return tracer.startActiveSpan(
    "external-api-call",
    { kind: SpanKind.CLIENT, attributes: { "http.url": url } },
    async (span) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        span.setAttribute("http.status_code", response.status);
        span.end();
        return response;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw error;
      }
    }
  );
}
```

### 4. Custom Metrics

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("my-app", "1.0.0");

// Counter -- monotonically increasing value
const requestCounter = meter.createCounter("http.requests.total", {
  description: "Total number of HTTP requests",
  unit: "requests",
});

// Histogram -- distribution of values
const requestDuration = meter.createHistogram("http.request.duration", {
  description: "HTTP request duration",
  unit: "ms",
  advice: {
    explicitBucketBoundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  },
});

// Up-down counter -- value that can increase and decrease
const activeConnections = meter.createUpDownCounter("connections.active", {
  description: "Number of active connections",
});

// Observable gauge -- async measurement
meter.createObservableGauge("system.memory.usage", {
  description: "Memory usage in bytes",
  unit: "bytes",
  callback: (result) => {
    const mem = process.memoryUsage();
    result.observe(mem.heapUsed, { "memory.type": "heap_used" });
    result.observe(mem.rss, { "memory.type": "rss" });
  },
});

// Usage in middleware
function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  activeConnections.add(1);

  res.on("finish", () => {
    const duration = performance.now() - start;
    const labels = {
      method: req.method,
      route: req.route?.path || "unknown",
      status: res.statusCode.toString(),
    };
    requestCounter.add(1, labels);
    requestDuration.record(duration, labels);
    activeConnections.add(-1);
  });

  next();
}
```

### 5. Context Propagation

```typescript
import { context, propagation, trace } from "@opentelemetry/api";

// Extract trace context from incoming request (server-side)
function extractContext(headers: Record<string, string>) {
  return propagation.extract(context.active(), headers);
}

// Inject trace context into outgoing request
function injectContext(headers: Record<string, string>) {
  propagation.inject(context.active(), headers);
  return headers;
}

// Cross-service call with context propagation
async function callDownstreamService(endpoint: string, data: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Inject current trace context into outgoing headers
  propagation.inject(context.active(), headers);

  return fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
}

// Correlate logs with traces
function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

// Use in structured logger
import pino from "pino";

const logger = pino({
  mixin() {
    return getTraceContext();
  },
});
```

### 6. Exporter Configurations

```typescript
// Jaeger (via OTLP)
const jaegerExporter = new OTLPTraceExporter({
  url: "http://jaeger:4318/v1/traces",
});

// Honeycomb
const honeycombExporter = new OTLPTraceExporter({
  url: "https://api.honeycomb.io/v1/traces",
  headers: {
    "x-honeycomb-team": process.env.HONEYCOMB_API_KEY!,
    "x-honeycomb-dataset": process.env.HONEYCOMB_DATASET || "my-app",
  },
});

// Grafana Cloud (Tempo)
const grafanaExporter = new OTLPTraceExporter({
  url: `https://tempo-${process.env.GRAFANA_REGION}.grafana.net/tempo/v1/traces`,
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${process.env.GRAFANA_INSTANCE_ID}:${process.env.GRAFANA_API_KEY}`
    ).toString("base64")}`,
  },
});

// For local development -- console exporter
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
const consoleExporter = new ConsoleSpanExporter();

// Choose exporter based on environment
function getTraceExporter() {
  switch (process.env.OTEL_EXPORTER) {
    case "honeycomb":
      return honeycombExporter;
    case "grafana":
      return grafanaExporter;
    case "console":
      return consoleExporter;
    default:
      return jaegerExporter;
  }
}
```

### 7. Docker Compose for Local Development

```yaml
# docker-compose.otel.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"  # Prometheus metrics
    depends_on:
      - jaeger

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - ./grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
```

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  prometheus:
    endpoint: 0.0.0.0:8889

  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

## Required Packages

```bash
# Core SDK
npm install @opentelemetry/sdk-node @opentelemetry/api

# Auto-instrumentation
npm install @opentelemetry/auto-instrumentations-node

# OTLP exporters
npm install @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http

# Metrics SDK
npm install @opentelemetry/sdk-metrics

# Resources and semantic conventions
npm install @opentelemetry/resources @opentelemetry/semantic-conventions
```

## Best Practices

1. **Initialize before everything** -- The instrumentation file must load before any other imports to monkey-patch libraries correctly
2. **Use semantic conventions** -- Follow OpenTelemetry naming standards (`http.method`, `db.system`, etc.)
3. **Set service.name always** -- Every service must have a unique `service.name` resource attribute
4. **Sample in production** -- Use tail-based or probabilistic sampling to control costs at scale
5. **Add span attributes, not events** for structured data -- Events are for point-in-time occurrences
6. **Record exceptions on spans** -- Use `span.recordException(error)` before setting error status
7. **End every span** -- Use try/finally to ensure `span.end()` is always called
8. **Batch exports** -- Always use batch processors in production, never simple/sync exporters
9. **Limit attribute cardinality** -- Do not use user IDs, email addresses, or request bodies as span attributes
10. **Correlate logs with traces** -- Inject `traceId` and `spanId` into your structured logger

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Importing app code before SDK init | Libraries not instrumented | Use `instrumentation.ts` or `--require` flag |
| Missing `span.end()` calls | Orphaned spans, memory leaks | Always use try/finally or `startActiveSpan` callback pattern |
| High-cardinality attributes | Exporter memory explosion, cost spike | Use bounded values, never raw user input |
| Not propagating context in async | Broken traces across async boundaries | Use `startActiveSpan` which handles context automatically |
| Console exporter in production | Performance degradation, log noise | Use OTLP exporter with batch processor |
| Instrumenting health check endpoints | Noisy traces | Filter with `ignoreIncomingPaths` |
| Not setting up graceful shutdown | Lost spans on deploy | Call `sdk.shutdown()` on SIGTERM |
| Mixing W3C and B3 propagation | Broken cross-service traces | Standardize on W3C TraceContext (the default) |


---

## From `sentry`

> Sentry error tracking SDK integration, source maps, breadcrumbs, performance monitoring, custom contexts, and alerting for JavaScript/TypeScript applications

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


---

## From `error-monitoring`

> Error monitoring architecture — error aggregation, alerting rules, SLOs, and incident response automation.

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


---

## From `logging`

> Structured logging, log levels, observability patterns, distributed tracing, and monitoring integration

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

