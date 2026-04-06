---
name: api-versioning
description: API versioning strategies — URL path, header, query parameter approaches. Version lifecycle management, deprecation policies, backward compatibility, and migration planning
layer: domain
category: backend
triggers:
  - "api versioning"
  - "api version"
  - "api v2"
  - "breaking changes api"
  - "deprecate api"
  - "api migration"
  - "backward compatibility"
inputs:
  - Current API surface and consumer count
  - Type of breaking change being introduced
  - Client update timeline constraints
  - API gateway or framework in use
outputs:
  - Versioning strategy recommendation
  - Migration plan with timeline
  - Deprecation policy document
  - Version routing implementation
  - Backward compatibility layer code
linksTo: [api-designer, microservices, monitoring]
linkedFrom: [migration-planner, code-review, ship]
preferredNextSkills: [api-designer, monitoring]
fallbackSkills: [migration-planner]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: [new API routes, deprecation headers, documentation changes]
---

# API Versioning Specialist

## Purpose

API versioning is the discipline of evolving an API without breaking existing consumers. A wrong versioning strategy causes client outages, support burden, and migration nightmares. This skill covers the three major strategies, when to use each, how to implement version routing, deprecation lifecycle, and backward-compatible evolution patterns that often avoid versioning entirely.

## Key Concepts

### The Three Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URL Path** | `/api/v2/users` | Explicit, easy to route, cacheable | URL pollution, hard to sunset |
| **Header** | `Accept: application/vnd.api.v2+json` | Clean URLs, content negotiation | Hidden, harder to test in browser |
| **Query Param** | `/api/users?version=2` | Easy to test, explicit | Pollutes query string, cache key issues |

### When to Version vs Evolve

```
Can you make the change WITHOUT breaking existing clients?
  |-- YES -> Do NOT version. Use backward-compatible evolution.
  |   |-- Add new fields (old clients ignore them)
  |   |-- Add new endpoints
  |   |-- Add optional parameters
  |   +-- Use feature flags
  +-- NO -> Version the API.
      |-- Removing or renaming fields
      |-- Changing field types
      |-- Changing response structure
      |-- Changing authentication flow
      +-- Changing error format
```

### Version Lifecycle

```
+----------+     +----------+     +----------+     +----------+
|  Active   |---->|  Stable  |---->|Deprecated|---->|  Sunset  |
| (latest)  |     |(supported)|    |(warnings) |    |(removed) |
+----------+     +----------+     +----------+     +----------+
   v3 (now)         v2               v1              v0
```

## Workflow

### Step 1: Choose a Strategy

**Use URL Path Versioning when:**
- Building a public API with many third-party consumers
- Consumers need to pin to specific versions easily
- You want maximum visibility and simplicity

**Use Header Versioning when:**
- Building an internal API or platform API
- You want clean URLs for REST purity
- Content negotiation is already part of your architecture

**Use Query Param Versioning when:**
- Rapid prototyping or internal tools
- You need easy version switching in browser/curl testing
- API gateway handles routing and can strip the param

### Step 2: Implement Version Routing

#### URL Path Versioning (Express/Node.js)

```typescript
// routes/v1/users.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const users = await db.user.findMany();
  // v1 response format
  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
  });
});

export default router;
```

```typescript
// routes/v2/users.ts
import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const users = await db.user.findMany({ include: { profile: true } });
  // v2 response format — different structure
  res.json({
    data: users.map((u) => ({
      id: u.id,
      fullName: u.name,        // renamed field
      email: u.email,
      profile: u.profile,       // new nested object
      createdAt: u.createdAt,   // new field
    })),
    meta: {
      total: users.length,
      version: 'v2',
    },
  });
});

export default router;
```

```typescript
// app.ts — mount versioned routes
import express from 'express';
import v1Users from './routes/v1/users';
import v2Users from './routes/v2/users';

const app = express();

app.use('/api/v1/users', v1Users);
app.use('/api/v2/users', v2Users);

// Default latest version redirect
app.use('/api/users', (req, res) => {
  res.redirect(308, `/api/v2/users${req.url}`);
});
```

#### Header-Based Versioning (Next.js API Routes)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const version = parseApiVersion(request);

  switch (version) {
    case 1:
      return handleV1(request);
    case 2:
      return handleV2(request);
    default:
      return NextResponse.json(
        { error: `Unsupported API version: ${version}` },
        { status: 400 }
      );
  }
}

