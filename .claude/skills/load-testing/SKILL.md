---
name: load-testing
description: "Load testing with k6, Artillery, Locust — traffic simulation, performance baselines, and stress testing."
layer: domain
category: testing
triggers:
  - "load test"
  - "stress test"
  - "k6"
  - "artillery"
  - "locust"
  - "performance test"
  - "benchmark"
inputs:
  - "Target endpoints and expected traffic patterns"
  - "Performance SLOs or baseline requirements"
  - "Scalability testing scenarios"
  - "Bottleneck identification needs"
outputs:
  - "Load test scripts for k6, Artillery, or Locust"
  - "Test execution strategies and configurations"
  - "Performance baselines and threshold definitions"
  - "Results analysis and bottleneck identification"
linksTo:
  - testing-strategy
  - performance-budget
  - monitoring
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Load Testing Patterns & Best Practices

## Purpose

Provide expert guidance on load testing, stress testing, and performance benchmarking using k6, Artillery, and Locust. Covers test design, traffic simulation, threshold definition, CI integration, and results analysis.

## Key Patterns

### Test Types

| Type | Purpose | Duration | Load Pattern |
|------|---------|----------|--------------|
| **Smoke** | Verify script works | 1-2 min | Minimal load (1-5 VUs) |
| **Load** | Validate expected traffic | 10-30 min | Ramp to expected peak |
| **Stress** | Find breaking point | 15-30 min | Ramp beyond expected peak |
| **Soak** | Find memory leaks, degradation | 1-4 hours | Sustained normal load |
| **Spike** | Test sudden traffic bursts | 5-10 min | Sudden jump then drop |
| **Breakpoint** | Find max capacity | Variable | Continuous ramp until failure |

### k6 (Recommended)

**Basic load test:**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const orderDuration = new Trend("order_duration", true);

