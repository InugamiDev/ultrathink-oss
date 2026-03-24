---
name: docker
description: Dockerfile optimization, multi-stage builds, Docker Compose orchestration, image security, and container best practices
layer: domain
category: devops
triggers:
  - "docker"
  - "dockerfile"
  - "container"
  - "docker compose"
  - "multi-stage build"
  - "container image"
  - "docker build"
inputs: [application source code, deployment requirements, base image preferences]
outputs: [Dockerfiles, docker-compose.yml, build scripts, optimization recommendations]
linksTo: [kubernetes, cicd, monitoring, nginx]
linkedFrom: [code-review, optimize, ship]
preferredNextSkills: [kubernetes, cicd, monitoring]
fallbackSkills: [linux-admin, vercel]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [container builds, image pushes]
---

# Docker Specialist

## Purpose

Produce optimized, secure, and production-ready Docker configurations. This skill covers Dockerfile authoring, multi-stage build strategies, Docker Compose orchestration, image security hardening, and container runtime best practices.

## Key Patterns

### Multi-Stage Build Template

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose Production Pattern

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Layer Caching Optimization

Order Dockerfile instructions from least to most frequently changing:

1. Base image selection
2. System package installation
3. Dependency file copy (package.json, lock files)
4. Dependency installation
5. Source code copy
6. Build step
7. Runtime configuration

## Best Practices

### Image Size Reduction
- Always use Alpine-based images when possible (e.g., `node:20-alpine`)
- Use multi-stage builds to exclude build tools from the final image
- Combine RUN commands with `&&` to reduce layers
- Add `.dockerignore` to exclude `node_modules`, `.git`, `.env`, test files
- Use `--no-cache` flag for package managers in CI builds

### Security Hardening
- Never run containers as root; create and switch to a non-root user
- Pin base image versions (avoid `latest` tag)
- Scan images with `docker scout`, `trivy`, or `grype`
- Do not embed secrets in the image; use runtime env vars or secret managers
- Set `read_only: true` on containers where possible
- Use `COPY` instead of `ADD` (ADD has implicit tar extraction and URL fetching)

### Health Checks
- Always define health checks in Dockerfiles or Compose
- Use lightweight checks (wget/curl to health endpoint)
- Set appropriate `start_period` for apps that need warm-up

### Networking
- Use named networks for service isolation
- Never expose database ports to the host in production
- Use internal DNS (service names) for inter-container communication

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `npm install` invalidated on every code change | Copy `package.json` + lockfile first, install, then copy source |
| Image bloat from dev dependencies | Use `--omit=dev` or `--production` flag in final stage |
| Running as root | Add `USER` instruction with a non-root user |
| Secrets baked into layers | Use `--secret` mount in BuildKit or runtime env vars |
| No `.dockerignore` | Create one excluding `node_modules`, `.git`, `.env`, `dist` |
| Using `latest` tag | Pin versions: `node:20.11-alpine` |
| Single-stage builds | Use multi-stage to separate build from runtime |

## Examples

### .dockerignore

```
node_modules
.git
.gitignore
.env*
*.md
dist
.next
coverage
.turbo
```

### BuildKit Secret Mount

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm install --registry https://registry.npmjs.org/
```

Build with:
```bash
docker build --secret id=npm_token,src=.npm_token .
```

### Development Compose with Hot Reload

```yaml
services:
  app:
    build:
      context: .
      target: deps
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

### Monitoring Container Logs

```bash
# Follow logs with timestamps
docker compose logs -f --timestamps app

# View last 100 lines
docker compose logs --tail=100 app

# Resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```