function parseApiVersion(request: NextRequest): number {
  // Check Accept header: application/vnd.myapi.v2+json
  const accept = request.headers.get('accept') ?? '';
  const match = accept.match(/application\/vnd\.myapi\.v(\d+)\+json/);
  if (match) return parseInt(match[1], 10);

  // Check custom header fallback
  const versionHeader = request.headers.get('x-api-version');
  if (versionHeader) return parseInt(versionHeader, 10);

  // Default to latest stable
  return 2;
}

async function handleV1(request: NextRequest) {
  const users = await db.user.findMany();
  const response = NextResponse.json({ users });

  // Add deprecation warning
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', 'Sat, 01 Nov 2025 00:00:00 GMT');
  response.headers.set('Link', '</api/v2/users>; rel="successor-version"');

  return response;
}

async function handleV2(request: NextRequest) {
  const users = await db.user.findMany({ include: { profile: true } });
  return NextResponse.json({
    data: users,
    meta: { version: 'v2' },
  });
}
```

#### API Gateway Routing (nginx)

```nginx
# Version routing at the gateway level
upstream api_v1 {
    server api-v1.internal:3000;
}

upstream api_v2 {
    server api-v2.internal:3000;
}

server {
    listen 80;

    # URL path versioning
    location /api/v1/ {
        proxy_pass http://api_v1/;
        add_header X-API-Deprecated "true";
        add_header Sunset "Sat, 01 Nov 2025 00:00:00 GMT";
    }

    location /api/v2/ {
        proxy_pass http://api_v2/;
    }

    # Header-based versioning
    location /api/ {
        set $backend "api_v2";

        if ($http_x_api_version = "1") {
            set $backend "api_v1";
        }

        proxy_pass http://$backend/;
    }
}
```

### Step 3: Implement Deprecation Headers

```typescript
// middleware/deprecation.ts
import { Request, Response, NextFunction } from 'express';

interface DeprecationConfig {
  version: string;
  sunsetDate: string;       // ISO 8601
  successorUrl?: string;
  migrationGuideUrl?: string;
}

const deprecatedVersions: Record<string, DeprecationConfig> = {
  v1: {
    version: 'v1',
    sunsetDate: '2025-11-01T00:00:00Z',
    successorUrl: '/api/v2',
    migrationGuideUrl: 'https://docs.example.com/api/migration/v1-to-v2',
  },
};

export function deprecationMiddleware(req: Request, res: Response, next: NextFunction) {
  const versionMatch = req.path.match(/\/api\/(v\d+)\//);
  if (!versionMatch) return next();

  const version = versionMatch[1];
  const config = deprecatedVersions[version];

  if (config) {
    res.set('Deprecation', 'true');
    res.set('Sunset', new Date(config.sunsetDate).toUTCString());

    const links: string[] = [];
    if (config.successorUrl) {
      links.push(`<${config.successorUrl}>; rel="successor-version"`);
    }
    if (config.migrationGuideUrl) {
      links.push(`<${config.migrationGuideUrl}>; rel="deprecation"`);
    }
    if (links.length > 0) {
      res.set('Link', links.join(', '));
    }

    // Log deprecated version usage for tracking migration progress
    console.warn(`Deprecated API ${version} called: ${req.method} ${req.path}`, {
      clientId: req.headers['x-client-id'],
      userAgent: req.headers['user-agent'],
    });
  }

  next();
}
```

### Step 4: Backward-Compatible Evolution (Avoid Versioning)

```typescript
// Strategy 1: Additive changes — add fields, never remove
interface UserResponseV1 {
  id: string;
  name: string;
  email: string;
}

// Just add new fields — old clients ignore them
interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;     // NEW — old clients ignore
  role: string;          // NEW — old clients ignore
}

// Strategy 2: Response shaping via fields parameter
// GET /api/users?fields=id,name,email,avatarUrl
router.get('/users', async (req, res) => {
  const fields = req.query.fields?.split(',') ?? null;
  const users = await db.user.findMany();

  const shaped = users.map((user) => {
    if (!fields) return user;
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => fields.includes(key))
    );
  });

  res.json({ data: shaped });
});

