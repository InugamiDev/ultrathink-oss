---
name: container-orchestration
description: Container orchestration beyond k8s — Docker Swarm, Nomad, ECS, and container networking patterns.
layer: utility
category: devops
triggers:
  - "container orchestration"
  - "docker swarm"
  - "nomad"
  - "ecs"
  - "container networking"
  - "service discovery"
inputs:
  - "Container deployment requirements"
  - "Service orchestration architecture questions"
  - "Container networking and service discovery needs"
  - "Scaling and health check configurations"
outputs:
  - "Orchestration platform configurations"
  - "Service discovery and networking setups"
  - "Health check and auto-scaling patterns"
  - "Platform comparison and selection guidance"
linksTo:
  - docker
  - kubernetes
  - microservices
linkedFrom: []
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
