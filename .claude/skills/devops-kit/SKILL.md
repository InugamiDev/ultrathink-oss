---
name: devops-kit
description: "Unified DevOps toolkit — Docker (optimization, multi-stage, compose, security), Kubernetes (manifests, Helm, scaling, service mesh), container orchestration beyond k8s (Swarm, Nomad, ECS), Terraform IaC, nginx (reverse proxy, load balancing, SSL/TLS, caching), Linux admin (systemd, networking, hardening), DNS configuration, multi-environment management (staging/preview/prod), CI/CD pipeline patterns (matrix builds, caching, deployment gates, rollback), GitHub Actions (reusable workflows, composite actions), general CI/CD with GitLab, shell scripting. Keeps cloud-specific skills (aws/cloudflare/vercel) separate."
layer: domain
category: devops
triggers: ["Makefile", "actions yaml", "automate this", "bash script", "cd pipeline", "centos", "ci caching", "ci pipeline", "ci workflow", "ci/cd", "cicd", "cluster", "cname", "container", "container image", "container networking", "container orchestration", "continuous deployment", "continuous integration", "cron job", "debian", "debug this script", "deployment gate", "deployment manifest", "dns", "dns propagation", "dns record", "docker", "docker build", "docker compose", "docker swarm", "dockerfile", "domain setup", "ecs", "env management", "environment promotion", "firewall", "gh action", "github actions", "github actions workflow", "github workflow", "gitlab ci", "hcl", "helm", "iac", "infrastructure as code", "ingress", "iptables", "k8s", "kubectl", "kubernetes", "linux", "load balancer", "matrix build", "multi environment", "multi-stage build", "nginx", "nginx config", "nomad", "pipeline", "pipeline optimization", "pod", "preview environment", "proxy pass", "reverse proxy", "server admin", "server setup", "service discovery", "shell script", "ssh", "ssl certificate", "ssl termination", "staging environment", "systemd", "terraform", "terraform module", "terraform plan", "tf state", "ubuntu", "workflow", "write a script", "zsh script"]
---

# devops-kit

Unified DevOps toolkit — Docker (optimization, multi-stage, compose, security), Kubernetes (manifests, Helm, scaling, service mesh), container orchestration beyond k8s (Swarm, Nomad, ECS), Terraform IaC, nginx (reverse proxy, load balancing, SSL/TLS, caching), Linux admin (systemd, networking, hardening), DNS configuration, multi-environment management (staging/preview/prod), CI/CD pipeline patterns (matrix builds, caching, deployment gates, rollback), GitHub Actions (reusable workflows, composite actions), general CI/CD with GitLab, shell scripting. Keeps cloud-specific skills (aws/cloudflare/vercel) separate.


## Absorbs

- `docker`
- `kubernetes`
- `container-orchestration`
- `terraform`
- `nginx`
- `linux-admin`
- `dns`
- `environment-management`
- `ci-cd-patterns`
- `github-actions`
- `cicd`
- `shell-scripting`


---

## From `docker`

> Dockerfile optimization, multi-stage builds, Docker Compose orchestration, image security, and container best practices

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


---

## From `kubernetes`

> Kubernetes manifests, Helm charts, scaling strategies, service mesh, and cluster management

# Kubernetes Specialist

## Purpose

Design and produce production-grade Kubernetes configurations including deployments, services, ingress, Helm charts, autoscaling, RBAC, and operational patterns for managing containerized workloads at scale.

## Key Patterns

### Production Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
  labels:
    app.kubernetes.io/name: app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/managed-by: helm
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app.kubernetes.io/name: app
  template:
    metadata:
      labels:
        app.kubernetes.io/name: app
    spec:
      serviceAccountName: app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: app
          image: registry.example.com/app:1.0.0
          ports:
            - containerPort: 3000
              protocol: TCP
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: app
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### Ingress with TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80
```

### Helm Chart Structure

```
chart/
  Chart.yaml
  values.yaml
  values-staging.yaml
  values-production.yaml
  templates/
    _helpers.tpl
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    configmap.yaml
    secret.yaml
    serviceaccount.yaml
    pdb.yaml
```

## Best Practices

### Resource Management
- Always set resource requests AND limits
- Use `LimitRange` and `ResourceQuota` per namespace
- Start with requests = observed p50, limits = observed p99 + headroom
- Use Vertical Pod Autoscaler (VPA) in recommend mode to size pods

### Reliability
- Use PodDisruptionBudgets (PDB) with `minAvailable: 50%` or similar
- Spread pods across zones using `topologySpreadConstraints`
- Define both liveness and readiness probes (different endpoints)
- Use `preStop` hooks for graceful shutdown
- Set `terminationGracePeriodSeconds` to match app drain time

### Security
- Use `securityContext.runAsNonRoot: true`
- Drop all capabilities, add only what's needed
- Use NetworkPolicies to restrict pod-to-pod communication
- Use ServiceAccounts with minimal RBAC roles
- Scan images in CI, enforce policies with OPA/Kyverno

### Secrets
- Never store secrets in ConfigMaps or manifests
- Use External Secrets Operator with AWS Secrets Manager / Vault
- Rotate secrets without pod restarts using CSI Secret Store driver

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| No resource limits | Always set requests and limits |
| Liveness probe on app startup path | Use `startupProbe` for slow-starting apps |
| Same endpoint for liveness and readiness | Liveness: "am I alive?"; readiness: "can I serve traffic?" |
| No PDB | Add PDB to prevent full unavailability during upgrades |
| Hardcoded image tags | Use SHA digests or versioned tags, never `latest` |
| Secrets in ConfigMap | Use Secrets resource or External Secrets |
| Single-zone deployment | Use topology spread constraints |

## Examples

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: "50%"
  selector:
    matchLabels:
      app.kubernetes.io/name: app
```

### NetworkPolicy (Allow Only Ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
```

### Useful kubectl Commands

```bash
# Rolling restart
kubectl rollout restart deployment/app -n production

# Check rollout status
kubectl rollout status deployment/app -n production

# View pod resource usage
kubectl top pods -n production --sort-by=memory

# Debug failing pod
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production --previous

# Port forward for debugging
kubectl port-forward svc/app-service 3000:80 -n production
```


---

## From `container-orchestration`

> Container orchestration beyond k8s — Docker Swarm, Nomad, ECS, and container networking patterns.

# Container Orchestration

## Purpose

Guide container orchestration decisions and implementations beyond Kubernetes. Covers Docker Swarm, HashiCorp Nomad, AWS ECS/Fargate, container networking, service discovery, and health checks. Helps choose the right orchestrator for the team's complexity budget.

## Platform Comparison

| Feature | Docker Swarm | Nomad | ECS/Fargate | Kubernetes |
|---------|-------------|-------|-------------|------------|
| Complexity | Low | Medium | Medium | High |
| Learning curve | Shallow | Moderate | Moderate (AWS-specific) | Steep |
| Multi-cloud | Yes | Yes | No (AWS only) | Yes |
| Non-container workloads | No | Yes (VMs, Java, batch) | No | Via CRDs |
| Built-in service mesh | No | Consul Connect | App Mesh | Istio/Linkerd |
| Auto-scaling | Limited | Autoscaler plugin | Native | HPA/VPA/KEDA |
| Best for | Small teams, simple apps | Mixed workloads, HashiStack | AWS-native teams | Large-scale, multi-tenant |

## Key Patterns

### Docker Swarm

**Stack deployment** — Use `docker-compose.yml` with deploy directives:

```yaml
# docker-compose.yml (Swarm mode)
version: '3.8'

services:
  api:
    image: myapp/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first    # Blue-green within rolling update
        failure_action: rollback
      rollback_config:
        parallelism: 0        # Rollback all at once
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    deploy:
      mode: global           # One per node
      placement:
        constraints:
          - node.role == manager
    networks:
      - app-network