// Strategy 3: Feature flags in API responses
router.get('/users', async (req, res) => {
  const includeProfile = req.query.include?.includes('profile');
  const users = await db.user.findMany({
    include: includeProfile ? { profile: true } : undefined,
  });
  res.json({ data: users });
});
```

### Step 5: Migration Plan Template

```markdown
## API Migration: v1 -> v2

### Timeline
| Phase | Date | Action |
|-------|------|--------|
| Announce | 2025-01-15 | Email consumers, update docs |
| Dual-run | 2025-01-15 | v1 and v2 both active |
| Deprecate | 2025-06-01 | v1 returns Deprecation headers |
| Sunset warning | 2025-09-01 | v1 returns 299 Warning header |
| Sunset | 2025-11-01 | v1 returns 410 Gone |

### Breaking Changes
1. name field renamed to fullName
2. Response wrapper changed from { users: [] } to { data: [], meta: {} }
3. Date fields changed from Unix timestamps to ISO 8601

### Migration Steps for Consumers
1. Update response parsing to use data wrapper
2. Rename name references to fullName
3. Update date parsing to handle ISO 8601
4. Change base URL from /api/v1/ to /api/v2/
```

## Best Practices

- Prefer backward-compatible evolution over new versions whenever possible
- Use URL path versioning for public APIs — it is the most widely understood pattern
- Always include `Deprecation`, `Sunset`, and `Link` headers on deprecated versions
- Log deprecated version usage to track migration progress and identify lagging consumers
- Maintain no more than 2 active versions at a time (N and N-1)
- Version the entire API, not individual endpoints (partial versioning creates confusion)
- Set concrete sunset dates and communicate them aggressively
- Use API gateways for version routing in microservice architectures
- Document every breaking change with before/after examples

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Versioning too early or too often | Exhaust backward-compatible options first (additive fields, optional params) |
| No deprecation timeline | Set and publish concrete sunset dates from day one of the new version |
| Breaking changes without migration guide | Provide before/after examples, SDK updates, and a migration checklist |
| Removing old version without usage tracking | Log deprecated calls with client ID; only sunset when usage drops below threshold |
| Different versioning per endpoint | Version the whole API uniformly — partial versioning confuses consumers |
| No default version behavior | Always default unversioned requests to the latest stable version |
| Forgetting to version error formats | Error response structure changes ARE breaking — include in version scope |

## Examples

### Version Discovery Endpoint

```typescript
// GET /api — API root with version discovery
app.get('/api', (req, res) => {
  res.json({
    versions: {
      v1: {
        status: 'deprecated',
        url: '/api/v1',
        sunset: '2025-11-01',
        docs: 'https://docs.example.com/api/v1',
      },
      v2: {
        status: 'stable',
        url: '/api/v2',
        docs: 'https://docs.example.com/api/v2',
      },
      v3: {
        status: 'beta',
        url: '/api/v3',
        docs: 'https://docs.example.com/api/v3',
      },
    },
    current: 'v2',
    latest: 'v3',
  });
});
```

### Sunset Response Handler

```typescript
// Return 410 Gone for fully sunset versions
app.use('/api/v0', (req, res) => {
  res.status(410).json({
    error: 'Gone',
    message: 'API v0 has been sunset as of 2024-06-01.',
    migrationGuide: 'https://docs.example.com/api/migration/v0-to-v2',
    currentVersion: {
      url: '/api/v2',
      docs: 'https://docs.example.com/api/v2',
    },
  });
});
```

### SDK Version Wrapper

```typescript
// Client-side SDK that handles versioning transparently
class ApiClient {
  private baseUrl: string;
  private version: string;

  constructor(options: { baseUrl: string; version?: string }) {
    this.baseUrl = options.baseUrl;
    this.version = options.version ?? 'v2';
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api/${this.version}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    // Check for deprecation warnings
    if (response.headers.get('Deprecation') === 'true') {
      const sunset = response.headers.get('Sunset');
      console.warn(
        `API ${this.version} is deprecated. Sunset: ${sunset}. ` +
        `Please migrate to the latest version.`
      );
    }

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.json();
  }

  getUsers() {
    return this.request<{ data: User[]; meta: Meta }>('/users');
  }
}
```
