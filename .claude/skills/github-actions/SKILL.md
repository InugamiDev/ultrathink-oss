---
name: github-actions
description: GitHub Actions workflow authoring, reusable workflows, composite actions, matrix builds, and caching.
layer: domain
category: devops
triggers:
  - "github actions"
  - "github workflow"
  - "gh action"
  - "ci workflow"
  - "actions yaml"
inputs:
  - "CI/CD pipeline requirements"
  - "Workflow optimization and caching"
  - "Reusable workflow design"
  - "Composite action development"
outputs:
  - "GitHub Actions workflow YAML files"
  - "Reusable workflows and composite actions"
  - "Matrix build configurations"
  - "Optimized caching strategies"
linksTo:
  - cicd
  - docker
  - ci-cd-patterns
linkedFrom: []
preferredNextSkills:
  - cicd
  - docker
  - terraform
fallbackSkills:
  - ci-cd-patterns
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

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
