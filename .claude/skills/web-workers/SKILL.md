---
name: web-workers
description: Offload heavy computation from the main thread using Web Workers, SharedWorkers, and Comlink — structured messaging, transferable objects, and off-main-thread architecture patterns
layer: domain
category: frontend
triggers:
  - "web worker"
  - "main thread"
  - "off main thread"
  - "SharedWorker"
  - "Comlink"
  - "postMessage"
  - "UI is janky"
  - "blocking the main thread"
  - "heavy computation"
  - "worker thread"
inputs:
  - Computation or task to offload
  - Framework in use (React, Vue, vanilla, Next.js)
  - Build tool (Vite, webpack, Turbopack)
  - Data transfer requirements (size, frequency)
  - Whether shared state across tabs is needed
outputs:
  - Worker implementation with typed messaging
  - Comlink wrapper for RPC-style worker calls
  - Build configuration for worker bundling
  - Transfer strategy for large data (Transferable, SharedArrayBuffer)
  - Error handling and graceful degradation pattern
linksTo:
  - code-splitting
  - performance-profiler
  - state-management
linkedFrom:
  - optimize
  - performance-profiler
preferredNextSkills:
  - performance-profiler
  - code-splitting
fallbackSkills:
  - optimize
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Web Workers Skill

## Purpose

The browser's main thread handles DOM rendering, event listeners, and JavaScript execution on a single thread. Any computation taking more than ~50ms blocks user interaction and causes visible jank. Web Workers run JavaScript on separate OS threads, keeping the UI responsive while performing heavy computation — parsing, sorting, image processing, cryptography, data transformation, or WASM execution.

## Key Concepts

### Worker Types

| Type | Scope | Use Case |
|------|-------|----------|
| **Dedicated Worker** | Single page | Heavy computation for one tab |
| **SharedWorker** | Multiple tabs/frames on same origin | Shared WebSocket, cross-tab sync |
| **Service Worker** | Entire origin (network proxy) | Offline support, push notifications |

### Communication Model

```
Main Thread ←→ Worker Thread

postMessage(data)  →  onmessage(event)
onmessage(event)   ←  postMessage(data)

Data is COPIED by default (structured clone algorithm).
Transferable objects can be MOVED (zero-copy) for ArrayBuffers.
SharedArrayBuffer allows TRUE shared memory (requires COOP/COEP headers).
```

### What Workers Cannot Access

- DOM (`document`, `window.document`)
- `window` (workers get `self` / `globalThis`)
- `localStorage` / `sessionStorage`
- Synchronous XHR (only in workers, but avoid it)

### What Workers Can Access

- `fetch`, `WebSocket`, `IndexedDB`, `Cache API`
- `crypto.subtle`, `TextEncoder/Decoder`
- `importScripts()` (classic) or ES modules
- `setTimeout`, `setInterval`, `requestAnimationFrame` (not in all workers)
- WASM instantiation and execution

## Implementation

### Basic Dedicated Worker

```typescript
// worker.ts
self.onmessage = (event: MessageEvent<{ numbers: number[] }>) => {
  const { numbers } = event.data;

  // Heavy computation: sort + statistical analysis
  const sorted = [...numbers].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  self.postMessage({ sorted, mean, median });
};
```

```typescript
// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

worker.onmessage = (event) => {
  const { sorted, mean, median } = event.data;
  console.log('Results:', { mean, median });
};

worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

worker.postMessage({ numbers: generateLargeDataset() });
```

### Typed Worker Wrapper

```typescript
// worker-types.ts
export interface WorkerRequest {
  id: string;
  type: 'sort' | 'filter' | 'transform';
  payload: unknown;
}

export interface WorkerResponse {
  id: string;
  result?: unknown;
  error?: string;
}

// typed-worker.ts
type Resolver = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

export function createTypedWorker(url: URL) {
  const worker = new Worker(url, { type: 'module' });
  const pending = new Map<string, Resolver>();
  let counter = 0;

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, result, error } = event.data;
    const resolver = pending.get(id);
    if (!resolver) return;

    pending.delete(id);
    if (error) {
      resolver.reject(new Error(error));
    } else {
      resolver.resolve(result);
    }
  };

  return {
    send<T>(type: string, payload: unknown): Promise<T> {
      const id = `msg-${++counter}`;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        worker.postMessage({ id, type, payload });
      });
    },
    terminate() {
      worker.terminate();
      for (const [, { reject }] of pending) {
        reject(new Error('Worker terminated'));
      }
      pending.clear();
    },
  };
}

// Usage
const w = createTypedWorker(new URL('./worker.ts', import.meta.url));
const result = await w.send<number[]>('sort', { data: largeArray });
```

### Comlink (RPC-Style Workers)

```typescript
// heavy-math.worker.ts
import * as Comlink from 'comlink';

const api = {
  async fibonacci(n: number): Promise<number> {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  },

  async processImage(
    imageData: ImageData,
    filter: 'grayscale' | 'blur' | 'sharpen'
  ): Promise<ImageData> {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data.length);

    if (filter === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        output[i] = output[i + 1] = output[i + 2] = gray;
        output[i + 3] = data[i + 3];
      }
    }

    return new ImageData(output, width, height);
  },
};

export type HeavyMathAPI = typeof api;
Comlink.expose(api);
```

```typescript
// main.ts — call worker like a normal async function
import * as Comlink from 'comlink';
import type { HeavyMathAPI } from './heavy-math.worker';

const worker = new Worker(
  new URL('./heavy-math.worker.ts', import.meta.url),
  { type: 'module' }
);

const math = Comlink.wrap<HeavyMathAPI>(worker);

// Looks like a regular function call — Comlink handles serialization
const result = await math.fibonacci(50);
console.log('Fibonacci(50):', result);
```

