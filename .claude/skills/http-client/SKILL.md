---
name: http-client
description: "HTTP client patterns — fetch wrapper, axios interceptors, retry logic, request cancellation, and timeout handling."
layer: utility
category: backend
triggers:
  - "http client"
  - "fetch wrapper"
  - "axios"
  - "ky"
  - "got"
  - "request interceptor"
  - "retry logic"
inputs:
  - "API consumption requirements"
  - "Retry and error handling strategies"
  - "Request/response interceptor patterns"
  - "Timeout and cancellation needs"
outputs:
  - "Type-safe HTTP client wrappers"
  - "Retry logic with exponential backoff"
  - "Request/response interceptor chains"
  - "Cancellation and timeout patterns"
linksTo:
  - error-handling
  - api-caching
  - api-error-handling
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# HTTP Client Patterns

## Purpose

Provide expert guidance on building robust HTTP clients with proper error handling, retry logic, request cancellation, interceptors, and type safety. Covers native fetch, axios, ky, and got patterns for both browser and Node.js.

## Key Patterns

### Type-Safe Fetch Wrapper

**Minimal, production-ready fetch client:**

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig extends Omit<RequestInit, "method" | "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
}

interface ApiError extends Error {
  status: number;
  statusText: string;
  data: unknown;
}

