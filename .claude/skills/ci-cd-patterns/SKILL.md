---
name: ci-cd-patterns
description: CI/CD pipeline patterns — matrix builds, caching, artifacts, deployment gates, rollback strategies
layer: domain
category: devops
triggers:
  - "ci pipeline"
  - "cd pipeline"
  - "github actions workflow"
  - "deployment gate"
  - "ci caching"
  - "matrix build"
  - "pipeline optimization"
inputs:
  - "CI/CD pipeline design or optimization needs"
  - "GitHub Actions workflow requirements"
  - "Deployment strategy and rollback design"
  - "Build caching and artifact management"
outputs:
  - "GitHub Actions workflow configurations"
  - "Matrix build strategies"
  - "Deployment gate and approval workflows"
  - "Rollback and canary deployment patterns"
linksTo:
  - cicd
  - docker
  - vercel
  - environment-management
linkedFrom:
  - cicd
preferredNextSkills:
  - cicd
  - docker
fallbackSkills:
  - vercel
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