### React Hook for Workers

```typescript
// useWorker.ts
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseWorkerOptions {
  terminateOnUnmount?: boolean;
}

export function useWorker<TInput, TOutput>(
  workerFactory: () => Worker,
  options: UseWorkerOptions = { terminateOnUnmount: true }
) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<TOutput | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const worker = workerFactory();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<TOutput>) => {
      setResult(event.data);
      setIsProcessing(false);
    };

    worker.onerror = (err) => {
      setError(new Error(err.message));
      setIsProcessing(false);
    };

    return () => {
      if (options.terminateOnUnmount) {
        worker.terminate();
      }
    };
  }, []);

  const postMessage = useCallback((data: TInput) => {
    setIsProcessing(true);
    setError(null);
    workerRef.current?.postMessage(data);
  }, []);

  return { result, error, isProcessing, postMessage };
}

// Usage in component
function DataProcessor({ data }: { data: number[] }) {
  const { result, isProcessing, postMessage } = useWorker<number[], number[]>(
    () => new Worker(new URL('./sort.worker.ts', import.meta.url), { type: 'module' })
  );

  return (
    <button onClick={() => postMessage(data)} disabled={isProcessing}>
      {isProcessing ? 'Processing...' : 'Sort Data'}
    </button>
  );
}
```

### Transferable Objects (Zero-Copy)

```typescript
// Transfer ownership of ArrayBuffer instead of copying
const buffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB
const uint8 = new Uint8Array(buffer);
// ... fill with data ...

// COPY (slow for large buffers):
// worker.postMessage({ data: uint8 });

// TRANSFER (instant, zero-copy — buffer becomes unusable in sender):
worker.postMessage({ data: buffer }, [buffer]);
// buffer.byteLength is now 0 — ownership transferred

// Worker side: receive transferred buffer
self.onmessage = (event) => {
  const buffer: ArrayBuffer = event.data.data;
  const view = new Uint8Array(buffer);
  // ... process ...

  // Transfer back to main thread
  self.postMessage({ result: buffer }, [buffer]);
};
```

### SharedWorker (Cross-Tab Communication)

```typescript
// shared-ws.worker.ts
const connections: MessagePort[] = [];
let socket: WebSocket | null = null;

function broadcast(message: unknown) {
  for (const port of connections) {
    port.postMessage(message);
  }
}

self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  connections.push(port);

  // Initialize WebSocket once, shared across all tabs
  if (!socket) {
    socket = new WebSocket('wss://api.example.com/ws');
    socket.onmessage = (wsEvent) => {
      broadcast({ type: 'ws-message', data: JSON.parse(wsEvent.data) });
    };
  }

  port.onmessage = (msgEvent) => {
    if (msgEvent.data.type === 'send') {
      socket?.send(JSON.stringify(msgEvent.data.payload));
    }
  };

  port.start();
};
```

```typescript
// main.ts
const shared = new SharedWorker(
  new URL('./shared-ws.worker.ts', import.meta.url),
  { type: 'module', name: 'ws-shared' }
);

shared.port.onmessage = (event) => {
  console.log('Message from shared worker:', event.data);
};

shared.port.start();
shared.port.postMessage({ type: 'send', payload: { action: 'subscribe' } });
```

### Vite Worker Configuration

```typescript
// vite.config.ts
export default defineConfig({
  worker: {
    format: 'es',          // Use ES modules in workers
    plugins: () => [],      // Plugins applied inside workers
    rollupOptions: {
      output: {
        entryFileNames: 'assets/worker-[name]-[hash].js',
      },
    },
  },
});

// Workers are auto-detected with `new Worker(new URL(...), { type: 'module' })`
// or with the `?worker` suffix:
import MyWorker from './my-worker?worker';
const worker = new MyWorker();
```

## Best Practices

1. **Measure before offloading.** Use the Performance API or Chrome DevTools to confirm a task actually blocks the main thread for >50ms. Workers add message-passing overhead.
2. **Batch messages.** Instead of sending one message per item, batch data into chunks. The structured clone overhead is per-message, not per-byte.
3. **Use Transferable objects** for large ArrayBuffers. Structured cloning a 100MB buffer takes ~80ms; transferring it takes ~0ms.
4. **Pool workers for repeated tasks.** Creating a new Worker has startup cost (~50-100ms). Reuse workers and route tasks via message types.
5. **Always handle errors.** Workers fail silently without `onerror`. Add error handlers and consider a timeout mechanism for unresponsive workers.
6. **Use Comlink for complex APIs.** Once a worker has more than 2-3 message types, Comlink's RPC pattern drastically reduces boilerplate.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Copying large data via `postMessage` | High memory usage, slow transfer | Use `Transferable` objects or `SharedArrayBuffer` |
| Not terminating workers | Memory leaks, zombie threads | Call `worker.terminate()` on component unmount or page unload |
| Accessing DOM from worker | `ReferenceError: document is not defined` | Workers have no DOM access — send results back to main thread for DOM updates |
| Module workers not supported in older browsers | Worker fails to load | Add `type: 'module'` and check `Worker` constructor support; fall back to classic workers |
| SharedArrayBuffer without COOP/COEP headers | `SharedArrayBuffer is not defined` | Set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` |
| Race conditions in SharedWorker | Inconsistent state across tabs | Use structured message protocol with sequence IDs; avoid shared mutable state |
| Worker bundle too large | Slow worker startup | Code-split worker dependencies; keep worker bundles focused |
| Forgetting `port.start()` on SharedWorker | Messages never received | Always call `port.start()` after setting up `onmessage` |