export const options = {
  stages: [
    { duration: "2m", target: 50 },   // ramp up
    { duration: "5m", target: 50 },   // hold
    { duration: "2m", target: 100 },  // ramp to peak
    { duration: "5m", target: 100 },  // hold at peak
    { duration: "2m", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],  // 95th < 500ms, 99th < 1s
    http_req_failed: ["rate<0.01"],                   // <1% error rate
    errors: ["rate<0.05"],                             // custom error metric
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Browse products
  const productsRes = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`);
  check(productsRes, {
    "products: status 200": (r) => r.status === 200,
    "products: has data": (r) => JSON.parse(r.body).data.length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // View single product
  const productRes = http.get(`${BASE_URL}/api/v1/products/1`);
  check(productRes, {
    "product: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);
}
```

**Authenticated user flow with scenarios:**

```javascript
import http from "k6/http";
import { check, group, sleep } from "k6";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "5m", target: 200 },
        { duration: "2m", target: 0 },
      ],
      exec: "browseProducts",
    },
    checkout: {
      executor: "constant-arrival-rate",
      rate: 10,              // 10 iterations per second
      timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: "checkoutFlow",
    },
  },
  thresholds: {
    "http_req_duration{scenario:checkout}": ["p(95)<2000"],
    "http_req_duration{scenario:browse}": ["p(95)<500"],
  },
};

function authenticate() {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: `user${__VU}@test.com`,
    password: "testpassword",
  }), { headers: { "Content-Type": "application/json" } });

  return JSON.parse(res.body).token;
}

export function browseProducts() {
  group("Browse", () => {
    http.get(`${BASE_URL}/api/v1/products`);
    sleep(Math.random() * 3 + 1); // 1-4s think time
    http.get(`${BASE_URL}/api/v1/products/${Math.floor(Math.random() * 100) + 1}`);
    sleep(Math.random() * 2 + 0.5);
  });
}

export function checkoutFlow() {
  const token = authenticate();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  group("Checkout", () => {
    // Add to cart
    const cartRes = http.post(`${BASE_URL}/api/v1/cart/items`, JSON.stringify({
      productId: Math.floor(Math.random() * 100) + 1,
      quantity: 1,
    }), { headers });
    check(cartRes, { "cart: item added": (r) => r.status === 201 });

    sleep(1);

    // Place order
    const orderRes = http.post(`${BASE_URL}/api/v1/orders`, JSON.stringify({
      shippingAddressId: 1,
    }), { headers });
    check(orderRes, { "order: created": (r) => r.status === 201 });
  });
}
```

**Stress test to find breaking point:**

```javascript
export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "5m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "5m", target: 200 },
    { duration: "2m", target: 300 },
    { duration: "5m", target: 300 },
    { duration: "2m", target: 400 },
    { duration: "5m", target: 400 },
    { duration: "5m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.10"],   // Accept up to 10% errors during stress
  },
};
```

### Artillery

**artillery.yml configuration:**

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 120
      arrivalRate: 5
      name: "Warm up"
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
    - duration: 120
      arrivalRate: 50
      name: "Peak load"
  defaults:
    headers:
      Content-Type: "application/json"
  plugins:
    expect: {}

scenarios:
  - name: "Browse and Purchase"
    weight: 70
    flow:
      - get:
          url: "/api/v1/products"
          expect:
            - statusCode: 200
      - think: 2
      - get:
          url: "/api/v1/products/{{ $randomNumber(1, 100) }}"
          expect:
            - statusCode: 200
          capture:
            - json: "$.id"
              as: "productId"
      - think: 1

  - name: "Search"
    weight: 30
    flow:
      - get:
          url: "/api/v1/products?search={{ $randomString() }}"
          expect:
            - statusCode: 200
```

### Locust (Python)

```python
from locust import HttpUser, task, between, tag

class ShopUser(HttpUser):
    wait_time = between(1, 5)
    host = "http://localhost:3000"

    def on_start(self):
        """Authenticate on virtual user start."""
        response = self.client.post("/api/v1/auth/login", json={
            "email": f"user{self.environment.runner.user_count}@test.com",
            "password": "testpassword",
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(5)
    @tag("browse")
    def browse_products(self):
        self.client.get("/api/v1/products", headers=self.headers)

    @task(3)
    @tag("browse")
    def view_product(self):
        product_id = random.randint(1, 100)
        self.client.get(f"/api/v1/products/{product_id}", headers=self.headers)

    @task(1)
    @tag("checkout")
    def place_order(self):
        with self.client.post("/api/v1/orders", json={
            "items": [{"productId": 1, "quantity": 1}],
        }, headers=self.headers, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Order failed: {response.status_code}")
```

### CI Integration

**GitHub Actions with k6:**

```yaml
name: Load Test
on:
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      app:
        image: myapp:latest
        ports: ["3000:3000"]
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Run load test
        run: k6 run --out json=results.json tests/load/smoke.js
        env:
          BASE_URL: http://localhost:3000

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

## Best Practices

1. **Start with smoke tests** — Verify scripts work before running expensive load tests. Catch bugs in test logic early.
2. **Use realistic think times** — Add `sleep()` between requests to simulate real user behavior. Without pauses, you test throughput, not load.
3. **Define thresholds upfront** — Set p95/p99 latency and error rate targets before running. Fail the test automatically when exceeded.
4. **Test against production-like environments** — Load testing staging with half the resources gives misleading results.
5. **Use separate scenarios for different user flows** — Weight scenarios by real traffic distribution (e.g., 80% browse, 15% search, 5% checkout).
6. **Ramp gradually** — Always ramp up and down. Sudden load spikes test spike resilience, not steady-state performance.
7. **Monitor the system under test** — Correlate k6 results with server CPU, memory, database connections, and queue depth.
8. **Use constant-arrival-rate for throughput testing** — `ramping-vus` tests user concurrency; `constant-arrival-rate` tests requests per second.
9. **Run soak tests before releases** — Memory leaks and connection pool exhaustion only surface after hours of sustained load.
10. **Version control your test scripts** — Treat load tests as code. Review changes, track baselines, and integrate into CI.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No think time | Unrealistic throughput, tests concurrency not load | Add `sleep()` between requests |
| Testing from same machine as app | Network and CPU contention skews results | Use separate load generator machines |
| No warmup phase | Cold caches and JIT compilation inflate p95 | Add a 2-minute ramp-up phase |
| Ignoring error responses | Reporting fast 500s as good performance | Add `check()` assertions on responses |
| Hardcoded test data | All VUs hit same record, unrealistic cache behavior | Randomize product IDs, user accounts |
| No baseline comparison | Cannot tell if performance regressed | Store baselines and compare in CI |
| Testing only happy path | Errors and edge cases not exercised | Include auth failures, 404s, validation errors |
| Running from distant regions | Network latency dominates response time | Run load generators close to the target |
