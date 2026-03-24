---
name: monitoring
description: Prometheus, Grafana, alerting, SLOs, structured logging, distributed tracing, and observability patterns
layer: domain
category: devops
triggers:
  - "monitoring"
  - "prometheus"
  - "grafana"
  - "alerting"
  - "slo"
  - "observability"
  - "metrics"
  - "tracing"
  - "logging"
inputs: [application stack, infrastructure components, SLA requirements]
outputs: [Prometheus configs, Grafana dashboards, alert rules, SLO definitions, logging configs]
linksTo: [kubernetes, docker, aws, nginx, cicd]
linkedFrom: [ship, optimize, debug]
preferredNextSkills: [kubernetes, nginx, aws]
fallbackSkills: [logging, debug]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [alert notifications]
---

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