networks:
  app-network:
    driver: overlay
    attachable: true
```

```bash
# Deploy the stack
docker stack deploy -c docker-compose.yml myapp

# Scale a service
docker service scale myapp_api=5

# Rolling update
docker service update --image myapp/api:v2.0 myapp_api

# View service status
docker service ps myapp_api
```

### HashiCorp Nomad

**Job specification** — HCL-based job definition:

```hcl
# api.nomad.hcl
job "api" {
  datacenters = ["dc1"]
  type        = "service"

  update {
    max_parallel     = 1
    min_healthy_time = "10s"
    healthy_deadline = "3m"
    auto_revert      = true
    canary           = 1        # Canary deployment
  }

  group "api" {
    count = 3

    network {
      port "http" {
        to = 3000
      }
    }

    service {
      name = "api"
      port = "http"
      tags = ["urlprefix-/api"]  # For Fabio load balancer

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }

      # Consul Connect sidecar proxy
      connect {
        sidecar_service {
          proxy {
            upstreams {
              destination_name = "postgres"
              local_bind_port  = 5432
            }
          }
        }
      }
    }

    task "api" {
      driver = "docker"

      config {
        image = "myapp/api:${NOMAD_META_version}"
        ports = ["http"]
      }

      env {
        NODE_ENV     = "production"
        DATABASE_URL = "postgresql://localhost:5432/mydb"
      }

      resources {
        cpu    = 500   # MHz
        memory = 512   # MB
      }

      # Pull secrets from Vault
      vault {
        policies = ["api-policy"]
      }

      template {
        data = <<EOF
{{ with secret "secret/data/api" }}
DATABASE_PASSWORD={{ .Data.data.password }}
{{ end }}
EOF
        destination = "secrets/env"
        env         = true
      }
    }
  }
}
```

```bash
# Submit the job
nomad job run api.nomad.hcl

# Promote canary
nomad deployment promote <deployment-id>

# Scale
nomad job scale api 5

# Check allocations
nomad job status api
```

### AWS ECS with Fargate

**Task definition** — Terraform configuration:

```hcl
# ecs.tf
resource "aws_ecs_cluster" "main" {
  name = "production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 15
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/api"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  network_configuration {
    subnets         = var.private_subnets
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }
}

# Auto-scaling
resource "aws_appautoscaling_target" "api" {
  max_capacity       = 10
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### Container Networking Patterns

**Service discovery** — DNS-based vs. registry-based:

```yaml
# Docker Swarm: Built-in DNS resolution
# Services resolve each other by name within overlay network
services:
  api:
    environment:
      - REDIS_HOST=redis    # Resolves via Docker DNS
      - DB_HOST=postgres
  redis:
    image: redis:7-alpine
  postgres:
    image: postgres:16-alpine
```

```hcl
# Nomad + Consul: Service mesh with transparent proxy
service {
  name = "api"
  connect {
    sidecar_service {
      proxy {
        upstreams {
          destination_name = "redis"
          local_bind_port  = 6379
        }
        upstreams {
          destination_name = "postgres"
          local_bind_port  = 5432
        }
      }
    }
  }
}
```

### Health Check Patterns

```typescript
// Health check endpoint — return dependency status
import { Router } from 'express';

const health = Router();

health.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

health.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external_api: await checkExternalApi(),
  };

  const allHealthy = Object.values(checks).every((c) => c.healthy);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    uptime: process.uptime(),
  });
});

async function checkDatabase(): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    return { healthy: true, latencyMs: Date.now() - start };
  } catch {
    return { healthy: false, latencyMs: Date.now() - start };
  }
}
```

## Best Practices

1. **Match orchestrator to team size** — Swarm for small teams (<5 services), ECS for AWS shops, Nomad for mixed workloads, k8s for large-scale.
2. **Always define health checks** — Every container needs a health endpoint; orchestrators use it for routing and restart decisions.
3. **Use rolling updates with rollback** — Configure `start-first` ordering and automatic rollback on failure.
4. **Separate liveness from readiness** — Liveness = "is the process alive?"; readiness = "can it serve traffic?".
5. **Set resource limits** — Prevent a single container from consuming all host resources.
6. **Use overlay networks** — Isolate service traffic and enable cross-node communication.
7. **Externalize configuration** — Use environment variables, secrets managers, or config maps rather than baking config into images.
8. **Log to stdout/stderr** — Let the orchestrator collect and route logs; do not write to files inside containers.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No health checks | Orchestrator routes traffic to broken containers | Define HTTP health checks with appropriate intervals |
| No resource limits | One service starves others | Set CPU and memory limits on every container |
| Hardcoded service addresses | Breaks when containers move | Use DNS-based service discovery |
| Missing rollback config | Bad deploys require manual intervention | Configure `auto_revert` (Nomad) or `deployment_circuit_breaker` (ECS) |
| Single replica in production | Zero availability during deploys | Run at least 2 replicas with rolling updates |
| No graceful shutdown | Requests dropped during redeploy | Handle SIGTERM, drain connections, use `stop_grace_period` |


---

## From `terraform`

> Infrastructure as Code with Terraform, module design, state management, provider patterns, and drift detection

# Terraform Specialist

## Purpose

Design modular, maintainable, and safe Terraform configurations for managing cloud infrastructure. This skill covers HCL authoring, module patterns, state management, provider configuration, CI integration, and drift detection strategies.

## Key Patterns

### Project Structure

```
infrastructure/
  environments/
    production/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
    staging/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
  global/
    iam/
    dns/
```

### Remote State Backend

```hcl
# backend.tf
terraform {
  required_version = ">= 1.7"

  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "production/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### Reusable Module Pattern

```hcl
# modules/ecs-service/main.tf
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.this.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = var.tags
}

# modules/ecs-service/variables.tf
variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "desired_count" {
  description = "Desired task count"
  type        = number
  default     = 2
}

variable "subnet_ids" {
  description = "Subnet IDs for the service"
  type        = list(string)
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

# modules/ecs-service/outputs.tf
output "service_id" {
  description = "ECS service ID"
  value       = aws_ecs_service.this.id
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.this.name
}
```

### Data Sources for Cross-Module References

```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "company-terraform-state"
    key    = "production/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

## Best Practices

### Module Design
- One resource concern per module (networking, compute, database)
- Always define `variables.tf`, `outputs.tf`, and `versions.tf`
- Use `description` on all variables and outputs
- Add `validation` blocks on variables for input safety
- Use `locals` to DRY up repeated expressions
- Version modules with Git tags for stability

### State Management
- Always use remote state with locking (S3 + DynamoDB, GCS, Terraform Cloud)
- Encrypt state at rest (contains sensitive values)
- Separate state files per environment and per component
- Use `terraform state mv` instead of deleting and recreating
- Run `terraform plan` in CI before `apply`

### Safety
- Use `lifecycle.prevent_destroy` on critical resources (databases, S3 buckets)
- Use `lifecycle.ignore_changes` for fields managed outside Terraform
- Lock provider versions with `~>` constraints
- Run `terraform validate` and `tflint` in CI
- Use `-target` sparingly; prefer full plans

### Naming and Tagging
- Use consistent naming: `{env}-{project}-{resource}`
- Apply common tags via a `default_tags` block on the provider
- Tag everything with `environment`, `project`, `managed-by: terraform`

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| State drift from manual changes | Use `terraform refresh` or import, enforce IaC-only changes |
| Circular dependencies | Use `data` sources or refactor module boundaries |
| Large blast radius | Split into smaller state files per component |
| Unversioned modules | Tag modules in Git, reference with `?ref=v1.0.0` |
| Missing locks | Always configure DynamoDB or equivalent lock table |
| Hardcoded values | Use variables with defaults and `terraform.tfvars` per env |
| No plan review | Always run `plan` in CI PR check before `apply` |

## Examples

### Variable Validation

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
  validation {
    condition     = can(regex("^t3\\.", var.instance_type))
    error_message = "Only t3 instance types are allowed."
  }
}
```

### CI Pipeline Integration

```yaml
# .github/workflows/terraform.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform
          aws-region: us-east-1

      - run: terraform init
      - run: terraform validate
      - run: terraform plan -out=tfplan
      - run: terraform show -no-color tfplan > plan.txt

      - uses: actions/github-script@v7
        with:
          script: |
            const plan = require('fs').readFileSync('plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\`\`\`\n${plan.slice(0, 60000)}\n\`\`\``
            });
