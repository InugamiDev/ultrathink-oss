---
name: terraform
description: Infrastructure as Code with Terraform, module design, state management, provider patterns, and drift detection
layer: domain
category: devops
triggers:
  - "terraform"
  - "infrastructure as code"
  - "iac"
  - "hcl"
  - "terraform module"
  - "tf state"
  - "terraform plan"
inputs: [infrastructure requirements, cloud provider, environment specifications]
outputs: [Terraform modules, variable definitions, state configs, provider configurations]
linksTo: [aws, cloudflare, kubernetes, monitoring, cicd]
linkedFrom: [ship, plan, infrastructure]
preferredNextSkills: [aws, kubernetes, monitoring]
fallbackSkills: [cloudflare, vercel]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [infrastructure provisioning, state modifications]
---

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
