---
name: opentelemetry
description: OpenTelemetry instrumentation for Node.js — traces, metrics, spans, exporters (Jaeger, Honeycomb, Grafana), auto-instrumentation, and Next.js integration
layer: domain
category: devops
triggers:
  - "opentelemetry"
  - "otel"
  - "tracing"
  - "distributed tracing"
  - "spans"
  - "jaeger"
  - "honeycomb"
  - "grafana tempo"
  - "observability"
  - "trace context"
  - "instrumentation"
inputs:
  - Application stack and framework
  - Desired exporter backends (Jaeger, Honeycomb, Grafana, etc.)
  - Services to instrument
outputs:
  - OpenTelemetry SDK configuration
  - Auto-instrumentation setup
  - Custom span and metric implementations
  - Exporter configuration
  - Next.js instrumentation file
linksTo:
  - monitoring
  - nextjs
  - nodejs
  - microservices
  - docker
linkedFrom:
  - debug
  - optimize
  - ship
preferredNextSkills:
  - monitoring
  - microservices
  - docker
fallbackSkills:
  - logging
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Adds OpenTelemetry dependencies
  - May add instrumentation.ts file
  - Sends telemetry data to configured backends
---

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