```

### Default Tags Pattern

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
      Repository  = "github.com/org/infra"
    }
  }
}
```


---

## From `nginx`

> Nginx configuration, reverse proxy, load balancing, SSL/TLS, caching, rate limiting, and security hardening

# Nginx Specialist

## Purpose

Configure Nginx for reverse proxying, load balancing, SSL termination, caching, rate limiting, and security hardening. This skill covers both traditional server deployments and container-based Nginx configurations.

## Key Patterns

### Production Reverse Proxy

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format json escape=json '{'
        '"time":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"method":"$request_method",'
        '"uri":"$request_uri",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"upstream_response_time":"$upstream_response_time",'
        '"user_agent":"$http_user_agent"'
    '}';
    access_log /var/log/nginx/access.log json;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Hide Nginx version
    server_tokens off;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

    include /etc/nginx/conf.d/*.conf;
}
```

### Server Block with SSL

```nginx
# /etc/nginx/conf.d/app.conf
upstream app_backend {
    least_conn;
    server app1:3000 weight=3;
    server app2:3000 weight=3;
    server app3:3000 weight=3 backup;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Body size
    client_max_body_size 10m;

    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        proxy_pass http://app_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_conn conn_per_ip 50;

        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Login with strict rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Default proxy
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint (no logging)
    location /health {
        access_log off;
        proxy_pass http://app_backend;
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### WebSocket Proxy

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Proxy Cache Configuration

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
    max_size=1g inactive=60m use_temp_path=off;

server {
    location /api/public/ {
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        proxy_cache_lock on;
        proxy_cache_background_update on;
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://app_backend;
    }
}
```

## Best Practices

### Performance
- Use `worker_processes auto` to match CPU cores
- Enable `sendfile`, `tcp_nopush`, `tcp_nodelay`
- Use `keepalive` connections to upstreams
- Enable gzip for text-based responses
- Use proxy caching for cacheable responses
- Set `worker_connections` high enough for expected load

### Security
- Always redirect HTTP to HTTPS
- Use TLS 1.2+ only; disable older protocols
- Set security headers (HSTS, X-Frame-Options, etc.)
- Hide server tokens (`server_tokens off`)
- Rate limit authentication endpoints aggressively
- Deny access to hidden files (`/\.`)
- Limit `client_max_body_size`

### SSL/TLS
- Use Let's Encrypt with auto-renewal (certbot)
- Enable OCSP stapling for faster handshakes
- Use `ssl_session_cache` for session reuse
- Prefer TLS 1.3 where possible
- Generate DH params: `openssl dhparam -out dhparam.pem 2048`

### Load Balancing
- Use `least_conn` for uneven request durations
- Use `ip_hash` for session affinity (if needed)
- Mark servers as `backup` for failover
- Set `max_fails` and `fail_timeout` for health checking

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `X-Forwarded-For` header | Always set `proxy_set_header X-Forwarded-For` |
| WebSocket connections dropping | Add `Upgrade` and `Connection` headers |
| 502 Bad Gateway | Check upstream health, increase timeouts |
| Large uploads failing | Increase `client_max_body_size` |
| SSL not working | Check certificate chain completeness (fullchain) |
| Rate limiting too aggressive | Tune `burst` parameter, use `nodelay` |
| Cache serving stale data | Set appropriate `proxy_cache_valid` durations |

## Examples

### Test Configuration

```bash
# Test config syntax
nginx -t

# Reload without downtime
nginx -s reload

# Check active connections
nginx -V 2>&1 | grep --color=auto -o "with-http_stub_status_module"
```

### Docker Nginx Config

```dockerfile
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
```

### Let's Encrypt with Certbot

```bash
# Initial certificate
certbot --nginx -d app.example.com

# Auto-renewal cron
0 0 1 * * certbot renew --quiet && nginx -s reload
```


---

## From `linux-admin`

> Linux server management, systemd, networking, troubleshooting, security hardening, and performance tuning

# Linux Administration Specialist

## Purpose

Manage Linux servers including initial setup, security hardening, service management, networking, performance tuning, and troubleshooting. This skill covers Ubuntu/Debian and RHEL/CentOS distributions with systemd.

## Key Patterns

### Initial Server Hardening

```bash
#!/bin/bash
# server-setup.sh — Run as root on a fresh server

set -euo pipefail

# 1. Update system
apt update && apt upgrade -y

# 2. Create admin user
USERNAME="deploy"
adduser --disabled-password --gecos "" "$USERNAME"
usermod -aG sudo "$USERNAME"
mkdir -p /home/$USERNAME/.ssh
cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/
chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
chmod 700 /home/$USERNAME/.ssh
chmod 600 /home/$USERNAME/.ssh/authorized_keys

# 3. Harden SSH
cat > /etc/ssh/sshd_config.d/hardening.conf <<'SSHEOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy
SSHEOF
systemctl restart sshd

# 4. Firewall (UFW)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

# 5. Fail2ban
apt install -y fail2ban
cat > /etc/fail2ban/jail.local <<'F2BEOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
F2BEOF
systemctl enable --now fail2ban

# 6. Automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 7. Kernel hardening
cat > /etc/sysctl.d/99-security.conf <<'SYSEOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
kernel.randomize_va_space = 2
SYSEOF
sysctl --system

echo "Server hardening complete."
```

### Systemd Service Unit

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
Documentation=https://docs.example.com
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=appuser
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node /opt/myapp/server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
StartLimitBurst=3
StartLimitIntervalSec=60

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/myapp/data /var/log/myapp
PrivateTmp=yes
PrivateDevices=yes

# Environment
EnvironmentFile=/opt/myapp/.env
Environment=NODE_ENV=production

# Resource limits
LimitNOFILE=65535
MemoryMax=512M
CPUQuota=50%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

### systemd Management Commands

```bash
# Enable and start service
systemctl enable --now myapp

# View status
systemctl status myapp

# View logs
journalctl -u myapp -f --since "1 hour ago"

# Reload configuration
systemctl daemon-reload
systemctl reload myapp

# Restart
systemctl restart myapp
```

### Performance Tuning (sysctl)

```bash
# /etc/sysctl.d/99-performance.conf

# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# File handles
fs.file-max = 2097152
fs.nr_open = 2097152
```

## Best Practices

### Security
- Disable root SSH login; use key-based auth only
- Use fail2ban to block brute-force attempts
- Enable automatic security updates (unattended-upgrades)
- Apply kernel hardening via sysctl
- Use UFW or nftables for firewall management
- Regularly audit open ports: `ss -tlnp`
- Keep system packages up to date

### Service Management
- Always use systemd service units (not init.d scripts)
- Apply security directives: `NoNewPrivileges`, `ProtectSystem`, `PrivateTmp`
- Set resource limits (`MemoryMax`, `CPUQuota`, `LimitNOFILE`)
- Use `Restart=on-failure` with backoff (`RestartSec`)
- Log to journal (`StandardOutput=journal`)

### Disk and Storage
- Use LVM for flexible partition management
- Monitor disk usage with alerts at 80% threshold
- Set up log rotation (`logrotate`)
- Use `tmpfs` for ephemeral data (`/tmp`, `/run`)
- Schedule regular backups with verification

### Networking
- Use `ss` instead of `netstat` (faster, more info)
- Use `ip` instead of `ifconfig`
- Configure DNS resolution in `/etc/systemd/resolved.conf`
- Use `chrony` for NTP time sync

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Running services as root | Create dedicated service users |
| No firewall configured | Enable UFW/nftables on setup |
| SSH password auth enabled | Disable in sshd_config, use keys only |
| Full disk from logs | Set up logrotate with size limits |
| No swap on low-memory servers | Create a small swap file as a safety net |
| Forgetting `daemon-reload` | Always run after editing unit files |
| Time drift | Install and enable `chrony` or `systemd-timesyncd` |

## Examples

### Troubleshooting Checklist

```bash
# Check system resources
free -h                          # Memory
df -h                            # Disk
top -bn1 | head -20              # CPU/processes
uptime                           # Load average

# Check network
ss -tlnp                         # Listening ports
ip addr show                     # Network interfaces
curl -I http://localhost:3000    # Test local service
dig +short example.com           # DNS resolution

# Check services
systemctl --failed               # Failed services
journalctl -p err --since today  # Today's errors
dmesg | tail -20                 # Kernel messages

# Check security
last -10                         # Recent logins
who                              # Current sessions
fail2ban-client status sshd      # Ban status
```

### Log Rotation Config

```
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 appuser appgroup
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

### Swap File Setup

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.d/99-performance.conf
```

### Backup Script

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -h localhost -U app mydb | gzip > "$BACKUP_DIR/db.sql.gz"

# Application data
tar czf "$BACKUP_DIR/app-data.tar.gz" /opt/myapp/data/

# Retention: keep 30 days
find /backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +

echo "Backup complete: $BACKUP_DIR"
```


---

## From `dns`

> DNS record management, propagation debugging, Cloudflare DNS configuration, SSL/TLS setup, domain migration, and email authentication records (SPF, DKIM, DMARC)

# DNS & SSL/TLS Skill

## Purpose

DNS is the foundation of every web application's reachability. Misconfigured DNS causes downtime, email deliverability failures, and SSL errors that are notoriously difficult to debug. This skill covers record types, Cloudflare DNS setup, SSL/TLS certificate management, email authentication (SPF/DKIM/DMARC), domain migrations, and propagation troubleshooting.

## Key Concepts

### DNS Record Types

| Type | Purpose | Example Value | When to Use |
|------|---------|---------------|-------------|
| **A** | Maps domain to IPv4 | `93.184.216.34` | Pointing to a server with a static IP |
| **AAAA** | Maps domain to IPv6 | `2606:2800:220:1:...` | IPv6-enabled servers |
| **CNAME** | Alias to another domain | `app.vercel.app` | Pointing subdomains to hosting providers |
| **MX** | Mail server routing | `10 mx1.emailprovider.com` | Email delivery configuration |
| **TXT** | Arbitrary text data | `v=spf1 include:...` | Domain verification, SPF, DKIM, DMARC |
| **NS** | Nameserver delegation | `ns1.cloudflare.com` | Delegating DNS to a provider |
| **CAA** | Certificate authority authorization | `0 issue "letsencrypt.org"` | Restricting which CAs can issue certs |
| **SRV** | Service location | `10 5 5060 sip.example.com` | Service discovery (rare in web apps) |

### Important Rules

- **CNAME cannot coexist** with other records at the same name (the "CNAME at apex" problem). Use ALIAS/ANAME or Cloudflare's CNAME flattening for root domains.
- **TTL (Time to Live)** controls how long resolvers cache a record. Lower TTL = faster propagation but more DNS queries.
- **Propagation is not instant** — it depends on the old TTL. If TTL was 86400 (24h), changes can take up to 24 hours.

## Workflow

### Step 1: Configure DNS Records

#### Vercel Deployment (Typical Setup)

```
# Root domain (@ or example.com)
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto (or 300)

# www subdomain
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto

# API subdomain (if separate)
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: Auto
```

#### Cloudflare with Proxy (Orange Cloud)

```
# Root domain — Cloudflare proxied (orange cloud)
Type: A
Name: @
Value: <origin server IP>
Proxy: Proxied (orange cloud)
TTL: Auto

# www — CNAME to root, proxied
Type: CNAME
Name: www
Value: example.com
Proxy: Proxied

# API — DNS only (gray cloud) if origin handles TLS
Type: A
Name: api
Value: <api server IP>
Proxy: DNS only (gray cloud)
```

#### Cloudflare API (Terraform or Script)

```bash
# Create a DNS record via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "app",
    "content": "cname.vercel-dns.com",
    "ttl": 1,
    "proxied": false
  }'
```

```hcl
# Terraform — Cloudflare DNS
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = "cname.vercel-dns.com"
  type    = "CNAME"
  ttl     = 1      # Auto when proxied
  proxied = false
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = "76.76.21.21"
  type    = "A"
  proxied = true
}
```

### Step 2: SSL/TLS Configuration

#### Cloudflare SSL Modes

```
Off             → No encryption (NEVER use this)
Flexible        → HTTPS client↔Cloudflare, HTTP Cloudflare↔origin (insecure!)
Full            → HTTPS everywhere, but origin cert not validated
Full (Strict)   → HTTPS everywhere, origin cert must be valid ← USE THIS
```

#### Cloudflare Origin Certificate

```bash
# Generate an origin certificate via Cloudflare dashboard or API
# Valid for up to 15 years, free, trusted ONLY by Cloudflare

# On origin server (nginx):
ssl_certificate     /etc/ssl/cloudflare-origin.pem;
ssl_certificate_key /etc/ssl/cloudflare-origin-key.pem;
```

#### Let's Encrypt with Certbot (Non-Cloudflare)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (nginx plugin auto-configures)
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal (certbot installs a systemd timer by default)
sudo certbot renew --dry-run

# Manual DNS challenge (for wildcard certs)
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.example.com" -d "example.com"
# Requires adding a TXT record: _acme-challenge.example.com
```

#### CAA Records (Restrict Certificate Issuance)

```
# Only allow Let's Encrypt and Cloudflare to issue certificates
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"

Type: CAA
Name: @
Value: 0 issue "comodoca.com"    # Used by Cloudflare Universal SSL

Type: CAA
Name: @
Value: 0 issuewild "letsencrypt.org"

# Report unauthorized issuance attempts
Type: CAA
Name: @
Value: 0 iodef "mailto:security@example.com"
```

### Step 3: Email Authentication Records

#### SPF (Sender Policy Framework)

```
# Allow Google Workspace and Resend to send email on your behalf
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com include:amazonses.com ~all

# Breakdown:
#   v=spf1           — SPF version
#   include:...      — Authorize these senders
#   ~all             — Soft fail others (use -all for hard fail after testing)
```

#### DKIM (DomainKeys Identified Mail)

```
# Provider gives you a CNAME or TXT record
# Example for Resend:
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.dev

# Example for Google Workspace:
Type: TXT
Name: google._domainkey
Value: v=DKIM1; k=rsa; p=MIIBIjANBgkq... (public key from admin console)
```

#### DMARC (Domain-based Message Authentication)

```
# Start with monitoring mode (p=none), then tighten
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; pct=100

# After confirming legitimate mail passes:
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100

# After full confidence:
Value: v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100
```

### Step 4: Domain Migration (Zero-Downtime)

```
Migration Timeline:

Day -7: Lower TTL on ALL records being changed
  Old TTL: 86400 (24h) → New TTL: 300 (5 min)

Day -1: Verify low TTL has propagated
  $ dig example.com +short | head -1
  # Confirm TTL is 300 in responses

Day 0: Update DNS records to new values
  - Change A/CNAME records to new hosting provider
  - Monitor for errors in both old and new infrastructure

Day 0 + 1h: Verify propagation across regions
  $ dig @8.8.8.8 example.com         # Google DNS
  $ dig @1.1.1.1 example.com         # Cloudflare DNS
  $ dig @208.67.222.222 example.com  # OpenDNS

Day +3: Old infrastructure can be decommissioned

Day +7: Raise TTL back to production values
  New TTL: 3600 (1h) or 86400 (24h)
```

### Step 5: Debugging DNS Issues

```bash
# Check current DNS resolution
dig example.com A +short
dig example.com AAAA +short
dig example.com MX +short
dig example.com TXT +short
dig _dmarc.example.com TXT +short

# Check specific nameserver
dig @ns1.cloudflare.com example.com A

# Full trace (follow delegation chain)
dig example.com +trace

# Check all record types
dig example.com ANY +noall +answer

# Check TTL remaining
dig example.com A | grep -E "^example" | awk '{print $2}'

# Verify CNAME chain
dig www.example.com CNAME +short
# Should return: cname.vercel-dns.com (or similar)

# Check SSL certificate
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Check certificate chain
curl -vI https://example.com 2>&1 | grep -E "subject:|issuer:|expire"

# Online propagation checker
# https://www.whatsmydns.net/#A/example.com
```

#### Common DNS Debug Patterns

```bash
# "DNS_PROBE_FINISHED_NXDOMAIN" → Domain does not resolve at all
dig example.com NS +short
# If empty: nameservers not delegated. Check registrar NS records.

# "ERR_SSL_VERSION_OR_CIPHER_MISMATCH" → SSL mode conflict
# Cloudflare Flexible SSL + origin expecting HTTPS = redirect loop
# Fix: Set Cloudflare SSL to "Full (Strict)" and install origin cert

# "Too many redirects" → HTTP↔HTTPS redirect loop
# Cloudflare "Always Use HTTPS" + origin 301 to HTTPS = infinite loop
# Fix: Set Cloudflare SSL to "Full (Strict)", remove origin HTTP→HTTPS redirect
```

## Best Practices

1. **Always use Full (Strict) SSL** on Cloudflare — "Flexible" mode means traffic between Cloudflare and your origin is unencrypted.
2. **Lower TTL before migrations** — Drop to 300s at least 48 hours before changing records, so old caches expire before the switch.
3. **Set CAA records** — Prevent unauthorized certificate issuance by restricting which CAs can issue for your domain.
4. **Deploy DMARC in stages** — Start with `p=none` to monitor, then `p=quarantine`, then `p=reject` once you confirm no legitimate mail is failing.
5. **Use CNAME for subdomains, A for apex** — CNAMEs are more flexible (they follow the target if the IP changes), but cannot be used at the zone apex without provider support.
6. **Add both IPv4 and IPv6** — Modern clients prefer AAAA records. Dual-stack avoids connectivity issues.
7. **Document your DNS zone** — Keep a table of all records and their purpose. DNS changes without context cause debugging nightmares months later.
8. **Test email authentication** — Use `mail-tester.com` or `mxtoolbox.com` to verify SPF, DKIM, and DMARC pass before relying on them.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **CNAME at zone apex** | Registrar rejects the record or resolution fails | Use A record pointing to IP, or use Cloudflare/Route53 ALIAS/ANAME flattening |
| **Cloudflare Flexible SSL** | Infinite redirect loop or mixed content | Switch to Full (Strict) and install an origin certificate |
| **High TTL during migration** | Users stuck on old IP for hours/days | Lower TTL to 300s at least 48 hours before migration |
| **Missing SPF record** | Emails land in spam or get rejected | Add `v=spf1 include:<provider> ~all` TXT record |
| **SPF too many lookups** | SPF validation fails (max 10 DNS lookups) | Consolidate includes; use `ip4:`/`ip6:` for known IPs instead of `include:` |
| **Proxying non-HTTP through Cloudflare** | SSH, database connections fail | Set DNS-only (gray cloud) for non-HTTP services |
| **Wildcard cert without DNS challenge** | Certbot HTTP challenge fails for `*.example.com` | Use `--preferred-challenges dns` with certbot for wildcard certificates |
| **Forgot to update nameservers at registrar** | All DNS changes at new provider are ignored | Update NS records at the registrar to point to the new DNS provider's nameservers |


---

## From `environment-management`

> Multi-environment management — staging, preview, production; environment promotion; config per environment

# Multi-Environment Management

## Purpose

Provide expert guidance on designing, configuring, and managing multi-environment deployment pipelines. Covers environment architecture (development, staging, preview, production), promotion strategies, per-environment configuration, and environment parity to minimize "works on staging, breaks in prod" failures.

## Key Patterns

### Environment Architecture

A typical environment ladder for production applications:

```
local -> preview (per-PR) -> staging -> production
```

| Environment | Purpose | Data | Lifetime | Access |
|-------------|---------|------|----------|--------|
| Local | Developer workstation | Seed/mock data | Permanent | Developer only |
| Preview | Per-PR verification | Seed or staging snapshot | Ephemeral (PR lifecycle) | Team |
| Staging | Pre-production validation | Sanitized production copy | Permanent | Team + QA |
| Production | Live users | Real data | Permanent | Public |

### Per-Environment Configuration

**Use environment variables with validation at startup:**

```typescript
// env.ts — validated environment config
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url(),
  FEATURE_FLAGS_ENDPOINT: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().optional(),
  // Staging/prod only
  CDN_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

// Type-safe environment checks
export const isProd = env.NODE_ENV === "production";
export const isStaging = env.NODE_ENV === "staging";
export const isDev = env.NODE_ENV === "development";
```

**Environment-specific configuration files (Next.js example):**

```
.env                  # Shared defaults (committed, no secrets)
.env.local            # Local overrides (gitignored)
.env.staging          # Staging values (committed, no secrets)
.env.production       # Production values (committed, no secrets)
```

```bash
# .env (shared defaults)
NEXT_PUBLIC_APP_NAME="MyApp"
LOG_LEVEL="info"

# .env.staging
NEXT_PUBLIC_API_URL="https://api.staging.myapp.com"
NEXT_PUBLIC_APP_ENV="staging"

# .env.production
NEXT_PUBLIC_API_URL="https://api.myapp.com"
NEXT_PUBLIC_APP_ENV="production"
```

**Secrets management -- never commit secrets:**

```yaml
# Use platform-specific secret stores
# Vercel: vercel env pull
# AWS: AWS Secrets Manager / SSM Parameter Store
# GitHub Actions: repository secrets

# GitHub Actions example
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

### Vercel Environment Setup

```bash
# Set environment variables per environment
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Pull env vars for local development
vercel env pull .env.local

# Link to specific environments
vercel --prod          # Deploy to production
vercel                 # Deploy to preview
```

**Vercel `vercel.json` with environment-specific headers:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "noindex"
        }
      ],
      "has": [
        {
          "type": "host",
          "value": ".*staging.*"
        }
      ]
    }
  ]
}
```

### Environment Promotion Flow

**GitHub Actions promotion pipeline:**

```yaml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      staging_sha:
        description: "Staging commit SHA to promote"
        required: true

jobs:
  verify-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.staging_sha }}

      - name: Verify staging deployment health
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.myapp.com/api/health)
          if [ "$STATUS" != "200" ]; then
            echo "Staging health check failed with status $STATUS"
            exit 1
          fi

      - name: Run smoke tests against staging
        run: npx playwright test --config=playwright.staging.config.ts

  promote:
    needs: verify-staging
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.staging_sha }}

      - name: Deploy to production
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Post-deploy smoke test
        run: |
          sleep 10
          curl -sf https://myapp.com/api/health || exit 1
```

### Preview Environments (Per-PR)

**Vercel automatic previews with database branching (Neon):**

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  setup-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Neon branch for PR
        id: neon
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Set preview DATABASE_URL
        run: |
          vercel env add DATABASE_URL preview \
            --token=${{ secrets.VERCEL_TOKEN }} \
            < <(echo "${{ steps.neon.outputs.db_url }}")

      - name: Deploy preview
        run: vercel --token=${{ secrets.VERCEL_TOKEN }}
```

### Docker Multi-Environment Setup

```dockerfile
# Multi-stage build with environment targets
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
COPY . .
ARG APP_ENV=production
ENV NEXT_PUBLIC_APP_ENV=$APP_ENV
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.staging.yml
services:
  app:
    build:
      context: .
      args:
        APP_ENV: staging
    env_file: .env.staging
    ports:
      - "3000:3000"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp_staging
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - staging_db:/var/lib/postgresql/data

volumes:
  staging_db:
```

### Environment Parity

Keep environments as similar as possible to minimize surprises.

```typescript
// Feature flags for environment-specific behavior (NOT code branches)
const featureFlags = {
  development: {
    enableDebugToolbar: true,
    enableMockPayments: true,
    enableSeedData: true,
  },
  staging: {
    enableDebugToolbar: true,
    enableMockPayments: true,  // Stripe test mode
    enableSeedData: false,
  },
  production: {
    enableDebugToolbar: false,
    enableMockPayments: false,
    enableSeedData: false,
  },
} as const;

export const flags = featureFlags[env.NODE_ENV];
```

## Best Practices

- **Validate env vars at startup** -- fail fast with clear error messages rather than crashing at runtime when a var is missing.
- **Never commit secrets** -- use `.env.local` (gitignored) for local secrets, platform secret stores for deployments.
- **Use database branching** (Neon, PlanetScale) for preview environments to get isolated data without full database provisioning.
- **Require approval gates** for production promotions via GitHub Environments or similar.
- **Run smoke tests after every deployment** -- automated health checks catch configuration drift.
- **Tag deployments** with git SHA and environment for traceability: `APP_VERSION=abc123 APP_ENV=staging`.
- **Keep staging as close to production as possible** -- same infra, same data shape, same feature flags.
- **Clean up preview environments** when PRs close to avoid resource waste.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Hardcoded URLs in code | Different base URLs per environment break | Use environment variables for all external URLs |
| Secrets in `.env` committed to git | Credential exposure | Use `.env.local` (gitignored) + platform secret stores |
| Staging with tiny dataset | Queries fast on staging, slow in production | Use sanitized production data snapshots for staging |
| No health check endpoint | Cannot verify deployment success | Add `/api/health` that checks DB, Redis, external deps |
| Preview envs sharing database | Data corruption across PRs | Use database branching (Neon) or isolated test databases |
| Missing cleanup on PR close | Orphaned preview databases and deployments | Add `pull_request: closed` workflow to tear down resources |


---

## From `ci-cd-patterns`

> CI/CD pipeline patterns — matrix builds, caching, artifacts, deployment gates, rollback strategies

# CI/CD Pipeline Patterns

## Purpose

Design efficient, reliable CI/CD pipelines with GitHub Actions. Covers matrix builds, dependency caching, artifact management, deployment gates with manual approvals, canary deployments, and rollback strategies.

## Key Patterns

### Optimized CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Fast checks first — fail early
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    needs: lint  # Only test if lint passes
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ matrix.shard }}
          path: test-results/
          retention-days: 7

  build:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile

      # Cache Next.js build
      - uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
            nextjs-${{ runner.os }}-

      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 1
```

### Matrix Builds

```yaml
# Test across multiple Node versions and OS
jobs:
  test-matrix:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [18, 20, 22]
        exclude:
          - os: macos-latest
            node: 18  # Skip older Node on macOS
        include:
          - os: ubuntu-latest
            node: 20
            coverage: true  # Only collect coverage once
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test ${{ matrix.coverage && '--coverage' || '' }}
      - if: matrix.coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

### Dependency Caching Strategies

```yaml
# pnpm caching (built into setup-node)
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'

# Docker layer caching
- uses: docker/build-push-action@v5
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max

# Turbo remote caching
- run: pnpm turbo build --cache-dir=.turbo
- uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
    restore-keys: turbo-${{ runner.os }}-

# Playwright browser caching
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
- run: pnpm exec playwright install --with-deps chromium
```

### Deployment Gates and Approvals

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-test:
    # ... build and test steps ...

  deploy-staging:
    needs: build-and-test
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
      - run: ./deploy.sh staging

  # Smoke tests on staging
  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm exec playwright test --config=e2e/smoke.config.ts
        env:
          BASE_URL: https://staging.example.com

  # Manual approval gate before production
  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
      - run: ./deploy.sh production
      - name: Notify deployment
        run: |
          curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{"text": "Deployed ${{ github.sha }} to production"}'
```

### Rollback Strategies

```yaml
# Manual rollback workflow
name: Rollback
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options: [staging, production]
      commit_sha:
        description: 'Commit SHA to rollback to'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit_sha }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: ./deploy.sh ${{ github.event.inputs.environment }}

      - name: Notify rollback
        run: |
          curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d '{"text": "Rolled back ${{ github.event.inputs.environment }} to ${{ github.event.inputs.commit_sha }}"}'
```

### Canary Deployment

```yaml
# Progressive rollout with health checks
jobs:
  canary:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy canary (10% traffic)
        run: ./deploy.sh production --canary --weight=10

      - name: Monitor canary (5 minutes)
        run: |
          for i in {1..10}; do
            ERROR_RATE=$(curl -s "$MONITORING_API/error-rate?deployment=canary")
            if (( $(echo "$ERROR_RATE > 1.0" | bc -l) )); then
              echo "Error rate exceeds threshold. Rolling back."
              ./deploy.sh production --rollback-canary
              exit 1
            fi
            echo "Canary healthy: error rate check $i/10"
            sleep 30
          done

      - name: Promote canary to full
        run: ./deploy.sh production --promote-canary
```

### Monorepo Pipeline with Change Detection

```yaml
# Only build/test/deploy what changed
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/ui/**'
              - 'packages/shared/**'
            api:
              - 'apps/api/**'
              - 'packages/shared/**'
            shared:
              - 'packages/shared/**'

  test-web:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm turbo test --filter=web...

  test-api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm turbo test --filter=api...

  deploy-web:
    needs: [changes, test-web]
    if: needs.changes.outputs.web == 'true' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: pnpm turbo deploy --filter=web
```

### Secrets and Environment Variables

```yaml
# Use GitHub environments for secret scoping
jobs:
  deploy:
    environment: production
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_KEY: ${{ secrets.API_KEY }}
    steps:
      # Use OIDC for cloud provider auth (no long-lived secrets)
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/deploy
          aws-region: us-east-1

      # Mask sensitive values in logs
      - run: |
          echo "::add-mask::${{ secrets.API_KEY }}"
          ./deploy.sh
```

## Best Practices

1. **Fail fast** — Run lint and type-check before tests. Cancel in-progress runs on new pushes with `concurrency`.
2. **Cache aggressively** — Cache dependencies (`pnpm`), build output (`.next/cache`), and Docker layers. Saves minutes per run.
3. **Shard tests** — Split test suites across parallel runners. Use `--shard=1/4` for Jest/Vitest.
4. **Use environments for gates** — GitHub Environments support required reviewers, wait timers, and scoped secrets.
5. **Detect changes in monorepos** — Only build/deploy what changed using path filters. Saves CI minutes and prevents unnecessary deploys.
6. **Pin action versions** — Use SHA-pinned actions (`actions/checkout@abc123`) for security, not just major versions.
7. **Canary before full deploy** — Route 10% traffic to canary, monitor error rates, then promote or rollback.
8. **Always have a rollback plan** — `workflow_dispatch` rollback workflow that can redeploy any previous commit.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No concurrency control | Multiple CI runs for same PR waste resources | Use `concurrency` with `cancel-in-progress: true` |
| Caching `node_modules` | Cache invalidation issues, platform mismatches | Cache pnpm store, not `node_modules`. Use `setup-node` cache |
| Secrets in logs | Credentials exposed in CI output | Use `::add-mask::` and never echo secrets |
| No artifact retention policy | Storage costs grow unbounded | Set `retention-days: 7` on artifacts |
| Sequential test execution | CI takes 20+ minutes | Shard tests across matrix runners |
| No smoke tests after deploy | Broken deploys not caught until users report | Run Playwright smoke suite against staging URL |
| Force-merging past failed checks | Broken code reaches production | Require status checks in branch protection rules |
| Long-lived feature branches | Merge conflicts and integration pain | Merge main into feature branches daily; use trunk-based development |


---

## From `github-actions`

> GitHub Actions workflow authoring, reusable workflows, composite actions, matrix builds, and caching.

# GitHub Actions Workflows

## Purpose

Provide expert guidance on GitHub Actions workflow authoring, reusable workflows, composite actions, matrix builds, caching strategies, and security hardening. Covers the latest GitHub Actions features including artifact v4, Node 20 runners, and reusable workflow improvements.

## Standard CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 7

  build:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 1
```

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22]
        os: [ubuntu-latest, macos-latest]
        exclude:
          - os: macos-latest
            node-version: 20
        include:
          - os: ubuntu-latest
            node-version: 22
            coverage: true
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - if: matrix.coverage
        run: npm run test:coverage
```

## Reusable Workflows

**Define a reusable workflow:**

```yaml
# .github/workflows/deploy-reusable.yml
name: Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      app-name:
        required: true
        type: string
    secrets:
      DEPLOY_TOKEN:
        required: true
    outputs:
      deploy-url:
        description: "The deployment URL"
        value: ${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - id: deploy
        run: |
          # Deploy logic here
          echo "url=https://${{ inputs.app-name }}.example.com" >> "$GITHUB_OUTPUT"
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

**Call the reusable workflow:**

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  build:
    uses: ./.github/workflows/ci.yml

  deploy-staging:
    needs: build
    uses: ./.github/workflows/deploy-reusable.yml
    with:
      environment: staging
      app-name: my-app-staging
    secrets:
      DEPLOY_TOKEN: ${{ secrets.STAGING_DEPLOY_TOKEN }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/deploy-reusable.yml
    with:
      environment: production
      app-name: my-app
    secrets:
      DEPLOY_TOKEN: ${{ secrets.PROD_DEPLOY_TOKEN }}
```

## Composite Actions

**Create a composite action:**

```yaml
# .github/actions/setup-project/action.yml
name: Setup Project
description: Install dependencies and setup Node.js with caching

inputs:
  node-version:
    description: Node.js version
    required: false
    default: '22'

runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
      shell: bash

    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: pnpm

    - run: pnpm install --frozen-lockfile
      shell: bash

    - run: echo "Setup complete — Node $(node -v), pnpm $(pnpm -v)"
      shell: bash
```

**Use the composite action:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-project
        with:
          node-version: '22'
      - run: pnpm build
```

## Caching Strategies

**Dependency caching (automatic with setup-node):**

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm  # automatic cache based on lockfile hash
```

**Custom caching for build artifacts:**

```yaml
- uses: actions/cache@v4
  id: build-cache
  with:
    path: |
      .next/cache
      dist/
    key: build-${{ runner.os }}-${{ hashFiles('src/**', 'package.json') }}
    restore-keys: |
      build-${{ runner.os }}-

- if: steps.build-cache.outputs.cache-hit != 'true'
  run: pnpm build
```

**Docker layer caching:**

```yaml
- uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: my-app:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Secrets and Security

**Principle of least privilege:**

```yaml
permissions:
  contents: read        # default read-only
  pull-requests: write  # only when needed (e.g., PR comments)

# Environment-level protection
jobs:
  deploy:
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    # Requires manual approval via GitHub environment protection rules
```

**Pin action versions by SHA:**

```yaml
# Prefer SHA over tag for third-party actions
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

**Avoid script injection:**

```yaml
# BAD — PR title is user-controlled
- run: echo "${{ github.event.pull_request.title }}"

# GOOD — use environment variable
- run: echo "$PR_TITLE"
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
```

## Conditional Execution

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying..."

  # Only run on specific file changes
  test-backend:
    if: |
      contains(github.event.pull_request.labels.*.name, 'backend') ||
      github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            backend:
              - 'src/api/**'
              - 'src/lib/**'
      - if: steps.changes.outputs.backend == 'true'
        run: pnpm test:backend
```

## Best Practices

1. **Use `concurrency` to cancel stale runs** — Saves CI minutes on rapid pushes.
2. **Pin actions by SHA** — Protect against supply-chain attacks on third-party actions.
3. **Set minimal `permissions`** — Never use `permissions: write-all`.
4. **Use `--frozen-lockfile`** — Prevent accidental dependency changes in CI.
5. **Parallelize independent jobs** — Lint, typecheck, and unit tests can run simultaneously.
6. **Use `fail-fast: false` in matrix** — See all failures, not just the first.
7. **Cache aggressively** — Dependencies, build output, Docker layers.
8. **Use environments for deploy gates** — Require approval for production deployments.
9. **Use reusable workflows for shared logic** — DRY across repositories.
10. **Set artifact retention** — Reduce storage costs with short retention for CI artifacts.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No `concurrency` group | Parallel runs on same PR waste resources | Add `concurrency` with `cancel-in-progress` |
| Action version `@main` | Breaking changes without notice | Pin to tag or SHA: `@v4` or `@<sha>` |
| Missing `--frozen-lockfile` | CI installs different deps than local | Always use `--frozen-lockfile` (pnpm) or `npm ci` |
| Secrets in logs | `echo $SECRET` exposes values | GitHub auto-masks, but avoid explicit logging |
| Large artifacts | Slow uploads, storage costs | Set `retention-days`, compress before upload |
| Missing `shell: bash` in composite | Steps fail without explicit shell | Always specify `shell: bash` in composite action steps |


---

## From `cicd`

> GitHub Actions, GitLab CI, pipeline optimization, deployment automation, and CI/CD best practices

# CI/CD Specialist

## Purpose

Design and implement efficient, secure, and maintainable CI/CD pipelines. This skill covers GitHub Actions (primary), GitLab CI, pipeline optimization, caching strategies, deployment workflows, and security scanning integration.

## Key Patterns

### GitHub Actions: Full CI/CD Pipeline

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

permissions:
  contents: read
  pull-requests: write

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    strategy:
      matrix:
        shard: [1, 2, 3]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm test --shard=${{ matrix.shard }}/3
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/test_db

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build
        env:
          NEXT_TELEMETRY_DISABLED: 1

      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next
          retention-days: 1

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next

      - id: deploy
        run: |
          # Deployment logic here
          echo "url=https://app.example.com" >> "$GITHUB_OUTPUT"
```

### Reusable Workflow Pattern

```yaml
# .github/workflows/reusable-docker.yml
name: Reusable Docker Build

on:
  workflow_call:
    inputs:
      image-name:
        required: true
        type: string
      context:
        required: false
        type: string
        default: "."
    secrets:
      registry-token:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.registry-token }}

      - uses: docker/build-push-action@v6
        with:
          context: ${{ inputs.context }}
          push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}/${{ inputs.image-name }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Path-Based Conditional Execution

```yaml
on:
  push:
    paths:
      - "apps/web/**"
      - "packages/shared/**"
      - ".github/workflows/web.yml"
    paths-ignore:
      - "**/*.md"
      - "docs/**"