class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private interceptors: {
    request: Array<(config: RequestInit) => RequestInit | Promise<RequestInit>>;
    response: Array<(response: Response) => Response | Promise<Response>>;
  };

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...defaultHeaders,
    };
    this.interceptors = { request: [], response: [] };
  }

  onRequest(fn: (config: RequestInit) => RequestInit | Promise<RequestInit>) {
    this.interceptors.request.push(fn);
    return this;
  }

  onResponse(fn: (response: Response) => Response | Promise<Response>) {
    this.interceptors.response.push(fn);
    return this;
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown, config: RequestConfig = {}): Promise<T> {
    const { params, timeout = 30_000, retries = 0, ...fetchOptions } = config;

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });
    }

    // Build request config
    let requestInit: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...fetchOptions.headers as Record<string, string> },
      ...fetchOptions,
    };

    if (body !== undefined && method !== "GET") {
      requestInit.body = JSON.stringify(body);
    }

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      requestInit = await interceptor(requestInit);
    }

    // Execute with timeout and retries
    return this.executeWithRetry<T>(url, requestInit, timeout, retries);
  }

  private async executeWithRetry<T>(
    url: URL,
    init: RequestInit,
    timeout: number,
    retries: number,
    attempt = 0
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      // Apply response interceptors
      for (const interceptor of this.interceptors.response) {
        response = await interceptor(response);
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = data;

        // Retry on 5xx and 429
        if (attempt < retries && (response.status >= 500 || response.status === 429)) {
          const delay = this.getRetryDelay(attempt, response);
          await this.sleep(delay);
          return this.executeWithRetry<T>(url, init, timeout, retries, attempt + 1);
        }

        throw error;
      }

      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms: ${url.pathname}`);
      }
      // Retry on network errors
      if (attempt < retries && !(error as ApiError).status) {
        const delay = this.getRetryDelay(attempt);
        await this.sleep(delay);
        return this.executeWithRetry<T>(url, init, timeout, retries, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getRetryDelay(attempt: number, response?: Response): number {
    // Respect Retry-After header
    const retryAfter = response?.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    // Exponential backoff with jitter
    const base = Math.min(1000 * 2 ** attempt, 30_000);
    return base + Math.random() * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convenience methods
  get<T>(path: string, config?: RequestConfig) { return this.request<T>("GET", path, undefined, config); }
  post<T>(path: string, body?: unknown, config?: RequestConfig) { return this.request<T>("POST", path, body, config); }
  put<T>(path: string, body?: unknown, config?: RequestConfig) { return this.request<T>("PUT", path, body, config); }
  patch<T>(path: string, body?: unknown, config?: RequestConfig) { return this.request<T>("PATCH", path, body, config); }
  delete<T>(path: string, config?: RequestConfig) { return this.request<T>("DELETE", path, undefined, config); }
}
```

**Usage:**

```typescript
const api = new HttpClient("https://api.example.com/v1", {
  Authorization: `Bearer ${token}`,
});

// Add auth token refresh interceptor
api.onResponse(async (response) => {
  if (response.status === 401) {
    const newToken = await refreshToken();
    // Retry the original request would need additional logic
  }
  return response;
});

// Type-safe requests
interface User { id: string; name: string; email: string; }

const users = await api.get<User[]>("/users", { params: { page: 1, limit: 20 } });
const user = await api.post<User>("/users", { name: "Alice", email: "alice@example.com" });
```

### Axios Interceptor Patterns

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const client = axios.create({
  baseURL: process.env.API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach auth token
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: refresh token on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

function processQueue(error: AxiosError | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config!;

    if (error.response?.status === 401 && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        // Queue the request until token is refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post("/auth/refresh", {
          refreshToken: getRefreshToken(),
        });
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        logout();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### Request Cancellation

```typescript
// Using AbortController with fetch
class CancellableRequest {
  private controllers = new Map<string, AbortController>();

  async fetch<T>(key: string, url: string, init?: RequestInit): Promise<T> {
    // Cancel previous request with the same key
    this.cancel(key);

    const controller = new AbortController();
    this.controllers.set(key, controller);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      this.controllers.delete(key);
    }
  }

  cancel(key: string) {
    this.controllers.get(key)?.abort();
    this.controllers.delete(key);
  }

  cancelAll() {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}

// Usage in React
function useSearch(query: string) {
  const [results, setResults] = useState([]);
  const requestRef = useRef(new CancellableRequest());

  useEffect(() => {
    if (!query) return;

    requestRef.current
      .fetch("search", `/api/search?q=${encodeURIComponent(query)}`)
      .then(setResults)
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });

    return () => requestRef.current.cancel("search");
  }, [query]);

  return results;
}
```

### Node.js HTTP Client (got)

```typescript
import got from "got";

const client = got.extend({
  prefixUrl: "https://api.example.com/v1",
  timeout: { request: 30_000 },
  retry: {
    limit: 3,
    methods: ["GET", "PUT", "DELETE"],
    statusCodes: [408, 429, 500, 502, 503, 504],
    calculateDelay: ({ attemptCount }) => attemptCount * 1000,
  },
  hooks: {
    beforeRequest: [
      (options) => {
        options.headers.authorization = `Bearer ${getToken()}`;
      },
    ],
    afterResponse: [
      (response) => {
        // Log slow responses
        if (response.timings.phases.total! > 5000) {
          console.warn(`Slow request: ${response.requestUrl} took ${response.timings.phases.total}ms`);
        }
        return response;
      },
    ],
    beforeRetry: [
      (error, retryCount) => {
        console.warn(`Retrying (${retryCount}): ${error.message}`);
      },
    ],
  },
  responseType: "json",
});

// Usage
const users = await client.get("users").json<User[]>();
const user = await client.post("users", { json: { name: "Alice" } }).json<User>();
```

## Best Practices

1. **Always set timeouts** — Never make HTTP requests without a timeout. Default to 30 seconds, reduce for user-facing requests.
2. **Implement retry with exponential backoff** — Retry on 5xx and 429, not on 4xx. Respect `Retry-After` headers.
3. **Use AbortController for cancellation** — Cancel in-flight requests on component unmount or when superseded by a newer request.
4. **Centralize error handling** — Use response interceptors to handle auth refresh, error normalization, and logging in one place.
5. **Type your responses** — Use generics (`get<User>("/users/1")`) so the return type flows through to the caller.
6. **Add request/response logging in development** — Log method, URL, status, and duration. Omit sensitive headers/bodies.
7. **Queue concurrent auth refreshes** — When multiple requests fail with 401 simultaneously, refresh the token once and replay all queued requests.
8. **Use `ky` for browser, `got` for Node.js** — Both have better defaults than raw fetch (retries, timeouts, JSON parsing). Axios works for both but has a larger bundle.
9. **Normalize error shapes** — Create a consistent `ApiError` type with `status`, `message`, and `data` across all HTTP calls.
10. **Add circuit breaker for critical paths** — After N consecutive failures, short-circuit requests for a cooldown period to avoid overwhelming a failing server.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No timeout | Requests hang indefinitely on network issues | Set `AbortController` with `setTimeout` or library timeout option |
| Retrying POST requests | Duplicate side effects (double charges) | Only retry idempotent methods (GET, PUT, DELETE) by default |
| Not cancelling on unmount | Memory leaks, state updates on unmounted components | Use `AbortController`, cancel in cleanup |
| Swallowing errors | Failed requests silently ignored | Always handle `.catch()` or use error boundaries |
| Token refresh race condition | Multiple 401s trigger multiple refresh calls | Queue failed requests, refresh token once |
| Hardcoded base URLs | Different URLs per environment | Use environment variables for base URL |
| Large response bodies without streaming | Memory exhaustion on large payloads | Use `response.body` (ReadableStream) for large responses |
| No `Content-Type` header on POST | Server rejects body as unparseable | Set `Content-Type: application/json` by default |