```

## Best Practices

### Speed Optimization
- Use `concurrency` groups to cancel outdated runs on PR branches
- Cache dependencies (pnpm store, node_modules, .next/cache)
- Use matrix strategy to parallelize tests across shards
- Use path filters to skip irrelevant builds in monorepos
- Upload/download artifacts between jobs rather than rebuilding
- Pin action versions by SHA for security and reproducibility

### Security
- Use `permissions` to follow the principle of least privilege
- Never echo secrets; use masked outputs
- Use GitHub Environments with required reviewers for production
- Pin actions to commit SHAs, not tags: `actions/checkout@abc123`
- Use OIDC for cloud provider auth instead of long-lived credentials
- Run `npm audit` / `trivy` in CI

### Reliability
- Use `--frozen-lockfile` to prevent lockfile drift
- Set explicit timeouts on jobs (`timeout-minutes: 15`)
- Use `services` for integration test dependencies
- Add status checks as required in branch protection rules

### Secrets Management
- Store secrets in GitHub Secrets, not in the repo
- Use environment-scoped secrets for different stages
- Rotate secrets regularly; use OIDC where possible

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Slow pipelines | Parallelize jobs, cache deps, use path filters |
| Flaky tests | Use retries sparingly; fix the root cause |
| Unpinned actions | Pin by SHA: `uses: actions/checkout@<sha>` |
| Missing concurrency groups | Add `concurrency` to cancel stale runs |
| Building on every path change | Use `paths` and `paths-ignore` filters |
| Secrets in logs | Use `::add-mask::` and avoid echoing env vars |
| No timeout | Set `timeout-minutes` to prevent hung jobs |

## Examples

### Cache Restoration for pnpm

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.pnpm-store
      .next/cache
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

### Release Workflow with Changeset

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: changesets/action@v1
        with:
          publish: pnpm release
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Slack Notification on Failure

```yaml
- if: failure()
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: |
      {
        "text": "CI failed on ${{ github.ref }} by ${{ github.actor }}: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```


---

## From `shell-scripting`

> Bash/Zsh script generation, debugging, POSIX compliance, and automation patterns

# Shell Scripting Skill

## Purpose

Generate robust, portable shell scripts for automation tasks. This skill covers Bash and Zsh scripting with proper error handling, argument parsing, logging, and POSIX compliance. Scripts produced by this skill are safe by default: they fail on errors, quote variables, and validate inputs.

## Key Concepts

### Script Header Template

Every script starts with this foundation:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# -------------------------------------------------------------------
# Script: deploy.sh
# Description: Deploy application to production
# Usage: ./deploy.sh [--env production|staging] [--dry-run]
# -------------------------------------------------------------------

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
```

### Safety Flags Explained

```bash
set -e          # Exit immediately on any command failure
set -u          # Treat unset variables as errors
set -o pipefail # Pipe fails if ANY command in the pipeline fails
IFS=$'\n\t'     # Safer word splitting (no space splitting)

# Combined:
set -euo pipefail
```

### Variable Best Practices

```bash
# ALWAYS quote variables (prevents word splitting and globbing)
echo "$my_var"         # Good
echo $my_var           # Bad -- breaks on spaces and wildcards

# Use readonly for constants
readonly MAX_RETRIES=3
readonly CONFIG_DIR="/etc/myapp"

# Use local in functions
my_function() {
  local result=""
  local -r timeout=30  # local + readonly
  result=$(some_command)
  echo "$result"
}

# Default values
name="${1:-default_value}"
env="${DEPLOY_ENV:-production}"

# Required variables (fail if unset)
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${API_KEY:?API_KEY must be set}"
```

## Patterns

### Argument Parsing

```bash
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Options:
  -e, --env ENV       Target environment (production|staging) [default: staging]
  -d, --dry-run       Show what would be done without executing
  -v, --verbose        Enable verbose output
  -h, --help           Show this help message

Examples:
  $SCRIPT_NAME --env production
  $SCRIPT_NAME --dry-run --verbose
EOF
}

# Defaults
env="staging"
dry_run=false
verbose=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      env="$2"
      shift 2
      ;;
    -d|--dry-run)
      dry_run=true
      shift
      ;;
    -v|--verbose)
      verbose=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Validate
if [[ "$env" != "production" && "$env" != "staging" ]]; then
  echo "Error: --env must be 'production' or 'staging'" >&2
  exit 1
fi
```

### Logging Functions

```bash
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*" >&2; }
log_fatal() { log_error "$@"; exit 1; }
```

### Cleanup Traps

```bash
cleanup() {
  local exit_code=$?
  log_info "Cleaning up..."
  [[ -f "$tmp_file" ]] && rm -f "$tmp_file"
  [[ -n "${original_branch:-}" ]] && git checkout "$original_branch" 2>/dev/null
  exit "$exit_code"
}

trap cleanup EXIT ERR INT TERM

# Now create temp files safely
tmp_file="$(mktemp)"
```

### Retry Logic

```bash
retry() {
  local max_attempts="${1:?}"
  local delay="${2:?}"
  shift 2
  local attempt=1

  until "$@"; do
    if (( attempt >= max_attempts )); then
      log_error "Command failed after $max_attempts attempts: $*"
      return 1
    fi
    log_warn "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
    sleep "$delay"
    (( attempt++ ))
    (( delay *= 2 ))  # Exponential backoff
  done
}

# Usage
retry 3 2 curl -sf "https://api.example.com/health"
```

### Parallel Execution

```bash
pids=()
for server in "${servers[@]}"; do
  deploy_to_server "$server" &
  pids+=($!)
done

failures=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    (( failures++ ))
  fi
done

if (( failures > 0 )); then
  log_error "$failures deployments failed"
  exit 1
fi
```

### Interactive Confirmation

```bash
confirm() {
  local prompt="${1:-Are you sure?}"
  local response
  if [[ "${FORCE:-false}" == "true" ]]; then return 0; fi
  read -rp "$prompt [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

if confirm "Deploy to production?"; then
  deploy
else
  log_info "Deployment cancelled"
  exit 0
fi
```

## Makefile Patterns

```makefile
.PHONY: dev build test lint clean deploy
.DEFAULT_GOAL := help

NODE_ENV ?= development
PORT ?= 3000

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development server
	NODE_ENV=development npm run dev

build: ## Build for production
	NODE_ENV=production npm run build

test: ## Run test suite
	npm test

lint: ## Run linter
	npm run lint

clean: ## Remove build artifacts
	rm -rf .next node_modules/.cache

deploy: build test ## Deploy (builds and tests first)
	./scripts/deploy.sh --env production
```

## Best Practices

1. **Always use `set -euo pipefail`** -- catches 90% of script bugs automatically
2. **Always quote variables** -- `"$var"` not `$var` to prevent word splitting
3. **Use `[[ ]]` not `[ ]`** -- double brackets are safer and more featureful in Bash
4. **Use `$(command)` not backticks** -- backticks do not nest and are harder to read
5. **Validate inputs early** -- check required arguments and environment variables before doing work
6. **Use `trap` for cleanup** -- temporary files and state changes must be cleaned up on exit
7. **Write errors to stderr** -- `echo "Error" >&2` keeps stdout clean for piping
8. **Use `readonly` for constants** -- prevents accidental reassignment
9. **Use `local` in functions** -- prevents variable leakage to global scope
10. **ShellCheck everything** -- run `shellcheck script.sh` before committing

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Unquoted variables | Word splitting breaks on spaces | Always use `"$var"` |
| Missing `set -e` | Script continues after errors | Add `set -euo pipefail` |
| `cd` without error check | Operates in wrong directory | Use `cd dir \|\| exit 1` or `set -e` |
| Parsing `ls` output | Breaks on special chars in filenames | Use `find` or glob patterns |
| `cat file \| grep` | Useless use of cat | `grep pattern file` directly |
| No cleanup trap | Temp files left on failure | Add `trap cleanup EXIT` |
| Hardcoded paths | Breaks on different systems | Use `$(dirname "$0")` or `which` |
| Missing shebang | Script runs in wrong shell | Always start with `#!/usr/bin/env bash` |

